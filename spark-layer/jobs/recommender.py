from pyspark.sql.functions import col, concat_ws, length, when, lit, array_join, size, coalesce, row_number
from utils.nlp_pipeline import get_nlp_pipeline, clean_and_prepare_features
from utils.spark_utils import get_spark_session, atlas_uri
from utils.ml_models import get_lda_topics
from pyspark.sql.window import Window
from pyspark.sql import functions as fun
import sys

# now lets move on to computing similarities between courses based on their topic distributions
def compute_ground_truth(df):
  from pyspark.ml.feature import Normalizer
  from pyspark.ml.functions import vector_to_array
  
  df.persist()

  normalizer = Normalizer(inputCol="features", outputCol="norm_features")
  norm_df = normalizer.transform(df)
  norm_df = norm_df.withColumn("feat_array", vector_to_array(fun.col("norm_features")))

  df_a = norm_df.select(fun.col("course_id").alias("id_a"), 
    fun.col("title").alias("title_a"), 
    fun.col("feat_array").alias("feat_a"))
  df_b = norm_df.select(fun.col("course_id").alias("id_b"), 
    fun.col("title").alias("title_b"), 
    fun.col("feat_array").alias("feat_b"))

  return df_a.crossJoin(df_b) \
    .filter(fun.col("id_a") < fun.col("id_b")) \
    .withColumn("cosine_sim", fun.expr("""
      aggregate(
        zip_with(feat_a, feat_b, (x, y) -> x * y), 
        CAST(0.0 AS DOUBLE), 
        (acc, x) -> acc + x
      )
    """)) \
    .orderBy(fun.col("cosine_sim").desc())

def exact_knn(ground_truth):
  window_spec = Window.partitionBy("id_a").orderBy(fun.col("cosine_sim").desc())

  # 2. Apply the Rank and Filter
  # This turns your 16-million-row ground truth into a focused ~20,000-row k-NN table.
  knn_tfidf_df = ground_truth \
      .withColumn("rank", fun.row_number().over(window_spec)) \
      .filter(fun.col("rank") <= 5) \
      .select("title_a", "title_b", "cosine_sim", "rank")
  return knn_tfidf_df

def run_scenario_exact_knn(vectorized_df, k=5):
  gt_results = compute_ground_truth(vectorized_df)
  knn_tfidf_df = exact_knn(gt_results)
  return knn_tfidf_df

def run_scenario_approx_knn(vectorized_df, k=5, bottom_threshold=0.01, top_threshold=0.25):
  from pyspark.ml.feature import MinHashLSH
  
  minhash = MinHashLSH(inputCol="features", outputCol="hashes", numHashTables=15)
  minhash_model = minhash.fit(vectorized_df)
  lsh_df = minhash_model.transform(vectorized_df)
  
  lsh_matches = minhash_model.approxSimilarityJoin(
    lsh_df,
    lsh_df,
    threshold=top_threshold,
    distCol="JaccardDistance"
  ).filter((col("datasetA.course_id") < col("datasetB.course_id")) & (col("JaccardDistance") > bottom_threshold))
  
  flattened_lsh = lsh_matches.select(
    fun.col("datasetA.course_id").alias("id_a"),
    fun.col("datasetA.title").alias("title_a"),
    fun.col("datasetB.course_id").alias("id_b"),
    fun.col("datasetB.title").alias("title_b"),
    fun.col("JaccardDistance").alias("distance")
  )
  
  window_spec = Window.partitionBy("id_a").orderBy(fun.col("distance").asc())

  lsh_knn_results = flattened_lsh \
    .withColumn("rank", fun.row_number().over(window_spec)) \
    .filter(fun.col("rank") <= 5)
  
  return lsh_knn_results

def run_scenario_lda_knn(vectorized_df, cv_model, k=5, upper_threshold=0.2, num_topics=15):
  from pyspark.ml.feature import BucketedRandomProjectionLSH
  
  lda_df = get_lda_topics(vectorized_df, cv_model, num_topics=num_topics)

  lsh = BucketedRandomProjectionLSH(
    inputCol="topicDistribution", 
    outputCol="hashes", 
    bucketLength=0.1, 
    numHashTables=3
  )
  lsh_model = lsh.fit(lda_df)
  lsh_df = lsh_model.transform(lda_df)

  similar_pairs_df = lsh_model.approxSimilarityJoin(
    lsh_df, 
    lsh_df, 
    threshold=upper_threshold, 
    distCol="CosineDistance"
  ).filter(col("datasetA.course_id") < col("datasetB.course_id"))

  recommendations = similar_pairs_df.select(
    fun.col("datasetA.course_id").alias("id_a"),
    fun.col("datasetA.title").alias("title_a"),
    fun.col("datasetB.course_id").alias("id_b"),
    fun.col("datasetB.title").alias("title_b"),
    fun.col("CosineDistance").alias("distance")
  )

  # recommendations.show(5, truncate=False)
  window_spec = Window.partitionBy("id_a").orderBy(col("distance").asc())
  return recommendations.withColumn("rank", fun.row_number().over(window_spec)).filter(col("rank") <= k)

def export_recommendations_to_mongodv(df, collection_name="course_recommendations"):
  """Explicitly writes to Atlas, bypassing session defaults."""
    
  # Ensure we are working with fresh data
  df.cache() 
  count = df.count()
  print(f"DEBUG: Attempting to write {count} rows to {collection_name}...")

  if count == 0:
    print("ABORT: DataFrame is empty. Check your similarity thresholds!")
    return

  # Use an explicit URI for the write to avoid any config mixups
  target_uri = atlas_uri.replace("/?", f"/test?") # Force it into the 'test' database

  df.select(
    col("id_a").alias("source_course_id"),
    col("id_b").alias("recommended_course_id"),
    col("distance").alias("score"),
    col("rank")
  ).write \
    .format("mongodb") \
    .mode("overwrite") \
    .option("connection.uri", target_uri) \
    .option("database", "test") \
    .option("collection", collection_name) \
    .save()

  print("SUCCESS: Exported recommendations to Atlas test database.")
  
def run_hybrid_scenario(vectorized_df, cv_model, k=5, num_topics=38, weights=(0.6, 0.4)):
  tfidf_sim = run_scenario_approx_knn(vectorized_df, k=k, bottom_threshold=0.01, top_threshold=0.4)
  
  lda_sim = run_scenario_lda_knn(vectorized_df, cv_model, k=k, upper_threshold=0.2, num_topics=num_topics)
  
  hybrid_sim = tfidf_sim.alias("tfidf").join(
    lda_sim.alias("lda"), 
    (col("tfidf.id_a") == col("lda.id_a")) & (col("tfidf.id_b") == col("lda.id_b")),
    how="outer"
  )

  # If a pair is missing in one model, we penalize it with a distance of 1.0
  final_hybrid = hybrid_sim.select(
    coalesce(col("tfidf.id_a"), col("lda.id_a")).alias("id_a"),
    coalesce(col("tfidf.id_b"), col("lda.id_b")).alias("id_b"),
    (
      (coalesce(col("tfidf.distance"), lit(1.0)) * weights[0]) +
      (coalesce(col("lda.distance"), lit(1.0)) * weights[1])
    ).alias("distance")
  )
  
  # rank again and take the top 5 per course
  window_spec = Window.partitionBy("id_a").orderBy(col("distance").asc())
  return final_hybrid.withColumn("rank", row_number().over(window_spec)).filter(col("rank") <= 5)
  
  
spark = get_spark_session()

raw_df = spark.read.format("mongodb")\
  .option("database", "test") \
  .option("collection", "courses") \
  .load().repartition(12)
  
raw_df.persist()

print(f"Total rows in raw_df: {raw_df.count()}")
raw_df.show(5)

# clean the data
cleaned_df = raw_df.select(
  col("_id").alias("course_id"),
  col("title"),
  col("description"),
  col("keywords"),
  concat_ws(" ", 
    col("title"), col("title"), col("title"), col("title"), col("title"), # more emphasis
    when(col("description") != "No description available", col("description"))
    .otherwise(lit("")),
    array_join(col("keywords"), " "),
    col("cluster_label"), col("cluster_label"), col("cluster_label"),
  ).alias("text_content")
)

nlp_pipeline = get_nlp_pipeline(cleaned_df)

from pyspark.sql.functions import array_union

nlp_model = nlp_pipeline.fit(cleaned_df)  
processed_df = nlp_model.transform(cleaned_df)

# we combine unigrams and bigrams 
# processed_df = processed_df.withColumn(
#     "tokens_all",
#     array_union("tokens", "bigrams")
# )

processed_df = processed_df.filter(size(col("tokens")) >= 35)

tokens_df = processed_df.select("course_id", "title", col("tokens").alias("tokens")) 
  
vectorized_df, cv_model = clean_and_prepare_features(tokens_df)
print(f"DF Rows: {vectorized_df.count()}")
# vectorized_df.show(5)

# Scenario A: Exact TF-IDF (Ground Truth)
# recommendations = run_scenario_exact_knn(vectorized_df)

try:
  choice = int(sys.argv[1])
except (IndexError, ValueError):
  print("Usage: spark-submit recommender.py [1|2|3]")
  sys.exit(1)

recommendations = None

if choice == 1:
  # Scenario B: Fast TF-IDF (MinHash LSH)
  recommendations = run_scenario_approx_knn(vectorized_df, k=5, bottom_threshold=0.01, top_threshold=0.4)
elif choice == 2:
  # Scenario C: Thematic LDA (BRP LSH)
  recommendations = run_scenario_lda_knn(vectorized_df, cv_model, k=5, num_topics=10)
elif choice == 3:
  # hybrid similarity logic
  recommendations = run_hybrid_scenario(vectorized_df, cv_model, k=5, num_topics=20)

if recommendations is not None:
  print(f"Total recommendations generated: {recommendations.count()}")
  recommendations.show(20, truncate=False)
  export_recommendations_to_mongodv(recommendations, collection_name="course_recommendations")
else:
  print("Invalid choice. Please select 1, 2, or 3.")
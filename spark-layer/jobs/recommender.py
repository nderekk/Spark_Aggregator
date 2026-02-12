from pyspark.sql.functions import col, concat_ws, length, when, lit, array_join, size, coalesce, row_number
from utils.nlp_pipeline import get_nlp_pipeline, clean_and_prepare_features
from utils.spark_utils import get_spark_session, atlas_uri
from utils.ml_models import get_lda_topics
from pyspark.sql.window import Window
from pyspark.sql import functions as fun
import sys

# --- CHOICE 0: EXACT GROUND TRUTH (Cosine Similarity) ---
def compute_ground_truth(df, spark_context):
  from pyspark.ml.feature import Normalizer
  from pyspark.mllib.linalg.distributed import IndexedRow, IndexedRowMatrix
  
  # 1. Normalize Vectors (L2) - Critical for Cosine Similarity
  # Cosine Sim is just Dot Product of L2-normalized vectors.
  normalizer = Normalizer(inputCol="features", outputCol="norm_features", p=2.0)
  norm_df = normalizer.transform(df)
  
  # 2. Create Distributed Matrix
  # Map (unique_id, vector)
  rdd_vectors = norm_df.select("course_id", "norm_features").rdd \
    .zipWithUniqueId() \
    .map(lambda x: IndexedRow(x[1], x[0]["norm_features"]))

  mat = IndexedRowMatrix(rdd_vectors)
  
  # 3. Compute A * A^T (All-pairs similarity)
  print("Computing A * A^T (This uses BlockMatrix multiplication)...")
  sim_mat = mat.toBlockMatrix().multiply(mat.toBlockMatrix().transpose())
  
  # 4. Extract Matches
  # Filter > 0.2 to remove noise.
  matches_rdd = sim_mat.toCoordinateMatrix().entries \
    .filter(lambda x: x.value > 0.25 and x.i != x.j)
    
  # 5. Map Indices back to Course IDs
  index_map = norm_df.select("course_id", "title").rdd \
    .zipWithUniqueId() \
    .map(lambda x: (x[1], x[0])) \
    .collectAsMap()
    
  bd_map = spark_context.broadcast(index_map)
  
  def map_back(entry):
    row_a = bd_map.value[entry.i]
    row_b = bd_map.value[entry.j]
    # Return: ID_A, ID_B, Score
    return (row_a["course_id"], row_b["course_id"], float(entry.value))

  return df.sparkSession.createDataFrame(matches_rdd.map(map_back), ["id_a", "id_b", "score"])

def exact_knn(ground_truth):
  # Sort DESCENDING because 'score' is similarity (Higher = Better)
  window_spec = Window.partitionBy("id_a").orderBy(fun.col("score").desc())

  knn_tfidf_df = ground_truth \
      .withColumn("rank", fun.row_number().over(window_spec)) \
      .filter(fun.col("rank") <= 5) \
      .select("id_a", "id_b", "score", "rank")
  return knn_tfidf_df

def run_scenario_exact_knn(vectorized_df, spark_context):
  gt_results = compute_ground_truth(vectorized_df, spark_context)
  knn_tfidf_df = exact_knn(gt_results)
  return knn_tfidf_df

# --- CHOICE 1: APPROXIMATE KNN (MinHash LSH) ---
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
  
  # Sort ASCENDING because 'distance' (Lower = Better)
  window_spec = Window.partitionBy("id_a").orderBy(fun.col("distance").asc())

  lsh_knn_results = flattened_lsh \
    .withColumn("rank", fun.row_number().over(window_spec)) \
    .filter(fun.col("rank") <= 5)
  
  return lsh_knn_results

# --- CHOICE 2: THEMATIC KNN (LDA + LSH) ---
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

  # Sort ASCENDING because 'distance' (Lower = Better)
  window_spec = Window.partitionBy("id_a").orderBy(col("distance").asc())
  return recommendations.withColumn("rank", fun.row_number().over(window_spec)).filter(col("rank") <= k)

# --- CHOICE 3: HYBRID ---
def run_hybrid_scenario(vectorized_df, cv_model, k=5, num_topics=38, weights=(0.6, 0.4)):
  tfidf_sim = run_scenario_approx_knn(vectorized_df, k=k, bottom_threshold=0.01, top_threshold=0.4)
  
  lda_sim = run_scenario_lda_knn(vectorized_df, cv_model, k=k, upper_threshold=0.2, num_topics=num_topics)
  
  hybrid_sim = tfidf_sim.alias("tfidf").join(
    lda_sim.alias("lda"), 
    (col("tfidf.id_a") == col("lda.id_a")) & (col("tfidf.id_b") == col("lda.id_b")),
    how="outer"
  )

  final_hybrid = hybrid_sim.select(
    coalesce(col("tfidf.id_a"), col("lda.id_a")).alias("id_a"),
    coalesce(col("tfidf.id_b"), col("lda.id_b")).alias("id_b"),
    (
      (coalesce(col("tfidf.distance"), lit(1.0)) * weights[0]) +
      (coalesce(col("lda.distance"), lit(1.0)) * weights[1])
    ).alias("distance")
  )
  
  # Sort ASCENDING because it's a weighted DISTANCE (Lower = Better)
  window_spec = Window.partitionBy("id_a").orderBy(col("distance").asc())
  return final_hybrid.withColumn("rank", row_number().over(window_spec)).filter(col("rank") <= 5)

# --- EXPORT UTIL ---
def export_recommendations_to_mongodv(df, collection_name="course_recommendations"):
  """Explicitly writes to Atlas, bypassing session defaults."""
    
  df.cache() 
  count = df.count()
  print(f"DEBUG: Attempting to write {count} rows to {collection_name}...")

  if count == 0:
    print("ABORT: DataFrame is empty. Check your similarity thresholds!")
    return

  target_uri = atlas_uri.replace("/?", f"/test?") 

  # Handle both "score" (Exact) and "distance" (LSH/Hybrid)
  # If 'score' exists, use it. If not, map 'distance' to 'score'.
  if "score" in df.columns:
      final_df = df.select(
        col("id_a").alias("source_course_id"),
        col("id_b").alias("recommended_course_id"),
        col("score"),
        col("rank")
      )
  else:
      final_df = df.select(
        col("id_a").alias("source_course_id"),
        col("id_b").alias("recommended_course_id"),
        col("distance").alias("score"),
        col("rank")
      )

  final_df.write \
    .format("mongodb") \
    .mode("overwrite") \
    .option("connection.uri", target_uri) \
    .option("database", "test") \
    .option("collection", collection_name) \
    .save()

  print("SUCCESS: Exported recommendations to Atlas test database.")

# --- MAIN EXECUTION ---
spark = get_spark_session()
sc = spark.sparkContext

# READ
raw_df = spark.read.format("mongodb")\
  .option("database", "test") \
  .option("collection", "courses") \
  .load().repartition(12)
  
raw_df.persist()
print(f"Total rows in raw_df: {raw_df.count()}")

# CLEAN
cleaned_df = raw_df.select(
  col("_id").alias("course_id"),
  col("title"),
  col("description"),
  col("keywords"),
  concat_ws(" ", 
    col("title"), col("title"), col("title"), col("title"), col("title"), # 5x Title Boost
    when(col("description") != "No description available", col("description"))
    .otherwise(lit("")),
    array_join(col("keywords"), " "),
  ).alias("text_content")
)

# NLP
nlp_pipeline = get_nlp_pipeline(cleaned_df)
nlp_model = nlp_pipeline.fit(cleaned_df)  
processed_df = nlp_model.transform(cleaned_df)

processed_df = processed_df.filter(size(col("tokens")) >= 35)
tokens_df = processed_df.select("course_id", "title", col("tokens").alias("tokens")) 
  
# VECTORIZE
vectorized_df, cv_model = clean_and_prepare_features(tokens_df)
print(f"DF Rows: {vectorized_df.count()}")

# SELECT SCENARIO
try:
  choice = int(sys.argv[1])
except (IndexError, ValueError):
  print("Usage: spark-submit recommender.py [0|1|2|3]")
  print("0: Exact Cosine (Best Quality)")
  print("1: Fast LSH (Jaccard)")
  print("2: Thematic (LDA)")
  print("3: Hybrid")
  sys.exit(1)

recommendations = None

if choice == 0:
  print("Running Scenario A: Exact TF-IDF (Ground Truth)...")
  # Pass SC here
  recommendations = run_scenario_exact_knn(vectorized_df, sc)
elif choice == 1:
  print("Running Scenario B: Fast TF-IDF (MinHash LSH)...")
  recommendations = run_scenario_approx_knn(vectorized_df, k=5, bottom_threshold=0.01, top_threshold=0.4)
elif choice == 2:
  print("Running Scenario C: Thematic LDA (BRP LSH)...")
  recommendations = run_scenario_lda_knn(vectorized_df, cv_model, k=5, num_topics=15)
elif choice == 3:
  print("Running Scenario D: Hybrid...")
  recommendations = run_hybrid_scenario(vectorized_df, cv_model, k=5, num_topics=20)

# OUTPUT
if recommendations is not None:
  print(f"Total recommendations generated: {recommendations.count()}")
  recommendations.show(20, truncate=False)
  export_recommendations_to_mongodv(recommendations, collection_name="course_recommendations")
else:
  print("Invalid choice selected.")
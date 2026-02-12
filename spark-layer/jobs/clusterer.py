from pyspark.sql.functions import col, concat_ws, length, when, lit, array_join, size, struct, trim
import random
from pyspark.ml.clustering import LDA
from utils.nlp_pipeline import get_nlp_pipeline, clean_and_prepare_features
from utils.spark_utils import get_spark_session, atlas_uri
from utils.ml_models import get_lda_topics
import random


def random_search_lda(vectorized_df, num_trials=10):
  results = []
    
  # Define the search space
  k_range = range(5, 40)
  max_iter_range = [50, 100, 150, 200]
  optimizer_options = ["online"]

  for i in range(num_trials):
    # Pick random parameters
    k = random.choice(k_range)
    max_iter = random.choice(max_iter_range)
    opt = random.choice(optimizer_options)
        
    print(f"Trial {i+1}: Testing k={k}, maxIter={max_iter}, opt={opt}")
       
    lda = LDA(k=k, maxIter=max_iter, optimizer=opt, seed=42)
    model = lda.fit(vectorized_df)
        
    perplexity = model.logPerplexity(vectorized_df)
    results.append({"k": k, "max_iter": max_iter, "optimizer": opt, "perplexity": perplexity})

  # Sort results by lowest perplexity
  best_params = sorted(results, key=lambda x: x['perplexity'])[0]
  print(f"\nWINNER: {best_params}")
  return best_params

def update_courses_with_clusterIds(lda_df):
  course_clusters = lda_df.select(
    col("course_id").alias("externalId"),
    col("topic_index").alias("cluster_id"),
    col("topic_label").alias("cluster_label")
  )
  
  course_clusters.printSchema()
  
  target_uri = atlas_uri.replace("/?", f"/test?")
  
  print(f'Writting {course_clusters.count()} into Database...')
  course_clusters.write \
    .format("mongodb") \
    .mode("append") \
    .option("connection.uri", target_uri) \
    .option("database", "test") \
    .option("collection", "courses") \
    .option("idFieldList", "externalId") \
    .option("operationType", "update") \
    .option("upsertDocument", "false") \
    .save()
    
  print("SUCCESS: Cluster IDs updated.")
    
spark = get_spark_session()

raw_data = spark.read.format("mongodb")\
  .option("database", "test") \
  .option("collection", "courses") \
  .load().repartition(12)
  
print("Data read")
  
cleaned_df = raw_data.select(
  col("externalId").alias("course_id"),
  col("title"),
  col("description"),
  col("keywords"),
  concat_ws(" ", 
    col("title"), col("title"), col("title"), 
    when(col("description") != "No description available", col("description"))
    .otherwise(lit("")),
    array_join(col("keywords"), " "), array_join(col("keywords"), " "), array_join(col("keywords"), " ")
  ).alias("text_content")
)

nlp_pipeline = get_nlp_pipeline(cleaned_df)
nlp_model = nlp_pipeline.fit(cleaned_df)
processed_df = nlp_model.transform(cleaned_df)

# processed_df = processed_df.filter(size(col("tokens")) >= 35)

tokens_df = processed_df.select("course_id", "title", "tokens")

vectorized_df, cv_model = clean_and_prepare_features(tokens_df)
print(f"DF Rows: {vectorized_df.count()}")
    
clusters = get_lda_topics(vectorized_df, cv_model, num_topics=15, max_iter=200)
clusters.describe().show()
print(f"Total clusters generated: {clusters.count()}")
clusters.show(20, truncate=True)

update_courses_with_clusterIds(clusters)
from pyspark.sql import SparkSession
from pyspark.sql.functions import col, concat_ws, length, when, lit
from pyspark.ml.feature import HashingTF, IDF, Tokenizer

atlas_uri = "mongodb+srv://admin:1234@cluster0.mtbfxhi.mongodb.net/?appName=Cluster0"

spark = SparkSession.builder \
  .appName("CourseSimilarityJob") \
  .config("spark.driver.memory", "10g") \
  .config("spark.executor.memory", "6g") \
  .config("spark.network.timeout", "1200s") \
  .config("spark.executor.heartbeatInterval", "100s") \
  .config("spark.rpc.message.maxSize", "1024") \
  .config("spark.mongodb.read.connection.uri", atlas_uri) \
  .config("spark.mongodb.read.database", "test") \
  .config("spark.mongodb.read.collection", "courses") \
  .config("spark.cleaner.referenceTracking.cleanCheckpoints", "true") \
  .config("spark.jars.packages", 
    "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0,"
    "com.johnsnowlabs.nlp:spark-nlp_2.12:5.5.1") \
  .config("spark.driver.host", "127.0.0.1") \
  .config("spark.driver.bindAddress", "127.0.0.1") \
  .config("spark.kryoserializer.buffer.max", "2000M") \
  .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
  .getOrCreate()
  
raw_df = spark.read.format("mongodb")\
  .option("database", "test") \
  .option("collection", "courses") \
  .load()

print(f"Total rows in raw_df: {raw_df.count()}")
raw_df.show(5)

# clean the data
cleaned_df = raw_df.select(
  col("_id").cast("string").alias("course_id"),
  col("title"),
  col("description"),
  concat_ws(" ", 
    col("title"), 
    when(col("description") != "No description available", col("description"))
    .otherwise(lit(""))
  ).alias("text_content")
)

print(f"Rows remaining after robust filter: {cleaned_df.count()}")
cleaned_df.show(5)


# spark nlp pipeline
from sparknlp.base import DocumentAssembler, Finisher
from sparknlp.annotator import (Stemmer, 
                                Tokenizer, Normalizer,
                                StopWordsCleaner)

# this is the documents
document_assembler = DocumentAssembler() \
  .setInputCol("text_content") \
  .setOutputCol("document") \
  .setCleanupMode("shrink")
document_assembler.transform(cleaned_df).select("document")

# these are the annotators
# split to tokens
tokenizer = Tokenizer() \
  .setInputCols(["document"]) \
  .setOutputCol("token")
  
# clean unwanted characters and grabvrage
normalizer = Normalizer() \
  .setInputCols(["token"]) \
  .setOutputCol("normalized") \
  .setLowercase(True)

# remove stopwords 
stopwords_cleaner = StopWordsCleaner() \
  .setInputCols(["normalized"]) \
  .setOutputCol("cleaned_tokens") \
  .setCaseSensitive(False)
  
# stem the words to bring them to the root form
stemmer = Stemmer() \
  .setInputCols(["cleaned_tokens"]) \
  .setOutputCol("stem")
  
# convert the stemmed tokens back to token array 
finisher = Finisher() \
  .setInputCols(["stem"]) \
  .setOutputCols(["tokens"]) \
  .setOutputAsArray(True) \
  .setCleanAnnotations(False)
    
from pyspark.ml import Pipeline

nlp_pipeline = Pipeline(stages=[
  document_assembler,
  tokenizer,
  normalizer,
  stopwords_cleaner,
  stemmer,
  finisher
])

nlp_model = nlp_pipeline.fit(cleaned_df)
processed_df = nlp_model.transform(cleaned_df)

tokens_df = processed_df.select("course_id", "title", "tokens")

from pyspark.ml.feature import CountVectorizer, IDF
from pyspark.sql import functions as fun
from pyspark.sql.window import Window

def clean_and_prepare_features(processed_df):
  """Filters empty tokens and prepares TF-IDF vectors."""
  # filter out 0 size token arrays to avoid issues in lsh
  valid_tokens_df = processed_df.filter(fun.size(fun.col("tokens")) > 0)
    
  cv = CountVectorizer(inputCol="tokens", outputCol="raw_features")
  cv_model = cv.fit(valid_tokens_df)
  vectorized_tokens = cv_model.transform(valid_tokens_df)

  idf = IDF(inputCol="raw_features", outputCol="features")
  idf_model = idf.fit(vectorized_tokens)
  final_vectorized_df = idf_model.transform(vectorized_tokens).drop("raw_features")
    
  return final_vectorized_df, cv_model

def get_lda_topics(vectorized_df, cv_model, num_topics=5):
  # LDA has poor performance with small datasets, especially when there is high topic overlap and text is short liek here. with extensive course descriptions it would perform better.
  from pyspark.ml.clustering import LDA 
  
  max_iter = 50

  lda = LDA(k=num_topics, maxIter=max_iter, featuresCol="features")
  lda_model = lda.fit(vectorized_df)
  vectorized_df.persist()

  # the lower the perplexity, the better the model is at predicting the sample
  lp = lda_model.logPerplexity(vectorized_df)
  print(f"Log Perplexity upper bound: {lp}")

  vocab = cv_model.vocabulary

  raw_topics = lda_model.describeTopics().collect()

  topic_inds = [ind.termIndices for ind in raw_topics]

  topics = []
  for topic in topic_inds:
    _topic = []
    for ind in topic:
      _topic.append(vocab[ind])
    topics.append(_topic)

  # print("Top terms for each topic:")
  # for i, topic in enumerate(topics, start=1):
  #   print(f"topic {i}: {topic}")

  lda_df = lda_model.transform(vectorized_df)
  lda_df.select(fun.col('title'), fun.col('topicDistribution')).\
    show(2, vertical=True, truncate=False)

  from pyspark.ml.functions import vector_to_array
  from pyspark.sql.functions import expr

  # 1. Convert the vector to an array first (this makes it 'visible' to SQL)
  lda_df = lda_df.withColumn("topic_array", vector_to_array(col("topicDistribution")))

  # 2. Use a SQL expression to find the index of the max value in that array
  # array_position is 1-based in Spark SQL
  lda_df = lda_df.withColumn("topic_index", 
      expr("array_position(topic_array, array_max(topic_array))")
  )

  # 3. Clean up the temporary array column
  lda_df = lda_df.drop("topic_array")

  print("Course titles with their assigned topic index:")
  lda_df.select('title', 'topic_index').show(truncate=False)
  
  return lda_df

# now lets move on to computing similarities between courses based on their topic distributions
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
    distCol="EuclideanDistance"
  ).filter(col("datasetA.course_id") < col("datasetB.course_id"))

  recommendations = similar_pairs_df.select(
    fun.col("datasetA.course_id").alias("id_a"),
    fun.col("datasetA.title").alias("title_a"),
    fun.col("datasetB.course_id").alias("id_b"),
    fun.col("datasetB.title").alias("title_b"),
    fun.col("EuclideanDistance").alias("distance")
  )

  # recommendations.show(5, truncate=False)
  window_spec = Window.partitionBy("id_a").orderBy(col("distance").asc())
  return recommendations.withColumn("rank", fun.row_number().over(window_spec)).filter(col("rank") <= k)
  
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

def run_scenario_approx_knn(vectorized_df, k=5,bottom_threshold=0.01, top_threshold=0.4):
  from pyspark.ml.feature import MinHashLSH
  
  minhash = MinHashLSH(inputCol="features", outputCol="hashes", numHashTables=5)
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

def run_scenario_exact_knn(vectorized_df, k=5):
  gt_results = compute_ground_truth(vectorized_df)
  knn_tfidf_df = exact_knn(gt_results)
  return knn_tfidf_df

def export_to_mongodb(df, collection_name="course_recommendations"):
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

  print("SUCCESS: Check your Atlas 'test' database now.")

vectorized_df, cv_model = clean_and_prepare_features(tokens_df)
print(f"Total rows in vectorized_df: {vectorized_df.count()}")
vectorized_df.show(5)

# Scenario A: Exact TF-IDF (Ground Truth)
# results = run_scenario_exact_knn(vectorized_df)

# Scenario B: Fast TF-IDF (MinHash LSH)
# results = run_scenario_approx_knn(vectorized_df, k=5, bottom_threshold=0.01, top_threshold=0.4)

# Scenario C: Thematic LDA (BRP LSH)
results = run_scenario_lda_knn(vectorized_df, cv_model, k=5, upper_threshold=0.2)

results.show(20, truncate=False)

export_to_mongodb(results, collection_name="course_recommendations")

# write results do mongodb
# recommendations.write \
#     .format("mongodb") \
#     .mode("overwrite") \
#     .option("database", "test") \
#     .option("collection", "ldalsh_course_recommendations") \
#     .save()

# print("Process Complete: LSH recommendations exported to Atlas.")
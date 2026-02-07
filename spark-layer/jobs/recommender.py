from pyspark.sql import SparkSession
from pyspark.sql.functions import col, concat_ws, length, when, lit
from pyspark.ml.feature import HashingTF, IDF, Tokenizer

atlas_uri = "mongodb+srv://admin:1234@cluster0.mtbfxhi.mongodb.net/?appName=Cluster0"

spark = SparkSession.builder \
  .appName("CourseSimilarityJob") \
  .config("spark.mongodb.read.connection.uri", atlas_uri) \
  .config("spark.mongodb.read.database", "test") \
  .config("spark.mongodb.read.collection", "courses") \
  .config("spark.jars.packages", 
    "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0,"
    "com.johnsnowlabs.nlp:spark-nlp_2.12:5.5.1") \
  .config("spark.driver.host", "127.0.0.1") \
  .config("spark.driver.bindAddress", "127.0.0.1") \
  .config("spark.driver.memory", "4g") \
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
from sparknlp.annotator import (Lemmatizer, Stemmer, 
                                Tokenizer, Normalizer,
                                StopWordsCleaner)
from sparknlp.pretrained import PretrainedPipeline

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

tokens_df = processed_df.select("course_id", "tokens")

from pyspark.ml.feature import CountVectorizer, IDF
from pyspark.sql import functions as fun

cv = CountVectorizer(inputCol="tokens", outputCol="raw_features")
cv_model = cv.fit(tokens_df)
vectorized_tokens = cv_model.transform(tokens_df)

idf = IDF(inputCol="raw_features", outputCol="features")
idf_model = idf.fit(vectorized_tokens)
vectorized_df = idf_model.transform(vectorized_tokens)

vectorized_df = vectorized_df.drop(fun.col('raw_features'))

print(f"Total rows in vectorized_df: {vectorized_df.count()}")
vectorized_df.show(5)

from pyspark.ml.clustering import LDA 
 
num_topics = 5
max_iter = 50

lda = LDA(k=num_topics, maxIter=max_iter, featuresCol="features")
lda_model = lda.fit(vectorized_df)

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

print("Top terms for each topic:")
for i, topic in enumerate(topics, start=1):
  print(f"topic {i}: {topic}")

lda_df = lda_model.transform(vectorized_df)
lda_df.select(fun.col('title'), fun.col('topicDistribution')).\
  show(2, vertical=True, truncate=False)

from pyspark.ml.types import IntergerType
from pyspark.sql.functions import udf

max_index = fun.udf(lambda x: x.toList().index(max(x)) + 1, IntegerType())
lda_df = lda_df.withColumn("topic_index", max_index(fun.col("topicDistribution")))
print("Course titles with their assigned topic index:")
lda_df.select('title', 'topic_index').show(10, truncate=False)

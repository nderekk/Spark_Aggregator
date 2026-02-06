from pyspark.sql import SparkSession
from pyspark.sql.functions import col, concat_ws, length, when, lit
from pyspark.ml.feature import HashingTF, IDF, Tokenizer

atlas_uri = "mongodb+srv://admin:1234@cluster0.mtbfxhi.mongodb.net/?appName=Cluster0"

spark = SparkSession.builder \
  .appName("CourseSimilarityJob") \
  .config("spark.mongodb.read.connection.uri", atlas_uri) \
  .config("spark.mongodb.read.database", "test") \
  .config("spark.mongodb.read.collection", "courses") \
  .config("spark.jars.packages", "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0") \
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
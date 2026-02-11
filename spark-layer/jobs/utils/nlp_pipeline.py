# spark nlp pipeline
from sparknlp.base import DocumentAssembler, Finisher
from sparknlp.annotator import (Stemmer, LemmatizerModel,
                                Tokenizer, Normalizer,
                                StopWordsCleaner)
from pyspark.ml.feature import NGram
from pyspark.ml import Pipeline


def get_nlp_pipeline(cleaned_df):

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

  extra_stopwords = [
      "course", "courses", "introduction",
      "student", "students",
      "learn", "learning",
      "overview",
  ]

  stopwords_cleaner = StopWordsCleaner() \
    .setInputCols(["normalized"]) \
    .setOutputCol("cleaned_tokens") \
    .setCaseSensitive(False)
    
  stopwords_cleaner.setStopWords(
    stopwords_cleaner.getStopWords() + extra_stopwords
  )
    
  # stem the words to bring them to the root form
  # stemmer = Stemmer() \
  #   .setInputCols(["cleaned_tokens"]) \
  #   .setOutputCol("stem")

  lemmatizer = LemmatizerModel.pretrained()  \
    .setInputCols(["cleaned_tokens"]) \
    .setOutputCol("lemmatized_tokens") \
      
  # convert the stemmed tokens back to token array 
  finisher = Finisher() \
    .setInputCols(["lemmatized_tokens"]) \
    .setOutputCols(["tokens"]) \
    .setOutputAsArray(True) \
    .setCleanAnnotations(False)
    
  # bigram = NGram(n=2, inputCol="tokens", outputCol="bigrams")
  nlp_pipeline = Pipeline(stages=[
    document_assembler,
    tokenizer,
    normalizer,
    stopwords_cleaner,
    lemmatizer,
    # stemmer,
    finisher,
    # bigram
  ])
  
  return nlp_pipeline

from pyspark.ml.feature import CountVectorizer, IDF
from pyspark.sql import functions as fun
from pyspark.ml.functions import vector_to_array
from pyspark.sql.functions import col, expr


def clean_and_prepare_features(processed_df):
  """Filters empty tokens and prepares TF-IDF vectors."""
  # filter out 0 size token arrays to avoid issues in lsh
  valid_tokens_df = processed_df.filter(fun.size(fun.col("tokens")) > 0)
    
  cv = CountVectorizer(inputCol="tokens", outputCol="raw_features", minDF=10, maxDF=0.6, vocabSize=20000)
  cv_model = cv.fit(valid_tokens_df)
  vectorized_tokens = cv_model.transform(valid_tokens_df)

  idf = IDF(inputCol="raw_features", outputCol="features")
  idf_model = idf.fit(vectorized_tokens)
  
# 3. CRITICAL: Filter out courses that became "empty" vectors after TF-IDF
  # We use vector_to_array to check if there are any non-zero values
  final_vectorized_df = idf_model.transform(vectorized_tokens) \
    .withColumn("vector_array", vector_to_array(col("features"))) \
    .filter(expr("exists(vector_array, x -> x > 0)")) \
    .drop("vector_array", "raw_features")
    
  return final_vectorized_df, cv_model
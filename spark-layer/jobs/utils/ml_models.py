from pyspark.ml.clustering import LDA
from pyspark.sql.functions import col, concat_ws, length, when, lit, array_join, size
from pyspark.sql import functions as fun


def get_lda_topics(vectorized_df, cv_model, num_topics=38, max_iter=200):
  # LDA has poor performance with small datasets, especially when there is high topic overlap and text is short liek here. with extensive course descriptions it would perform better.

  lda = LDA(k=num_topics, maxIter=max_iter, featuresCol="features", optimizer='online')
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
  # lda_df.select(fun.col('title'), fun.col('topicDistribution')).\
  #   show(2, vertical=True, truncate=False)

  from pyspark.ml.functions import vector_to_array
  from pyspark.sql.functions import expr, create_map
  from itertools import chain


  # 1. Convert the vector to an array first (this makes it 'visible' to SQL)
  lda_df = lda_df.withColumn("topic_array", vector_to_array(col("topicDistribution")))

  # 2. Use a SQL expression to find the index of the max value in that array
  # array_position is 1-based in Spark SQL
  lda_df = lda_df.withColumn("topic_index", 
    expr("array_position(topic_array, array_max(topic_array))")
  )

  # 1. Create a dictionary mapping: Topic Index -> Top 3 Words
  # 'topics' is your list of words for each topic index
  mapping = {i + 1: ", ".join(words[:3]).title() for i, words in enumerate(topics)}

  # 2. Convert that dictionary into a Spark Map expression
  # This avoids a join and is extremely fast for small metadata like this
  mapping_expr = create_map([lit(x) for x in chain(*mapping.items())])

  # 3. Apply the label in ONE SINGLE STEP (no loop!)
  lda_df = lda_df.withColumn("topic_label", mapping_expr[col("topic_index")])

  # Optional: Handle any missing labels (if topic_index is null/invalid)
  lda_df = lda_df.fillna({"topic_label": "General"})
    
  # 3. Clean up the temporary array column
  lda_df = lda_df.drop("topic_array")

  print("Course titles with their assigned topic index:")
  lda_df.select('title', 'topic_index', 'topic_label').show(truncate=False)
  
  return lda_df
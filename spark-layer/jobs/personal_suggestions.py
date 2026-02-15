from pyspark.sql.functions import col, explode, lit, collect_list, struct, row_number, desc
from pyspark.sql.window import Window  # Added Window for re-ranking
from pyspark.ml.recommendation import ALS
from pyspark.ml.feature import StringIndexer, IndexToString
from pyspark.ml import Pipeline
from utils.spark_utils import get_spark_session, atlas_uri

def run_als_recommender():
    spark = get_spark_session()
    
    # We load the 'Users' collection in order to access favoriteCourses
    users_df = spark.read.format("mongodb") \
        .option("database", "aggregator_db") \
        .option("collection", "users") \
        .load()

    # Data Preparation: 'Explode' each table so we map UserIDs to CourseIDs
    # We rate each favorite course with 1.0
    ratings_df = users_df.select(
        col("_id").cast("string").alias("userStrId"),
        explode(col("favoriteCourses")).alias("courseStrId")
    ).withColumn("rating", lit(1.0)).distinct()
    
    print(f"Total user-course interactions found: {ratings_df.count()}")

    if ratings_df.count() == 0:
        print("No favorites found. Exiting.")
        return

    # ALS requires numeric IDs, so we do the convertion to UserIDs and CourseIDs
    user_indexer = StringIndexer(inputCol="userStrId", outputCol="userIndex")
    course_indexer = StringIndexer(inputCol="courseStrId", outputCol="courseIndex")
    
    # We build the pipeline for convertion
    pipeline = Pipeline(stages=[user_indexer, course_indexer])
    indexer_model = pipeline.fit(ratings_df)
    indexed_df = indexer_model.transform(ratings_df)

    # We train our DataFrame (after processing) and train it with ALS
    als = ALS(
        maxIter=10, 
        regParam=0.1, 
        userCol="userIndex", 
        itemCol="courseIndex", 
        ratingCol="rating",
        implicitPrefs=True,
        coldStartStrategy="drop"
    )
    model = als.fit(indexed_df)

    # generate MORE than 10 (e.g., 20) initially.
    user_recs = model.recommendForAllUsers(20)

    # Array 'explosion' of user_recs
    new_user_recs = user_recs.select(
        col("userIndex"), 
        explode(col("recommendations")).alias("rec_struct")
    ).select(
        col("userIndex"),
        col("rec_struct.courseIndex").alias("courseIndex"),
        col("rec_struct.rating").alias("score")
    )

    # remove "Already Seen" items (Anti-Join)
    # 'left_anti' keeps only rows in new_user_recs that DO NOT exist in indexed_df.
    clean_recs = new_user_recs.join(
        indexed_df.select("userIndex", "courseIndex"), 
        on=["userIndex", "courseIndex"], 
        how="left_anti"
    )

    # Convert back to String
    user_converter = IndexToString(inputCol="userIndex", outputCol="userId", labels=indexer_model.stages[0].labels)
    course_converter = IndexToString(inputCol="courseIndex", outputCol="courseId", labels=indexer_model.stages[1].labels)

    # Apply conversion from Index to String
    converted_users = user_converter.transform(clean_recs)
    final_recs_flat = course_converter.transform(converted_users)

    # re-Rank and Limit to Top 10
    # Because joins can shuffle data, we must re-sort by score to ensure we keep the best ones.
    windowSpec = Window.partitionBy("userId").orderBy(col("score").desc())

    final_top_10 = final_recs_flat \
        .withColumn("rank", row_number().over(windowSpec)) \
        .filter(col("rank") <= 10)

    # Form the fields of the table before exporting back to the database
    final_output = final_top_10.groupBy("userId") \
        .agg(collect_list("courseId").alias("recommendedCourseIds"))

    print("Sample Recommendations:")
    final_output.show(5, truncate=False)

    # Export back to database in a new table 'user_recommendations'
    target_uri = atlas_uri.replace("/?", f"/aggregator_db?")
    
    final_output.write \
        .format("mongodb") \
        .mode("overwrite") \
        .option("connection.uri", target_uri) \
        .option("database", "aggregator_db") \
        .option("collection", "user_recommendations") \
        .save()
        
    print("SUCCESS: Personalized recommendations exported to 'user_recommendations'.")

if __name__ == "__main__":
    run_als_recommender()
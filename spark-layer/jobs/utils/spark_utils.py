from pyspark.sql import SparkSession

atlas_uri = "mongodb+srv://admin:1234@cluster0.mtbfxhi.mongodb.net/?appName=Cluster0"


def get_spark_session():
  return SparkSession.builder \
    .appName("CourseSimilarityJob") \
    .config("spark.driver.memory", "10g") \
    .config("spark.executor.memory", "6g") \
    .config("spark.network.timeout", "1200s") \
    .config("spark.executor.heartbeatInterval", "100s") \
    .config("spark.rpc.message.maxSize", "1024") \
    .config("spark.mongodb.read.connection.uri", atlas_uri) \
    .config("spark.mongodb.read.heartbeat.frequency.ms", "10000") \
    .config("spark.mongodb.write.heartbeat.frequency.ms", "10000") \
    .config("spark.mongodb.read.maxConnectionIdleTimeMS", "10000") \
    .config("spark.mongodb.read.database", "test") \
    .config("spark.mongodb.read.collection", "courses") \
    .config("spark.jars.packages", 
      "org.mongodb.spark:mongo-spark-connector_2.12:10.3.0,"
      "com.johnsnowlabs.nlp:spark-nlp_2.12:5.5.1,"
      "com.github.fommil.netlib:all:1.1.2" # <--- Add this for BLAS/ARPACK support
      ) \
    .config("spark.driver.host", "127.0.0.1") \
    .config("spark.driver.bindAddress", "127.0.0.1") \
    .config("spark.kryoserializer.buffer.max", "2000M") \
    .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer") \
    .config("spark.driver.extraJavaOptions", "-Dcom.github.fommil.netlib.BLAS=com.github.fommil.netlib.NativeBLAS -Dcom.github.fommil.netlib.LAPACK=com.github.fommil.netlib.NativeLAPACK -Xss4m") \
    .config("spark.executor.extraJavaOptions", "-Dcom.github.fommil.netlib.BLAS=com.github.fommil.netlib.NativeBLAS -Dcom.github.fommil.netlib.LAPACK=com.github.fommil.netlib.NativeLAPACK -Xss4m") \
    .config("spark.scheduler.listenerbus.eventqueue.capacity", "20000") \
    .config("spark.ui.retainedJobs", "50") \
    .config("spark.ui.retainedStages", "50") \
    .master("local[*]") \
    .getOrCreate()
  

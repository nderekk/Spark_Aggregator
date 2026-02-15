# Spark Course Aggregator & Recommender System

A distributed end-to-end platform for harvesting, analyzing, and recommending online courses. The system utilizes a modern web stack for orchestration and a robust **Apache Spark** layer for large-scale Natural Language Processing (NLP) and machine learning.



---

## Project Overview

This project serves as a horizontal repository and aggregator for educational content. It is designed to ingest data from external APIs and provide intelligent recommendations through various mathematical models.

### Core Technical Pillars

* **Data Ingestion & Orchestration**: A Node.js (Express) backend manages the data lifecycle, from harvesting via external REST APIs to storing raw content in MongoDB.
* **NLP Pipeline**: Powered by **SparkNLP**, the system processes course titles and descriptions through tokenization, normalization, stop-word removal, and lemmatization.
* **Vectorization**: Textual data is converted into numerical representations using **TF-IDF** (Term Frequency-Inverse Document Frequency), utilizing a vocabulary of 20,000 terms.
* **Recommendation Engine**: Implements four distinct scenarios in `recommender.py`:
    * **Exact Cosine Similarity**: The ground truth model using distributed matrix multiplication ($AA^{T}$).
    * **Approximate k-NN (MinHash LSH)**: A scalable Jaccard-based approach for high-speed similarity detection in large datasets.
    * **Thematic Recommender (LDA + LSH)**: Uses Latent Dirichlet Allocation to recommend courses based on latent topics.
    * **Hybrid Model**: A weighted ensemble (60% TF-IDF / 40% LDA) for balanced lexical and semantic relevance.
* **Topic-Based Clustering**: Uses **LDA** for soft clustering, allowing courses to belong to multiple thematic mixtures. These clusters are then used for "Semantic Boosting" of the recommendation scores.



---

## System Architecture

The project follows a **Triggered Batch Architecture**. While designed for horizontal scalability, the current implementation allows an Administrator to trigger harvesting and Spark processing jobs on-demand via a dedicated dashboard.

### Technology Stack
* **Frontend**: React.
* **Backend**: Node.js, Express.
* **Distributed Computing**: Apache Spark (PySpark), SparkNLP.
* **Database**: MongoDB.
* **Containerization**: Docker & Docker Compose.

---

## Installation & Setup

The entire environment is containerized to ensure consistency across different operating systems.

### Prerequisites
* Docker and Docker Compose installed.

### Step-by-Step Instructions

1. **Configure Environment Variables**
   ```bash
   git clone [https://github.com/your-username/spark-aggregator.git](https://github.com/your-username/spark-aggregator.git)
   cd spark-aggregator

2. **Clone the Repository**

3. **Build and Launch Containers**
  docker-compose up --build

4. **Access the Application**
  * **Frontend**: http://localhost:5000
  * **Backend API**: http://localhost:3000

## Usage Guide

1. **Harvesting**: Navigate to the Admin Dashboard and select an API source to populate MongoDB with raw course data. 
2. **Clustering**: Execute the LDA job to generate thematic categories for the harvested courses. 
3. **Recommendations**: Choose a recommendation scenario (e.g., Hybrid) to generate the top-5 most similar courses for every entry in the database. 

## Key Challenges Addressed

* **Environment Stability**: Migrated the development environment from native Windows to WSL (Ubuntu) to resolve critical socket communication errors between the Spark Driver and Executors. 
* **Data Integrity**: Developed custom handling for MongoDB ObjectIds to ensure compatibility with Spark’s StructType representations. 
* **Library Compatibility**: Resolved version mismatches between `pyspark.ml` and `pyspark.mllib` by implementing RDD-level vector conversion mechanisms. 
* **Semantic Consistency**: Implemented Feature Boosting by injecting LDA cluster labels into the text content, artificially increasing Term Frequency (TF) for thematic terms to align recommendations with course topics. 
## Contributors

* **Nikolaos Derekenaris** (1100529) - 4th Year, CEID University of Patras.
* **Argyrios Kefalonitis** (1100579) - 4th Year, CEID University of Patras.
* **Evangelos Mitrogiannis** (1100626) - 4th Year, CEID University of Patras.
* **Christos Marios Nikolopoulos** (100644) - 4th Year, CEID University of Patras. 

---

**University of Patras** **Department of Computer Engineering and Informatics** **Course**: Decentralized Data Technologies & Algorithms, Winter Semester 2025-26. 

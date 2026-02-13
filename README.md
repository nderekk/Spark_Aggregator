# Spark Course Aggregator & Recommender System

[cite_start]A distributed end-to-end platform for harvesting, analyzing, and recommending online courses[cite: 244]. [cite_start]The system utilizes a modern web stack for orchestration and a robust **Apache Spark** layer for large-scale Natural Language Processing (NLP) and machine learning[cite: 247, 250].



---

## Project Overview

[cite_start]This project serves as a horizontal repository and aggregator for educational content[cite: 244, 245]. [cite_start]It is designed to ingest data from external APIs and provide intelligent recommendations through various mathematical models[cite: 28, 88].

### Core Technical Pillars

* [cite_start]**Data Ingestion & Orchestration**: A Node.js (Express) backend manages the data lifecycle, from harvesting via external REST APIs to storing raw content in MongoDB[cite: 23, 24, 29, 248].
* [cite_start]**NLP Pipeline**: Powered by **SparkNLP**, the system processes course titles and descriptions through tokenization, normalization, stop-word removal, and lemmatization[cite: 30, 41, 42, 43, 46].
* [cite_start]**Vectorization**: Textual data is converted into numerical representations using **TF-IDF** (Term Frequency-Inverse Document Frequency), utilizing a vocabulary of 20,000 terms[cite: 31, 50, 77].
* [cite_start]**Recommendation Engine**: Implements four distinct scenarios in `recommender.py`[cite: 88]:
    * [cite_start]**Exact Cosine Similarity**: The ground truth model using distributed matrix multiplication ($AA^{T}$)[cite: 89, 91, 99].
    * [cite_start]**Approximate k-NN (MinHash LSH)**: A scalable Jaccard-based approach for high-speed similarity detection in large datasets[cite: 102, 104, 108].
    * [cite_start]**Thematic Recommender (LDA + LSH)**: Uses Latent Dirichlet Allocation to recommend courses based on latent topics[cite: 124, 127].
    * [cite_start]**Hybrid Model**: A weighted ensemble (60% TF-IDF / 40% LDA) for balanced lexical and semantic relevance[cite: 141, 148].
* [cite_start]**Topic-Based Clustering**: Uses **LDA** for soft clustering, allowing courses to belong to multiple thematic mixtures[cite: 33, 168, 169, 172, 173]. [cite_start]These clusters are then used for "Semantic Boosting" of the recommendation scores[cite: 186, 191].



---

## System Architecture

[cite_start]The project follows a **Triggered Batch Architecture**[cite: 230]. [cite_start]While designed for horizontal scalability, the current implementation allows an Administrator to trigger harvesting and Spark processing jobs on-demand via a dedicated dashboard[cite: 231, 235, 257].

### Technology Stack
* [cite_start]**Frontend**: React[cite: 22, 256].
* [cite_start]**Backend**: Node.js, Express[cite: 23, 248].
* [cite_start]**Distributed Computing**: Apache Spark (PySpark), SparkNLP[cite: 25, 41, 250].
* [cite_start]**Database**: MongoDB[cite: 29, 35].
* **Containerization**: Docker & Docker Compose.

---

## Installation & Setup

The entire environment is containerized to ensure consistency across different operating systems.

### Prerequisites
* Docker and Docker Compose installed.
* A `.env` file configured in the `backend/` directory (refer to `.env.example`).

### Step-by-Step Instructions

1. **Configure Environment Variables**
   ```bash
   git clone [https://github.com/your-username/spark-aggregator.git](https://github.com/your-username/spark-aggregator.git)
   cd spark-aggregator

2. **Clone the Repository**
Create a .env file in the backend/ folder:
  * Use the provided .env.example as a template
  * Ensure MONGO_URI is set to:
  * MONGO_URI=mongodb://mongo:27017/aggregator_db

3. **Build and Launch Containers**
  docker-compose up --build

4. **Access the Application**
  * **Frontend**: http://localhost:5000
  * **Backend API**: http://localhost:3000

## Usage Guide

1. [cite_start]**Harvesting**: Navigate to the Admin Dashboard and select an API source to populate MongoDB with raw course data. [cite: 18, 230, 233]
2. [cite_start]**Clustering**: Execute the LDA job to generate thematic categories for the harvested courses. [cite: 18, 169, 235]
3. [cite_start]**Recommendations**: Choose a recommendation scenario (e.g., Hybrid) to generate the top-5 most similar courses for every entry in the database. [cite: 18, 141, 161]

## Key Challenges Addressed

* [cite_start]**Environment Stability**: Migrated the development environment from native Windows to WSL (Ubuntu) to resolve critical socket communication errors between the Spark Driver and Executors. [cite: 18, 198, 199, 201]
* [cite_start]**Data Integrity**: Developed custom handling for MongoDB ObjectIds to ensure compatibility with Spark’s StructType representations. [cite: 18, 204, 205, 206]
* [cite_start]**Library Compatibility**: Resolved version mismatches between `pyspark.ml` and `pyspark.mllib` by implementing RDD-level vector conversion mechanisms. [cite: 18, 208, 211, 212]
* [cite_start]**Semantic Consistency**: Implemented Feature Boosting by injecting LDA cluster labels into the text content, artificially increasing Term Frequency (TF) for thematic terms to align recommendations with course topics. [cite: 18, 186, 189, 190, 191]

## Contributors

* [cite_start]**Nikolaos Derekenaris** (1100529) - 4th Year, CEID University of Patras. [cite: 8, 9]
* [cite_start]**Argyrios Kefalonitis** (1100579) - 4th Year, CEID University of Patras. [cite: 9]
* [cite_start]**Evangelos Mitrogiannis** (1100626) - 4th Year, CEID University of Patras. [cite: 10]
* [cite_start]**Christos Marios Nikolopoulos** (100644) - 4th Year, CEID University of Patras. [cite: 11, 12]

---

[cite_start]**University of Patras** **Department of Computer Engineering and Informatics** **Course**: Decentralized Data Technologies & Algorithms, Winter Semester 2025-26. [cite: 13, 14, 15]

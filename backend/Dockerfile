FROM python:3.11-slim-bookworm

RUN apt-get update && \
  apt-get install -y openjdk-17-jre-headless procps curl gnupg && \
  rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH
ENV PYSPARK_PYTHON=python3

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN mkdir /spark-layer

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
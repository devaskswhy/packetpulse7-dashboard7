FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Explicitly install scikit-learn
RUN pip install --no-cache-dir scikit-learn

# Copy source code
COPY src/ ./src/
COPY main.py .
COPY models/ ./models/
COPY ../db/ ./db/

# Create non-root user
RUN useradd -m -u 1000 detectuser

# Change ownership
RUN chown -R detectuser:detectuser /app

# Switch to non-root user
USER detectuser

# Environment variables
ENV PYTHONPATH=/app
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:9092
ENV KAFKA_TOPIC_PROCESSED=processed_packets
ENV KAFKA_TOPIC_ALERTS=alerts
ENV REDIS_URL=redis://redis:6379/0
ENV MODEL_PATH=./models
ENV HEALTH_PORT=8003

# Command
CMD ["python", "main.py"]

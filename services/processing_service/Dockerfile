FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY src/ ./src/
COPY main.py .
COPY ../db/ ./db/

# Create non-root user
RUN useradd -m -u 1000 procuser

# Change ownership
RUN chown -R procuser:procuser /app

# Switch to non-root user
USER procuser

# Environment variables
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:9092
ENV KAFKA_TOPIC_PROCESSED=processed_packets
ENV KAFKA_TOPIC_RAW=raw_packets
ENV REDIS_URL=redis://redis:6379/0
ENV HEALTH_PORT=8002
ENV PYTHONPATH=/app

# Command
CMD ["python", "main.py"]

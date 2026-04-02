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
RUN useradd -m -u 1000 apiuser

# Change ownership
RUN chown -R apiuser:apiuser /app

# Switch to non-root user
USER apiuser

# Environment variables
ENV PYTHONPATH=/app
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:9092
ENV REDIS_URL=redis://redis:6379/0
ENV POSTGRES_URL=postgresql+asyncpg://pp:pp_secret@postgres/packetpulse
ENV ADMIN_SECRET=change_me
ENV API_KEY=dev_key_12345
ENV HEALTH_PORT=8001

# Command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]

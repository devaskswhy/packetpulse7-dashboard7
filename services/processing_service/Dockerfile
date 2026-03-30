FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y librdkafka-dev gcc && rm -rf /var/lib/apt/lists/*

COPY services/processing_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/processing_service/ .
COPY services/db/ ./db/

ENV KAFKA_BOOTSTRAP_SERVERS="kafka:29092"
ENV HEALTH_PORT="8002"
ENV PYTHONPATH=/app

CMD ["python", "main.py"]

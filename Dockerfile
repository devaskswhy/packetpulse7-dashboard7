FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY services/api_gateway/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/api_gateway/ ./
COPY services/db/ ./db/

ENV PYTHONPATH=/app

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

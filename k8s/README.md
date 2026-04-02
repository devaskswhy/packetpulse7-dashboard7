# Kubernetes Deployment Guide

## Prerequisites

1. **Minikube Setup**
   ```bash
   minikube start --cpus=4 --memory=8g
   ```

2. **Docker Environment**
   ```bash
   eval $(minikube docker-env)
   ```

3. **Build Docker Images**
   Build each image with the exact name referenced in deployments:
   ```bash
   # From project root
   docker build -t packetpulse/packet-service:latest ./services/packet_service
   docker build -t packetpulse/processing-service:latest ./services/processing_service
   docker build -t packetpulse/detection-service:latest ./services/detection_service
   docker build -t packetpulse/api-gateway:latest ./services/api_gateway
   docker build -t packetpulse/dashboard:latest ./dashboard
   ```

4. **Setup Secrets**
   ```bash
   cp k8s/secrets.yaml k8s/secrets-local.yaml
   # Edit secrets-local.yaml with your actual base64-encoded values
   # Example: echo -n "your_secret_value" | base64
   ```

## Deployment

1. **Apply Namespace and Config**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmap.yaml
   kubectl apply -f k8s/secrets-local.yaml
   ```

2. **Apply Infrastructure Services**
   ```bash
   kubectl apply -f k8s/kafka/
   kubectl apply -f k8s/redis/
   kubectl apply -f k8s/postgres/
   ```

3. **Wait for Infrastructure**
   ```bash
   # Wait for all infrastructure pods to be ready
   kubectl wait --for=condition=ready pod -l app=zookeeper -n packetpulse --timeout=300s
   kubectl wait --for=condition=ready pod -l app=kafka -n packetpulse --timeout=300s
   kubectl wait --for=condition=ready pod -l app=redis -n packetpulse --timeout=300s
   kubectl wait --for=condition=ready pod -l app=postgres -n packetpulse --timeout=300s
   ```

4. **Initialize Kafka Topics**
   ```bash
   # Run kafka-init job (similar to docker-compose)
   kubectl run kafka-init --image=confluentinc/cp-kafka:7.6.0 --rm -i --tty --restart=Never \
     --env="BROKER=kafka-service:9092" \
     -n packetpulse -- \
     bash -c "
       kafka-topics --bootstrap-server \$BROKER --create --if-not-exists --topic raw_packets --partitions 4 --replication-factor 1
       kafka-topics --bootstrap-server \$BROKER --create --if-not-exists --topic processed_packets --partitions 4 --replication-factor 1
       kafka-topics --bootstrap-server \$BROKER --create --if-not-exists --topic alerts --partitions 2 --replication-factor 1
       kafka-topics --bootstrap-server \$BROKER --create --if-not-exists --topic flow_stats --partitions 1 --replication-factor 1
     "
   ```

5. **Apply Application Services**
   ```bash
   kubectl apply -f k8s/services/
   kubectl apply -f k8s/dashboard/
   ```

## Access Services

1. **Enable LoadBalancer Access**
   ```bash
   minikube tunnel
   ```

2. **Add Host Entry**
   ```bash
   # Add to /etc/hosts (or C:\Windows\System32\drivers\etc\hosts on Windows)
   echo "127.0.0.1 packetpulse.local" | sudo tee -a /etc/hosts
   ```

3. **Access URLs**
   - Dashboard: http://packetpulse.local
   - API Gateway: http://packetpulse.local/api
   - API Docs: http://packetpulse.local/api/docs

## Monitoring

1. **Check Pod Status**
   ```bash
   kubectl get pods -n packetpulse
   kubectl get services -n packetpulse
   kubectl get ingress -n packetpulse
   ```

2. **View Logs**
   ```bash
   kubectl logs -f deployment/packet-service -n packetpulse
   kubectl logs -f deployment/processing-service -n packetpulse
   kubectl logs -f deployment/detection-service -n packetpulse
   kubectl logs -f deployment/api-gateway -n packetpulse
   kubectl logs -f deployment/dashboard -n packetpulse
   ```

3. **Scale Services**
   ```bash
   # Manual scaling
   kubectl scale deployment processing-service --replicas=5 -n packetpulse
   
   # Check HPA status
   kubectl get hpa -n packetpulse
   ```

## Cleanup

```bash
kubectl delete namespace packetpulse
minikube stop
```

## Service Port Map

| Service            | Internal Port | Health Endpoint        |
|--------------------|--------------|------------------------|
| packet_service     | 8001         | http://localhost:8001/health |
| processing_service | 8002         | http://localhost:8002/health |
| detection_service  | 8003         | http://localhost:8003/health |
| api_gateway        | 8000         | http://localhost:8000/health |
| dashboard          | 80           | http://localhost/health |
| Kafka              | 9092         | —                      |
| Redis              | 6379         | —                      |
| PostgreSQL         | 5432         | —                      |

## Kafka Topic Map

| Topic              | Producer           | Consumer(s)                      |
|--------------------|--------------------|----------------------------------|
| raw_packets        | packet_service     | processing_service               |
| processed_packets  | processing_service | detection_service, api_gateway   |
| alerts             | detection_service  | api_gateway                      |
| flow_stats         | processing_service | api_gateway                      |

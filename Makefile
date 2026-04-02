# PacketPulse DPI System - Docker Convenience Commands

.PHONY: up down logs reset clean help

# Start all services
up:
	@echo "🚀 Starting PacketPulse DPI System..."
	docker compose up --build -d
	@echo "✅ Services started. Dashboard: http://localhost:3000"
	@echo "📊 API Gateway: http://localhost:8000"
	@echo "📋 View logs with: make logs"

# Stop all services
down:
	@echo "🛑 Stopping PacketPulse DPI System..."
	docker compose down
	@echo "✅ Services stopped."

# View logs
logs:
	docker compose logs -f

# Reset system (remove volumes and rebuild)
reset:
	@echo "🔄 Resetting PacketPulse DPI System..."
	docker compose down -v
	docker compose up --build -d
	@echo "✅ System reset complete."

# Clean up (remove containers, images, volumes)
clean:
	@echo "🧹 Cleaning up Docker resources..."
	docker compose down -v --rmi all
	docker system prune -f
	@echo "✅ Cleanup complete."

# Show service status
status:
	@echo "📊 Service Status:"
	docker compose ps

# Access service shells
shell-api:
	docker compose exec api_gateway bash

shell-db:
	docker compose exec postgres psql -U pp -d packetpulse

shell-redis:
	docker compose exec redis redis-cli

# View specific service logs
logs-api:
	docker compose logs -f api_gateway

logs-db:
	docker compose logs -f postgres

logs-kafka:
	docker compose logs -f kafka

logs-dashboard:
	docker compose logs -f dashboard

# Help
help:
	@echo "PacketPulse DPI System - Available Commands:"
	@echo ""
	@echo "  make up      - Start all services"
	@echo "  make down    - Stop all services"
	@echo "  make logs    - View all logs"
	@echo "  make reset   - Reset system (remove volumes and rebuild)"
	@echo "  make clean   - Clean up Docker resources"
	@echo "  make status  - Show service status"
	@echo ""
	@echo "Service Shells:"
	@echo "  make shell-api   - Access API Gateway shell"
	@echo "  make shell-db    - Access PostgreSQL shell"
	@echo "  make shell-redis - Access Redis shell"
	@echo ""
	@echo "Service Logs:"
	@echo "  make logs-api     - API Gateway logs"
	@echo "  make logs-db      - PostgreSQL logs"
	@echo "  make logs-kafka   - Kafka logs"
	@echo "  make logs-dashboard - Dashboard logs"

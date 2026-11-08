#!/bin/bash
set -e

echo "Invoice Anomaly Desk - Deployment Script"
echo "=========================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found"
    echo "Please create .env from .env.example and fill in values"
    exit 1
fi

# Load environment
source .env

# Validate required variables
required_vars=("VULTR_INFERENCE_API_KEY" "ADMIN_TOKEN" "MONGO_ROOT_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set in .env"
        exit 1
    fi
done

echo "✓ Environment validated"

# Pull latest code (if using git)
if [ -d .git ]; then
    echo "Pulling latest code..."
    git pull
    echo "✓ Code updated"
fi

# Build and start services
echo "Building Docker images..."
docker-compose build

echo "Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Check health
echo "Checking API health..."
health_response=$(curl -s http://localhost:3000/api/health || echo "{\"ok\":false}")
if echo "$health_response" | grep -q '"ok":true'; then
    echo "✓ API is healthy"
else
    echo "⚠ API health check failed"
    docker-compose logs backend
fi

echo ""
echo "Deployment complete!"
echo "===================="
echo "API: http://localhost:3000/api/health"
echo "Logs: docker-compose logs -f"
echo "Stop: docker-compose down"

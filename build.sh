#!/bin/bash
# build.sh
# Script to build and start the Social Network application using Docker Compose.

set -e

echo "============================================"
echo "  Editorial Pulse - Social Network"
echo "  Building and starting Docker containers..."
echo "============================================"

# Clean up any existing containers
echo "[1/3] Cleaning up existing containers..."
docker-compose down --remove-orphans 2>/dev/null || true

# Build and start containers
echo "[2/3] Building images and starting containers..."
docker-compose up --build -d

# Wait for containers to be ready
echo "[3/3] Waiting for services to be ready..."
sleep 5

# Verify containers are running
echo ""
echo "============================================"
echo "  Container Status:"
echo "============================================"
docker ps --filter "name=social-network" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "============================================"
echo "  Application is running!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8080"
echo "============================================"
echo ""
echo "  Useful commands:"
echo "    View logs:  docker-compose logs -f"
echo "    Stop:       docker-compose down"
echo "    Restart:    docker-compose restart"
echo "============================================"
#!/bin/bash
# RsuShop Deployment Script

set -e

echo "🚀 Starting RsuShop deployment..."

# Build Docker images
echo "📦 Building Docker images..."
docker-compose build

# Start services
echo "▶️ Starting services..."
docker-compose up -d

# Wait for MongoDB
echo "⏳ Waiting for MongoDB..."
until docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null; do
  sleep 2
done

# Wait for Redis
echo "⏳ Waiting for Redis..."
until docker-compose exec -T redis redis-cli ping &>/dev/null; do
  sleep 2
done

# Check API health
echo "🏥 Checking API health..."
sleep 5
for i in {1..10}; do
  if curl -sf http://localhost:3001/api/v1/health > /dev/null; then
    echo "✅ API is healthy!"
    break
  fi
  echo "⏳ Waiting for API... ($i/10)"
  sleep 3
done

# Show status
echo ""
echo "📊 Deployment Status:"
docker-compose ps

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set up your domain DNS to point to this server"
echo "2. Configure SSL certificates in docker/ssl/"
echo "3. Update environment variables in .env"
echo "4. Create your Meta app and configure permissions"
echo "5. Set up Stripe products and webhooks"

#!/bin/bash

set -e

echo "🚀 Reputation Buddy - Quick Start Deployment"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose found${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    HMAC_SECRET=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-20)
    
    cat > .env << EOF
# Generated on $(date)
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
HMAC_SECRET=${HMAC_SECRET}

# ⚠️ REQUIRED: Add your API keys below
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_PRICE_ID_LITE=price_lite_id
STRIPE_PRICE_ID_PRO=price_pro_id
STRIPE_PRICE_ID_MAX=price_max_id

OPENAI_API_KEY=sk-your_openai_key_here
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here

TWILIO_ACCOUNT_SID=AC_your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

GOOGLE_PLACES_API_KEY=your_google_places_key

# Deployment URLs
CLIENT_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
    
    echo -e "${GREEN}✅ Created .env file with random secrets${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env and add your API keys before proceeding${NC}"
    echo ""
    read -p "Press Enter after you've added your API keys to .env..."
fi

# Validate that API keys are set
echo "🔍 Validating environment configuration..."
source .env

missing_keys=()

if [[ $STRIPE_SECRET_KEY == *"your_key"* ]]; then
    missing_keys+=("STRIPE_SECRET_KEY")
fi

if [[ $OPENAI_API_KEY == *"your_"* ]]; then
    missing_keys+=("OPENAI_API_KEY")
fi

if [[ $ANTHROPIC_API_KEY == *"your_"* ]]; then
    missing_keys+=("ANTHROPIC_API_KEY")
fi

if [ ${#missing_keys[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required API keys: ${missing_keys[*]}${NC}"
    echo "Please edit .env and add the required keys."
    exit 1
fi

echo -e "${GREEN}✅ Environment configuration validated${NC}"
echo ""

# Build and start services
echo "🏗️  Building Docker images..."
docker-compose build

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
echo "🏥 Checking service health..."

if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services are running!${NC}"
else
    echo -e "${RED}❌ Some services failed to start. Check logs with: docker-compose logs${NC}"
    exit 1
fi

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "Services are available at:"
echo "  📱 Frontend:    http://localhost:3000"
echo "  🔧 Backend API: http://localhost:3001"
echo "  🗄️  PostgreSQL:  localhost:5432"
echo "  💾 Redis:       localhost:6379"
echo ""
echo "Useful commands:"
echo "  📊 View logs:        docker-compose logs -f"
echo "  🛑 Stop services:    docker-compose down"
echo "  🔄 Restart:          docker-compose restart"
echo "  📈 Check status:     docker-compose ps"
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Register a new account (use test card: 4242 4242 4242 4242)"
echo "  3. Configure your business location and sources"
echo "  4. Watch reviews come in!"
echo ""
echo -e "${YELLOW}⚠️  For production deployment, see README.md${NC}"
echo ""

# Reputation Buddy SaaS - Production Deployment Guide

## 🚀 Overview

Reputation Buddy is a fully automated, AI-powered reputation management SaaS platform that:
- Discovers review sources globally based on GPS, industry & language
- Monitors reviews & mentions 24/7 across platforms
- Analyzes sentiment, risk & virality using AI
- Generates legally-safe, brand-aligned responses
- Delivers WhatsApp-first actionable alerts
- Tracks ROI via revenue protection metrics
- Automates billing with Stripe

## 📋 System Requirements

- Node.js 18+ (LTS recommended)
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (recommended)
- Domain with SSL (for production)

## 🏗️ Architecture

```
Backend (Node.js/Express + TypeScript)
├── REST API with JWT authentication
├── Prisma ORM + PostgreSQL multi-tenant DB
├── BullMQ job queues for background tasks
├── Playwright for web scraping
├── OpenAI/Anthropic for NLP & reply generation
├── Twilio for WhatsApp notifications
└── Stripe for payment processing

Frontend (Next.js + React + Tailwind)
├── Progressive Web App (PWA)
├── Dark mode support
├── Responsive mobile-first design
├── Real-time notifications
└── Offline-capable

Infrastructure
├── Docker Compose orchestration
├── PostgreSQL for data persistence
├── Redis for caching & queues
└── Nginx reverse proxy (production)
```

## 🔧 Environment Setup

### 1. Clone and Configure

```bash
cd /home/claude/reputation-buddy

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Required API Keys

Edit `backend/.env` with your keys:

```env
# Database
DATABASE_URL="postgresql://reputationbuddy:yourpassword@localhost:5432/reputation_buddy"

# Security
JWT_SECRET="generate-a-random-64-char-string"
HMAC_SECRET="generate-another-random-string"

# Stripe (get from stripe.com/dashboard)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_LITE="price_..."
STRIPE_PRICE_ID_PRO="price_..."
STRIPE_PRICE_ID_MAX="price_..."

# AI/LLM
OPENAI_API_KEY="sk-..." # openai.com
ANTHROPIC_API_KEY="sk-ant-..." # console.anthropic.com

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID="AC..." # twilio.com/console
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Google Places
GOOGLE_PLACES_API_KEY="..." # console.cloud.google.com

# Optional: Sentry for error tracking
SENTRY_DSN="https://...@sentry.io/..."

# S3 Storage (AWS S3 or MinIO)
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="us-east-1"
S3_BUCKET="reputation-buddy-evidence"
S3_ACCESS_KEY="..."
S3_SECRET_KEY="..."
```

### 3. Stripe Setup

1. Create Stripe account at stripe.com
2. Create products:
   - **Lite Plan**: $29/month, 3 locations
   - **Pro Plan**: $79/month, 10 locations
   - **Max Plan**: $199/month, unlimited locations
3. Copy Price IDs to .env
4. Configure webhook endpoint: `https://yourdomain.com/api/webhooks/stripe`
5. Select events: `customer.subscription.*`, `invoice.payment_*`

### 4. Twilio WhatsApp Setup

1. Sign up at twilio.com
2. Enable WhatsApp Business API
3. Verify your WhatsApp Business number
4. Copy SID and Auth Token to .env

## 🐳 Deployment Methods

### Option A: Docker Compose (Recommended)

```bash
# Create .env file for Docker Compose
cat > .env << EOF
DB_PASSWORD=yourSecurePassword123
JWT_SECRET=your-jwt-secret
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
GOOGLE_PLACES_API_KEY=...
CLIENT_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
EOF

# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Database migrations will run automatically
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Option B: Manual Deployment

#### Backend

```bash
cd backend

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Build TypeScript
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start dist/server.js --name reputation-buddy-api
pm2 start dist/worker.js --name reputation-buddy-worker
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start

# Or use PM2
pm2 start npm --name reputation-buddy-web -- start
```

## 🔐 Security Checklist

- [ ] Strong JWT_SECRET (64+ characters)
- [ ] HTTPS/SSL certificate configured
- [ ] Database credentials secured
- [ ] Stripe webhook signing verified
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Helmet.js security headers active
- [ ] Environment variables NOT committed to git
- [ ] Regular security updates scheduled

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# API health
curl http://localhost:3001/health

# Database connection
docker exec reputation-buddy-db pg_isready

# Redis status
docker exec reputation-buddy-redis redis-cli ping
```

### Logs

```bash
# Application logs
docker-compose logs -f backend

# Worker logs
docker-compose logs -f worker

# Database logs
docker-compose logs -f postgres
```

### Database Backups

```bash
# Backup
docker exec reputation-buddy-db pg_dump -U reputationbuddy reputation_buddy > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i reputation-buddy-db psql -U reputationbuddy reputation_buddy < backup_20231215.sql
```

## 🧪 Testing

### API Testing

```bash
# Register new tenant
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "businessName": "Test Restaurant",
    "industry": "restaurant",
    "country": "Malaysia",
    "city": "Kuala Lumpur",
    "plan": "PRO",
    "paymentMethodId": "pm_card_visa"
  }'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

## 📱 PWA Features

The frontend is a fully-functional Progressive Web App:
- Install on mobile home screen
- Offline functionality
- Push notifications
- App-like experience
- Fast loading with service workers

## 🌍 Multi-Language Support

Currently supports:
- English (EN)
- Malay (MS)
- Chinese (ZH)

Add more languages in `frontend/i18n/`.

## 🎯 Performance Optimization

- **Backend**: Node.js cluster mode, Redis caching, database indexing
- **Frontend**: Next.js SSR/SSG, image optimization, code splitting
- **Database**: Connection pooling, query optimization, proper indexing
- **Queue**: BullMQ job prioritization and rate limiting

## 🐛 Troubleshooting

### Issue: Playwright browser not found

```bash
# Install Chromium
npx playwright install chromium
```

### Issue: Database migration fails

```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or create new migration
npx prisma migrate dev --name init
```

### Issue: WhatsApp messages not sending

- Verify Twilio credentials
- Check WhatsApp number is verified
- Ensure phone numbers include country code with +
- Check Twilio console for error logs

### Issue: Stripe webhooks not working

- Verify webhook secret in .env
- Test webhook endpoint locally: `stripe listen --forward-to localhost:3001/api/webhooks/stripe`
- Check webhook logs in Stripe dashboard

## 📦 Production Deployment

### Recommended Stack

- **Hosting**: AWS EC2, DigitalOcean, or GCP Compute Engine
- **Database**: AWS RDS PostgreSQL or managed PostgreSQL
- **Redis**: AWS ElastiCache or managed Redis
- **CDN**: CloudFlare
- **SSL**: Let's Encrypt via Certbot
- **Reverse Proxy**: Nginx
- **Process Manager**: PM2 or Docker Swarm
- **CI/CD**: GitHub Actions or GitLab CI

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔄 Updates & Maintenance

```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Run new migrations
docker exec reputation-buddy-api npx prisma migrate deploy
```

## 📈 Scaling

### Horizontal Scaling

- Deploy multiple backend instances behind load balancer
- Use Redis for session management
- Database read replicas for analytics queries
- Queue workers can be scaled independently

### Vertical Scaling

- Increase PostgreSQL connection pool size
- Add more Redis memory
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`

## 💰 Cost Estimates (Monthly)

**Small Deployment (<100 tenants)**:
- Server: $20-40 (2GB RAM, 2 vCPU)
- Database: $15-25 (managed)
- Redis: $10-15 (managed)
- APIs: $50-100 (OpenAI, Twilio, etc.)
- **Total**: ~$95-180/month

**Medium Deployment (100-1000 tenants)**:
- Server: $80-120 (8GB RAM, 4 vCPU)
- Database: $50-100 (managed with backups)
- Redis: $20-30 (managed)
- APIs: $200-500
- **Total**: ~$350-750/month

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review Sentry error tracking
3. Check database connections
4. Verify API keys and credentials

## 🚦 Status Monitoring

Recommended monitoring tools:
- **Uptime**: UptimeRobot or Pingdom
- **Performance**: New Relic or Datadog
- **Errors**: Sentry
- **Logs**: LogDNA or Papertrail

## 🎉 Launch Checklist

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Stripe products and webhooks configured
- [ ] SSL certificate installed
- [ ] Domain DNS configured
- [ ] Monitoring tools setup
- [ ] Backup strategy implemented
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Documentation updated
- [ ] Support channels ready

---

**Version**: 1.0.0  
**Last Updated**: November 2024  
**License**: Proprietary  
**Contact**: support@reputationbuddy.com

# REPUTATION BUDDY - SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Web App    │    │  Mobile App  │    │   WhatsApp   │              │
│  │  (Next.js)   │    │    (PWA)     │    │   Alerts     │              │
│  │  Port 3000   │    │              │    │   (Twilio)   │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                    │                       │
│         └───────────────────┴────────────────────┘                       │
│                             │                                            │
└─────────────────────────────┼────────────────────────────────────────────┘
                              │
                              │ HTTPS / JWT
                              │
┌─────────────────────────────┼────────────────────────────────────────────┐
│                        API GATEWAY                                       │
├─────────────────────────────┼────────────────────────────────────────────┤
│                             ▼                                            │
│  ┌────────────────────────────────────────────────────────────┐         │
│  │           Express.js REST API (Port 3001)                   │         │
│  │  • JWT Authentication                                       │         │
│  │  • Rate Limiting (100 req/15min)                           │         │
│  │  • Input Validation (Zod)                                  │         │
│  │  • Helmet.js Security                                      │         │
│  │  • CORS Protection                                         │         │
│  └─────────┬──────────────────────────────────────────────────┘         │
│            │                                                              │
└────────────┼──────────────────────────────────────────────────────────────┘
             │
             ├──────────────────┬─────────────────┬─────────────────┐
             │                  │                 │                 │
             ▼                  ▼                 ▼                 ▼
┌─────────────────────┐ ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│   AUTH ROUTES       │ │   MENTION    │ │   PAYMENT   │ │   WEBHOOK   │
│  /api/auth/*        │ │   ROUTES     │ │   ROUTES    │ │   ROUTES    │
│  • Register         │ │ /api/mentions│ │ /api/tenants│ │ /api/webhooks│
│  • Login            │ │ /api/replies │ │ /api/billing│ │  • Stripe   │
│  • JWT Refresh      │ │ /api/vouchers│ │             │ │             │
└──────────┬──────────┘ └──────┬───────┘ └──────┬──────┘ └──────┬──────┘
           │                   │                │                │
           │                   │                │                │
┌──────────┴───────────────────┴────────────────┴────────────────┴────────┐
│                          SERVICE LAYER                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │  StripeService  │  │   AIService     │  │ WhatsAppService │         │
│  │  • createCustomer│ │  • analyzeMention│ │  • sendAlert    │         │
│  │  • subscription  │  │  • generateReply│ │  • sendSummary  │         │
│  │  • webhook       │  │  • detectViral  │  │                 │         │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│           │                    │                     │                   │
│  ┌────────┴────────┐  ┌────────┴────────┐           │                   │
│  │DiscoveryService │  │ ScrapingService │           │                   │
│  │ • findSources   │  │ • Playwright    │           │                   │
│  │ • GooglePlaces  │  │ • Multi-platform│           │                   │
│  └─────────────────┘  └─────────────────┘           │                   │
└───────────────────────────────────────────────────────┼───────────────────┘
                                                        │
┌───────────────────────────────────────────────────────┼───────────────────┐
│                      EXTERNAL APIS                    │                   │
├───────────────────────────────────────────────────────┼───────────────────┤
│                                                       │                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│  ┌──────────┐    │
│  │  Stripe  │ │  OpenAI  │ │Anthropic │ │  Twilio  ││  │  Google  │    │
│  │ Payment  │ │   GPT-4  │ │  Claude  │ │ WhatsApp ││  │  Places  │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘│  └──────────┘    │
│                                                       │                   │
└───────────────────────────────────────────────────────┴───────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKGROUND WORKERS                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │ Scraping Worker  │   │ Analysis Worker  │   │Notification Worker│   │
│  │ • Google scraper │   │ • AI analysis    │   │ • WhatsApp send  │   │
│  │ • Yelp scraper   │   │ • Reply gen      │   │ • Email send     │   │
│  │ • FB scraper     │   │ • Risk scoring   │   │ • Daily summary  │   │
│  │ Concurrency: 5   │   │ Concurrency: 10  │   │ Concurrency: 20  │   │
│  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘   │
│           │                      │                       │              │
│           └──────────────────────┴───────────────────────┘              │
│                                  │                                      │
│                                  ▼                                      │
│                     ┌────────────────────────┐                         │
│                     │    BullMQ Queues       │                         │
│                     │  • scraping-queue      │                         │
│                     │  • analysis-queue      │                         │
│                     │  • notification-queue  │                         │
│                     └────────────┬───────────┘                         │
│                                  │                                      │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌───────────────────────────────┐     ┌──────────────────────────┐    │
│  │       PostgreSQL 15           │     │       Redis 7            │    │
│  │  • Multi-tenant isolation     │     │  • Job queues            │    │
│  │  • 12 core tables             │     │  • Session cache         │    │
│  │  • Audit logs                 │     │  • Rate limiting         │    │
│  │  • Full-text search           │     │  • Pub/sub               │    │
│  │  Port: 5432                   │     │  Port: 6379              │    │
│  │                               │     │                          │    │
│  │  Tables:                      │     └──────────────────────────┘    │
│  │  • Tenant                     │                                      │
│  │  • User                       │                                      │
│  │  • Subscription               │                                      │
│  │  • Location                   │                                      │
│  │  • SourceAccount              │                                      │
│  │  • Mention                    │                                      │
│  │  • Reply                      │                                      │
│  │  • Voucher                    │                                      │
│  │  • Evidence                   │                                      │
│  │  • Report                     │                                      │
│  │  • AuditLog                   │                                      │
│  └───────────────────────────────┘                                      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       SCRAPING TARGETS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Platforms (14 total):                                                   │
│  ✅ Google My Business    ✅ Yelp            ⚙️  Facebook                 │
│  ⚙️  Instagram             ⚙️  TikTok         ⚙️  Twitter/X              │
│  ⚙️  Reddit                ✅ TripAdvisor     ⚙️  GrabFood                │
│  ⚙️  FoodPanda             ⚙️  OpenTable      ⚙️  Trustpilot             │
│  ⚙️  Forums                ⚙️  Other                                     │
│                                                                           │
│  ✅ = Implemented  ⚙️ = Needs platform-specific code                      │
│                                                                           │
│  Scraping Strategy:                                                      │
│  • Playwright headless browser                                          │
│  • Respects robots.txt                                                  │
│  • Platform-specific intervals (6-24h)                                  │
│  • Deduplication via content hash                                       │
│  • 30-90 day backfill on discovery                                      │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       DATA FLOW EXAMPLE                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. USER REGISTERS                                                       │
│     └─> POST /api/auth/register                                         │
│         └─> Create Stripe customer (card-on-file)                       │
│             └─> Create subscription (14-day trial)                      │
│                 └─> Discover review sources (Google Places)             │
│                     └─> Queue scraping jobs                             │
│                                                                           │
│  2. REVIEW DISCOVERED                                                    │
│     └─> Scraping worker runs                                            │
│         └─> Fetch reviews from platform                                 │
│             └─> Deduplicate & save to DB                                │
│                 └─> Queue analysis job                                  │
│                                                                           │
│  3. AI ANALYSIS                                                          │
│     └─> Analysis worker runs                                            │
│         └─> OpenAI: Sentiment + risk scoring                            │
│             └─> Anthropic: Generate 3 reply options                     │
│                 └─> Save to DB                                          │
│                     └─> If risk > 70, queue notification                │
│                                                                           │
│  4. ALERT SENT                                                           │
│     └─> Notification worker runs                                        │
│         └─> Format WhatsApp message                                     │
│             └─> Twilio API send                                         │
│                 └─> User receives alert on phone                        │
│                     └─> Tap link → Opens reply composer                 │
│                                                                           │
│  5. REPLY POSTED                                                         │
│     └─> User approves reply                                             │
│         └─> POST /api/replies/:id/approve                               │
│             └─> Manual post to platform (future: automated)             │
│                 └─> Update status to POSTED                             │
│                     └─> Audit log created                               │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Development:                Production:                                 │
│  ┌─────────────┐            ┌──────────────────┐                       │
│  │   Docker    │            │   Load Balancer  │                        │
│  │  Compose    │            │   (Nginx/HAProxy)│                        │
│  │             │            └────────┬─────────┘                        │
│  │ • API       │                     │                                  │
│  │ • Worker    │            ┌────────┴─────────┐                        │
│  │ • Postgres  │            │                  │                        │
│  │ • Redis     │      ┌─────┴─────┐      ┌────┴──────┐                │
│  │ • Frontend  │      │ API Node  │      │ API Node  │                 │
│  └─────────────┘      │ + Workers │      │ + Workers │                 │
│                       └─────┬─────┘      └────┬──────┘                 │
│                             │                  │                        │
│                       ┌─────┴──────────────────┴─────┐                 │
│                       │                               │                 │
│                  ┌────┴──────┐              ┌────────┴───────┐         │
│                  │ PostgreSQL │              │     Redis      │         │
│                  │ (Managed)  │              │   (Managed)    │         │
│                  └────────────┘              └────────────────┘         │
│                                                                           │
│  Scaling:                                                                │
│  • Horizontal: Add more API nodes behind load balancer                  │
│  • Vertical: Increase DB/Redis resources                                │
│  • Worker: Scale independently based on queue depth                     │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

KEY METRICS & MONITORING:
─────────────────────────
• API Response Time: <2s (p95)
• Scraping Success Rate: >95%
• AI Analysis Accuracy: >90%
• WhatsApp Delivery: >98%
• Uptime: >99.9%
• Error Rate: <1%

SECURITY LAYERS:
───────────────
1. HTTPS/TLS everywhere
2. JWT with expiration
3. Rate limiting per IP
4. Input validation (Zod)
5. SQL injection protection (Prisma)
6. XSS protection (Helmet.js)
7. CORS whitelist
8. Webhook signature verification
9. Audit logging
10. Database encryption at rest

TECH STACK SUMMARY:
──────────────────
Backend: Node.js 18, Express 4, TypeScript 5
Database: PostgreSQL 15, Prisma ORM
Cache/Queue: Redis 7, BullMQ
Frontend: Next.js 14, React 18, Tailwind CSS
Payments: Stripe API v2023
AI/NLP: OpenAI GPT-4, Anthropic Claude 4
Alerts: Twilio WhatsApp Business API
Scraping: Playwright (Chromium)
Discovery: Google Places API
DevOps: Docker, Docker Compose
Monitoring: Sentry, Winston
Testing: Jest, Playwright Test

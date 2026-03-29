# Infrastructure — What You Need to Run 8gent

## Complete Infrastructure Breakdown

This document covers every piece of infrastructure needed to operate 8gent — from day one through scale. Organized by what you need immediately vs. what you add as you grow.

---

## Day 1 Infrastructure (Launch)

### 1. Web Hosting — Frontend Apps

**What:** Platforms A (consumer) and B (contractor) are Next.js apps. They need a hosting platform.

| Service | Provider | Cost | Purpose |
|---------|----------|------|---------|
| Platform A (8gentc.com) | Vercel Pro | $20/month | Consumer web app |
| Platform B (8gent-c.com) | Vercel Pro | $20/month | Contractor web app |
| Admin dashboard | Vercel Pro (same team) | included | Internal ops |

**Why Vercel:** Zero-config Next.js deployment, preview deployments per PR, edge functions, analytics built in. You don't need to manage servers for the frontend.

**When to leave Vercel:** If monthly bill exceeds ~$500/month or you need background workers running longer than 60 seconds on the frontend (unlikely — your background work lives in Platform C).

---

### 2. Backend Servers — Platform C Engine

**What:** Platform C's services (engine API, LLM gateway, agent host) need always-on servers. These are Docker containers running Node.js services.

| Service | Provider | Spec | Cost | Purpose |
|---------|----------|------|------|---------|
| Engine API server | DigitalOcean Droplet | 4 vCPU / 8GB RAM | $48/month | Core orchestration API |
| LLM Gateway server | DigitalOcean Droplet | 2 vCPU / 4GB RAM | $24/month | LLM routing + caching |
| Agent Host server | DigitalOcean Droplet | 4 vCPU / 8GB RAM | $48/month | Runs agent containers |
| Staging server | DigitalOcean Droplet | 2 vCPU / 4GB RAM | $24/month | Staging environment (all services) |

**Total backend hosting: ~$144/month at launch**

**Why DigitalOcean:** Simple, predictable pricing, great API for automation, managed databases available, good enough for first 1,000 users. No Kubernetes overhead.

**Scaling path:** When you need more agent capacity, add more Agent Host droplets. The engine API and LLM gateway can be scaled vertically (bigger droplets) before needing horizontal scaling.

---

### 3. Database

**What:** PostgreSQL for all persistent data — users, notes, agents, tasks, contractors, telemetry, billing.

| Service | Provider | Spec | Cost | Purpose |
|---------|----------|------|------|---------|
| Primary database | DigitalOcean Managed PostgreSQL | 2 vCPU / 4GB RAM / 50GB disk | $60/month | Production database |
| Staging database | DigitalOcean Managed PostgreSQL | 1 vCPU / 1GB RAM / 10GB disk | $15/month | Staging |

**Why managed:** Automatic backups, failover, security patches. You don't want to manage Postgres yourself at this stage.

**Total database: ~$75/month at launch**

---

### 4. Cache + Message Broker

**What:** Redis for caching (LLM response cache, session cache) and pub/sub messaging (agent-to-agent communication, real-time events).

| Service | Provider | Spec | Cost | Purpose |
|---------|----------|------|------|---------|
| Redis | DigitalOcean Managed Redis | 1 vCPU / 2GB RAM | $15/month | Cache + pub/sub |

**Total cache: ~$15/month at launch**

---

### 5. LLM Provider Accounts

**What:** API keys for the LLM providers your gateway routes to. These are your biggest variable cost.

| Provider | Purpose | Pricing |
|----------|---------|---------|
| Anthropic (Claude) | Primary provider — reasoning, coding, content | ~$3-15/M tokens depending on model |
| OpenAI | Secondary provider — fallback, specific use cases | ~$2.50-30/M tokens depending on model |
| Google (Gemini) | Tertiary provider — additional fallback | ~$1.25-5/M tokens |

**You do NOT pay a monthly fee for these.** You pay per token used. Your LLM gateway routes intelligently to minimize cost.

**Estimated LLM cost at launch (100 active users):**
- ~500K tokens/day average across all users
- Blended cost with intelligent routing: ~$5-15/day
- Monthly: ~$150-450/month

**This scales linearly with users.** At 1,000 users: ~$1,500-4,500/month. At 10,000 users: ~$15,000-45,000/month. This is why the LLM gateway's routing intelligence is so critical.

---

### 6. Domain + DNS + SSL

| Service | Provider | Cost | Purpose |
|---------|----------|------|---------|
| 8gentc.com | Already owned | $12/year | Consumer domain |
| 8gent-c.com | Already owned | $12/year | Contractor domain |
| DNS | Cloudflare (free tier) | $0 | DNS management, DDoS protection, SSL |

---

### 7. Auth

| Service | Provider | Cost | Purpose |
|---------|----------|------|---------|
| Authentication | Clerk | $25/month (Pro) | Auth for both platforms |

Clerk Pro covers 10,000 MAU. Scales to $0.02/MAU after that.

---

### 8. Payments

| Service | Provider | Cost | Purpose |
|---------|----------|------|---------|
| Subscription billing | Stripe | 2.9% + $0.30/transaction | Client subscription payments |
| Contractor payouts | Stripe Connect | 0.25% + $0.25/payout | Pay contractors |

No monthly fee. You pay per transaction.

---

### 9. Email

| Service | Provider | Cost | Purpose |
|---------|----------|------|---------|
| Transactional email | Resend | $20/month | Notifications, password resets, digests |

---

### 10. Monitoring + Error Tracking

| Service | Provider | Cost | Purpose |
|---------|----------|------|---------|
| Error tracking | Sentry (Team) | $26/month | Crash reporting across all platforms |
| Uptime monitoring | Better Uptime (free) | $0 | Downtime alerts |
| Analytics | PostHog (free tier) | $0 | User behavior analytics |

---

### 11. CI/CD

| Service | Provider | Cost | Purpose |
|---------|----------|------|---------|
| CI/CD | GitHub Actions | Free (2,000 min/month) | Build, test, deploy pipelines |
| Container registry | GitHub Container Registry | Free | Store Docker images |

---

### 12. File Storage

| Service | Provider | Cost | Purpose |
|---------|----------|------|---------|
| Object storage | DigitalOcean Spaces | $5/month (250GB) | User uploads, deliverables, agent outputs |

---

## Day 1 Total Cost Summary

| Category | Monthly Cost |
|----------|-------------|
| Frontend hosting (Vercel) | $40 |
| Backend servers (DigitalOcean) | $144 |
| Database (managed PostgreSQL) | $75 |
| Cache (managed Redis) | $15 |
| LLM tokens (estimated, 100 users) | $300 |
| Auth (Clerk) | $25 |
| Email (Resend) | $20 |
| Monitoring (Sentry) | $26 |
| File storage (Spaces) | $5 |
| **Total fixed infrastructure** | **$350/month** |
| **Total with LLM costs** | **~$650/month** |

**Your biggest cost is and will always be LLM tokens.** Infrastructure is cheap. Tokens are the variable that determines margin.

---

## Scaling Infrastructure (1,000+ Users)

When you hit ~1,000 active users, you'll likely need:

| Upgrade | From | To | Cost Change |
|---------|------|----|-------------|
| Engine API | 1 × 4vCPU/8GB | 2 × 4vCPU/8GB (load balanced) | +$48/month |
| Agent Host | 1 × 4vCPU/8GB | 3 × 8vCPU/16GB | +$240/month |
| Database | 2vCPU/4GB | 4vCPU/8GB | +$60/month |
| Redis | 1vCPU/2GB | 2vCPU/4GB | +$15/month |
| LLM tokens | ~$300/month | ~$3,000/month | +$2,700/month |

**Scaled total: ~$3,400/month** (mostly LLM tokens)

---

## Scaling Infrastructure (10,000+ Users)

| Upgrade | Spec | Cost |
|---------|------|------|
| Engine API cluster | 4 × 8vCPU/16GB behind load balancer | ~$400/month |
| Agent Host fleet | 10 × 16vCPU/32GB droplets | ~$2,400/month |
| Database | Managed cluster with read replicas | ~$500/month |
| Redis cluster | 3-node cluster | ~$150/month |
| Dedicated LLM gateway | Separate high-memory server | ~$100/month |
| LLM tokens | Bulk pricing + self-hosted for simple tasks | ~$20,000-30,000/month |
| Consider: Kubernetes | Migrate from raw Docker to K8s for orchestration | +ops complexity |
| Consider: Hetzner | Move agent hosting to Hetzner for 40-60% cost reduction | -$1,000/month |

**At 10,000 users, total infra: ~$25,000-35,000/month** (80%+ is LLM tokens)

---

## Infrastructure You Do NOT Need at Launch

Do not buy or set up these things until you have clear demand:

| Thing | Why Not Yet |
|-------|-------------|
| Kubernetes | Overkill under 10 servers. Docker Compose + SSH deploys work fine. |
| AWS/GCP/Azure | Too complex and expensive for a startup. DigitalOcean is 3-5x cheaper at launch scale. |
| Self-hosted LLMs | Only worthwhile when you're spending $10K+/month on API tokens AND have predictable traffic patterns. |
| CDN (beyond Cloudflare free) | Vercel has its own CDN. Cloudflare free tier handles everything else. |
| Dedicated security tools | Design for SOC 2, but don't buy compliance tools until an enterprise client requires certification. |
| Data warehouse | PostgreSQL + materialized views handles analytics at launch scale. Add ClickHouse/BigQuery when you have millions of telemetry events per day. |
| Multiple environments | Staging + production is enough. Skip "dev" and "QA" environments — test locally with Docker. |

---

## Infrastructure Architecture Diagram

```
                    ┌─────────────┐
                    │  Cloudflare  │  DNS + DDoS + SSL
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Vercel   │ │ Vercel   │ │ Vercel   │
        │ consumer │ │contractor│ │  admin   │
        │ 8gentc   │ │ 8gent-c  │ │ internal │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │             │            │
             └──────┬──────┘            │
                    │ HTTPS             │
                    ▼                   ▼
        ┌──────────────────────────────────────┐
        │  DigitalOcean — Platform C            │
        │                                       │
        │  ┌─────────────┐  ┌──────────────┐   │
        │  │ Engine API   │  │ LLM Gateway  │   │
        │  │ (Droplet)    │  │ (Droplet)    │   │
        │  └──────┬───────┘  └──────┬───────┘   │
        │         │                 │            │
        │  ┌──────▼─────────────────▼──────┐    │
        │  │ Agent Host (Droplet)          │    │
        │  │ ┌─────┐ ┌─────┐ ┌─────┐      │    │
        │  │ │Agent│ │Agent│ │Agent│ ...   │    │
        │  │ │cont.│ │cont.│ │cont.│       │    │
        │  │ └─────┘ └─────┘ └─────┘       │    │
        │  └───────────────────────────────┘    │
        │                                       │
        │  ┌──────────────┐  ┌──────────────┐   │
        │  │ Managed      │  │ Managed      │   │
        │  │ PostgreSQL   │  │ Redis        │   │
        │  └──────────────┘  └──────────────┘   │
        │                                       │
        │  ┌──────────────┐                     │
        │  │ DO Spaces    │  Object storage     │
        │  └──────────────┘                     │
        └──────────────────────────────────────┘
                    │
                    │ API calls
                    ▼
        ┌──────────────────────┐
        │  LLM Providers       │
        │  ├─ Anthropic        │
        │  ├─ OpenAI           │
        │  └─ Google           │
        └──────────────────────┘
```

---

## Accounts You Need to Create

Before development begins, set up these accounts:

| Account | URL | Purpose | Free Tier? |
|---------|-----|---------|------------|
| GitHub Organization | github.com | Code hosting, CI/CD, container registry | Yes |
| Vercel | vercel.com | Frontend hosting | Pro: $20/team member |
| DigitalOcean | digitalocean.com | Backend hosting, database, Redis, storage | $200 free credit for new accounts |
| Cloudflare | cloudflare.com | DNS, SSL, DDoS protection | Yes |
| Anthropic | console.anthropic.com | Primary LLM provider | Pay per use |
| OpenAI | platform.openai.com | Secondary LLM provider | Pay per use |
| Google AI | ai.google.dev | Tertiary LLM provider | Free tier available |
| Stripe | stripe.com | Payments (subscriptions + contractor payouts) | Pay per transaction |
| Clerk | clerk.com | Authentication | Free under 10K MAU |
| Sentry | sentry.io | Error tracking | Free tier (5K events/month) |
| Resend | resend.com | Transactional email | Free tier (100 emails/day) |
| PostHog | posthog.com | Product analytics | Free tier (1M events/month) |

---

## Answer: Yes, You Need Backend Servers

To directly answer your question — yes, you absolutely need backend servers regardless of the frontend hosting choice. Here's why:

1. **The LLM Gateway** must be an always-on server. It proxies every AI call, manages caching, enforces budgets, and routes to providers. This can't run on serverless (Vercel functions have 60s timeout, and LLM calls can take 30s+).

2. **The Agent Host** runs Docker containers for user agents. Agents have persistent state, long-running processes, and need to wake on schedules. This requires real servers with Docker.

3. **Background Workers** (understanding engine analysis, scoring pipeline, dispatch, billing aggregation) run continuously or on cron schedules. Serverless is wrong for this — you need always-on processes.

4. **WebSocket Connections** for real-time agent communication and chat streaming need persistent connections. Vercel supports WebSockets but with limitations. A dedicated server is more reliable.

**The split is:**
- **Vercel** = frontend apps (consumer, contractor, admin). These are stateless web apps.
- **DigitalOcean** = everything else (API, gateway, agents, workers, database, cache, storage).

This is the standard modern architecture: CDN-hosted frontend + dedicated backend servers for the heavy lifting.

---

## Environment Variables Template

Create a `.env` file from this template for local development:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/8gent

# Redis
REDIS_URL=redis://localhost:6379

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# LLM Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Connect (contractor payouts)
STRIPE_CONNECT_CLIENT_ID=ca_...

# Email (Resend)
RESEND_API_KEY=re_...

# File Storage (DigitalOcean Spaces)
DO_SPACES_KEY=...
DO_SPACES_SECRET=...
DO_SPACES_BUCKET=8gent-uploads
DO_SPACES_REGION=nyc3
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com

# Sentry
SENTRY_DSN=https://...@sentry.io/...

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# Internal service URLs (local dev)
ENGINE_API_URL=http://localhost:3001
LLM_GATEWAY_URL=http://localhost:3002
AGENT_HOST_URL=http://localhost:3003

# App URLs
NEXT_PUBLIC_CONSUMER_URL=http://localhost:3000
NEXT_PUBLIC_CONTRACTOR_URL=http://localhost:3010
NEXT_PUBLIC_ADMIN_URL=http://localhost:3020
```

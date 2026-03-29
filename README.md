# 8gent

The leading agentic ecosystem provider for individuals and enterprises. The world's largest AI-native contractor fleet.

---

## Repository Structure

```
8gent/
├── README.md                          ← you are here
├── .github/
│   ├── workflows/
│   │   ├── ci-platform-a.yml         ← CI for consumer platform
│   │   ├── ci-platform-b.yml         ← CI for contractor platform
│   │   ├── ci-platform-c.yml         ← CI for engine layer
│   │   ├── ci-packages.yml           ← CI for shared packages
│   │   └── deploy.yml                ← CD pipeline
│   ├── CODEOWNERS                     ← team ownership per directory
│   └── pull_request_template.md
│
├── apps/
│   ├── consumer/                      ← Platform A — 8gentc.com (Next.js)
│   │   ├── src/
│   │   │   ├── app/                   ← Next.js app router pages
│   │   │   ├── components/            ← platform-specific components
│   │   │   ├── hooks/                 ← custom React hooks
│   │   │   ├── lib/                   ← client-side utilities
│   │   │   └── styles/                ← platform-specific styles
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   ├── contractor/                    ← Platform B — 8gent-c.com (Next.js)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── styles/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── admin/                         ← Internal ops dashboard (Next.js)
│       ├── src/
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── services/
│   ├── engine/                        ← Platform C — core orchestration API (Node.js/Fastify)
│   │   ├── src/
│   │   │   ├── routes/                ← API route handlers
│   │   │   │   ├── chat/
│   │   │   │   ├── agents/
│   │   │   │   ├── understanding/
│   │   │   │   ├── metering/
│   │   │   │   ├── tasks/
│   │   │   │   ├── dispatch/
│   │   │   │   └── telemetry/
│   │   │   ├── services/              ← business logic
│   │   │   │   ├── understanding-engine/
│   │   │   │   ├── task-decomposition/
│   │   │   │   ├── dispatch-matching/
│   │   │   │   └── scoring/
│   │   │   ├── workers/               ← background job processors
│   │   │   │   ├── agent-heartbeat.ts
│   │   │   │   ├── understanding-analysis.ts
│   │   │   │   ├── scoring-pipeline.ts
│   │   │   │   ├── billing-aggregation.ts
│   │   │   │   └── dispatch-worker.ts
│   │   │   ├── middleware/
│   │   │   ├── lib/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   ├── llm-gateway/                   ← LLM routing + caching + metering (Node.js)
│   │   ├── src/
│   │   │   ├── router/                ← model routing logic
│   │   │   ├── cache/                 ← semantic cache layer
│   │   │   ├── budget/                ← token budget enforcement
│   │   │   ├── providers/             ← provider adapters (Anthropic, OpenAI, etc.)
│   │   │   ├── metering/              ← per-call metering
│   │   │   └── index.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── agent-host/                    ← Agent container orchestration service
│       ├── src/
│       │   ├── provisioner/           ← container lifecycle management
│       │   ├── health/                ← health monitoring
│       │   ├── scaling/               ← auto-scaling logic
│       │   └── index.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── Dockerfile
│
├── packages/
│   ├── 8gentc/                        ← Forked + rebranded OpenClaw agent runtime
│   │   ├── src/
│   │   │   ├── gateway/               ← WebSocket control plane
│   │   │   ├── agents/                ← agent lifecycle management
│   │   │   ├── skills/                ← skill/plugin system
│   │   │   ├── comms/                 ← agent-to-agent communication
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── swarm/                         ← Forked Overstory multi-agent orchestration
│   │   ├── src/
│   │   │   ├── coordinator/
│   │   │   ├── workers/
│   │   │   ├── messaging/
│   │   │   ├── templates/             ← swarm templates (dev, content, research)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── shared/                        ← Shared types, utils, constants
│   │   ├── src/
│   │   │   ├── types/                 ← TypeScript types shared across all platforms
│   │   │   │   ├── user.ts
│   │   │   │   ├── agent.ts
│   │   │   │   ├── task.ts
│   │   │   │   ├── contractor.ts
│   │   │   │   ├── telemetry.ts
│   │   │   │   └── index.ts
│   │   │   ├── constants/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                            ← Shared component library
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── primitives/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                            ← Database schemas + migrations
│   │   ├── src/
│   │   │   ├── schema/                ← Drizzle schema definitions
│   │   │   │   ├── users.ts
│   │   │   │   ├── workspaces.ts
│   │   │   │   ├── notes.ts
│   │   │   │   ├── agents.ts
│   │   │   │   ├── tasks.ts
│   │   │   │   ├── contractors.ts
│   │   │   │   ├── telemetry.ts
│   │   │   │   ├── billing.ts
│   │   │   │   └── index.ts
│   │   │   ├── migrations/
│   │   │   └── client.ts              ← database client initialization
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api-client/                    ← Type-safe API client for inter-service calls
│       ├── src/
│       │   ├── platform-a.ts          ← client for calling Platform A endpoints
│       │   ├── platform-b.ts          ← client for calling Platform B endpoints
│       │   ├── platform-c.ts          ← client for calling Platform C endpoints
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── specs/
│   ├── PLATFORM-A-CONSUMER.md         ← Platform A build spec
│   ├── PLATFORM-B-CONTRACTOR.md       ← Platform B build spec
│   ├── PLATFORM-C-ENGINE.md           ← Platform C build spec
│   └── INFRASTRUCTURE.md              ← Infrastructure runbook (see below)
│
├── docker/
│   ├── docker-compose.yml             ← local development (all services)
│   ├── docker-compose.platform-a.yml  ← Platform A only
│   ├── docker-compose.platform-b.yml  ← Platform B only
│   ├── docker-compose.platform-c.yml  ← Platform C only
│   └── docker-compose.deps.yml        ← shared dependencies (postgres, redis)
│
├── turbo.json                         ← Turborepo pipeline config
├── package.json                       ← root workspace config
├── tsconfig.base.json                 ← shared TypeScript config
├── .eslintrc.js                       ← shared ESLint config
├── .prettierrc                        ← shared Prettier config
└── .env.example                       ← environment variable template
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker + Docker Compose
- Git

### Setup

```bash
# Clone the repo
git clone https://github.com/8gent/8gent.git
cd 8gent

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your local config

# Start dependencies (postgres, redis)
docker compose -f docker/docker-compose.deps.yml up -d

# Run database migrations
pnpm db:migrate

# Start all apps in dev mode
pnpm dev
```

### Per-Platform Development

Each team can work independently:

```bash
# Platform A team (consumer)
pnpm dev --filter=consumer

# Platform B team (contractor)
pnpm dev --filter=contractor

# Platform C team (engine + services)
pnpm dev --filter=engine --filter=llm-gateway --filter=agent-host

# Run only shared dependencies
docker compose -f docker/docker-compose.deps.yml up -d
```

### Common Commands

```bash
pnpm dev              # start all apps in dev mode
pnpm build            # build all apps
pnpm lint             # lint all packages
pnpm typecheck        # type-check all packages
pnpm test             # run all tests
pnpm test:e2e         # run end-to-end tests
pnpm db:migrate       # run database migrations
pnpm db:seed          # seed database with test data
pnpm db:studio        # open Drizzle Studio (database GUI)
```

---

## Team Ownership

| Directory | Team | Platform |
|-----------|------|----------|
| `apps/consumer/` | Team A | Platform A — Consumer |
| `apps/contractor/` | Team B | Platform B — Contractor |
| `apps/admin/` | Team C | Platform C — Internal |
| `services/engine/` | Team C | Platform C — Engine |
| `services/llm-gateway/` | Team C | Platform C — Engine |
| `services/agent-host/` | Team C | Platform C — Engine |
| `packages/8gentc/` | Team C | Platform C — Runtime |
| `packages/swarm/` | Team C | Platform C — Swarm |
| `packages/shared/` | All teams | Shared — requires review from all |
| `packages/ui/` | Team A (primary) | Shared — any team can contribute |
| `packages/db/` | Team C (primary) | Shared — schema changes require review from all |
| `packages/api-client/` | Team C (primary) | Shared — contract changes require review from all |

---

## Branch Strategy

```
main                    ← production (protected, deploy on merge)
├── staging             ← staging environment (auto-deploy on merge)
├── platform-a/*        ← Team A feature branches
├── platform-b/*        ← Team B feature branches
├── platform-c/*        ← Team C feature branches
└── shared/*            ← cross-platform changes (require multi-team review)
```

### Rules

- All changes via pull request
- Platform-specific changes: reviewed by owning team
- Shared package changes: reviewed by ALL teams
- API contract changes (`packages/api-client/`, `packages/shared/types/`): reviewed by ALL teams
- Database schema changes (`packages/db/`): reviewed by ALL teams
- `main` is always deployable
- Feature flags for incomplete features

---

## Build Specs

Detailed development roadmaps for each platform:

- [Platform A — Consumer](specs/PLATFORM-A-CONSUMER.md) (10 milestones)
- [Platform B — Contractor](specs/PLATFORM-B-CONTRACTOR.md) (10 milestones)
- [Platform C — Engine](specs/PLATFORM-C-ENGINE.md) (14 milestones)

---

## Architecture Overview

```
Clients (individuals + enterprises)
         │
         ▼
┌─────────────────────────────┐
│  Platform A — 8gentc.com    │   Next.js web app
│  Knowledge workspace + chat │   Deployed on Vercel
│  Agent dashboard + billing  │
└────────────┬────────────────┘
             │ HTTPS API calls
             ▼
┌─────────────────────────────┐
│  Platform C — Engine Layer  │   Node.js services
│  ┌───────────────────────┐  │   Deployed on DigitalOcean
│  │ Orchestration API     │  │
│  │ Understanding engine  │  │
│  │ Task decomposition    │  │
│  │ Dispatch + matching   │  │
│  └───────────┬───────────┘  │
│  ┌───────────▼───────────┐  │
│  │ LLM Gateway           │  │   Routes to Anthropic, OpenAI, etc.
│  │ Token routing + cache │  │
│  │ Budget enforcement    │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Agent Hosting         │  │   Docker containers on VPS
│  │ Container mgmt        │  │
│  │ Health monitoring     │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ 8gentc Runtime        │  │   Forked OpenClaw
│  │ Overstory Swarm       │  │   Multi-agent orchestration
│  └───────────────────────┘  │
└────────────┬────────────────┘
             │ HTTPS API calls
             ▼
┌─────────────────────────────┐
│  Platform B — 8gent-c.com   │   Next.js web app
│  Task marketplace + queue   │   Deployed on Vercel
│  Harnesses + runtime env    │
│  Scoring + gamification     │
└─────────────────────────────┘
```

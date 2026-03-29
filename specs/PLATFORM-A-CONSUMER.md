# Platform A — Consumer Platform (8gentc.com)

## Build Spec v1.0

**Team:** Platform A  
**Stack:** TypeScript / Next.js (full stack)  
**Repo:** `8gent` (monorepo — this spec lives at `/specs/PLATFORM-A-CONSUMER.md`)  
**Dependencies:** Platform C (shared engine layer — see `PLATFORM-C-ENGINE.md`)

---

## Overview

Platform A is the client-facing product for individuals and enterprises. It is a knowledge management workspace powered by a chat interface, backed by a persistent agent swarm that works on the user's behalf 24/7. The platform handles everything from a freelancer who needs a client acquisition agent to an enterprise that needs an entire software team — the interface is identical, only the execution layer changes.

This platform does NOT contain the agent runtime itself (that's Platform C), nor the contractor fulfillment system (that's Platform B). Platform A is the **client experience layer** — it captures intent, displays results, manages subscriptions, and provides the knowledge workspace.

---

## Architecture Context

```
┌─────────────────────────────────────────┐
│  Platform A (this spec)                 │
│  - Knowledge workspace UI               │
│  - Chat interface                        │
│  - Agent dashboard                       │
│  - Understanding engine                  │
│  - Billing + subscription                │
│  - Ambition classifier + upgrade flow    │
├─────────────────────────────────────────┤
│  Platform C (shared engine)              │
│  - 8gentc agent runtime                  │
│  - Task decomposition                    │
│  - LLM gateway + token routing           │
│  - Telemetry + metering                  │
├─────────────────────────────────────────┤
│  Platform B (contractor)                 │
│  - Receives escalated tasks from A→C→B   │
└─────────────────────────────────────────┘
```

Platform A communicates with Platform C via internal APIs. Platform A never communicates directly with Platform B — all escalation flows through Platform C's dispatch engine.

---

## Milestone 1 — Project Foundation

**Goal:** Monorepo structure, CI/CD, dev environment, shared tooling that all three teams use.

### Deliverables

- Monorepo initialized with Turborepo or Nx
- Shared TypeScript config, ESLint, Prettier
- Directory structure:
  - `/apps/consumer` — Platform A (Next.js)
  - `/apps/contractor` — Platform B (Next.js)
  - `/packages/shared` — shared types, utils, API contracts
  - `/packages/ui` — shared component library
  - `/packages/db` — database schemas (Prisma or Drizzle)
  - `/specs/` — all build specs (this file and siblings)
- CI pipeline: lint, type-check, test on every PR
- CD pipeline: preview deployments per PR
- Environment configuration (.env schema for local dev)
- Docker Compose for local development (database, redis, etc.)

### `[DECIDED]` — Database

**PostgreSQL + Drizzle.** Best balance of performance, TypeScript DX, and flexibility for the graph-like data structures the knowledge workspace will need. Already configured in `packages/db/`.

### `[DECIDED]` — Hosting

**Vercel for frontend apps + DigitalOcean for backend services.** Vercel handles zero-config Next.js deployment with preview deploys per PR. DigitalOcean hosts Platform C engine services, database, Redis, and agent containers.

---

## Milestone 2 — Authentication + User Management

**Goal:** Users can sign up, log in, and have a profile. Foundation for multi-tenancy.

### Deliverables

- Auth system (email/password + OAuth: Google, GitHub)
- User profile (name, avatar, plan tier, onboarding status)
- Organization/workspace model (a user belongs to a workspace)
- Role-based access: owner, admin, member, viewer
- Onboarding flow (first-time user experience)
- Session management + token refresh
- API middleware: auth guard on all protected routes

### `[DECIDED]` — Auth Provider

**Clerk.** Best DX, fast to ship, handles everything. Already configured with env vars. Can migrate to self-hosted later.

---

## Milestone 3 — Knowledge Workspace

**Goal:** The core product surface — an Obsidian-style knowledge graph with a note-taking interface where users dump their thoughts, goals, and intentions.

### Deliverables

- Note editor (rich text — markdown compatible)
- Note-to-note linking (bidirectional — when A links to B, B shows a backlink to A)
- Graph visualization (interactive node map showing all notes and their connections)
- Tagging system (user-defined tags on any note)
- Search (full-text search across all notes)
- Note types: thought, goal, intention, reference, agent-output
- Folder/hierarchy support (optional — flat by default with links as primary structure)
- Real-time sync (changes saved instantly, no "save" button)
- Mobile-responsive layout

### `[DECIDED]` — Editor Framework

**TipTap (ProseMirror).** Most extensible for the custom blocks we'll need (agent output blocks, goal tracking blocks, etc.). Large ecosystem.

### `[DECIDED]` — Graph Visualization

**React Flow** for the interactive workspace graph. Can layer D3 underneath for advanced layouts later.

---

## Milestone 4 — Chat Interface

**Goal:** The primary input method. Users communicate with the platform via a persistent chat modal overlaid on the knowledge workspace.

### Deliverables

- Chat panel (slide-out or persistent sidebar)
- Message threading (user messages + system responses)
- Streaming responses (token-by-token display)
- Chat-to-note conversion (any chat output can be saved as a note)
- Context awareness (chat knows which note/page the user is looking at)
- Command palette (slash commands for quick actions: /create-agent, /set-goal, /search)
- Chat history (searchable, per-workspace)
- File/image upload in chat
- Typing indicators + loading states

### Integration Point with Platform C

The chat interface sends messages to Platform C's understanding engine API. The response is streamed back and displayed. The chat does NOT run LLM inference directly — all intelligence lives in Platform C.

```
User types message → Platform A sends to Platform C API → 
Platform C processes via understanding engine → 
Streams response back → Platform A renders in chat
```

---

## Milestone 5 — Agent Dashboard

**Goal:** Users can see what agents are running on their behalf, their status, recent outputs, and configure new agents.

### Deliverables

- Agent list view (all active agents for this user/workspace)
- Per-agent detail view:
  - Agent name + type (acquisition, research, assistant, custom)
  - Status (active, paused, error, idle)
  - Last run timestamp + next scheduled run
  - Recent outputs (linked to notes in the knowledge workspace)
  - Configuration (editable parameters)
  - Runtime stats (runs this period, token consumption visualization)
- Agent creation flow:
  - Select agent type (from template library)
  - Configure parameters (target audience, schedule, data sources)
  - Activate
- Agent pause/resume/delete controls
- Agent output feed (unified timeline of all agent outputs across all agents)

### `[DECIDED]` — Agent Persistence Model

**Hybrid (option 3).** Event-driven for reactive agents (customer service) + cron for proactive agents (research, acquisition). The dashboard shows the agent as "active" regardless — the scheduling is invisible to the user.

*Note: The actual agent execution happens in Platform C. Platform A only displays status and configuration. The scheduling/execution model is defined in Platform C's spec.*

---

## Milestone 6 — Understanding Engine (Frontend)

**Goal:** The understanding engine is Platform A's differentiator — the system proactively engages the user with questions, clarifications, and ideas. This milestone covers the frontend surface. The intelligence lives in Platform C.

### Deliverables

- Proactive notification system:
  - "We noticed your goal X has no action plan — want to define one?"
  - "Your research agent found something relevant to Y — take a look"
  - "It's been 2 weeks since you updated Z — still a priority?"
- Notification delivery channels:
  - In-app notification center (bell icon)
  - Chat message (proactive messages appear in the chat panel)
  - Email digest (daily/weekly summary of agent activity + suggestions)
- Notification preferences (per channel, per agent, per type)
- Inline suggestion cards (appear in the knowledge workspace contextually)
- "Snooze" and "dismiss" actions on all proactive content
- Feedback loop (user can rate suggestions as helpful/not helpful)

### Integration Point with Platform C

Platform C's understanding engine analyzes the knowledge graph on a schedule and generates proactive outreach items. These are pushed to Platform A via webhook or polling. Platform A renders them in the appropriate channel.

```
Platform C analyzes knowledge graph →
Generates proactive items (questions, suggestions, alerts) →
Pushes to Platform A via internal API →
Platform A renders in notification center / chat / email
```

---

## Milestone 7 — Subscription + Billing

**Goal:** Users can subscribe to a plan, manage their subscription, and see their usage.

### Deliverables

- Plan tiers:
  - Free (limited: X notes, X agent runs/month, 1 agent)
  - Individual ($X/month: unlimited notes, X runtime hours, up to Y agents)
  - Pro ($X/month: more runtime hours, priority agent execution)
  - Enterprise (custom pricing — triggers contractor fleet)
- Stripe integration:
  - Checkout flow
  - Subscription management (upgrade, downgrade, cancel)
  - Usage-based billing component (runtime hours metering)
  - Invoice history
- Usage dashboard:
  - Runtime hours consumed this period
  - Token consumption breakdown (by agent)
  - Projected usage for current billing cycle
  - Overage warnings
- Plan limits enforcement (graceful degradation when limits hit)

### `[DECIDED]` — Pricing Model

**Hybrid (option 3).** Base subscription includes X runtime hours. Overage charged at $Y/hour. This gives users predictability while protecting margins.

*Note: Actual runtime metering data comes from Platform C's telemetry layer. Platform A reads metering data via API and displays it.*

---

## Milestone 8 — Ambition Classifier + Enterprise Upgrade

**Goal:** The system detects when a user's task exceeds what autonomous agents can handle and recommends an enterprise upgrade that connects them to the contractor fleet.

### Deliverables

- Ambition classification engine (runs on every significant task/goal created):
  - Scoring dimensions: estimated duration, domain complexity, human judgment required, estimated token cost
  - Threshold: tasks above score X trigger enterprise recommendation
- Enterprise upgrade prompt:
  - Contextual: appears when an ambitious task is detected
  - Shows what the system CAN'T do autonomously for this task
  - Shows what the contractor fleet WOULD do
  - Estimated cost range
  - One-click upgrade to enterprise plan (or "talk to us" for custom pricing)
- Enterprise onboarding flow:
  - Task handoff: user's context (relevant knowledge graph sections) packaged for Platform C dispatch
  - Communication channel: enterprise user continues to use the same chat interface
  - Progress visibility: contractor deliverables appear in the knowledge workspace
- Enterprise dashboard additions:
  - Active projects (contractor-managed)
  - Project status + milestones
  - Deliverable review + approval workflow

### Integration Point with Platform B (via Platform C)

When a user upgrades to enterprise and a task is escalated:

```
Platform A packages task context →
Sends to Platform C dispatch engine →
Platform C decomposes task + matches contractors →
Contractors (Platform B) execute work →
Deliverables flow back through Platform C →
Platform A renders deliverables in user's workspace
```

The user NEVER interacts with Platform B directly. They only see their workspace and chat.

---

## Milestone 9 — QA + Acceptance Testing

**Goal:** Verify all user-facing flows work correctly end-to-end.

### Deliverables

- E2E test suite (Playwright):
  - Sign up → onboarding → first note → first agent → first output
  - Chat interaction → note creation from chat
  - Agent creation → configuration → status monitoring
  - Subscription flow → upgrade → usage dashboard
  - Enterprise upgrade prompt → task escalation
- Integration tests:
  - Platform A ↔ Platform C API contract validation
  - Billing webhook handling
  - Notification delivery (in-app, email)
- Performance testing:
  - Knowledge graph with 1,000+ notes: search and render performance
  - Chat streaming latency
  - Dashboard load time with 10+ active agents
- Accessibility audit (WCAG 2.1 AA)
- Mobile responsiveness verification

---

## Milestone 10 — Production Hardening

**Goal:** Prepare for real users. Monitoring, error handling, documentation.

### Deliverables

- Error tracking (Sentry or similar)
- Application monitoring (Vercel Analytics + custom dashboards)
- Rate limiting on all public endpoints
- CSRF protection
- Content Security Policy headers
- Database backup strategy
- Runbook: deployment process, rollback procedures
- User-facing documentation / help center (basic)
- Landing page + marketing site (separate from app)
- Analytics (Posthog or Mixpanel — user behavior tracking)
- Feature flags (for gradual rollout)

---

## API Contract: Platform A → Platform C

This is the integration boundary. Platform A calls Platform C for all intelligence and agent operations. Both teams must agree on this contract before building.

### Endpoints Platform A Expects from Platform C

| Endpoint | Purpose |
|----------|---------|
| `POST /chat/message` | Send user message, receive streamed response |
| `GET /agents` | List agents for a user/workspace |
| `POST /agents` | Create a new agent |
| `PATCH /agents/:id` | Update agent configuration |
| `DELETE /agents/:id` | Delete an agent |
| `GET /agents/:id/outputs` | Get recent outputs for an agent |
| `GET /agents/:id/status` | Get agent runtime status |
| `POST /agents/:id/pause` | Pause an agent |
| `POST /agents/:id/resume` | Resume an agent |
| `GET /understanding/notifications` | Get proactive suggestions for a user |
| `POST /understanding/feedback` | Submit feedback on a suggestion |
| `GET /metering/usage` | Get token/runtime usage for billing |
| `POST /tasks/escalate` | Escalate a task to enterprise dispatch |
| `GET /tasks/:id/status` | Get status of an escalated task |
| `GET /tasks/:id/deliverables` | Get deliverables from contractor work |

*Full API schema to be co-defined with Platform C team before Milestone 4 begins.*

---

## Open Questions Tracker

These are known gaps flagged throughout this spec. They should be resolved during development, not before.

| # | Gap | Milestone | Status |
|---|-----|-----------|--------|
| 1 | Database selection (Postgres + Drizzle recommended) | M1 | `[DECIDED]` — PostgreSQL + Drizzle |
| 2 | Hosting strategy (Vercel + worker recommended) | M1 | `[DECIDED]` — Vercel + DigitalOcean |
| 3 | Auth provider (Clerk recommended) | M2 | `[DECIDED]` — Clerk |
| 4 | Editor framework (TipTap recommended) | M3 | `[DECIDED]` — TipTap (ProseMirror) |
| 5 | Graph visualization (React Flow recommended) | M3 | `[DECIDED]` — React Flow |
| 6 | Agent persistence model (hybrid recommended) | M5 | `[DECIDED]` — Hybrid (event-driven + cron) |
| 7 | Pricing tiers and exact dollar amounts | M7 | `[DECIDED]` — Hybrid (base subscription + usage overage) |
| 8 | Ambition classifier scoring rubric | M8 | `[DECIDED]` — Multi-dimensional scoring via Platform C |
| 9 | Understanding engine proactive outreach triggers | M6 | `[DECIDED]` — Platform C webhook/polling push model |
| 10 | Enterprise upgrade UX (self-serve vs. sales-assisted) | M8 | `[DECIDED]` — Self-serve with "talk to us" fallback |

---

## Dependency Map

```
M1 (Foundation) ──→ M2 (Auth) ──→ M3 (Knowledge Workspace)
                                         │
                                         ├──→ M4 (Chat) ──→ M6 (Understanding Engine FE)
                                         │
                                         └──→ M5 (Agent Dashboard)
                                                    │
                                                    └──→ M7 (Billing) ──→ M8 (Enterprise Upgrade)
                                                                                    │
                                                                         M9 (QA) ←──┘
                                                                           │
                                                                         M10 (Hardening)
```

M3, M4, and M5 can be developed in parallel once M2 is complete.  
M7 and M8 are sequential and depend on M5.  
M9 and M10 are final.

# PS7_IMPLEMENTATION_PLAN.md
## QueueSense — Outpatient Wait-Time & Dynamic Queue Velocity Tracker
## Live Implementation Control Document (Authoritative: `development.md`)

**Last Updated:** 2026-08-29
**Current Status:** All Phases (1–7) Implemented & Verified
**Single Source of Truth:** `development.md`

---

## 1. PROJECT OBJECTIVE

Build **QueueSense**: an event-driven outpatient queue management system that models doctors as continuous, time-varying service channels. It recalculates patient waiting times dynamically using actual consultation velocity, and pushes real-time updates when delays, emergencies, or no-shows occur.

**One-line pitch:** "A queue that tells the truth, live."

---

## 2. ARCHITECTURE RECONCILIATION

Per `development.md`, the authoritative stack is:
- **Backend:** Node.js + TypeScript + Fastify + Zod + Prisma ORM + PostgreSQL (`DATABASE_URL`, `DIRECT_URL` for Supabase)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + TanStack Query + React Router + Recharts + native EventSource
- **Real-Time:** Native Server-Sent Events (SSE) + in-memory `EventEmitter`
- **Testing:** Vitest + Supertest + ESLint + Prettier
- **Monorepo Layout:** `apps/api/`, `apps/web/`, `packages/shared-types/`

---

## 3. 7-PHASE BUILD ROADMAP (`development.md`)

| # | Phase | Status | Key Deliverables |
|---|---|---|---|
| 1 | Foundation & Auth | COMPLETED | Monorepo workspace linking, Prisma schema, Fastify server, JWT login, RBAC middleware |
| 2 | Core Queue & Consultation Flow | COMPLETED | Queue Service, Consultation Service, Prediction Service (EMA baseline: 0.3*last + 0.7*old), dynamic ETA window formula |
| 3 | Priority, Emergencies & No-Shows | COMPLETED | Three-tier priority (ROUTINE/URGENT/EMERGENCY), emergency safe insertion, no-show human confirmation, transactional immutable audit log |
| 4 | Workload Balancing & Transfers | COMPLETED | Workload Service (load_score formula), walk-in intake suggestions, staff-confirmed atomic patient transfers |
| 5 | Real-Time Layer (SSE) | COMPLETED | Notification Service (EventEmitter), SSE streams (`/stream/doctors/:id/queue`, `/stream/patients/:token`), thresholded ±5 min alert filter |
| 6 | Frontend Surfaces | COMPLETED | Patient View (live range, no false precision), Doctor Dashboard (live timer, queue table), Reception/Admin Board (cross-doctor board, load scores, transfers, audit log) |
| 7 | Testing, Hardening & Deployment | COMPLETED | 100% Vitest unit & integration test coverage (25 tests passing), rate limiting, Docker Compose, GitHub Actions CI |

---

## 4. DOMAIN FORMULAS & CONTRACTS (VERIFIED)

1. **EMA Baseline:**
   $$\text{new\_avg} = 0.3 \times \text{last\_duration} + 0.7 \times \text{old\_avg}$$
   *(Cold start seeded from department default)*

2. **Patient ETA Formula:**
   $$\text{ETA}(\text{patient}) = \text{remaining current consultation} + \sum_{j < i} \text{predicted\_duration}(j)$$
   *(Presented as window e.g. "25–35 min", never a false-precision single number)*

3. **Emergency Preemption Policy:**
   - Tiers: `ROUTINE` $\rightarrow$ `URGENT` $\rightarrow$ `EMERGENCY`
   - Emergency inserted immediately after the in-progress consultation (FIFO among emergencies).
   - Running consultation is NEVER interrupted.

4. **No-Show Human-in-the-Loop:**
   - 5–10 min grace period expiry triggers automated **soft flag** only.
   - Doctor or reception staff confirms hard `NO_SHOW` $\rightarrow$ slot reclaimed & queue recalculated.

5. **Workload Load Score:**
   $$\text{load\_score} = w_1 \times \text{count} + w_2 \times \text{total\_predicted} + w_3 \times \text{remaining} + w_4 \times \text{priority\_bonus}$$
   *(Configurable weights, default $w_1=w_2=w_3=w_4=1$)*

6. **Audit Requirement:**
   - Immutable `AuditEvent` written in same DB transaction for every priority change, transfer, and no-show confirmation with `actor_id`, role, and reason.

---

## 5. CHANGELOG

| Date | Phase | Change | Notes |
|---|---|---|---|
| 2026-08-29 | 0 | Specification & Architecture Audit | Reconciled stack to `development.md` (Fastify + Prisma + React + TanStack Query) |
| 2026-08-29 | 1–5 | Backend Implementation | Implemented Fastify server, Prisma schema, prediction/queue/consultation/workload/audit/stream services |
| 2026-08-29 | 6 | Frontend Surfaces & Monorepo | Configured `apps/web` with React 19, Tailwind CSS, TanStack Query, Recharts, and verified production build |
| 2026-08-29 | 7 | Hardening & Test Verification | 25/25 unit & integration tests passing in Vitest, docker-compose.yml, CI workflow |
| 2026-08-29 | 8 | Complete Fluid Responsiveness Pass | Full dynamic adaptation across all viewports (mobile, tablet, desktop, landscape), stable SSE keying, scrollable modals, touch targets >=44px, zero layout shift |
| 2026-08-29 | 9 | Enterprise Information Architecture & Visual Hierarchy | Dedicated Public Landing Page, Context-Aware Collapsible Left Sidebar Application Shell, decoupled Incident Simulation Sandbox, refined clinical design system |
| 2026-08-29 | 10 | Enterprise Healthcare SaaS Redesign (Reference Match) | Complete operational command center, 5 KPI cards, Smart Queue Engine hero banner, department queues snapshot, wait-time AreaChart & priority Donut charts, live activity feed, workload RadarChart, and quick actions |
| 2026-08-29 | 11 | Canonical Deployment Structure Consolidation | Consolidated to single canonical frontend (`apps/web` → Vercel) and backend (`apps/api` → Render), removed legacy duplicate folders, added Dockerfile and vercel.json |



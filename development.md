# development.md
## QueueSense — Master Implementation Blueprint & Agent Prompt
### PS7: Outpatient Wait-Time & Dynamic Queue Velocity Tracker

> **How to use this file:** This is a complete, self-contained implementation prompt. Paste this entire file into Antigravity (or any AI coding agent) as the first message of a new project. It contains the PRD, architecture, engineering rules, domain logic, API contract, data model, and a phased build roadmap in the order the agent should execute them. Do not skip phases — each phase assumes the previous one is working and tested.

---

## 0. Agent Instructions (read this first)

You are building **QueueSense**, a production-grade outpatient queue management system. Follow this document as the single source of truth. Where this document is silent, make the most conservative, standard choice and state your assumption in a comment rather than guessing silently.

Build in the phase order given in Section 7. Do not jump ahead to later phases before earlier ones compile, run, and pass their stated acceptance checks. After each phase, output a short summary of what was built and what was deliberately deferred.

Do not introduce new libraries, services, or architectural patterns beyond what's listed in Section 3 and Section 4 without flagging it first as a proposed deviation.

---

## 1. Executive Summary & Problem Framing

**Core problem:** Fixed-slot appointment schedules (e.g. 15 min/slot) break down in outpatient clinics because real consultation lengths are random variables driven by patient complexity, clinical procedures, and doctor pacing.

**Cascading impact:** Delays compound throughout the day, creating crowded waiting rooms, patient anxiety, opaque wait times, and unbalanced doctor workloads.

**System mission:** Build **QueueSense**, an event-driven outpatient queue management system that models doctors as continuous, time-varying service channels. It recalculates patient waiting times dynamically using actual consultation velocity, and pushes real-time updates when delays, emergencies, or no-shows occur.

**Target users:**
- **Patients** — want an honest, live wait-time window instead of silence or a rigid appointment slot.
- **Doctors** — want a queue that reflects reality and doesn't require manual reshuffling.
- **Reception / admin staff** — want visibility across all doctors, the ability to intervene (priority changes, transfers, no-show confirmation), and an audit trail for every intervention.

**Core value delivered:** Replace a static, fictional schedule with a live, explainable, self-correcting queue.

---

## 2. Product Requirements (PRD)

### 2.1 What to build
An event-driven outpatient queue system with three surfaces (Patient View, Doctor Dashboard, Reception/Admin Board) sharing one backend, where wait-time predictions update automatically as real consultations happen.

### 2.2 Targeted users & needs
| User | Need | Pain point today |
|---|---|---|
| Patient | Know roughly when they'll be seen | Fixed slots lie; no visibility into delays |
| Doctor | See queue reflect real pace | Manual reshuffling, no live picture of backlog |
| Reception/Admin | Balance load, handle exceptions | No systematic way to insert emergencies or reassign patients fairly |

### 2.3 Feature list (must-have, in build order)
1. Authenticated login for doctors and reception/admin (patients use a token link, no account).
2. Doctor starts/ends consultation → system captures exact duration.
3. EMA-based per-doctor pace prediction, seeded from department defaults.
4. Live ETA calculation per patient, shown as a range ("25–35 min"), not a false-precision number.
5. Three-tier priority queue (ROUTINE / URGENT / EMERGENCY) with safe emergency insertion.
6. No-show detection with grace period + human confirmation.
7. Multi-doctor load scoring and walk-in intake suggestions.
8. Staff-authorized patient transfer between doctors.
9. Real-time SSE push to patient and doctor views, thresholded to avoid notification fatigue.
10. Immutable audit log for every priority change, transfer, and no-show confirmation.

---

## 3. Architecture

### 3.1 System design overview
```
[ Patient View (Mobile) ]     [ Doctor Dashboard ]     [ Reception/Admin Board ]
            │                          │                           │
            └──────────────────────────┼───────────────────────────┘
                                       │ REST Mutations + SSE Stream
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          API ROUTING & RBAC MIDDLEWARE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                               MODULAR MONOLITH                               │
│                                                                               │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐   │
│  │     Queue Service      │  │  Consultation Service │  │  Audit Service   │   │
│  │ (State & Transitions)  │  │  (Timers & Durations)  │  │ (Immutable Log)  │   │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬────────┘   │
│              │                          │                       │            │
│  ┌───────────▼───────────┐  ┌───────────▼───────────┐           │            │
│  │   Prediction Service   │  │    Workload Service    │           │            │
│  │     (EMA Baseline)     │  │  (Scoring & Transfers)  │           │            │
│  └───────────┬───────────┘  └───────────┬───────────┘           │            │
│              │                          │                       │            │
│              └──────────────────────────┼───────────────────────┘            │
│                                         ▼                                    │
│                           Notification Service (SSE Bus)                     │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          ▼
                           PostgreSQL (Transactional Store)
```

### 3.2 Request lifecycle (reference flow — consultation end)
1. Client mutation hits **RBAC middleware** → role verified.
2. **Consultation Service** stamps `ended_at`, computes actual duration.
3. **Prediction Service** updates that doctor's EMA: `new_avg = 0.3 × last_duration + 0.7 × old_avg`.
4. **Queue Service** recalculates ETA for every patient behind that doctor.
5. **Audit Service** logs the state transition unconditionally.
6. **Notification Service** pushes an SSE update only where ETA delta ≥ ±5 minutes.

### 3.3 Folder & file structure
```
queuesense/
├── apps/
│   ├── web/                      # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── views/
│   │   │   │   ├── patient/      # Patient View
│   │   │   │   ├── doctor/       # Doctor Dashboard
│   │   │   │   └── reception/    # Reception/Admin Board
│   │   │   ├── components/
│   │   │   ├── hooks/            # useSSE, useQueueQuery, etc.
│   │   │   ├── lib/              # API client, auth, formatting
│   │   │   └── routes/
│   │   └── vite.config.ts
│   └── api/                      # Node/TypeScript backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── queue/            # Queue Service
│       │   │   ├── consultation/     # Consultation Service
│       │   │   ├── prediction/       # Prediction Service (EMA)
│       │   │   ├── workload/         # Workload Service
│       │   │   ├── audit/            # Audit Service
│       │   │   └── notification/     # Notification Service (SSE bus)
│       │   ├── middleware/
│       │   │   ├── rbac.ts
│       │   │   ├── validate.ts       # Zod schemas
│       │   │   └── rateLimit.ts
│       │   ├── db/
│       │   │   ├── schema.ts         # Prisma schema
│       │   │   └── migrations/
│       │   ├── routes/
│       │   ├── events/               # internal pub/sub bus
│       │   ├── config/
│       │   └── server.ts
│       └── test/
├── packages/
│   └── shared-types/              # DTOs shared between web and api
├── docker-compose.yml              # postgres + api local dev
├── .github/workflows/ci.yml
└── development.md                  # this file
```

### 3.4 Tech stack

**Frontend**
- React + TypeScript, Vite, Tailwind CSS
- TanStack Query (React Query) — cache + resync after SSE reconnect
- Native `EventSource` for SSE (no library)
- React Router
- Recharts — dashboard charts

**Backend**
- Node.js + TypeScript
- Fastify (preferred over Express for native streaming/SSE support and speed)
- Zod — request validation
- JWT (`jsonwebtoken`) — staff/doctor auth
- Custom RBAC middleware
- `@fastify/rate-limit` — abuse protection

**Real-time**
- Server-Sent Events (native streaming response, no library)
- In-memory `EventEmitter` pub/sub bus (single-instance deploy). Documented upgrade path to Redis pub/sub if scaled horizontally — do not build this until needed.

**Database**
- PostgreSQL
- Prisma ORM — schema, migrations, type-safe queries

**Testing & quality**
- Vitest — unit tests (EMA math, load scoring, priority insertion are mandatory coverage)
- Supertest — API integration tests
- ESLint + Prettier

**DevOps**
- Docker + docker-compose for local dev (api + postgres)
- GitHub Actions CI: lint → test → build on every push
- Deploy target: Railway, Render, or Fly.io (skip Kubernetes — unnecessary for this scale)

---

## 4. Rules

### 4.1 What to use
- TypeScript everywhere (frontend and backend), strict mode on.
- Fastify for the API server; Prisma for all DB access — no raw SQL except for one-off migration scripts.
- Zod for all external input validation, at the route boundary, before any service logic runs.
- All timestamps are UTC in the database; convert to local time only at render.
- All duration math in whole minutes and seconds — no floats for time arithmetic.

### 4.2 What to avoid
- No ORMs beyond Prisma (no mixing Prisma + raw pg client except migrations).
- No WebSockets — SSE is sufficient and simpler for this one-directional push model; do not introduce bidirectional real-time unless a future feature explicitly needs client→server push mid-stream.
- No client-side storage of authoritative queue state beyond a local cache that's resynced on every SSE reconnect — the server is always the source of truth.
- No premature microservices split. Stay a modular monolith until there's a proven scaling reason not to.
- No global mutable state outside the service modules' own in-memory caches (e.g. EMA values must live in Postgres, not just memory, so a restart doesn't lose them).

### 4.3 Libraries & dependencies (whitelist)
| Package | Purpose | Notes |
|---|---|---|
| `fastify` | API server | pin major version |
| `@fastify/rate-limit` | rate limiting | |
| `zod` | validation | |
| `jsonwebtoken` | auth tokens | |
| `prisma` / `@prisma/client` | ORM | |
| `react`, `react-dom` | frontend | |
| `@tanstack/react-query` | data fetching/cache | |
| `react-router-dom` | routing | |
| `recharts` | charts | |
| `vitest` | unit tests | |
| `supertest` | API integration tests | |

Do not add a package outside this list without noting it explicitly as a deviation and justifying it in one sentence.

### 4.4 Error handling
- Every route handler wraps logic in try/catch and returns a consistent error shape: `{ error: { code, message } }`.
- Domain errors (e.g. "cannot insert emergency into a completed queue") are typed and mapped to 4xx; unexpected errors are logged with context and return a generic 500 message to the client — never leak stack traces to the frontend.
- SSE streams catch write failures and clean up the connection rather than crashing the process.
- All audit writes happen inside the same DB transaction as the state change they describe — an audit entry must never exist without its corresponding change actually having committed, and vice versa.

### 4.5 Boundaries of AI (what the coding agent may and may not do)
- **May:** implement services, routes, migrations, tests, and UI within the structure and stack defined above; refactor within a phase; write and run tests.
- **May not:** change the tech stack, add new external services (e.g. swap Postgres for another DB, add Redis) without flagging it as a proposed change first; skip the audit-log write path for any state mutation; weaken the RBAC check on any mutation route; invent patient-facing copy that states false precision (e.g. exact minute countdowns) — always present ranges per Section 5.1.
- **Must always:** keep `started_at`/`ended_at` server-authoritative (never trust a client-supplied timestamp for consultation duration).

### 4.6 General rules
- **Code style:** ESLint (`@typescript-eslint`) + Prettier, enforced in CI.
- **Naming:** camelCase for variables/functions, PascalCase for types/components, kebab-case for file names in `apps/web`, snake_case for DB columns (Prisma maps automatically).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`).
- **Security:** JWT auth for staff/doctor routes; patients use a signed, single-purpose queue token (no password); sanitize all inputs via Zod; secrets in `.env`, never committed.
- **Performance:** index `queue_entries` on `(doctor_id, status, priority, created_at)`; keep ETA recalculation O(n) per doctor's queue, not O(n²) across the whole system.
- **Testing targets:** 90%+ coverage on Prediction Service and Queue Service (the two most failure-sensitive modules); integration tests for every mutation route.

---

## 5. Domain Logic (implement exactly as specified)

### 5.1 Dynamic velocity & waiting-time estimation
- **Authoritative timestamps:** `started_at`/`ended_at` are set server-side only, never accepted from the client.
- **EMA baseline:**
  ```
  new_avg = α × last_duration + (1 - α) × old_avg     (α = 0.3)
  ```
  Seeds from a department default on cold start (no history yet); updates immediately after every consultation completes.
- **ETA formula:**
  ```
  ETA(patient) = remaining time in current consultation
               + Σ predicted durations of all patients ahead in that doctor's queue
  ```
- **Display rule:** always show a window (e.g. "25–35 min"), never a false-precision single number. Compute the window as ETA ± a spread derived from recent variance (or a fixed ±5 min band if variance isn't tracked yet in an early phase).

### 5.2 Emergency preemption & insertion policy
- Three tiers: `ROUTINE` (default) → `URGENT` → `EMERGENCY`.
- **Insertion rule:** an emergency patient is inserted immediately after the currently in-progress consultation. FIFO among waiting emergencies. A running consultation is never interrupted.
- **Audit requirement:** every priority change requires `actor_id`, role, and a reason string. Write an immutable `AuditEvent`, then recalculate and push updated ETAs downstream with the reason attached.

### 5.3 No-show management
- **Grace period:** configurable window, 5–10 minutes, after a patient is called.
- Expiry produces an automated **soft flag** — not a state change.
- **Human-in-the-loop:** only a doctor or reception staff member can confirm `NO_SHOW`; this protects patients who stepped away briefly.
- Confirming `NO_SHOW` reclaims the slot and immediately triggers queue recalculation for that doctor.

### 5.4 Multi-doctor workload balancing
- **Load score:**
  ```
  load_score(doctor) = w1×(queue count) + w2×(total predicted duration)
                      + w3×(remaining current) + w4×(priority bonus)
  ```
  Start with `w1=w2=w3=w4=1` and expose them as config, not hardcoded literals, so they can be tuned later.
- **Intake suggestion:** on new walk-in registration, auto-recommend the least-loaded *compatible* doctor (compatibility = matching department/specialty).
- **Transfer:** system may suggest a transfer for a waiting patient, but execution always requires staff confirmation via `POST /queue/:id/transfer`, which updates both doctors' queues atomically.

### 5.5 Real-time communication & notifications
- SSE endpoints: `GET /stream/doctors/:id/queue`, `GET /stream/patients/:token`. Target delivery latency: under 2 seconds from state change to client receipt.
- **Thresholded alerts:** dispatch a distinct in-app alert only when an ETA delta is ≥ ±5 minutes — prevents notification fatigue from tiny recalculations.
- **Reconnection:** rely on native `EventSource` retry for the transport; on every `onopen`, the client performs a full REST resync of current state (`GET /queue/patient/:token` or equivalent) rather than trusting replayed events — this is simpler and more robust than an event-log replay for a system where state is cheap to refetch fresh.

---

## 6. API Contract (build these routes first, in this order)

| Method | Route | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/login` | Staff/doctor login | none |
| GET | `/queue/patient/:token` | Patient's current queue position + ETA | token |
| GET | `/queue/doctors/:id` | Doctor's full queue | doctor/staff |
| POST | `/consultations/:queueEntryId/start` | Mark consultation started | doctor |
| POST | `/consultations/:queueEntryId/end` | Mark consultation ended, triggers EMA update | doctor |
| POST | `/queue/:id/priority` | Change priority tier, requires reason | staff |
| POST | `/queue/:id/no-show/confirm` | Confirm a soft-flagged no-show | doctor/staff |
| POST | `/queue/:id/transfer` | Transfer patient to another doctor | staff |
| GET | `/workload/doctors` | Load scores for all doctors | staff |
| GET | `/stream/doctors/:id/queue` | SSE stream, doctor queue updates | doctor/staff |
| GET | `/stream/patients/:token` | SSE stream, patient ETA updates | token |
| GET | `/audit/events` | Audit log, filterable | admin |

---

## 7. Data Model (Prisma-style entities)

- **Department** — `id, name, defaultConsultationMinutes`
- **Doctor** — `id, name, departmentId, emaMinutes, updatedAt`
- **Patient** — `id, name, phone/contact, createdAt`
- **QueueEntry** — `id, patientId, doctorId, priority (ROUTINE/URGENT/EMERGENCY), status (WAITING/IN_PROGRESS/DONE/NO_SHOW), position, softFlaggedAt, createdAt`
- **Consultation** — `id, queueEntryId, startedAt, endedAt, durationSeconds`
- **AuditEvent** — `id, actorId, actorRole, action, targetId, reason, createdAt` (immutable — insert-only, no update/delete allowed at the application layer)

---

## 8. Phased Build Roadmap

Execute in this order. Each phase must compile, run, and pass its acceptance check before moving to the next.

### Phase 1 — Foundation & Auth
- Repo scaffold per Section 3.3; Docker Compose (Postgres + API).
- Prisma schema per Section 7.
- JWT login for staff/doctor; token-link access for patients.
- RBAC middleware with role checks stubbed for all future routes.
- **Acceptance:** a doctor and a reception user can log in and receive a role-scoped JWT; a patient token route returns 401 without a valid token.

### Phase 2 — Core Queue & Consultation Flow
- Queue Service: create/list queue entries, FIFO ordering within a tier.
- Consultation Service: start/end endpoints, server-authoritative timestamps.
- Prediction Service: EMA implementation with department-default seeding.
- Basic ETA formula (no variance band yet — fixed ±5 min window is fine here).
- **Acceptance:** starting and ending a consultation updates the doctor's EMA and recalculates ETAs for the remaining queue, verified by unit test.

### Phase 3 — Priority, Emergencies & No-Shows
- Three-tier priority model + safe emergency insertion rule.
- Audit Service: immutable `AuditEvent` writes on every priority change, inside the same transaction as the state change.
- No-show grace period + soft flag + human confirmation endpoint.
- **Acceptance:** inserting an emergency never interrupts a running consultation; every priority change produces exactly one audit row with actor, role, and reason.

### Phase 4 — Workload Balancing & Transfers
- Workload Service: load score calculation, configurable weights.
- Intake suggestion endpoint for new walk-ins.
- Transfer endpoint, staff-confirmed, atomically updates both doctors' queues.
- **Acceptance:** load scores update immediately after a transfer; a transfer is rejected if attempted without staff role.

### Phase 5 — Real-Time Layer (SSE)
- Notification Service: internal pub/sub bus, ETA-delta threshold filter (≥5 min).
- SSE endpoints for doctor and patient streams.
- Frontend: `EventSource` hooks with full-state resync on reconnect (Section 5.5).
- **Acceptance:** an ETA-affecting consultation end is visible on an open patient stream within 2 seconds; disconnecting and reconnecting the client resyncs to correct current state.

### Phase 6 — Frontend Surfaces
- Patient View: live ETA window, no numeric false precision.
- Doctor Dashboard: current queue, start/end consultation controls, no-show confirmation.
- Reception/Admin Board: cross-doctor view, priority changes, transfers, load scores, audit log viewer.
- **Acceptance:** all three views reflect a single consultation-end event correctly and in real time, without a manual refresh.

### Phase 7 — Testing, Hardening & Deployment
- Full unit coverage on Prediction and Queue services (target 90%+).
- Integration tests for every mutation route in Section 6.
- Rate limiting on public/patient-facing routes.
- CI pipeline (lint → test → build) on every push.
- Deploy to chosen host (Railway/Render/Fly.io); verify env-based config, migrations run on deploy.
- **Acceptance:** CI is green on a clean clone; deployed instance passes the same smoke tests as local.

---

## 9. Glossary (for reference while building)

- **RBAC** — permission system gating actions by role (doctor/reception/admin), not by individual identity.
- **SSE** — one-way server→client live push over HTTP; no polling.
- **EMA** — running average weighting recent data more heavily; used for doctor pace prediction.
- **ETA** — here, the patient's estimated remaining wait, not literal arrival time.
- **Modular monolith** — one deployed app, internally split into clean service modules.
- **FIFO** — first-in-first-out ordering, used among patients at the same priority tier.
- **Audit event / actor_id** — immutable log entry plus the identity of who triggered it.
- **Load score** — single number representing a doctor's current busyness, used for routing new patients.
- **Grace period** — window before a missed patient is soft-flagged as a possible no-show.
- **Soft flag vs. confirmed** — automatic suspicion vs. human-confirmed state change.
- **Pub/sub** — services publish events without knowing who's listening; Notification Service subscribes and forwards relevant ones over SSE.
- **Transactional store** — a database guaranteeing all-or-nothing writes (PostgreSQL here).

---

*End of blueprint. Build phase by phase, test at every boundary, and do not deviate from the stack or domain formulas above without flagging the change first.*

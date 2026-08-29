# PS7_IMPLEMENTATION_PLAN.md
## QueueSense — Outpatient Wait-Time & Dynamic Queue Velocity Tracker
## Live Implementation Control Document

**Last Updated:** 2026-08-29
**Current Phase:** 1 — Foundation (in progress)
**Maintained by:** Antigravity implementation agent

---

## 1. PROJECT OBJECTIVE

Build **QueueSense**: a dynamic outpatient queue system that continuously estimates patient waiting time from the doctor actual current consultation speed, pushes updates to patients the moment reality changes, and safely handles emergencies, no-shows, and multi-doctor workload balancing.

This is a hackathon project (PS7) — the goal is to demonstrate five core capabilities end-to-end with a live, credible demo story. It is NOT an EHR system, NOT a diagnostic system, and NOT a billing system.

**One-line pitch:** "A queue that tells the truth, live."

---

## 2. SOURCE DOCUMENTS

| # | File | Authority Level | Status |
|---|---|---|---|
| 1 | PS7_Official_Problem_Statement.pdf | Level 1 — NOT PROVIDED AS SEPARATE FILE | Missing — proxy is Research Blueprint SS02 |
| 2 | PS7_MASTER_IMPLEMENTATION_SPEC(2) (1).md | Level 2 Master Spec | Read completely |
| 3 | PS7_Research_Blueprint(1).md | Level 2 Research Blueprint | Read completely |
| 4 | PS7_Antigravity_Master_Implementation_Prompt(1).md | Level 4 Execution rules | Read completely |

KNOWN GAP: The official PS7 PDF was not supplied as a distinct file. Research Blueprint SS02 quotes serve as proxy for Level 1 authority.

---

## 3. PHASE 0 AUDIT RESULTS

### Repository State
- GREENFIELD — The repository contains ONLY the four specification documents.
- No existing source code of any kind.
- No frontend, backend, database, or configuration files exist.
- No API keys, environment variables, or authentication configuration.
- No Supabase, Firebase, or other BaaS configuration.

### Existing Functionality: None (empty repository)
### Existing Problems: None (nothing to break yet)
### What Must Be Preserved: The four specification documents must not be deleted or modified.

---

## 4. ENVIRONMENT AUDIT RESULTS

| Tool | Version | Status |
|---|---|---|
| Node.js | v24.14.0 | Available |
| npm | 11.9.0 | Available |
| Python | 3.14.3 | Available |
| pip | 25.3 | Available |
| git | 2.55.0 | Available |
| Docker | — | NOT installed |
| PostgreSQL | — | Not confirmed locally |

BLOCKER CANDIDATE (LOW): Docker not available. Use local PostgreSQL + managed cloud DB for production.

---

## 5. FINAL ARCHITECTURE

Backend: Python 3.14 + FastAPI + SQLAlchemy + Alembic
Database: PostgreSQL
Real-time: Server-Sent Events (SSE)
Frontend: React 18 + TypeScript + Vite
Styling: Tailwind CSS v3
Data fetching: TanStack Query v5 + native EventSource
Animation: Framer Motion (selective)
Charts: Recharts
Icons: Lucide React
Prediction Phase 1: EMA / weighted moving average (pure Python)
Prediction Phase 2: scikit-learn GradientBoostingRegressor (optional)
Synthetic data: Faker + custom simulator
Testing backend: pytest + httpx
Testing frontend: Vitest + React Testing Library
Deployment: Render/Railway (backend + Postgres) + Vercel (frontend)

Architecture pattern: Modular monolith — one transaction boundary, single deployment unit.

---

## 6. COMPLETE PHASE LIST

| # | Phase | Status |
|---|---|---|
| 0 | Repository/Document Audit | COMPLETE |
| 1 | Foundation — FastAPI setup, DB connection, env config, health endpoint | IN PROGRESS |
| 2 | Database — Full schema, migrations, constraints, indexes | Pending |
| 3 | Authentication and RBAC — JWT, roles, RBAC middleware | Pending |
| 4 | Core Queue Engine — Deterministic ordering, state machine, transactions | Pending |
| 5 | Consultation Tracking — Start/complete timestamps, duration | Pending |
| 6 | ETA Engine — Baseline EMA prediction + full waiting-time calculation | Pending |
| 7 | Emergency Handling — Priority insertion, audit | Pending |
| 8 | No-Show Handling — Grace period, soft flag, confirmation | Pending |
| 9 | Doctor Availability — State machine, queue effects | Pending |
| 10 | Workload Balancing — Load score, recommendations, transfer | Pending |
| 11 | Synthetic Data — Faker + simulator, seed script | Pending |
| 12 | ML Prediction — scikit-learn behind fallback wrapper (optional) | Pending |
| 13 | Real-Time SSE — Event pipeline, reconnect, fan-out | Pending |
| 14 | Patient UI — Mobile-first live wait, join queue, timeline | Pending |
| 15 | Doctor UI — Dashboard, consultation controls, workload | Pending |
| 16 | Reception/Admin UI — Live board, transfers, audit log, analytics | Pending |
| 17 | Notifications — In-app threshold-based notifications | Pending |
| 18 | Visual Design Polish — Design system, motion, 3D hero | Pending |
| 19 | Full Testing — Unit, integration, security, concurrency, E2E | Pending |
| 20 | Performance Optimization | Pending |
| 21 | Accessibility Hardening | Pending |
| 22 | Deployment | Pending |
| 23 | Demo Prep | Pending |
| 24 | Final Verification — 24-step E2E scenario, acceptance criteria | Pending |

---

## 7. KNOWN BLOCKERS

| # | Blocker | Severity | Resolution |
|---|---|---|---|
| B1 | Official PS7 PDF not provided | LOW | Research Blueprint SS02 quotes adequate; proceed |
| B2 | Docker not installed | LOW | Local PostgreSQL + Render managed DB |
| B3 | PostgreSQL not confirmed locally | MEDIUM | Install psycopg2; configure local PG or use SQLite for dev |
| B4 | scikit-learn not installed | LOW | Phase 12 only; pip install when needed |

---

## 8. ACCEPTANCE CRITERIA

- Given 3+ historical consultation durations for a doctor, the waiting-time engine returns a dynamic estimate, not a hardcoded constant.
- POST /consultations/:id/complete causes every WAITING entry to show recalculated eta_seconds within one recompute cycle.
- POST /queue/:entry_id/priority EMERGENCY from authorized role repositions per insertion policy, updates ETAs, creates EmergencyEvent + AuditEvent.
- POST /queue/:entry_id/no-show sets status to NO_SHOW, excludes from active ordering, recalculates downstream ETAs.
- With 2+ available compatible doctors, GET /doctors/workload-recommendations returns the lower-load_score doctor.
- With ML deliberately disabled, waiting-time engine returns valid estimate from EMA baseline; no 5xx reaches the client.
- A change in one authenticated session is visible in a second independent session within 2 seconds, no manual refresh.
- Patient token A cannot retrieve patient token B wait-time data (403/404 assertion).
- All screens have loading, empty, error, and success states.
- Theme switching produces no noticeable lag.
- Audit log records all emergency, no-show, transfer, availability-change events with actor+timestamp+reason.
- 24-step E2E demo scenario passes without manual intervention.

---

## 9. DO-NOT-CHANGE RULES

1. Never hardcode API keys, secrets, or passwords in source.
2. Never delete the four specification documents from the repo.
3. Never put an LLM/Gemini/ChatGPT in the queue calculation path.
4. Never auto-remove a patient as no-show without human confirmation.
5. Never auto-transfer a patient between doctors without human confirmation.
6. Never claim medical diagnosis capability.
7. Never claim HIPAA/DPDP compliance.
8. Never silently show stale data as current (always show reconnecting state).
9. Never remove audit trail write from priority/no-show/transfer/availability actions.
10. Implementation order: Reliable core then prediction then real-time then premium UX then motion polish.

---

## 10. CHANGELOG

| Date | Phase | Change | Notes |
|---|---|---|---|
| 2026-08-29 | 0 | Phase 0 complete: all four documents read, implementation plan created | Greenfield repo — no existing code |
| 2026-08-29 | 1 | Phase 1 beginning: project scaffolding | Next action |

---

## 11. VERIFICATION RESULTS

| Phase | Test | Result | Date |
|---|---|---|---|
| 0 | Document audit | All 4 documents located and read | 2026-08-29 |
| 0 | Repository audit | Greenfield confirmed, no existing code | 2026-08-29 |
| 0 | Environment audit | Python 3.14, Node 24, npm 11, git available | 2026-08-29 |

---

Next action: Begin Phase 1 — Project Foundation (backend scaffolding + frontend scaffolding)

# PS7_MASTER_IMPLEMENTATION_SPEC.md
## Single Source of Truth — PS7: Outpatient Wait-Time & Dynamic Queue Velocity Tracker

*Maintained document. Update via Change Control (§39) whenever new information arrives. Do not silently drop or reinterpret requirements.*

---

## 0. SOURCE AUDIT — READ THIS FIRST

Three documents were provided. Before anything else, a conflict must be flagged rather than silently resolved:

| # | File | What it actually is | Authority level it fills |
|---|---|---|---|
| 1 | `ai_development_blueprint.pdf` | A **generic, project-agnostic framework guide** ("AI-Driven Development Specification Guide") describing four document *types* any AI-assisted project should have: PRD, `architecture.md`, `rules.md`, `phases.doc.md`. It contains **no PS7-specific content whatsoever** — no mention of outpatient queues, doctors, or waiting times. | Not Level 1. It is a *meta-template* for how to structure documentation, not the official PS7 problem statement. |
| 2 | `PS7_Research_Blueprint.md` | The full researched technical/product blueprint (970 lines), including a literal-quote table of PS7 problem-statement lines in its §02. | Functions as **Level 2** (research blueprint), and is currently the *only* source containing verbatim fragments of the actual PS7 problem statement. |
| 3 | `PS7_Antigravity_Master_Implementation_Prompt.md` | A phased implementation prompt for a coding agent, derived from the Research Blueprint. | **Level 4** (previous project discussion/decisions) — it operationalizes Level 2, it doesn't add new requirements. |

**CONFLICT/GAP IDENTIFIED:** The master-prompt instructions call for a "Level 1 — Official PS7 Problem Statement PDF." That literal document has not been uploaded. What was uploaded under that name is the generic framework guide (Document 1 above). This is recorded here per the "never silently resolve contradictions" rule rather than treated as if the real PS7 PDF had been supplied.

**Resolution applied for now:** Section 02 below reproduces the PS7 problem-statement fragments *as quoted inside the Research Blueprint* (its §02 table), since that is the only PS7-specific primary text available, and treats those quoted lines as the closest available proxy for Level 1. **If you upload the actual official PS7 PDF, it supersedes this section and every requirement below must be re-diffed against it under Change Control (§39).**

The generic framework guide (Document 1) is used only for its structural idea (PRD / architecture.md / rules.md / phases.doc.md as four artifact types) — folded into this master spec's organization rather than kept as a separate document, since you asked for one continuously maintained source of truth rather than four fragmented files.

---

## 01 — PROJECT IDENTITY

- **Project name:** QueueSense (working name, from Research Blueprint §05 — not yet confirmed by you; treat as placeholder pending your confirmation)
- **PS7 number:** PS7
- **Problem statement title:** Outpatient Wait-Time & Dynamic Queue Velocity Tracker
- **One-line product definition:** A dynamic outpatient queue system that continuously measures how fast each doctor is actually working and tells every waiting patient, in real time, how long they truly have left — safely handling emergencies, no-shows, and multi-doctor workload balancing.
- **Product vision:** Replace fixed-slot appointment scheduling (which fails because consultation length is a random variable, not a constant) with a live, self-correcting queue that tells the truth and updates the instant reality changes.
- **Core objective:** Continuously estimate patient waiting time from actual doctor consultation speed, and push updates to patients the moment delays or priority changes occur.
- **Target users:** Patients (queue/ETA view), Doctors (consultation + queue control), Reception/front-desk staff, Admins.
- **Target environment:** Outpatient clinic / hospital department, single or multi-doctor, single or multi-department.
- **Hackathon objective:** Demonstrate the five PS7 core requirements (§02) end-to-end, live, with a rehearsed demo story (§36).
- **What makes the solution different:** Baseline-first, ML-optional-with-fallback prediction (never a single point of failure); deterministic, transaction-safe queue engine; explainable ETA changes (never a silent number change); real-time via SSE rather than over-engineered WebSockets; privacy-minimal data model (operational timestamps only, no clinical data).

Do not invent a different problem: PS7 is about queue/wait-time truth-telling, not diagnosis, not EHR integration, not billing.

---

## 02 — OFFICIAL PROBLEM STATEMENT

**Caveat repeated from §0:** the literal PS7 PDF was not supplied. The lines below are quoted as they appear inside `PS7_Research_Blueprint.md` §02, which explicitly frames itself as "reading the problem statement literally, line by line."

| Official requirement (as quoted in Research Blueprint) | Product interpretation | Technical implementation | UI manifestation | Testing requirement |
|---|---|---|---|---|
| "Fixed appointment schedules often fail…" | Motivational framing, not a feature — justifies replacing fixed slots with a dynamic queue | Queue engine models each doctor as a live service channel, not a fixed-interval schedule | Patient screen shows a *range/estimate*, never a fixed clock-slot promise | N/A (framing, not a testable requirement) |
| "continuously estimates patient waiting times based on doctor's current consultation speed" | **Core requirement** | Live per-doctor rolling rate (EMA/weighted avg baseline; optional ML) feeding a recalculated ETA on every relevant event | `WaitTimeCard` — large ETA number + clock time | §31 Unit: engine reproduces worked example from seeded data (Research Blueprint §40 Phase 4) |
| "update patients when delays or priority changes occur" | **Core requirement** | Recalculation trigger events (§08 FR4) → SSE push, target < 2s end-to-end | "Why did this change?" explanation panel | E2E: second browser tab reflects change without manual refresh within 2s |
| "support emergency handling" | **Core requirement** | Authorized priority flag → insertion policy (§17) → recalculation → audit | `EmergencyDialog`, `PriorityBadge` | Insertion-policy unit tests + audit-write test |
| "no-shows" | **Core requirement** | Grace period → soft auto-flag → human confirmation → status change → recalculation | `NoShowDialog`, soft "may be a no-show" flag | No-show removal + downstream ETA-decrease test |
| "workload balancing between available doctors" | **Core requirement** | `load_score` per doctor (§18) → read-only recommendation endpoint; separate authorized transfer endpoint | `WorkloadCard`, cross-doctor board | Load-score arithmetic test + transfer-authorization test |

Everything not named above (mobile native apps, SMS/email integration, hospital-wide EHR integration, deep learning, video calls, billing) is **optional scope at best** (§04) — useful only insofar as it strengthens the demonstration of these five core requirements, never a substitute for them.

**ACTION ITEM for you:** please upload the actual PS7 problem-statement PDF if one exists as a distinct file, so this section can be upgraded from "quoted-inside-blueprint" to true Level 1 and cross-checked line-by-line.

---

## 03 — REQUIREMENT TRACEABILITY MATRIX

| ID | Source | Requirement | Priority | Technical implementation | UI | API/Data | Test | Status |
|---|---|---|---|---|---|---|---|---|
| FR1 | Blueprint §08 | Record `consultation_started_at`/`ended_at`, derive `duration_seconds` | P0 | Consultation Service, software timestamps only | Doctor "Start"/"Complete" buttons | `POST /consultations/start`, `POST /consultations/:id/complete` | Duration arithmetic unit test | Not started |
| FR2 | Blueprint §08 | Per-doctor ordered `QueueEntry` state machine | P0 | Queue Service, deterministic ordering (§10) | `QueueCard` list | `GET /queue/:doctor_id` | Ordering unit tests | Not started |
| FR3 | Blueprint §08 | Compute ETA for every `WAITING` entry | P0 | Waiting-Time Engine (§11) | `WaitTimeCard` | `GET /patients/:token/wait-time` | Worked-example reproduction test | Not started |
| FR4 | Blueprint §08 | Recompute affected estimates within <2s of any trigger event | P0 | Recalculation trigger list (§10) + SSE | Live ETA update, no refresh | SSE `queue_updated` event | E2E real-time propagation test | Not started |
| FR5 | Blueprint §08 | Authorized roles mark `EMERGENCY` priority; insertion policy; logged | P0 | Priority Service + Audit Service | `EmergencyDialog` | `POST /queue/:entry_id/priority` | Insertion-policy + audit test | Not started |
| FR6 | Blueprint §08 | Mark `NO_SHOW`; remove from active wait-time calc | P0 | No-Show Service | `NoShowDialog`, soft auto-flag | `POST /queue/:entry_id/no-show` | Removal + downstream recalculation test | Not started |
| FR7 | Blueprint §08 | Workload metric + assignment **recommendation**; reassignment of already-waiting patients requires human confirmation | P0 | Workload Service (§18) | `WorkloadCard` | `GET /doctors/workload-recommendations` (read-only) + `POST /queue/:id/transfer` (authorized) | Load-score + transfer-authorization tests | Not started |
| FR8 | Blueprint §08 | Doctor availability states affect queue/ETA immediately | P0/P1 | Availability state machine (§17 blueprint) | `DoctorAvailabilityControl` | `POST /doctors/:id/availability` | Availability-effect tests | Not started |
| FR9 | Blueprint §08 | Real-time push to all relevant connected clients | P0 | Notification/SSE Service | All live screens | `GET /stream/doctors/:id/queue`, `GET /stream/patients/:token` | E2E real-time test | Not started |
| FR10 | Blueprint §08 | Immutable audit trail for priority/no-show/transfer/availability | P1 | Audit Service, insert-only table | Admin Audit Log screen | `GET /audit-events` | Audit immutability test | Not started |
| FR11 | Blueprint §08 | Graceful degradation to deterministic baseline if ML fails | P0 (safety-critical) | `predict_duration()` wrapper (§11) | No user-visible error; `PredictionConfidence` shows "baseline" | N/A internal | Fallback-on-failure unit test | Not started |
| FR12 | Blueprint §08 | Synthetic demo data sufficient for all workflows, no real patient data | P1 | Faker + custom rule-based simulator (§14 blueprint) | Demo-mode reset | Seed script | Seed script runs cleanly | Not started |

Every PS7 requirement above (FR1–FR12) traces through to a concrete implementation, UI element, API surface, and test. This table must be kept in sync with `PS7_IMPLEMENTATION_PLAN.md` (§38) as implementation proceeds — do not let the two documents diverge.

---

## 04 — COMPLETE FEATURE INVENTORY

### A. Mandatory PS7 features (directly required)
- Live queue per doctor with position tracking
- Continuous waiting-time estimation driven by actual consultation speed
- Real-time update push on delay/priority change, with a visible reason
- Emergency insertion workflow (authorized, policy-governed, audited)
- No-show handling (grace period → confirmation → removal → recalculation)
- Multi-doctor workload balancing / recommendation

### B. Strongly recommended engineering features (not explicitly named by PS7, but required for the above to be *correct*)
- Authentication + RBAC (patient/doctor/reception/admin) — otherwise "who can mark emergency" is unanswerable
- Consultation start/end timestamp capture — only real source of "current consultation speed"
- Doctor availability state machine — required for workload balancing to mean anything
- Audit logging for emergency/no-show/reassignment/availability actions
- Deterministic statistical fallback estimator — required by FR11 ("system must work even if ML fails")
- Transaction-safe, race-condition-protected queue mutation (DB transactions/row locks)
- Idempotent recalculation (safe retries)
- Reconnection handling for the real-time channel

### C. Optional features (clearly labeled — valuable, not required)
- ML-based duration prediction layered on the baseline (Phase 2, §11)
- SMS/email/push notifications (external delivery)
- Analytics dashboards / heatmaps for admins
- Patient self-check-in via QR/token kiosk simulation
- Appointment history and rebooking
- Multi-department support beyond a single specialty
- A well-scoped, privacy-reviewed generative-AI assistant for staff-facing summarization only (§12 clarification)

### D. Explicitly out of scope (do NOT build — do not silently reintroduce these later)
- Deep learning / LLMs inside the numeric prediction path
- LLM dependency for queue calculation
- Microservices / Kubernetes / service mesh
- Real hospital EHR/HL7-FHIR integration
- Biometric or IoT hardware for consultation detection ("no physical machine required merely to calculate consultation duration")
- Native mobile apps (a responsive web app covers patient-facing needs)
- Payment/billing modules
- Unrelated medical functionality (diagnosis, clinical notes, prescriptions, lab results, vitals)
- Claims of regulatory compliance (HIPAA/DPDP) unless genuinely implemented and independently verified

---

## 05 — PRODUCT ARCHITECTURE

```text
Patient / Doctor / Reception-Admin (three role-based clients)
        ↓ REST (mutations) + SSE (live push)
API Layer (routing, request validation, RBAC middleware)
        ↓
┌────────────────── Modular Monolith ──────────────────┐
│  Queue Service        — ordering, state machine        │
│  Consultation Service — start/complete timestamps       │
│  Prediction Service   — EMA baseline + optional ML      │
│  Workload Service     — load scoring, recommendations   │
│  Notification Service — event → SSE fan-out             │
│  Audit Service        — immutable event log             │
└──────────────────────────────────────────────────────┘
        ↓
PostgreSQL (single transactional store)
```

**Why a modular monolith, not microservices:** a hackathon team gains nothing from network-hop overhead between "services" that all read/write the same queue state. One codebase, one transaction boundary, one database — faster to build, easier to keep consistent, easier to deploy and demo. (Research Blueprint §24; corroborated by exclusion list in §04D above.)

**Component responsibilities:**
- **Frontend:** three role-scoped experiences (Patient / Doctor / Reception-Admin) sharing one component library.
- **API/backend:** REST for all mutating/reading actions; RBAC enforced server-side on every mutating endpoint.
- **Queue engine:** deterministic ordering logic; owns state transitions; consumes (but does not compute) duration predictions.
- **Prediction engine:** supplies `predicted_duration_seconds` via a single `predict_duration()` interface; baseline always available, ML optional and wrapped with fallback.
- **Database:** PostgreSQL, one transaction boundary per doctor-queue mutation.
- **Real-time event system:** Server-Sent Events, one stream per doctor queue + one lightweight stream per patient token.

---

## 06 — TECHNOLOGY STACK

Per the "evaluate the existing project first" rule: **no existing repository/codebase has been provided yet.** The stack below is the Research Blueprint's recommendation and should be confirmed or overridden once Phase 0 (repository audit, §37 Phase 0) actually inspects a real codebase.

| Layer | Recommended | Why needed | What it does | What it replaces | Risk if it fails |
|---|---|---|---|---|---|
| Backend | Python (Django+DRF or FastAPI) | Same-language ML integration (no network hop to call scikit-learn), mature ORM/transactions | Request handling, RBAC, business logic, in-process prediction call | Node/Express+Prisma is an equally valid alternative if team strength lies there | Backend down = whole app down; mitigated by standard uptime practices, not a novel risk here |
| Database | PostgreSQL | Strong transactional guarantees for concurrent queue mutation; relational fit | Stores all entities (§07), enforces constraints | MySQL/SQLite/MongoDB considered, rejected for weaker transactional/relational fit at this concurrency profile | Brief DB outage → API returns 503 w/ retry-after; client shows last-known cached state (§34 failure handling) |
| Real-time | Server-Sent Events (SSE) | One-directional server→client fits the problem exactly; auto-reconnecting, simpler than WebSockets | Pushes queue/ETA state changes to clients | WebSockets (rejected — bidirectional complexity unneeded), polling/long-polling (kept only as fallback) | SSE drop → client auto-reconnects natively or falls back to polling; UI shows "reconnecting," never blank |
| Prediction (Phase 1) | EMA / weighted moving average | Works with zero historical data, fully explainable, zero dependency risk | Produces `predicted_duration_seconds` from recent consultation history | N/A — always the baseline of record | None — it's the fallback itself |
| Prediction (Phase 2, optional) | scikit-learn (RandomForest/GradientBoosting) or XGBoost/LightGBM | Best fit for small-medium tabular operational data; explainable via feature importances | Learns doctor/context-specific duration patterns | Deep learning / LLMs (explicitly rejected for this role) | Wrapped in `predict_duration()`; failure silently falls back to EMA baseline (FR11) |
| Frontend | React + TypeScript | Component reuse across three role-based UIs; strong real-time-data ecosystem | Renders Patient/Doctor/Admin experiences | Vue/plain HTML+JS considered, React chosen for ecosystem fit | Standard SPA failure modes; mitigated by loading/error states (§21 blueprint) |
| Synthetic data | Faker + custom rule-based simulator | Operational-timestamp realism needed, not full clinical-record fidelity | Generates plausible patients/doctors/consultations/no-shows/emergencies | Synthea (rejected as unnecessarily heavyweight for this scope) | N/A (dev-time tool only) |
| Deployment | Single web app + managed Postgres (Render/Railway/Fly.io or single VM/container) | Hackathon-appropriate; matches "avoid unnecessary complexity" | Hosts backend+frontend+DB | Kubernetes/multi-region/service mesh (explicitly rejected) | Standard single-instance risk; acceptable at hackathon scale |

**Animation/3D/UI component libraries** are addressed separately in §27–§31 (visual design) since they are presentation-layer choices, not core architecture.

---

## 07 — DATA ARCHITECTURE

### Entities (from Research Blueprint §25, preserved verbatim in structure)

| Entity | Purpose | Key fields | Relationships |
|---|---|---|---|
| Department | Groups doctors by specialty | `id`, `name` | 1→N Doctor |
| Doctor | Clinician running a queue | `id`, `department_id (FK)`, `name`, `availability_status` | 1→N QueueEntry, 1→N ConsultationSession, 1→N DoctorAvailability |
| DoctorAvailability | Historical/state log of availability changes | `id`, `doctor_id (FK)`, `status`, `changed_at`, `changed_by (FK→User)` | N→1 Doctor |
| Patient | Person using the queue | `id`, `token`, `name`, `contact` (minimal) | 1→N Appointment, 1→N QueueEntry |
| Appointment | Intent to be seen (booked or walk-in) | `id`, `patient_id (FK)`, `doctor_id (FK)`, `created_at`, `type` | 1→1 QueueEntry (typically) |
| QueueEntry | Patient's live position in a doctor's queue | `id`, `appointment_id (FK)`, `patient_id (FK)`, `doctor_id (FK)`, `status`, `priority_level`, `queue_sequence`, `joined_at` | N→1 Doctor, N→1 Patient, 1→1 ConsultationSession |
| ConsultationSession | The actual service event | `id`, `queue_entry_id (FK)`, `doctor_id (FK)`, `started_at`, `ended_at`, `duration_seconds` | 1→1 QueueEntry |
| WaitingTimePrediction | Snapshot of an ETA computation, for audit/model evaluation | `id`, `queue_entry_id (FK)`, `predicted_at`, `eta_seconds`, `source` (`baseline`\|`ml`), `reason` | N→1 QueueEntry |
| EmergencyEvent | Emergency flag record | `id`, `queue_entry_id (FK)`, `actor_id (FK→User)`, `reason`, `flagged_at` | N→1 QueueEntry |
| NoShowEvent | No-show record | `id`, `queue_entry_id (FK)`, `actor_id (FK→User)`, `marked_at`, `auto_flagged (bool)` | N→1 QueueEntry |
| QueueTransfer | Cross-doctor move record | `id`, `queue_entry_id (FK)`, `from_doctor_id`, `to_doctor_id`, `actor_id (FK→User)`, `reason`, `transferred_at` | N→1 QueueEntry |
| NotificationEvent | Sent/queued notification | `id`, `patient_id (FK)`, `type`, `payload`, `sent_at`, `delivered (bool)` | N→1 Patient |
| AuditEvent | Immutable log of all sensitive actions | `id`, `actor_id (FK→User)`, `action_type`, `entity_type`, `entity_id`, `metadata (JSON)`, `created_at` | Polymorphic reference |
| User | Login identity for staff (patients use lightweight token auth) | `id`, `role`, `name`, `credentials` | 1→N AuditEvent (as actor) |

**Required constraints:** `queue_entry.status`/`priority_level` as constrained enums; `consultation_session.ended_at >= started_at` check constraint; unique `(doctor_id, queue_sequence)` for active entries; unique `patient.token`; audit-linked FKs `ON DELETE RESTRICT` (never silently lose history).

**Explicitly excluded fields (privacy):** diagnosis codes, symptoms, prescriptions, lab results, vitals, insurance/billing data, free-text clinical notes. None are needed to answer "how long until I'm seen"; each is a privacy liability with zero benefit to PS7's stated goal. Do not create clinical records PS7 doesn't require.

**Indexes:** `queue_entry(doctor_id, status, queue_sequence)`, `consultation_session(doctor_id, started_at)`, `patient(token)`.

---

## 08 — COMPLETE QUEUE ENGINE

The queue engine is **deterministic** — no ML inside it. It owns ordering; the prediction engine only supplies duration estimates it consumes as input.

**Ordering rule (per doctor queue), evaluated top to bottom:**
1. `IN_PROGRESS` entry (if any) is always first.
2. `EMERGENCY` entries next, FIFO within the emergency class, per insertion policy (§17).
3. Remaining `WAITING` entries by `queue_sequence` (arrival/check-in order), with any manually-approved priority boosts applied.
4. `NO_SHOW`, `CANCELLED`, `COMPLETED`, `TRANSFERRED` excluded from active ordering, retained for history/audit.

**State machine per QueueEntry:**
```text
WAITING → IN_PROGRESS → COMPLETED
WAITING → NO_SHOW
WAITING → CANCELLED
WAITING → TRANSFERRED (moved to a different doctor's WAITING)
WAITING → EMERGENCY (priority flag; still resolves to WAITING/IN_PROGRESS/COMPLETED)
```

**Recalculation trigger events** (each fires a full recompute of that doctor's queue only, for isolation and performance):
`consultation_started`, `consultation_completed`, `emergency_flagged`, `no_show_marked`, `queue_joined`, `queue_cancelled`, `doctor_availability_changed`, `patient_transferred_in`, `patient_transferred_out`.

**Concurrency protection — required transaction shape:**
```text
transaction
→ lock relevant doctor-queue rows (SELECT ... FOR UPDATE or equivalent)
→ validate
→ mutate
→ recalculate
→ commit
→ emit event
```
Recalculation is **idempotent** — running it twice with identical inputs produces identical output, so retries after a transient failure are always safe.

**Named race conditions and how each is prevented:**
- Doctor presses "Complete" while reception marks the same patient's neighbor as no-show simultaneously → row lock on that doctor's queue serializes the two mutations.
- Two simultaneous requests to complete the same consultation → only one transition succeeds; the other gets a clean idempotent response, not a corrupted queue.
- Transfer initiated during an in-flight recalculation → transfer is itself a queue mutation and goes through the same lock/transaction path.

---

## 09 — CONSULTATION TIMING

**No physical machine is required merely to calculate consultation duration.** Software timestamps only.

```text
START CONSULTATION
        ↓
server records started_at timestamp
        ↓
consultation happens
        ↓
COMPLETE CONSULTATION
        ↓
server records ended_at timestamp
        ↓
duration_seconds = ended_at - started_at
```

- **Timestamp authority:** the server clock is authoritative, never the client's — prevents client clock skew from corrupting duration data.
- **Duplicate start prevention:** a `QueueEntry` already `IN_PROGRESS` cannot be started again.
- **Duplicate completion prevention:** a `ConsultationSession` with `ended_at` already set cannot be completed again.
- **Invalid state prevention:** cannot complete a consultation that was never started; cannot start a consultation for an entry not in `WAITING`/next-eligible state.
- **Duration validation:** `ended_at >= started_at` as a DB check constraint; negative or nonsensical durations are rejected, not silently stored.
- **Doctor forgets to press "Complete":** reception can manually correct via an admin override endpoint, logged as a manual correction in the audit trail (never a silent DB edit).
- **Historical data generation:** synthetic seed data (§13) populates `ConsultationSession` rows the same way real usage would, so the EMA baseline and any future ML training see realistic-shaped data from day one.

---

## 10 — WAITING-TIME CALCULATION

**Conceptual formula:**
```text
patient ETA
=
remaining time of current in-progress consultation
+
sum(predicted duration for everyone ahead in the queue)
+
applicable operational adjustments (priority, no-shows, transfers, availability)
```

**Inputs feeding the calculation:** current consultation remaining duration; predicted durations of patients ahead; queue position; priority tier; no-shows already excluded; transfers already applied; doctor availability state; completed consultations updating the rolling average; uncertainty/confidence band.

**Do not display misleading precision.** Prefer `Estimated wait: 25–35 min` or `About 30 minutes` over a falsely precise `31.27 minutes`. This is a hard rule, not a style suggestion — it directly reflects the statistical nature of the estimate and avoids overclaiming accuracy the system doesn't have.

**Recalculation triggers:** identical to §08's trigger-event list — any of those events invalidates and recomputes every downstream `WAITING` entry's ETA for that doctor.

---

## 11 — PREDICTION SYSTEM

### Deterministic baseline (Phase 1 — always present, ships first)

For each doctor, maintain a rolling statistic of recent consultation durations:
- **Weighted moving average** of the last *N* (e.g., 8–10) completed consultations, optionally weighted by recency.
- **Exponential moving average (EMA):** `new_avg = α × last_duration + (1-α) × old_avg`, α ≈ 0.3. Reacts faster to a doctor speeding up/slowing down today than a flat historical average, while remaining simple, explainable, zero-training-step.

**Cold-start behavior:** seed with a department-level default (e.g., 12 minutes) when a doctor has zero historical data; falls back further to a global default if the department itself is new.

**Why this matters:** works from day one with zero data; fully explainable to judges and patients ("based on your doctor's last 8 patients"); zero dependency risk (no model to fail, no API to time out); research confirms queue length and recent service pace are the dominant predictive signal even before ML is added.

### Machine learning (Phase 2 — additive, optional, only after ≥150–200 completed consultations exist)

- **Dataset:** accumulated `ConsultationSession` rows (real usage or synthetic seed).
- **Features (operational only):** `doctor_id`, `department_id`, `hour_of_day`, `day_of_week`, doctor's own rolling avg (last 5/10), current queue length for that doctor, whether the next patient is flagged priority-adjacent, time since doctor's shift start.
- **Target:** `duration_seconds` of the next consultation.
- **Model choice:** gradient-boosted trees (LightGBM/XGBoost) or scikit-learn `GradientBoostingRegressor`/`RandomForestRegressor` — literature favors tree ensembles for this kind of small-to-medium tabular operational data over deep learning.
- **Train/validation/test:** temporal separation (train on earlier data, validate/test on later data) to reduce leakage — never randomly shuffle time-series-like operational data.
- **Leakage prevention:** never include the target consultation's own outcome-adjacent fields as features.
- **Evaluation:** compare against the EMA baseline on held-out data; if ML does not meaningfully improve on baseline, **retain the baseline as the production default**.
- **Output contract:** a single number `predicted_duration_seconds`, ideally with a confidence bound (± residual std-dev from validation) so the UI can show a range instead of false precision.
- **Model versioning:** each trained model artifact is versioned; the wrapper records which version produced a given `WaitingTimePrediction`.
- **Retraining strategy:** periodic (e.g., nightly or every N new consultations) offline retrain, or a lightweight online bias-correction — no live/continuous training loop needed for hackathon scope.

**Mandatory fallback contract (safety-critical, ties to FR11):**
```text
predict_duration(doctor_id, context) -> seconds
```
If the model is missing, throws, times out, or returns a nonsensical value (negative, absurdly large), the wrapper **silently falls back to the EMA baseline** and logs a warning. The rest of the system never knows or cares which source produced the number.

### What NOT to do
- Do not put a generative AI/LLM in the numeric prediction path — unnecessary, slower, non-deterministic, harder to justify than a transparent regression.
- Do not use patient medical/clinical features (symptoms, diagnosis, vitals) as model inputs — unnecessary for a time prediction, privacy risk, explicitly warned against.

---

## 12 — IMPORTANT AI CLARIFICATION

**The core application does NOT require Gemini, ChatGPT, or any generative AI API to calculate queue waiting times.**

The primary intelligence chain is:
```text
Historical operational data + statistical estimation + optional tabular ML
= predicted consultation duration

predicted durations + queue state = waiting-time estimate
```

**LLMs may be considered only for clearly justified, non-critical auxiliary functionality** — for example, turning the audit log into a plain-English daily summary for admins, or a simple staff-facing FAQ assistant. Any such feature must:
- Never receive patient names/contact info — only aggregated/anonymized counts.
- Never become a single point of failure for the queue — the core loop must run with zero external AI dependency.
- Be clearly labeled as optional/non-core in the implementation plan.

### Technology decision matrix (condensed from Research Blueprint §12)

| Option | Latency | Explainability | API key/internet? | Hackathon fit |
|---|---|---|---|---|
| EMA/weighted-avg baseline | ~0ms | Excellent (hand-computable) | No | Excellent — **always present** |
| scikit-learn RF/GBM | 1–5ms | Good (feature importances) | No | **Recommended** optional layer |
| XGBoost/LightGBM | 1–5ms | Good | No | Good if time allows |
| Hugging Face transformers | 10s–100s ms | Lower (black-box) | Only to download weights | Poor fit — not built for structured regression |
| Cloud ML APIs (Vertex/SageMaker AutoML) | Network-dependent | Medium | Yes | Overkill; data leaves local env |
| Generative AI (LLM) | 200ms–seconds | Poor for numeric trust | Yes | Optional side feature only, never core |

**Conclusion:** EMA baseline everywhere, upgraded by scikit-learn/gradient-boosted trees once real usage data accumulates. No API key, no internet dependency, no generative AI in the core prediction path.

---

## 13 — ML DATA STRATEGY

Because real patient data should not be assumed (and is not available or appropriate for a hackathon — privacy/consent/ethics preclude it), all training and demo data is **synthetic**:

```text
Synthetic data
+ simulated consultation behavior
+ software-generated timestamps
+ synthetic queue events
```

**Approach:** a **custom rule-based simulator**, not a raw GAN/deep generative model — the goal is plausible operational patterns, not statistical fidelity to a real population.

**Tooling:**
- **Faker** for realistic-looking but obviously fake patient/doctor names, phone numbers, tokens.
- A hand-written **simulation script** generating, per doctor per simulated day: a shift window, N synthetic patients arriving at realistic intervals, a per-doctor "true" mean/variance consultation time (varied doctor-to-doctor for heterogeneity), sampled durations from a log-normal distribution (realistically produces occasional long-tail overruns), with deliberately injected no-shows and emergencies.
- (Considered and explicitly rejected as unnecessary for this scope: Synthea — a heavyweight synthetic *clinical*-record generator; PS7 only needs operational timestamps.)

**Document for the actual dataset once generated:**
- Number of records, distribution shape, doctor-to-doctor variability, consultation-duration variability, no-show rate, emergency-event rate, time-of-day/shift effects, reproducible random seeds, and a clean train/test split.

**Do not claim synthetic data is real hospital data** — disclose it as a strength (privacy-safe), never hide it.

**Output artifacts required:** a seed script that populates historical `ConsultationSession` rows (for EMA baseline and ML training) plus a "live demo" script that can replay a realistic day at accelerated speed during judging.

---

## 14 — REAL-TIME ARCHITECTURE

**Decision: Server-Sent Events (SSE)**, with polling as an automatic client-side fallback if SSE cannot be established (e.g., restrictive network/proxy).

| Approach | Direction | Verdict |
|---|---|---|
| Polling | Client asks repeatedly | Simple but wasteful/laggy; fallback only |
| Long polling | Client waits, server responds when ready | Better than polling, still manual reconnection overhead |
| **SSE** | Server → client, over plain HTTP | **Best fit** — automatic reconnection, simple, matches a read-mostly client population |
| WebSockets | Bi-directional | Overkill — no true bidirectional streaming need here |

**Event pipeline:**
```text
User action
    ↓
API
    ↓
DB transaction
    ↓
database state change
    ↓
queue recalculation
    ↓
event emitted
    ↓
SSE
    ↓
frontend update
```

**Event channel design:** one SSE stream per doctor's queue (`GET /stream/doctors/:id/queue`) for doctor/reception dashboards; one lightweight per-patient stream (`GET /stream/patients/:token`) scoped to that patient's own entry only — so a patient's browser never receives another patient's data even at the transport level.

**Events to cover:** consultation started/completed, ETA changed, queue position changed, emergency, no-show, transfer, doctor availability, workload, relevant notifications.

**Reconnect behavior:** client auto-reconnects (native `EventSource` behavior) and/or falls back to short-interval polling; UI shows a subtle "reconnecting" indicator, never a blank/broken screen; on reconnect, the client re-syncs from authoritative server state rather than trusting any stale local mutation. **The UI must never silently show stale data as current.**

**Payload shape example:**
```json
{
  "event": "queue_updated",
  "reason": "consultation_completed",
  "doctor_id": "D-12",
  "updated_at": "2026-08-29T10:41:03Z",
  "entries": [
    {"token": "A-42", "position": 3, "eta_minutes": 24, "eta_clock": "11:05 AM"}
  ]
}
```

**Heartbeat:** SSE connections include heartbeat/keep-alive pings so clients can detect a dead connection and fall back rather than silently showing stale data forever.

---

## 15 — USER ROLES

| Role | Can do | Cannot do |
|---|---|---|
| **Patient** | View own token, position, live ETA, join/cancel queue, receive notifications | See other patients' data, alter queue order, mark emergencies, self-declare emergency status |
| **Doctor** | Start/complete consultations, mark no-show, request emergency insertion, set own availability | Approve their own emergency escalation beyond policy limits, edit other doctors' queues |
| **Reception/front-desk** | Register walk-ins, mark emergencies (with authorization level), mark no-shows, manually reassign patients between doctors, view all queues | Override audit log, delete history |
| **Admin** | Everything reception can, plus manage doctors/departments, view analytics, configure policies (grace periods, escalation limits) | — |
| **System (automated)** | Auto-flag suspected no-shows after grace period (flag only, never remove), recompute ETAs, emit notifications | Autonomously reassign patients across doctors without human confirmation |

---

## 16 — USER JOURNEYS

**Patient (happy path):**
`Arrive/register or book ahead → receive token (e.g., A-42) → join doctor's queue → view live position & ETA → notified as position advances → notified if ETA changes materially → called for consultation → consultation happens → marked complete → token closed`

**Patient (delay path):**
`Waiting → doctor's consultation runs long → system recalculates → ETA updates upward with a visible reason ("Current consultations are taking longer than usual") → optional push notification if delta exceeds threshold`

**Doctor:**
`Log in → set AVAILABLE → see next patient → press "Start Consultation" (timestamp recorded) → consult → press "Complete" (timestamp recorded, duration computed, rolling average updated) → next patient auto-surfaces → optionally mark emergency mid-queue → optionally mark a no-show → go ON_BREAK/UNAVAILABLE when needed`

**Reception/Admin:**
`View live cross-doctor board → notice Dr. A overloaded, Dr. B light → receive system workload recommendation → approve reassignment of a waiting (not yet called) patient → audit log records the action → affected patients' ETAs recalculate`

**Emergency:**
`Reception/doctor flags patient as emergency → authorization check → insertion policy applied (never blindly to front) → affected patients' positions/ETAs recalculated → notification with reason → event logged (actor, timestamp, reason)`

**No-show:** grace period elapses → soft system flag → human confirmation → `NO_SHOW` status → removed from active ordering → downstream ETAs recalculate (typically decrease) → audit event.

**Doctor unavailable → returns:** queue freezes (no new `IN_PROGRESS`) → ETAs show "delayed" without false precision → doctor returns AVAILABLE → queue resumes → next patient surfaces → ETAs recompute.

**Workload balancing / transfer:** system computes `load_score` per doctor → recommends assignment for new joins automatically; recommends reassignment for waiting patients but **requires explicit staff confirmation** before any move.

**ML fallback:** ML disabled/broken → `predict_duration()` wrapper falls back to EMA baseline silently → queue keeps functioning, no 5xx surfaces to the client.

**Real-time disconnection/reconnection:** SSE drops → UI shows "reconnecting" → client auto-reconnects or polls → re-syncs to authoritative server state on reconnect.

Every journey above includes both backend and frontend behavior — do not implement one without the other.

---

## 17 — EMERGENCY HANDLING

**The application must NOT diagnose emergencies.** A human — doctor (for their own current patient context) or reception/admin staff (front-desk triage) — always makes the call. Patients cannot self-declare emergency status; no patient-facing "mark me emergency" control exists at all.

**Priority levels (3-tier):** `ROUTINE` (default) → `URGENT` (bumped ahead of routine, behind any in-progress or already-queued URGENT/EMERGENCY) → `EMERGENCY` (bumped to immediately after the current in-progress consultation — "next," not necessarily literal position 1 if another EMERGENCY is already waiting).

**Insertion policy:** an EMERGENCY is inserted **after the currently in-progress consultation** (never interrupting a consultation already underway) and **after any earlier-flagged EMERGENCY still waiting** (FIFO within the emergency tier). This avoids indefinite starvation of the routine queue and the unsafe pattern of pulling a doctor mid-consultation.

**Authorization & abuse prevention:**
- Every emergency flag requires `actor_id`, `actor_role`, `reason` (short free-text), `timestamp`.
- Rate-limit / flag for review: unusually high emergency-marking frequency by one staff account relative to department baseline surfaces to an admin audit view — visible after the fact, not blocked (clinical judgment must never be blocked by software).
- Emergencies cannot be self-approved by a patient account.

**Recalculation & communication:** flagging an emergency immediately triggers queue re-ordering (§08) and ETA recomputation; each affected patient's UI shows the delta and a plain-language reason (e.g., "An emergency case was prioritized ahead of you").

**Audit trail:** every emergency event is permanently stored (`EmergencyEvent`) and visible in the admin audit log — who flagged it, when, why, which patients were affected.

---

## 18 — NO-SHOW SYSTEM

**Definition:** a patient who does not respond/appear when called, within a grace period, after being notified it is (or is near) their turn.

**Grace period:** configurable; default suggestion 5–10 minutes after being called, or after predicted turn passes a threshold with no check-in action.

**Detection:** system may auto-suggest/flag a likely no-show once the grace period elapses (soft visual flag: "P103 may be a no-show") — does **not** auto-remove the patient without staff confirmation, protecting against a patient who is in the building but momentarily stepped away.

**Human confirmation:** doctor or reception manually confirms via "Mark No-Show," keeping a human in the loop for a judgment call affecting care access.

**Removal from active queue:** once confirmed, status → `NO_SHOW`, excluded from active ordering (§08), all downstream `WAITING` entries recalculate immediately (wait typically decreases).

**History preservation:** never silently deleted — `NoShowEvent` records actor, patient, timestamp, grace-period metadata, and the entry itself remains in history/audit even though excluded from active ordering.

**Notification:** no-show patient optionally notified their slot was released (if contactable); may be offered re-queuing at the back per configurable clinic policy, rather than fully dropped.

**Audit:** `NoShowEvent` table, immutable.

---

## 19 — WORKLOAD BALANCING

**Load metric per doctor:**
```text
load_score(doctor) =
      w1 × waiting_patient_count
    + w2 × sum(predicted_duration_seconds for all waiting patients)
    + w3 × remaining_time_of_current_consultation
    + w4 × (priority_weight_bonus for any EMERGENCY/URGENT waiting)
```
Weights tunable (e.g., `w1=1`, `w2=1/60` to convert to minutes, `w3=1/60`, `w4` a fixed bonus per pending priority case). Key idea: **total predicted minutes of outstanding work**, not raw patient count — 6 fast patients can be a lighter load than 2 slow ones.

**Worked example:**
```text
Dr A: 6 patients, ~12 min avg → high total outstanding minutes → HIGH load
Dr B: 2 patients, ~9 min avg  → low total outstanding minutes  → LOW load
Dr C: 4 patients, ~11 min avg → medium total outstanding minutes → MEDIUM load
```

**New-patient assignment:** if compatible with more than one available, non-`OFFLINE`/`UNAVAILABLE` doctor (same department/specialization), recommend the doctor with the lowest current `load_score`. Presented as a recommendation at check-in; reception can override.

**Reassignment of an already-waiting patient:** the system may *suggest* a transfer when one doctor's load is far above another's, but this is always a **recommendation requiring explicit staff confirmation** — never silent automatic reassignment, because clinical specialization/continuity may make a transfer inappropriate even when it looks efficient on paper. Enforced at the API level: `GET /doctors/workload-recommendations` is read-only; the actual move requires a separate authorized `POST /queue/:id/transfer` call.

**Do not blindly optimize for shortest queue** — produce an explainable recommendation, and never send a patient to an incompatible doctor merely to reduce queue length.

---

## 20 — SECURITY

- RBAC enforced **server-side** on every mutating endpoint — never trust a client-side role check alone.
- Authentication for staff roles (standard session/JWT + RBAC middleware); patients use lightweight token-based identity (queue token, possibly + short PIN) — no full account creation required.
- Patient data isolation enforced at the query layer, not just the UI: a patient's token can only ever fetch their own `QueueEntry`.
- Input validation (schema validation, e.g., Pydantic/DRF serializers) on every mutating request.
- Rate limiting on auth endpoints and write-heavy endpoints (priority/no-show flags) to blunt abuse.
- Secure cookies/tokens; CSRF protection where session-based auth is used.
- Secrets management via environment variables/secret manager — **never hardcode API keys**, never commit secrets.
- Audit logging: immutable, insert-only `AuditEvent` rows — no update/delete path in the API for that table.
- Consistent error envelope `{error: {code, message}}`: 4xx for client/authorization errors, 5xx for server faults; the prediction fallback (§11) ensures a 5xx in the ML path never reaches the user.
- Transport security: HTTPS/TLS for all traffic in any deployed environment.
- Database protection: parameterized queries/ORM usage throughout, no raw string-interpolated SQL.

---

## 21 — PRIVACY

**Minimum necessary data only.** Explicitly avoid collecting or storing: diagnosis, clinical notes, medical history, sensitive patient information, lab results, prescriptions, vitals, insurance/billing data.

**Distinguish clearly:**
- **Operational queue data** (token, name, contact, timestamps, queue position, doctor assignment) — what this system needs and stores.
- **Clinical healthcare data** — explicitly out of scope; not collected.

**Claims discipline:**
- Do not claim the system performs medical diagnosis or triage in any clinical sense — it only reorders a queue based on human-authorized priority flags.
- Do not claim HIPAA/DPDP/any regulatory compliance certification — a hackathon prototype has not undergone the audits that "compliance" implies. Fair framing: "designed with data-minimization and RBAC principles in mind."
- Do not claim ML prediction accuracy beyond what has actually been validated on the demo dataset.

---

## 22 — API SPECIFICATION

```text
Auth
POST   /auth/login
POST   /auth/logout

Doctors & Departments
GET    /departments
GET    /doctors?department_id=
GET    /doctors/:id
GET    /doctors/:id/availability
POST   /doctors/:id/availability          (staff only)
GET    /doctors/:id/workload
GET    /doctors/workload-recommendations  (read-only, staff)

Patients & Queue
POST   /patients                          (register/create token)
POST   /appointments
POST   /queue/join
GET    /queue/:doctor_id                  (full live queue, staff view)
GET    /patients/:token/wait-time         (patient view, own entry only)
POST   /queue/:entry_id/cancel

Consultations
POST   /consultations/start               {queue_entry_id}
POST   /consultations/:id/complete

Priority / No-show / Transfer (RBAC + AuditEvent write required)
POST   /queue/:entry_id/priority          {level, reason}
POST   /queue/:entry_id/no-show           {reason}
POST   /queue/:entry_id/transfer          {to_doctor_id, reason}

Real-time
GET    /stream/doctors/:id/queue          (SSE)
GET    /stream/patients/:token            (SSE)

Audit & Analytics
GET    /audit-events?actor=&type=&from=&to=
GET    /analytics/wait-times?department_id=&range=

Health
GET    /health
```

For every endpoint at implementation time, document: method, path, authentication requirement, role required, request/response schema, validation rules, error cases, side effects (queue recalculation, SSE event emission), and audit requirement. Full request/response bodies to be filled in during Phase 1–2 implementation, not invented ahead of the real schema.

---

## 23 — FRONTEND ARCHITECTURE

**Stack:** React + TypeScript, Tailwind CSS utility classes + small design system (§27), React Query/TanStack Query for REST, native `EventSource` for SSE.

**Structure:**
```text
/patient   — mobile-first (token/ETA screen, queue timeline, history)
/doctor    — desktop-first (current/next patient, controls, workload)
/admin     — desktop-first (cross-doctor board, audit log, analytics)
/shared    — component library (QueueCard, WaitTimeCard, PriorityBadge, etc.)
```

**State management:** server state (queue, predictions) lives in a query cache refreshed by SSE push (invalidate/patch cache entries on incoming events) rather than a heavy global client-state store — keeps the UI a faithful mirror of server truth, avoiding "UI says one thing, server says another" bugs.

**Responsive rule:** patient-facing screens mobile-first (single column, large type, big ETA numbers); staff-facing dashboards desktop-first (dense tables, multi-column boards) but usable on tablet at minimum.

**Required states for every data view:** loading (skeleton, not spinner-only), empty, error (retry affordance), success, warning (delay), and a distinct emergency visual state (used sparingly, to preserve urgency signal).

**Accessibility:** WCAG AA contrast, keyboard navigation, focus states, screen-reader labels, semantic HTML, touch targets, reduced-motion support, non-color status communication, accessible forms/dialogs.

---

## 24 — PATIENT UI

Mobile-first design. Main information block:
```text
YOUR TOKEN: A-42
NOW SERVING: A-37
PEOPLE AHEAD: 4
ESTIMATED WAIT: 25–35 min
EXPECTED TURN: ~11:42 AM
DOCTOR STATUS: [badge]
WHY ETA CHANGED: [expandable reason]
```

**Screens:**
- **Live Wait Screen** (single most important screen) — `WaitTimeCard` (huge ETA + clock time), `QueueTimeline`, "Why did this change?" expandable, `NotificationCenter` badge. Loading skeleton on first load; error state shows last-known cached value with a "reconnecting…" banner; distinct warning state when ETA increases beyond threshold.
- **Queue Position/Timeline** — anonymized positions ahead, no other patient's identity ever shown.
- **Join Queue/Token Creation** — department/doctor picker, confirm; error if doctor `OFFLINE`.
- **Notifications/History** — past visits and notifications.

**Never reveal other patients' identity or sensitive information.**

---

## 25 — DOCTOR UI

**Dashboard (core screen) components:** `ConsultationTimer` (current patient, running time vs. predicted — soft amber cue, not alarming, when it exceeds prediction), "Start"/"Complete" buttons, `QueueCard` list (next patients), `PredictionConfidence` chip (baseline vs. ML source), `WorkloadCard` (own load vs. peers), `DoctorAvailabilityControl`, `EmergencyDialog`, `NoShowDialog`.

**Data shown:** current patient, next patient, full waiting list, rolling avg duration, predicted next duration, own workload score.

**States:** empty ("No patients waiting"), loading, error with retry.

**Responsive:** desktop-first, usable on tablet.

Server timestamps are authoritative — the doctor's local clock never determines recorded duration.

---

## 26 — RECEPTION / ADMIN UI

**Live Board:** department overview grid, per-doctor mini `WorkloadCard`s, `QueueTransferDialog`, `EmergencyDialog`, `NoShowDialog`, `DoctorAvailabilityControl` (for all doctors), `AnalyticsChart`, `NotificationCenter` (system alerts), audit log table. Empty state ("No active queues"); alert banner when any doctor exceeds overload threshold.

**Audit Log** — full transparency/history of priority, no-show, transfer, availability events; read-only, filterable by actor/date/type.

**Analytics** — aggregate view: average wait by department/doctor/time-of-day, no-show rate, emergency frequency, doctor utilization, prediction-accuracy tracking (compare `WaitingTimePrediction.eta_seconds` against realized outcomes — also how you'd empirically judge whether ML is beating baseline).

**High-risk operations require confirmation** (transfers, availability overrides, emergency approval where policy demands it).

---

## 27 — VISUAL DESIGN SYSTEM

**Design intent:** a premium healthcare product, not a generic hackathon dashboard. Communicate trust, calm, precision, safety, modern technology, professionalism — "airline gate display" clarity crossed with modern healthcare polish.

| Token | Guidance |
|---|---|
| Color | Neutral base (soft white/near-white bg, dark slate text) + one calm primary accent (blue/teal) + semantic colors (green/amber/red) — never color alone, always paired with label/icon |
| Typography | One clean sans-serif family; large, tabular-numeral weight for the ETA number itself (the single most important element on the patient screen) |
| Spacing | Generous whitespace on patient screens (reduces perceived anxiety of waiting); denser, information-rich spacing on staff dashboards |
| Cards | Flat, subtly bordered cards, not heavy drop-shadows |
| Status badges | Pill-shaped, color+icon+text (e.g., Available / On Break / Emergency) |
| Charts | Simple bar/line charts only — no 3D/gimmick charts |
| Motion | Minimal, purposeful only — never animate in a way that could visually mask or delay the arrival of a real-time update |
| Grid/Buttons/Forms/Tables/Icons/Shadows/Borders/Radius | Define a coherent, small design-token set at implementation time; avoid ad hoc one-off styling per screen |

**Avoid:** gaming aesthetics, excessive neon/glassmorphism, distracting particles, constant motion, huge decorative 3D, visual clutter, low-contrast text, aggressive gradients, overly playful effects — anything that makes a hospital product feel unreliable.

**Light/dark mode (if supported):** both modes deliberately designed, not simple color inversion; check charts, dialogs, borders, shadows, status badges, text in both. Theme switching must be smooth with no noticeable lag — avoid expensive whole-app re-renders on theme change.

---

## 28 — COLOR PSYCHOLOGY

Deliberate healthcare-appropriate semantic palette: Primary, Secondary, Success, Warning, Danger, Info, Neutral, Background, Surface, Border, Text, Muted text.

**Never communicate meaning using color alone** — pair every status color with an icon and/or text label, both for accessibility and because a hospital product cannot afford ambiguous status signals.

---

## 29 — WORLD-CLASS MOTION

**Possible resources:** Framer Motion/Motion, Motion Primitives, GSAP, Aceternity UI, Magic UI, Lumenite UI, LottieFiles.

**Use motion for:** page transitions, queue movement, ETA changes, notifications, status changes, dialogs, loading, important state changes (subtle ETA number transitions, doctor status transitions, notification entrance/exit, emergency state transitions).

**Avoid:** constant/perpetual motion, animation on every component, heavy blur, excessive parallax, gaming effects, expensive canvas/filter effects, motion that interferes with clinical information or delays perception of a real-time update.

---

## 30 — 3D

3D must be purposeful, never load-bearing for core functionality.

**Possible technologies:** Three.js, React Three Fiber, Spline.

**Appropriate use:** landing-page hero, premium visual explanation, subtle depth.

**Do NOT make the live patient queue dependent on heavy 3D** — 3D must never compromise performance on the screens that matter most (patient live-wait screen, doctor dashboard).

---

## 31 — DESIGN RESOURCE STRATEGY

Consider selectively, not wholesale: Aceternity UI, Motion Primitives, Magic UI, Lumenite UI, Framer Motion, GSAP, Three.js, React Three Fiber, Spline, LottieFiles, Haikei, BGJar, Lucide, Geist, Inter, Awwwards, Mobbin, Land-book, Page Flows (reference libraries).

**Do not install everything.** Choose based on: design fit + performance + accessibility + maintainability. Never combine unrelated visual systems just because they're available.

---

## 32 — PERFORMANCE ENGINEERING

**Hard requirement: no noticeable lag** when switching themes, navigating, opening dialogs, updating queues, receiving SSE events, animating ETAs, loading dashboards, rendering charts, or using mobile devices.

**Measure:** initial load, bundle size, CPU, memory, network requests, rendering, long tasks, animation smoothness, mobile performance — measure before adding effects, not after.

**Prefer:** code splitting, lazy loading, dynamic imports, optimized assets, CSS transforms/opacity (GPU-friendly), efficient state updates, memoization where justified, virtualization for large lists if needed.

**Avoid:** large animated blurs, huge repeatedly-animated shadows, expensive filters, full-screen canvas effects, heavy 3D everywhere, large unoptimized assets, unnecessary polling/network requests.

**If an effect causes lag, optimize it or remove it. A beautiful interface that lags is a failed implementation.**

---

## 33 — ACCESSIBILITY

WCAG-oriented contrast, keyboard navigation, focus states, screen-reader labels, semantic HTML, adequate touch targets, reduced-motion support, non-color status communication, accessible forms, accessible dialogs.

---

## 34 — FAILURE / DEGRADATION STRATEGY

| Failure | Handling |
|---|---|
| ML prediction service errors/times out | Wrapper falls back to EMA baseline (§11); logged, never surfaced as a user-facing error |
| SSE connection drops | Client auto-reconnects (native `EventSource`) and/or falls back to short-interval polling; UI shows a subtle "reconnecting" indicator, never blank/broken |
| Concurrent conflicting queue mutation | DB transaction + row lock ensures only one wins; the loser's client re-syncs from the next broadcast state, not a stale local mutation |
| Doctor forgets to press "Complete" | Reception manual correction via an audited admin override endpoint |
| Database briefly unavailable | API returns 503 with retry-after; client shows last-known cached state, never crashes |
| Notification/external delivery provider fails | In-app SSE notification remains the primary, always-available channel; external delivery is optional and non-blocking |

**Core queue functionality must remain usable wherever reasonably possible** — no single optional component's failure should take down the core loop (queue viewing, ETA, start/complete consultation).

---

## 35 — TESTING STRATEGY

| Layer | What to test | Example |
|---|---|---|
| Unit — Queue Engine | Ordering, state transitions, isolated, no DB/ML | "3 waiting + 1 emergency flagged → emergency placed after in-progress, before routine" |
| Unit — Prediction wrapper | Fallback behavior | "ML predictor raises → `predict_duration()` returns EMA baseline value, not an error" |
| Unit — Workload scoring | Load metric arithmetic | Matches the §19 worked example given fixed inputs |
| Integration | API endpoints against a real test DB | Marking no-show removes entry from `GET /queue/:doctor_id` active list and recalculates downstream ETAs |
| Concurrency | Race conditions | Two simultaneous "complete" requests → only one transition succeeds; other gets idempotent response |
| End-to-End | Full user journeys via UI automation | Patient joins → sees ETA → doctor completes ahead of them → patient's ETA visibly decreases without manual refresh |
| Load (lightweight) | Recalculation performance under realistic queue sizes | Recompute completes under target latency (§32/§10) |
| Security | RBAC boundary tests | Patient token A cannot fetch patient token B's wait-time; non-staff cannot call priority/no-show endpoints |
| Accessibility | Keyboard/mobile/contrast | All defined UI states pass a WCAG AA contrast + keyboard-nav check |
| Regression | Existing features after each phase | No previously-passing test breaks after a new phase lands |

**Acceptance criteria (objectively checkable, from Research Blueprint appendix):**
- Given ≥3 historical consultation durations for a doctor, the waiting-time engine returns an estimate derived from that history, not a hardcoded constant.
- `POST /consultations/:id/complete` succeeding causes every `WAITING` entry for that doctor to show a recalculated `eta_seconds` within one recompute cycle.
- Authorized `POST /queue/:entry_id/priority {level: EMERGENCY}` repositions the entry per insertion policy, updates affected ETAs, and creates `EmergencyEvent` + `AuditEvent` rows.
- `POST /queue/:entry_id/no-show` sets status to `NO_SHOW`, excludes it from active ordering, and recalculates downstream ETAs.
- With ≥2 available compatible doctors, `GET /doctors/workload-recommendations` returns the lower-`load_score` doctor.
- With ML deliberately disabled/broken in a test, the engine still returns a valid, non-null estimate from baseline, and no 5xx reaches the client.
- A change in one authenticated session is visible in a second, independent session without manual refresh, within target latency.
- A patient token cannot retrieve another patient's wait-time data (verified via a 403/404 assertion, not data comparison).

---

## 36 — MANDATORY END-TO-END DEMO

This exact scenario must pass before the project is considered demo-ready. Do not consider any phase "done" if this scenario cannot yet be run end-to-end once all relevant phases are complete.

1. Three doctors are available.
2. Multiple patients enter queues.
3. Doctor A starts a consultation.
4. Consultation exceeds prediction.
5. ETA increases.
6. Patient UI updates without refresh.
7. Authorized staff adds/marks an emergency.
8. Queue reorders per insertion policy.
9. ETAs update.
10. Affected patients see why.
11. A patient becomes a no-show.
12. Queue recalculates (typically shrinks/improves).
13. Doctor A becomes unavailable.
14. Workload engine recommends a compatible doctor.
15. Staff approves the transfer.
16. Both queues update.
17. Audit records everything.
18. ML is disabled.
19. EMA fallback continues seamlessly.
20. SSE disconnects.
21. UI displays "reconnecting."
22. SSE reconnects.
23. Authoritative state is resynchronized.
24. No corruption occurs anywhere in the above.

---

## 37 — IMPLEMENTATION PHASES

Sequential plan, synthesized from both the Research Blueprint roadmap (§40) and the existing Antigravity implementation prompt. This is the canonical phase list — `PS7_IMPLEMENTATION_PLAN.md` (§38) tracks live status against it.

| Phase | Objective | Key files/modules (indicative) | Dependencies | Acceptance criteria | Tests |
|---|---|---|---|---|---|
| **0** | Repository audit — inspect any existing codebase, identify stack/features/blockers before writing anything new | root config, `ARCHITECTURE.md`, `.env.example` | None | Project boots, or blocker identified and resolved | N/A (audit) |
| **1** | Foundation — project structure, DB connection, env config, auth, roles, RBAC, error handling, logging, health endpoint, test framework, migrations | `models/`, `migrations/`, `auth/` | Phase 0 | App starts, DB connects, auth works, unauthorized mutations rejected | Model + RBAC unit tests |
| **2** | Database — full data model (§07) with constraints/indexes/transaction-safe mutations | `models/`, `migrations/` | Phase 1 | Clean migrations, seed data, correct relationships, invalid states rejected | Constraint tests |
| **3** | Core queue engine — deterministic ordering, all state transitions (§08), transactional locking | `queue_service/` | Phase 2 | Identical state + identical event sequence → identical queue state | Ordering unit tests |
| **4** | Consultation tracking — start/complete timestamps, duration derivation (§09) | `consultations/` | Phase 3 | Real consultation lifecycle produces reliable duration records | Duration arithmetic tests |
| **5** | Dynamic waiting-time engine — baseline ETA calculation (§10, §11 baseline) | `prediction_service/baseline.py`, `queue_service/eta.py` | Phase 4 | Worked example reproduces correctly against seeded data | Engine unit tests with fixed fixtures |
| **6** | Emergency handling — priority insertion policy (§17), audit writes | `queue_service/priority.py`, `audit/` | Phase 5 | Insertion-policy examples reproduce; audit log records both actor+reason | Insertion-policy + audit tests |
| **7** | No-show handling — grace period, soft flag, confirmation flow (§18) | `queue_service/no_show.py`, `audit/` | Phase 6 | No-show examples reproduce; downstream ETAs recalc correctly | No-show tests |
| **8** | Doctor availability — state machine (§17 blueprint), queue effects | `doctors/availability.py` | Phase 5 | Availability changes correctly affect queue/ETA/workload | Availability-effect tests |
| **9** | Multi-doctor workload balancing — `load_score`, read-only recommendation + authorized transfer (§19) | `workload_service/` | Phases 6–8 | §19 worked example reproduces; transfer requires explicit confirmation, never implicit | Load-score + transfer-authorization tests |
| **10** | ML prediction (optional) — offline scikit-learn model behind `predict_duration()` fallback wrapper (§11 ML) | `prediction_service/ml_model.py`, `ml/train.py` | Phase 5 | Disabling/breaking the model never breaks the queue | Fallback-on-failure test + baseline-comparison sanity check |
| **11** | Synthetic data — Faker + custom simulator, reproducible seeds (§13) | `scripts/seed.py`, `scripts/simulate.py` | Phase 2 (schema) | Seed script populates realistic historical + live-demo data | Seed script runs cleanly |
| **12** | Real-time SSE — event pipeline (§14), reconnect handling | `notification_service/`, SSE endpoints | Phases 3–9 | Second, independently open patient tab reflects a change within 2s, no manual refresh | E2E real-time propagation test |
| **13** | Notifications — in-app via SSE, threshold-based triggering | `notification_service/thresholds.py`, `NotificationCenter` | Phase 12 | Only meaningful ETA deltas trigger a distinct notification | Threshold-triggering tests |
| **14** | Patient UI — Live Wait screen and related screens (§24) | `frontend/patient/` | Phases 5, 12 | All defined states render correctly; mobile-first | Screen-state coverage |
| **15** | Doctor UI — dashboard (§25) | `frontend/doctor/` | Phases 4, 6–9, 12 | All defined states render correctly | Screen-state coverage |
| **16** | Reception/Admin UI — live board, audit log, analytics (§26) | `frontend/admin/` | Phases 6–9, 12 | All defined states render correctly; high-risk actions require confirmation | Screen-state coverage |
| **17** | Visual design/motion/3D/performance polish (§27–§32) | `frontend/shared/`, design tokens | Phases 14–16 | UI Quality Gate (below) passes; no measurable lag introduced | Perf checks |
| **18** | Full testing — complete suite from §35 including concurrency and security | `tests/` (all layers) | All prior phases | All acceptance criteria pass | Full suite green |
| **19** | Deployment — containerize, deploy, run seed script in deployed env, verify `/health` | deployment configs, `/health` | Phase 18 | Fresh browser, no prior state, can complete the full demo story (§36) against the deployed URL | Deployment smoke test |
| **20** | Final optimization + judge demo prep — rehearse §36 scenario, prepare offline fallback demo | demo-mode scripts | Phase 19 | §36 scenario runs end-to-end without manual intervention | Full demo rehearsal |

**Guiding rule for every phase:** if a phase's work seems to require changing something outside its listed files/modules, stop and treat that as a signal this master spec needs a deliberate, explicit update under Change Control (§39) — not a silent scope drift.

**Implementation order (never reverse):** `Reliable core → prediction → real-time → premium UX → motion/3D polish`. Do not polish animations while queue logic is broken; do not sacrifice correctness for visuals, performance for animations, security for convenience, or explainability for AI buzzwords.

**UI Quality Gate (apply before considering Phase 17 done):** alignment, typography, spacing, consistency, contrast, responsive behavior, empty/loading/error/success states, hover/focus states, keyboard accessibility, motion consistency, reduced-motion support, dark mode if enabled, no clutter.

---

## 38 — IMPLEMENTATION AGENT INSTRUCTIONS

The implementation agent (e.g., Antigravity) executes this specification without requiring a fresh prompt for every phase.

```text
Read this master specification (PS7_MASTER_IMPLEMENTATION_SPEC.md)
        ↓
Inspect the repository
        ↓
Create/read PS7_IMPLEMENTATION_PLAN.md (live phase-tracking file)
        ↓
Execute current phase
        ↓
Test
        ↓
Fix failures
        ↓
Update PS7_IMPLEMENTATION_PLAN.md
        ↓
Move to next phase
```

`PS7_IMPLEMENTATION_PLAN.md` (a separate, continuously updated companion file the agent maintains — not this document) must track: objective, source documents, final architecture, technology decisions, complete phase list, current phase, completed phases, pending phases, acceptance criteria, tests, known issues, architecture decisions, files changed per phase, dependencies, performance requirements, UI/UX rules, motion/design rules, security rules, do-not-change rules, final demo checklist.

**Do not make the implementation agent ask for permission after every phase.** It should continue automatically unless genuinely blocked by: a missing secret/credential that cannot safely be generated, a destructive action requiring authorization, or a contradiction in the source documents that this master spec doesn't already resolve.

**Existing feature protection:** before modifying any existing functionality — `inspect → understand → test → modify minimally → regression-test`. Do not accidentally break theme switching, navigation, authentication, existing dashboards, existing APIs, settings, responsive behavior, or any other already-working feature. Do not touch unrelated features during a phase unless a genuine dependency requires it.

**No fake features:** every important visible feature must connect to real application behavior. No decorative "AI Prediction" cards without a real model/baseline behind them, no fake live queues, no fake workload numbers, no buttons with no backend behavior, no charts using hardcoded values. Seed/demo data is fine; functionality must remain dynamic.

---

## 39 — CHANGE CONTROL

Whenever a new requirement, correction, or piece of information is provided:

1. Read the new requirement.
2. Compare it against this master specification.
3. Identify every affected section.
4. Update every affected section explicitly (do not summarize the change away).
5. Update the Requirement Traceability Matrix (§03).
6. Update the relevant implementation phase(s) (§37) if necessary.
7. Update dependencies noted in §37.
8. Update tests (§35).
9. Update UI requirements (§23–§26) if relevant.
10. Update API/data requirements (§07, §22) if relevant.
11. Record the change below in the change log, with date, what changed, why, and source authority level.
12. If the new information **conflicts** with something already in this document, do NOT silently overwrite: state what each source says, determine which has higher authority (§ "Source Authority" below), preserve the rejected requirement in the Superseded/Decisions section, and record the final decision and reason.

### Source Authority (unchanged from your original instructions)
1. **Level 1** — Official PS7 problem-statement PDF *(not yet supplied as a distinct document — see §0)*
2. **Level 2** — PS7 research blueprint (`PS7_Research_Blueprint.md`)
3. **Level 3** — Project requirements provided directly by you (may exceed literal PS7 wording)
4. **Level 4** — Previous project discussions/decisions (`PS7_Antigravity_Master_Implementation_Prompt.md`)
5. **Level 5** — Engineering reasoning, used only to fill genuine gaps, never converted into a requirement on its own authority

### Change Log

| Date | Change | Reason | Source authority |
|---|---|---|---|
| 2026-08-29 | Initial master spec created, consolidating `ai_development_blueprint.pdf`, `PS7_Research_Blueprint.md`, `PS7_Antigravity_Master_Implementation_Prompt.md` | First creation per your master prompt | Levels 2 & 4 (see §0 for Level 1 gap) |

### Superseded / Decisions (empty for now — populate as real conflicts arise)

*(No conflicts between the Research Blueprint and the Antigravity prompt were found — the latter is a faithful phased operationalization of the former, so nothing has been superseded yet. The one open item is the missing Level 1 PDF, tracked in §0 and §02, not treated as a resolved conflict.)*

---

*End of master specification. Do not fork this into a second document — all future updates happen here, in place, via §39 Change Control.*

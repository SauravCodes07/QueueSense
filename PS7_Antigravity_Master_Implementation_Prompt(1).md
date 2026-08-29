# PS7 — MASTER PHASED IMPLEMENTATION PROMPT FOR ANTIGRAVITY

## Purpose

You are the implementation agent for PS7: **Outpatient Wait-Time & Dynamic Queue Velocity Tracker**.

You have two authoritative project documents:
1. The official PS7 problem-statement PDF — authority for what the hackathon requires.
2. `PS7_Research_Blueprint.md` — the researched product and technical blueprint.

Read BOTH completely before making substantial changes.

PS7 requires a dynamic outpatient queue that continuously estimates waiting time from the doctor's current consultation speed, updates patients when delays or priority changes occur, and supports emergency handling, no-shows, and workload balancing between available doctors.

---

# ABSOLUTE OPERATING RULE

## DO NOT BUILD THE ENTIRE APPLICATION IN ONE SHOT.

The user will NOT provide a new prompt for every implementation phase.

You must therefore:
1. Inspect the repository first.
2. Create a persistent implementation-control file.
3. Divide work into phases.
4. Implement phases sequentially.
5. Test every phase.
6. Fix failures before continuing.
7. Preserve working functionality.
8. Continue automatically after a phase passes.
9. Never silently expand scope.
10. Stop only for a genuinely blocking decision, missing secret/credential that cannot safely be generated, destructive action requiring authorization, or contradiction in the source documents.

This is healthcare-related software. **Correctness, reliability, privacy, consistency and safety take priority over implementation speed.**

Do not simplify critical logic merely because it is difficult.

---

# FIRST TASK — CREATE IMPLEMENTATION CONTROL FILE

Create:

`PS7_IMPLEMENTATION_PLAN.md`

It must track:
- Objective
- Source documents
- Final architecture
- Technology decisions
- Complete phase list
- Current phase
- Completed phases
- Pending phases
- Acceptance criteria
- Tests
- Known issues
- Architecture decisions
- Files changed per phase
- Dependencies
- Performance requirements
- UI/UX rules
- Motion/design rules
- Security rules
- Do-not-change rules
- Final demo checklist

Update it after every completed phase.

---

# SOURCE-OF-TRUTH HIERARCHY

Use this order:
1. Official PS7 PDF
2. `PS7_Research_Blueprint.md`
3. Existing project code
4. Sound engineering judgment only where the documents are silent

Do not present optional features as PS7 requirements.

---

# PHASE 0 — REPOSITORY AUDIT

Before substantial coding:
- Inspect the complete relevant repository.
- Identify framework, frontend, backend, database, authentication, dependencies, environment variables and deployment setup.
- Identify existing features and broken features.
- Identify performance problems.
- Identify duplicate/dead code.
- Identify features that must be preserved.
- Map the current architecture.

Do NOT rewrite an existing project merely because another stack is theoretically better.

Create/update:
- `PS7_IMPLEMENTATION_PLAN.md`
- `ARCHITECTURE.md`
- `.env.example`

Never commit secrets.

Acceptance: project boots, or any blocker is identified and resolved.

---

# PHASE 1 — FOUNDATION

Implement/verify:
- Project structure
- Database connection
- Environment configuration
- Authentication
- Roles: PATIENT, DOCTOR, RECEPTION, ADMIN
- RBAC
- Error handling
- Logging
- Health endpoint
- Test framework
- Migrations

Acceptance:
- Application starts
- Database connects
- Authentication works
- Unauthorized mutations are rejected
- Tests pass

---

# PHASE 2 — DATABASE

Implement the blueprint's data model for:
- Patients
- Doctors
- Departments
- Doctor availability
- Appointments
- Queue entries
- Consultations
- Consultation durations
- Priority/emergency events
- No-show events
- Transfers
- Predictions
- Notifications
- Audit events

Use:
- Foreign keys
- Constraints
- Indexes
- Correct timestamps
- Status/state validation
- Transaction-safe mutations

Minimize sensitive healthcare data. Do not create clinical records that PS7 does not require.

Acceptance:
- Clean migrations work
- Seed data works
- Relationships are correct
- Invalid states are rejected
- Tests pass

---

# PHASE 3 — CORE QUEUE ENGINE

Build the deterministic queue engine BEFORE ML.

Handle:
- Joining
- Ordering
- Current consultation
- Waiting
- Completion
- Cancellation
- No-show
- Transfer
- Priority
- Doctor availability

Queue behavior must be deterministic.

Protect mutations with database transactions/appropriate locking.

Test:
- Normal queue
- Multiple joins
- Consultation start
- Consultation completion
- Cancellation
- No-show
- Priority insertion
- Transfer
- Doctor unavailable
- Simultaneous mutations

Acceptance: identical state + identical event sequence always produces identical queue state.

---

# PHASE 4 — CONSULTATION TRACKING

Implement software-only consultation timing.

Flow:
`Start Consultation → server timestamp → Complete Consultation → server timestamp → duration = end-start → historical record`

No physical hardware is required.

Prevent:
- Double-start
- Completing an unstarted consultation
- Double completion
- Negative duration
- Unauthorized historical modification

Acceptance: real consultation lifecycle produces reliable duration records.

---

# PHASE 5 — DYNAMIC WAITING-TIME ENGINE

Implement the actual ETA engine.

It must consider:
- Current consultation remaining time
- Predicted service duration of patients ahead
- Queue order
- Emergency priority
- No-shows
- Doctor availability
- Transfers
- Completed consultations

Conceptually:

`ETA(patient) = remaining current service + sum(predicted service times ahead)`

Handle all edge cases from the blueprint.

Do NOT display false precision. Prefer:
- `Estimated wait: 25–35 min`
- `About 30 minutes`

rather than exact-looking false precision.

Every relevant queue event must trigger correct downstream recalculation.

---

# PHASE 6 — EMERGENCY HANDLING

Implement authorized emergency/priority handling.

The system does NOT diagnose emergencies. An authorized person marks priority.

Do not interrupt an already-running consultation by default. Prefer:
`Current consultation finishes → emergency receives priority → remaining queue recalculates`

Audit:
- Actor
- Role
- Timestamp
- Reason
- Previous state
- New state

Affected patients must see an understandable reason.

Prevent unauthorized priority manipulation.

Acceptance:
- Authorization
- Correct ordering
- Audit
- ETA recalculation
- Real-time update
- No queue corruption

---

# PHASE 7 — NO-SHOW

Implement:
- Staff-controlled no-show
- Configurable grace period
- Optional automated FLAG only
- Human confirmation where appropriate
- Removal from active queue
- ETA recalculation
- Audit event
- Historical preservation

Never silently delete history.

---

# PHASE 8 — DOCTOR AVAILABILITY

Implement useful availability states, for example:
`AVAILABLE, BUSY, ON_BREAK, UNAVAILABLE, OFFLINE`

Define behavior when doctors:
- Start shift
- Start consultation
- Break
- Return
- Become unavailable
- Return from unavailable state

Availability changes must affect queue/workload calculations correctly.

---

# PHASE 9 — MULTI-DOCTOR WORKLOAD BALANCING

Calculate workload using appropriate factors:
- Queue length
- Predicted service duration
- Current consultation remaining time
- Availability
- Department
- Specialization/compatibility
- Priority cases

Show:
- Doctor
- Current load
- Estimated completion time
- Availability
- Recommendation
- Reason

Do not automatically move an already-waiting patient across doctors without authorization.
Never send a patient to an incompatible doctor merely to reduce queue length.

---

# PHASE 10 — BASELINE PREDICTION

Implement an always-available prediction baseline:
- EMA or weighted recent average
- Doctor-specific history where available
- Department/global fallback for cold start

The baseline must work with zero historical doctor data.

It must react to current consultation speed.

No external AI API is required.

---

# PHASE 11 — ML PREDICTION

Only after the deterministic system is reliable.

Preferred initial direction:
`Python + scikit-learn`

Evaluate lightweight tabular models such as gradient boosting/random forest and select based on measured performance.

ML primarily predicts:
`next consultation duration`

The queue engine converts those predictions into patient waiting-time estimates.

Potential operational features:
- Doctor
- Department
- Hour
- Day of week
- Recent durations
- Rolling doctor average
- Queue length
- Time since shift start
- Legitimate priority/context features

Avoid unnecessary medical information.

Use temporal train/validation/test separation to reduce leakage.

Compare ML against the baseline.

If ML does not meaningfully improve the baseline, retain the baseline as the production/default estimator.

Mandatory fallback:
`ML unavailable → EMA baseline`

The queue must never stop because ML fails.

No Gemini/ChatGPT/LLM/Hugging Face hosted inference should be added merely for appearance.

---

# PHASE 12 — SYNTHETIC DATA

Create realistic synthetic operational data using Faker/custom simulation.

Generate:
- Doctors
- Departments
- Synthetic patient identifiers
- Consultation timestamps
- Consultation durations
- Queue events
- No-shows
- Priority events
- Availability events

Use reproducible random seeds.

Do not claim synthetic data represents real hospital data.

Seed enough historical records to demonstrate prediction/ML.

---

# PHASE 13 — REAL-TIME

Implement real-time updates.

Preferred flow:
`REST mutation → DB transaction → queue recalculation → event → SSE → clients`

Use SSE where one-way server-to-client streaming is sufficient.

Do not add WebSockets just to make the stack look advanced.

Events should cover:
- Consultation started/completed
- ETA changed
- Queue position changed
- Emergency
- No-show
- Transfer
- Doctor availability
- Workload
- Relevant notifications

If SSE disconnects:
- Show reconnecting state
- Preserve safe last-known state
- Reconnect
- Re-fetch authoritative server state

Stale data must never silently appear current.

---

# PHASE 14 — NOTIFICATIONS

Start with in-app notifications.

Optional external channels:
- Email
- SMS
- Push

External providers are not required for core PS7.

Use meaningful thresholds to prevent notification spam.

Example:
small ETA change → no notification
large meaningful change → notification

Make thresholds configurable.

---

# PHASE 15 — PATIENT UI

Build a premium mobile-first patient experience.

The most important screen should clearly show:
- Token
- Now serving
- People ahead
- Estimated wait
- Expected turn
- Doctor status
- Why ETA changed

Example structure:
`YOUR TOKEN: A-42`
`NOW SERVING: A-37`
`PEOPLE AHEAD: 4`
`ESTIMATED WAIT: 25–35 min`
`EXPECTED TURN: ~11:42 AM`

Include:
- Queue timeline
- Notifications
- Reconnecting state
- Loading state
- Error state
- Last-known state where safe

Never reveal another patient's identity or sensitive information.

---

# PHASE 16 — DOCTOR UI

Build:
- Current patient
- Reliable consultation timer
- Predicted duration
- Actual duration
- Queue
- Next patient
- Workload
- Availability
- Emergency workflow
- No-show workflow
- Prediction information

Server timestamps are authoritative.

---

# PHASE 17 — RECEPTION / ADMIN UI

Build:
- Cross-doctor live board
- Queue overview
- Workload comparison
- Emergency workflow
- No-show management
- Availability
- Transfer/reassignment
- Alerts
- Audit log
- Useful analytics

High-risk actions require confirmation.

---

# PHASE 18 — WORLD-CLASS HEALTHCARE UI/UX

The application must look like a premium modern healthcare product, not a generic CRUD dashboard.

Visual goals:
- Trust
- Calm
- Precision
- Safety
- Modern technology
- Accessibility

Avoid:
- Gaming aesthetics
- Excessive neon
- Excessive glassmorphism
- Distracting particles
- Constant motion
- Huge decorative 3D objects
- Visual clutter
- Low-contrast text
- Aggressive gradients
- Overly playful effects
- Anything that makes a hospital product feel unreliable

Use a coherent design system rather than random effects.

---

# MOTION / ANIMATION SYSTEM

Use world-class motion selectively and functionally.

Appropriate uses:
- Smooth navigation transitions
- Queue position changes
- Subtle ETA number transitions
- Doctor status transitions
- Notification entrance/exit
- Emergency state transitions
- Dialog transitions
- Lightweight loading skeletons

Avoid:
- Perpetual animations
- Animation on every component
- Expensive blur animation
- Excessive parallax
- Heavy canvas effects
- Motion that interferes with clinical information

Use Motion/Framer Motion, GSAP, CSS animation, or other appropriate tools based on measured performance.

---

# 3D

3D is allowed but purposeful.

Good use:
- One premium interactive 3D element on the landing/hero page
- Subtle depth where appropriate
- Lightweight visualization when it improves comprehension

Possible technologies:
- Spline
- Three.js
- React Three Fiber

Do NOT put heavy 3D on live patient queue screens.

The patient queue must remain extremely fast.

---

# VISUAL RESOURCE STRATEGY

Previously identified resources may be used selectively:
- Aceternity UI
- Motion Primitives
- Magic UI
- Lumenite UI
- Motion / Framer Motion
- GSAP
- Three.js / React Three Fiber
- Spline
- LottieFiles
- Haikei
- BGJar
- Lucide
- Geist / Inter
- Awwwards
- Mobbin
- Land-book
- Page Flows

These are resources, not instructions to install everything.

Select components that fit the healthcare design language and are performant.

Never combine unrelated visual systems just because they are available.

---

# COLOR SYSTEM

Create a healthcare-appropriate semantic palette:
- Primary
- Secondary
- Success
- Warning
- Danger
- Info
- Neutral
- Background
- Surface
- Border
- Text
- Muted text

Prioritize trust, calm, clarity and safety.

Never use color as the sole indicator. Pair status colors with icons/text.

Ensure accessible contrast.

---

# LIGHT / DARK MODE

If supported:
- Both modes are deliberately designed.
- Do not simply invert colors.
- Check charts, dialogs, borders, shadows, status badges and text.
- Theme switching must be smooth and must NOT cause noticeable lag.

Avoid expensive whole-app re-renders during theme changes.

---

# HARD PERFORMANCE REQUIREMENT

**No noticeable lag between core features.**

Measure before adding effects.

Optimize:
- Initial load
- Navigation
- Queue updates
- Theme switching
- Modals
- Animations
- Mobile performance
- Network requests
- React/component re-renders
- Main-thread work
- Memory

Prefer:
- CSS transform/opacity
- GPU-friendly properties
- Lazy loading
- Code splitting
- Dynamic imports
- Optimized SVG/assets
- Reusable components
- Reduced-motion support

Avoid:
- Large animated blurs
- Huge shadows repeatedly animated
- Expensive filters
- Full-screen canvas effects
- Heavy 3D everywhere
- Large unoptimized assets
- Unnecessary polling/network requests

If an effect causes lag, optimize it or remove it.

A beautiful interface that lags is considered a failed implementation.

---

# EXISTING FEATURE PROTECTION

Before modifying existing functionality:
`inspect → understand → test → modify minimally → regression-test`

Do not accidentally remove or break:
- Theme switching
- Navigation
- Authentication
- Maps
- Existing dashboards
- Existing APIs
- Settings
- Responsive behavior
- Any other already-working feature

Do not touch unrelated features during a phase unless a dependency genuinely requires it.

---

# NO FAKE FEATURES

Every important visible feature must connect to real application behavior.

Do not create decorative:
- "AI Prediction" cards without a model/baseline
- Fake live queues
- Fake workload numbers
- Buttons with no backend behavior
- Charts using hardcoded values

Seed/demo data is acceptable, but functionality must remain dynamic.

---

# API / SECRETS

Never hardcode API keys.

Use environment variables and `.env.example`.

Core PS7 must work without Gemini or another generative-AI API.

Core queue functionality must not depend on a third-party AI service.

---

# SECURITY / PRIVACY

Maintain:
- RBAC
- Least privilege
- Input validation
- Rate limiting where appropriate
- Audit logging
- Secure secret handling
- Data isolation
- Safe errors
- Minimum necessary data
- No unnecessary medical history
- No diagnosis

Do not claim HIPAA/DPDP/etc. compliance unless actually implemented and verified.

---

# CONCURRENCY

Protect critical queue state against:
- Simultaneous completion/no-show
- Simultaneous priority actions
- Duplicate consultation start
- Duplicate queue joining
- Transfer during recalculation
- Availability changes during reassignment

Use transactions/appropriate locking.

Recalculation should be idempotent.

---

# TESTING GATE

A phase is NOT complete because the UI renders.

Before proceeding:
1. Run unit tests.
2. Run integration tests.
3. Run relevant E2E tests.
4. Run regression tests.
5. Check critical UI states.
6. Check database state.
7. Check performance.
8. Check security/RBAC.
9. Update `PS7_IMPLEMENTATION_PLAN.md`.

If something fails, fix it before continuing.

---

# MANDATORY END-TO-END SCENARIO

Before final completion, prove this exact flow:

1. Three doctors are available.
2. Several patients join queues.
3. Doctor A starts a consultation.
4. Consultation takes longer than predicted.
5. Patient ETAs increase.
6. Patient UI updates without refresh.
7. Authorized staff marks a new patient as emergency priority.
8. Queue changes according to policy.
9. ETAs recalculate.
10. Affected patients see why.
11. Another patient becomes no-show.
12. Queue shrinks and ETAs recalculate.
13. Doctor A becomes unavailable.
14. Workload balancing finds a compatible available doctor.
15. Staff approves transfer.
16. Both queues update.
17. Audit events are recorded.
18. ML prediction is disabled.
19. EMA fallback continues working.
20. SSE disconnects.
21. UI shows reconnecting.
22. SSE reconnects.
23. UI synchronizes with authoritative server state.
24. No corruption occurs.

This must pass before final demo readiness.

---

# UI QUALITY GATE

Inspect every screen for:
- Alignment
- Typography
- Spacing
- Consistency
- Contrast
- Responsive behavior
- Empty states
- Loading states
- Error states
- Success states
- Hover/focus states
- Keyboard accessibility
- Motion consistency
- Reduced-motion support
- Dark mode if enabled
- No clutter

The result must feel like a serious premium healthcare product.

---

# FINAL IMPLEMENTATION RULE

The implementation order is:

`Reliable core → prediction → real-time → premium UX → motion/3D polish`

Never reverse this order.

Do not spend time polishing animations while queue logic is broken.

Do not sacrifice correctness for visuals.
Do not sacrifice performance for animations.
Do not sacrifice security for convenience.
Do not sacrifice explainability for AI buzzwords.
Do not sacrifice PS7 alignment for unnecessary features.

At the same time, do not produce an ordinary-looking interface. The final product should be visually exceptional while remaining calm, trustworthy, accessible and fast.

---

# FINAL DOCUMENTATION

Maintain:
- `PS7_IMPLEMENTATION_PLAN.md`
- `ARCHITECTURE.md`
- API documentation
- Database documentation
- ML documentation
- Environment setup documentation
- Testing documentation
- Deployment documentation

At each phase record:
- What changed
- Files changed
- Tests run
- Tests passed
- Known limitations
- Performance findings
- Next phase

---

# FINAL DELIVERABLE

The completed repository should contain a working PS7 application with:
- Frontend
- Backend
- Database
- Authentication/RBAC
- Queue engine
- Dynamic ETA engine
- Emergency handling
- No-show handling
- Doctor availability
- Workload balancing
- Baseline prediction
- ML prediction where justified
- ML fallback
- Synthetic data
- Real-time SSE
- Notifications
- Patient UI
- Doctor UI
- Reception/Admin UI
- Audit system
- Tests
- Deployment configuration
- Environment example
- Documentation
- Implementation plan
- Architecture documentation
- Final demo scenario

The final demo must visibly prove:

**The queue is not based on a fixed schedule. It continuously adapts to actual doctor speed, calculates realistic waiting times, updates patients when reality changes, safely handles priority cases and no-shows, and helps balance workload across available doctors.**

Start now with repository inspection and creation of `PS7_IMPLEMENTATION_PLAN.md`. Then execute the phases sequentially without requiring a separate prompt from the user for every phase.

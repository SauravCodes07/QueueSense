# QueueSense — System Context, Architecture, Workflows & User Guide

> **Intelligent Outpatient Velocity & Dynamic Wait-Time Operating System**  
> *Problem Statement 7 (PS7) Implementation Reference*

---

## 1. Executive Summary & Problem Solved

Traditional hospital outpatient departments (OPDs) rely on **static appointment slots** (e.g., *"Your appointment is scheduled for 10:30 AM"*). In reality, medical consultations vary drastically in duration, emergency cases interrupt workflows, patients fail to show up, and doctors practice at varying velocities. This results in **false precision, overcrowded waiting areas, high patient anxiety, and clinician burnout**.

**QueueSense** replaces static appointment slots with a real-time **Outpatient Velocity Engine**:
1. **Continuous Velocity Tracking**: Measures actual consultation times and dynamically recalculates downstream patient wait times using Exponential Moving Averages ($\text{EMA}$).
2. **High-Acuity Priority Awareness**: Immediately escalates emergency triage patients to the front of the queue while automatically recalculating all downstream wait times with clear explainability.
3. **Dual-Queue Load Balancing**: Calculates clinician workload scores in real time to recommend patient transfers and balance hospital throughput.
4. **Zero Medical PHI Storage**: Focuses strictly on operational efficiency using anonymous tokens (`A-1`, `A-2`, `C-07`) with zero medical history or diagnosis storage.
5. **Real-Time Push Updates**: Streams live queue and ETA recalculations directly to patient smartphones, clinician consoles, and waiting room monitors via native Server-Sent Events ($\text{SSE}$).

---

## 2. Technical Stack & Monorepo Architecture

```text
QueueSense/
├── apps/
│   ├── web/                     # Canonical Frontend (React 19 + TypeScript + Vite + Tailwind) → Vercel
│   │   ├── src/
│   │   │   ├── components/      # LandingPage, AppShell, Sidebar, TopHeader, OverviewDashboard,
│   │   │   │                    # DoctorDashboard, PatientPortal, ReceptionLiveBoard, AuditAndAnalytics
│   │   │   ├── context/         # AuthContext, ThemeContext, NotificationContext
│   │   │   ├── services/        # api.ts (REST client) & sse.ts (EventSource Stream Manager)
│   │   │   └── types/           # Domain interfaces & navigation definitions
│   │   ├── vercel.json          # Production SPA rewrites
│   │   └── package.json
│   │
│   └── api/                     # Canonical Backend (Node.js + Fastify + Prisma + SSE) → Render
│       ├── src/
│       │   ├── modules/         # queue, consultation, prediction, workload, audit, stream
│       │   ├── routes/          # Fastify REST & SSE endpoints
│       │   ├── middleware/      # JWT verification & RBAC authorization
│       │   └── db/              # Prisma client & database seed data
│       ├── prisma/              # schema.prisma (Local SQLite) & schema.postgresql.prisma (Supabase)
│       ├── Dockerfile           # Multi-stage container for Render deployment
│       └── package.json
│
├── packages/
│   └── shared-types/            # Shared TypeScript contracts across frontend and backend
│
├── docker-compose.yml           # Production multi-container orchestration
└── development.md               # Single Source of Truth architecture specification
```

---

## 3. Mathematical & Algorithmic Foundations

### A. Clinician Velocity Calibration (EMA)
When a doctor completes a consultation session with actual duration $T_{\text{actual}}$, their pace updates automatically:
$$\text{EMA}_{\text{new}} = 0.3 \times T_{\text{actual}} + 0.7 \times \text{EMA}_{\text{old}}$$
*If a consultation has fewer than 3 historical samples or machine learning is enabled, the system uses a trained Scikit-learn `GradientBoostingRegressor` model with zero-downtime mathematical fallback to EMA.*

### B. Probabilistic Wait-Time Range (Zero False Precision)
For a waiting patient $i$ behind $k$ people in a doctor's queue:
$$\text{ETA}_{\text{base}} = T_{\text{remaining\_current}} + \sum_{j=1}^{k} \text{Duration}_{\text{predicted}}(j)$$
The patient receives an honest, arrival-window range:
$$\text{ETA}_{\text{low}} = \max(0, \lfloor \text{ETA}_{\text{base}} \times 0.85 \rfloor), \quad \text{ETA}_{\text{high}} = \lceil \text{ETA}_{\text{base}} \times 1.15 \rceil$$

### C. Deterministic Queue Priority Hierarchy
1. `IN_PROGRESS` (Active patient currently in consultation room)
2. `EMERGENCY` (Immediate triage — sorted by arrival timestamp)
3. `URGENT` (Priority evaluation — sorted by arrival timestamp)
4. `ROUTINE` (Standard FIFO order)

### D. Composite Clinician Workload Score
$$\text{Load Score} = w_1 \cdot N_{\text{queue}} + w_2 \cdot T_{\text{total\_predicted}} + w_3 \cdot T_{\text{remaining\_current}} + w_4 \cdot B_{\text{priority}}$$
*(Default weights: $w_1=1.0, w_2=1.0, w_3=1.0, w_4=1.0$)*

---

## 4. Complete Application Workflows Built

```text
                              ┌───────────────────────────────────┐
                              │     Public Landing Experience     │
                              │  - Dynamic Velocity Explanation   │
                              │  - Quick Token Tracking Search    │
                              │  - Role Workspace Sign-In         │
                              └─────────────────┬─────────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
      ┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
      │   PATIENT PORTAL   │         │   DOCTOR CONSOLE   │         │  OPERATIONS BOARD  │
      │ - Live Wait Range  │         │ - Consultation     │         │ - Cross-Doctor     │
      │ - Expected Clock   │         │   Stopwatch        │         │   Load Balancing   │
      │ - "Why ETA Changed"│         │ - Target Pace Bar  │         │ - Patient Transfer │
      │ - Visit Timeline   │         │ - Priority Trigger │         │   Recommendations  │
      │ - Walk-in Register │         │ - No-Show Action   │         │ - Department Live  │
      └────────────────────┘         └────────────────────┘         └────────────────────┘
                                                │                              │
                                                └──────────────┬───────────────┘
                                                               ▼
                                                    ┌────────────────────┐
                                                    │ ANALYTICS & AUDIT  │
                                                    │ - 7-Day Velocity   │
                                                    │ - ML Diagnostics   │
                                                    │ - Immutable Audit  │
                                                    └────────────────────┘
```

---

## 5. How Users Interact With the Application

### 1. Patient User Journey
1. **Access**: The patient opens `http://localhost:5173/` on their mobile phone or kiosk terminal.
2. **Track Token**: Enters their anonymous token (`A-1`, `A-2`, `C-07`) in the search bar.
3. **Live Status**:
   - Sees their token number, position in line (e.g. `#2`), and who is currently in the room (`A-1`).
   - Views their **dynamic ETA range** (e.g. `12–16 min`) and probabilistic **expected clock turn** (e.g. `1:15 PM`).
   - Receives instant updates if an emergency occurs or a no-show is marked with an explainability banner (*"Why Your ETA Changed: Previous consultation concluded in 10 minutes"*).
4. **Walk-In Registration**: Patients arriving at the clinic can click **Walk-In Registration** to select a department and clinician and immediately receive a queue token.

### 2. Clinician User Journey (Doctor Dashboard)
1. **Selection**: Selects their profile (e.g., Dr. Priya Sharma, Dr. Raj Mehta, or Dr. Anita Patel).
2. **Consultation Console**:
   - Clicks **Start Consultation** when calling a patient into the room.
   - An active **live stopwatch** tracks elapsed session time (`MM:SS`) with a visual progress bar comparing against target velocity EMA.
   - Clicks **Complete Consultation & Next Patient** when done, which updates their individual velocity EMA and recalculates downstream wait times in real time.
3. **Queue Actions**:
   - **Priority Flagging**: Can escalate a waiting patient to `URGENT` or `EMERGENCY` with a required operational reason.
   - **No-Show Confirmation**: Can mark an absent patient as `NO_SHOW`, removing them from the active queue and advancing all downstream patients.
4. **Clinician Status**: Switches availability with one tap (`AVAILABLE`, `ON_BREAK`, `UNAVAILABLE`, `OFFLINE`).

### 3. Front Desk / Reception Staff Journey
1. **Cross-Doctor Live Operations Board**:
   - Views all active doctor queues side-by-side with specialty filters (General Medicine, Cardiology, Paediatrics).
   - Monitors live department load scores, patients in consultation, and queue depths.
2. **Intelligent Load Balancing & Patient Transfers**:
   - Identifies overloaded clinician queues.
   - Clicks the **Transfer** icon on any waiting patient; the system automatically recommends the clinician with the lowest load score in the same department.
   - Authorizes the transfer with an operational justification, instantly rebalancing wait times across both doctors.

### 4. Hospital Administrator Journey
1. **Operational Command Center (`Overview`)**:
   - Monitors 5 high-level operational KPIs: Total Patients, Average Wait Time, In Consultation, No-Shows, and Emergencies.
   - Views the **Smart Queue Engine** telemetry banner with live clock and system status.
   - Inspects the **Wait Time Trend AreaChart** and **Priority Distribution Donut Chart**.
   - Analyzes the **Hospital Workload Distribution Radar Chart** comparing current vs optimal load across departments.
2. **ML Engine Calibration**:
   - Inspects the Scikit-learn GradientBoosting model metrics (MAE in seconds, sample count).
   - Triggers on-demand model retraining over recent consultation sessions.
3. **Cryptographic Audit Stream**:
   - Reviews an immutable, filterable log of all staff interventions (emergencies injected, no-shows recorded, patient transfers, availability changes) with full actor attribution.

### 5. Developer & Simulation Sandbox
- Accessible via the **Incident Simulator** button in the sidebar.
- Allows testing real-time recalculations and zero-downtime fallback:
  - **🚨 Inject Emergency**: Flags the next waiting patient as `EMERGENCY`.
  - **🚫 Simulate No-Show**: Marks the first waiting patient as `NO_SHOW`.
  - **🧠 / 🛡️ ML Toggle**: Switches between the GradientBoosting ML model and mathematical EMA baseline.
  - **🔄 Reset Demo State**: Restores clean initial seed data with active queues and tokens.

---

## 6. How to Run Locally

Both services run locally with hot-reloading:

```bash
# 1. Start Fastify API Backend (Port 8000)
npm run dev --workspace=@queuesense/api

# 2. Start Vite React Frontend (Port 5173)
npm run dev --workspace=@queuesense/web
```

- **Frontend Application**: [http://localhost:5173/](http://localhost:5173/)
- **Fastify Backend API**: [http://localhost:8000/](http://localhost:8000/) *(Health Check: [http://localhost:8000/health](http://localhost:8000/health))*

---

## 7. Deployment Configuration Summary

| Service | Target Provider | Root Directory | Build Command | Start Command | Key Environment Variables |
|---|---|---|---|---|---|
| **Frontend** | **Vercel** | `apps/web` | `npm run build` | `Vite SPA Output` | `VITE_API_URL=https://<your-render-backend-url>` |
| **Backend** | **Render** | `apps/api` | `npm install && npm run build` | `node dist/server.js` | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN` |
| **Database** | **Supabase** | `—` | `npx prisma db push --schema=apps/api/prisma/schema.postgresql.prisma` | PostgreSQL | Connection Pooler on port `6543`, Direct on `5432` |

<div align="center">

# 🏥 QueueSense

### Intelligent Outpatient Velocity & Dynamic Wait-Time Operating System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat-square&logo=react)](https://react.dev/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black.svg?style=flat-square&logo=fastify)](https://fastify.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748.svg?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20PostgreSQL-3ECF8E.svg?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

<p align="center">
  <b>Transforming chaotic hospital waiting halls with real-time consultation velocity tracking, zero medical PHI storage, and probabilistic arrival windows.</b>
</p>

[Overview](#-product-overview) •
[Features](#-key-features) •
[User Flows](#-user-flows) •
[Interactive Demo](#-interactive-demo--scenarios) •
[Architecture](#-system-architecture) •
[Tech Stack](#-technology-stack) •
[Authentication](#-authentication--security) •
[Database](#-database--data-models) •
[API Reference](#-api-reference) •
[Environment](#-environment-variables) •
[Local Setup](#-local-development) •
[Deployment](#-deployment-guide)

</div>

---

## 📌 Product Overview

Traditional hospital outpatient departments (OPDs) rely on **static appointment slots** (e.g., *"Your appointment is at 10:30 AM"*). When real clinical events occur — unpredictable consultation durations, high-acuity emergency triage, no-shows, and varying clinician velocities — static schedules collapse. This causes **false precision, overcrowded waiting areas, patient anxiety, and clinician burnout**.

**QueueSense** replaces static appointment slots with a dynamic, real-time **Outpatient Velocity Engine**:

- **Real-Time Velocity Recalibration**: Uses Exponential Moving Averages ($\text{EMA}$) to measure individual clinician speeds and update downstream wait times dynamically.
- **Probabilistic Arrival Windows**: Replaces misleading exact clock timestamps with honest, calibrated ranges (e.g. `14–18 min`, `11:42 AM`).
- **High-Acuity Emergency Awareness**: Instantly moves emergency triage patients to the top of the queue while automatically recalculating all affected wait times with explainability banners.
- **Zero Medical PHI Architecture**: Focuses strictly on operational telemetry using anonymous tokens (`A-1`, `A-2`, `C-07`) with zero medical history or diagnosis storage.
- **Live SSE Event Streams**: Pushes real-time queue decrements and arrival predictions directly to patient smartphones, doctor consoles, and waiting room monitors.

---

## ✨ Key Features

| Feature | Description | Operational Impact |
|---|---|---|
| **⚡ Clinician Velocity Calibration ($\text{EMA}$)** | Automatically recalibrates doctor consultation pace using $\text{EMA}_{\text{new}} = 0.3 \times T_{\text{actual}} + 0.7 \times \text{EMA}_{\text{old}}$. | Eliminates static averages; adapts to fast or complex clinical days. |
| **🎯 Probabilistic Wait Ranges** | Calculates $\text{ETA}_{\text{low}}$ and $\text{ETA}_{\text{high}}$ arrival brackets ($\pm 15\%$). | Prevents false precision; patients receive dependable arrival expectations. |
| **🚨 Emergency Triage Escalation** | Injects high-acuity emergency cases to the top of the queue with required staff justification. | Critical patients receive immediate care while downstream queues auto-rebalance. |
| **⚖️ Dual-Queue Load Balancing** | Computes composite clinician workload scores across queue depth, remaining consultation time, and urgency. | Recommends staff-authorized patient transfers to prevent clinician burnout. |
| **🚫 Automatic No-Show Handling** | Flags absent patients after configurable grace periods and removes them with downstream ETA deductions. | Prevents dead time and immediately advances waiting patients. |
| **📡 Native Server-Sent Events ($\text{SSE}$)** | Full-duplex real-time push streams for `/stream/doctors/:id/queue` and `/stream/patients/:token`. | Instant updates across patient smartphones and wall boards without polling. |
| **🔒 Immutable Cryptographic Audit Log** | Records all staff interventions (emergencies, transfers, no-shows, status changes) with actor IDs. | Ensures operational transparency, clinical accountability, and governance. |
| **🧠 Scikit-Learn ML Fallback** | GradientBoosting regression model trained on clinical durations with zero-downtime mathematical fallback. | Provides high-accuracy predictions even with sparse historical data. |

---

## 🔄 User Flows

```text
                                  ┌───────────────────────────────┐
                                  │   Public Landing Experience   │
                                  │  - Anonymous Token Lookup     │
                                  │  - Walk-In Registration       │
                                  │  - Supabase / Google OAuth    │
                                  └───────────────┬───────────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
   ┌────────────────────────┐        ┌────────────────────────┐        ┌────────────────────────┐
   │     PATIENT FLOW       │        │     CLINICIAN FLOW     │        │     RECEPTION FLOW     │
   │ 1. Enter Token (A-1)   │        │ 1. Sign in as Doctor   │        │ 1. Monitor All Queues  │
   │ 2. Live SSE Wait Range │        │ 2. Start Live Stopwatch│        │ 2. Inspect Load Scores │
   │ 3. "Why ETA Changed"   │        │ 3. Velocity Target Bar │        │ 3. Rebalance Transfers │
   │ 4. Clock Turn & Status │        │ 4. Complete / Next     │        │ 4. Register Walk-Ins   │
   └────────────────────────┘        └────────────────────────┘        └────────────────────────┘
                                                  │                                 │
                                                  └────────────────┬────────────────┘
                                                                   ▼
                                                      ┌────────────────────────┐
                                                      │     ADMIN & AUDIT      │
                                                      │ 1. Command Center KPIs │
                                                      │ 2. Velocity AreaCharts │
                                                      │ 3. Workload Radar Map  │
                                                      │ 4. Cryptographic Log   │
                                                      └────────────────────────┘
```

---

## 🎮 Interactive Demo & Scenarios

<details>
<summary><b>▶ Scenario 1: Patient Tracking Live Wait Time</b></summary>

1. Open [http://localhost:5173/](http://localhost:5173/) in your browser.
2. In the **Patient Wait Tracker** search bar, enter token `A-1` (or `A-2`).
3. View the real-time queue position (e.g., `#2 in line`), the active patient in room (`A-1`), and the dynamic ETA range (e.g., `14–18 min`).
4. Watch the ETA recalculate automatically when consultations complete upstream.
</details>

<details>
<summary><b>▶ Scenario 2: Clinician Managing Live Consultations</b></summary>

1. From the top header or sidebar, switch persona to **Dr. Priya Sharma**.
2. Navigate to the **Doctors** tab.
3. Click **Start Consultation** to initiate the live session stopwatch (`MM:SS`).
4. Compare actual elapsed time with the target velocity progress bar.
5. Click **Complete Consultation & Next Patient** to finalize the consultation and trigger downstream $\text{EMA}$ recalculation.
</details>

<details>
<summary><b>▶ Scenario 3: Cross-Doctor Load Balancing & Patient Transfer</b></summary>

1. Navigate to the **Live Queues** or **Transfers** tab.
2. Review department load scores comparing clinicians side-by-side.
3. Click the **Transfer** icon on an overloaded queue.
4. The system automatically recommends the clinician with the lowest load score in the specialty.
5. Authorize the transfer with an operational justification; both queues update instantaneously.
</details>

<details>
<summary><b>▶ Scenario 4: Developer Incident Sandbox</b></summary>

1. Click the **Incident Simulator** button in the left sidebar.
2. Click **🚨 Inject Emergency Case** to escalate a patient and observe instant queue reordering.
3. Click **🚫 Simulate Patient No-Show** to confirm an absence and advance downstream wait times.
4. Toggle between **🧠 ML Model** and **🛡️ Mathematical EMA** to verify fallback resilience.
5. Click **🔄 Reset Demo State** to restore clean initial seed data.
</details>

---

## 🖼️ Application Interfaces

<div align="center">

| Operational Command Center | Dedicated Patient Tracker |
|---|---|
| *5 KPI Metric Cards, Live Clock, Wait Time AreaChart, Priority Donut, and Workload Radar.* | *Live ETA Range, Expected Clock Turn, Velocity Explainability, and Visit Timeline.* |
| *(Explore at `/` $\rightarrow$ `Overview`)* | *(Explore at `/` $\rightarrow$ `Patient Wait Tracker`)* |

| Clinician Consultation Console | Cross-Doctor Operations Board |
|---|---|
| *Active Consultation Stopwatch, Target Speed Progress, Queue Triage Actions.* | *Side-by-side Doctor Queues, Load Scores, and 1-Click Patient Transfers.* |
| *(Explore at `/` $\rightarrow$ `Doctors`)* | *(Explore at `/` $\rightarrow$ `Live Queues`)* |

</div>

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 19 + TypeScript | High-performance reactive UI with strict type safety. |
| **Build & Bundler** | Vite 8 | Instant HMR development server and optimized production bundling. |
| **Styling & Design System** | Tailwind CSS 3.4 | Curated clinical color system, responsive utilities, and dark/light themes. |
| **Data Visualization** | Recharts 2.15 | Responsive SVG AreaCharts, Donut charts, and Workload Radar diagrams. |
| **Real-Time Streaming** | Native Server-Sent Events ($\text{SSE}$) | Resilient HTTP streaming for live queue events and ETA recalculations. |
| **Backend Framework** | Node.js 20 + Fastify 5 | High-throughput async REST API and SSE endpoint handler. |
| **Database & ORM** | Prisma 6.4 + PostgreSQL (Supabase) | Declarative schema, typed queries, and automated schema migrations. |
| **Authentication** | Supabase Auth + Google OAuth | Production user authentication, JWT verification, and RBAC authorization. |
| **Prediction Engine** | EMA + Scikit-Learn Regression Fallback | Dynamic velocity calibration with machine learning duration estimation. |
| **Icons & Micro-animations** | Lucide React + Canvas Confetti | Accessible clinical icons and lightweight interactive feedback. |

---

## 📐 System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      Client Layer (apps/web)                            │
│  - React 19 SPA (Vite)                                                  │
│  - Public Landing Page + Patient Wait Portal                            │
│  - Clinician Console + Reception Live Board + Command Center            │
│  - Native EventSource SSE Stream Manager (/stream/*)                    │
│  - Supabase Auth SDK (Email / Google OAuth)                             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                        HTTP REST / SSE EventStream
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                       API Server (apps/api)                             │
│  - Fastify 5 High-Throughput HTTP Engine                                │
│  - JWT & Role-Based Access Control (RBAC) Middleware                    │
│  - Domain Engines:                                                      │
│    * Velocity Engine (EMA Calibration & Wait-Time Calculations)         │
│    * Priority Engine (Deterministic Emergency & Urgent Sorting)         │
│    * Workload Engine (Composite Load Scores & Transfer Rebalancing)     │
│    * In-Memory EventEmitter EventBus (/events/bus.ts)                   │
│  - Prisma 6.4 Client Data Layer                                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                          PostgreSQL Connection Pool
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    Database & Auth (Supabase)                           │
│  - Supabase PostgreSQL (Managed Database)                               │
│  - Supabase Auth (Google OAuth & Email Session Management)              │
│  - Connection Pooler (Port 6543) & Direct Migrations (Port 5432)        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication & Security

QueueSense uses **Supabase Auth** for production identity and session management:

- **Email & Password Authentication**: Secure registration and sign-in with client-side validation and Supabase Auth.
- **Google OAuth 2.0 Integration**: Single-sign-on using Supabase's Google OAuth provider, extracting Google user names and avatar photos.
- **Role-Based Access Control (RBAC)**: Supports `ADMIN`, `DOCTOR`, `RECEPTION`, and `PATIENT` roles with JWT verification on privileged backend endpoints.
- **Session Persistence & Real-time State**: Subscribed to Supabase `onAuthStateChange` to keep UI state synchronized across tabs with zero layout flicker.
- **Zero PHI Tokenization**: Patient queues function entirely on anonymous tokens (`A-1`, `A-2`, `C-07`) without storing medical diagnosis or history.

---

## 🗄️ Database & Data Models

Database schema management is handled by **Prisma ORM** targeting **Supabase PostgreSQL**:

```text
apps/api/prisma/schema.prisma
```

### Core Entity Schema

```prisma
model User {
  id           Int       @id @default(autoincrement())
  supabaseId   String?   @unique @map("supabase_id")
  email        String    @unique
  passwordHash String?   @map("password_hash")
  name         String
  role         String    @default("RECEPTION")
  avatarUrl    String?   @map("avatar_url")
  doctorId     Int?      @unique @map("doctor_id")
  doctor       Doctor?   @relation(fields: [doctorId], references: [id])
  createdAt    DateTime  @default(now()) @map("created_at")
}

model Department {
  id                         Int      @id @default(autoincrement())
  name                       String   @unique
  defaultConsultationMinutes Float    @default(12.0) @map("default_consultation_minutes")
  doctors                    Doctor[]
}

model Doctor {
  id                 Int          @id @default(autoincrement())
  name               String
  departmentId       Int          @map("department_id")
  department         Department   @relation(fields: [departmentId], references: [id])
  emaMinutes         Float        @default(12.0) @map("ema_minutes")
  availabilityStatus String       @default("AVAILABLE") @map("availability_status")
  updatedAt          DateTime     @updatedAt @map("updated_at")
  user               User?
  queueEntries       QueueEntry[]
}

model Patient {
  id           Int          @id @default(autoincrement())
  name         String
  token        String       @unique
  phone        String?
  createdAt    DateTime     @default(now()) @map("created_at")
  queueEntries QueueEntry[]
}

model QueueEntry {
  id             Int            @id @default(autoincrement())
  patientId      Int            @map("patient_id")
  patient        Patient        @relation(fields: [patientId], references: [id])
  doctorId       Int            @map("doctor_id")
  doctor         Doctor         @relation(fields: [doctorId], references: [id])
  priority       String         @default("ROUTINE")  // ROUTINE | URGENT | EMERGENCY
  status         String         @default("WAITING")  // WAITING | IN_PROGRESS | COMPLETED | NO_SHOW
  position       Int            @default(1)
  softFlaggedAt  DateTime?      @map("soft_flagged_at")
  etaLowMinutes  Int?           @map("eta_low_minutes")
  etaHighMinutes Int?           @map("eta_high_minutes")
  etaReason      String?        @map("eta_reason")
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")
  consultations  Consultation[]
}
```

---

## 📡 API Reference

### Key Endpoints

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/departments` | Public | List all active hospital departments. |
| `GET` | `/api/v1/doctors` | Public | List doctors, current EMA duration, and availability. |
| `GET` | `/api/v1/doctors/:id/queue` | Public | Retrieve ordered patient queue for a doctor. |
| `GET` | `/api/v1/doctors/:id/workload` | Public | Retrieve live composite workload score for a doctor. |
| `GET` | `/api/v1/patients/:token/wait-time` | Public | Get probabilistic ETA range and clock turn for a token. |
| `POST` | `/api/v1/patients` | Public | Register walk-in patient and issue queue token. |
| `POST` | `/api/v1/consultations/:id/start` | Staff | Start consultation stopwatch for a queue entry. |
| `POST` | `/api/v1/consultations/:id/end` | Staff | Complete consultation and trigger downstream EMA update. |
| `POST` | `/api/v1/queue/:id/priority` | Staff | Escalate patient priority (`URGENT` / `EMERGENCY`). |
| `POST` | `/api/v1/queue/:id/no-show` | Staff | Mark patient as absent and advance queue. |
| `POST` | `/api/v1/queue/:id/transfer` | Staff | Transfer patient to another clinician with reason. |
| `GET` | `/api/v1/audit-events` | Staff | Retrieve immutable cryptographic audit trail. |
| `GET` | `/api/v1/stream/doctors/:id/queue` | Public | Real-time SSE stream of doctor queue updates. |
| `GET` | `/api/v1/stream/patients/:token` | Public | Real-time SSE stream of patient ETA recalculations. |

<details>
<summary><b>▶ Example: GET /api/v1/patients/A-1/wait-time</b></summary>

```json
{
  "token": "A-1",
  "position": 1,
  "queue_length_ahead": 0,
  "in_consultation_token": "A-1",
  "doctor_id": 1,
  "doctor_name": "Dr. Priya Sharma",
  "department_name": "General Medicine",
  "eta_low_minutes": 10,
  "eta_high_minutes": 14,
  "eta_clock": "1:15 PM",
  "explanation": "Consultation currently in progress (target duration: 12 min)."
}
```
</details>

<details>
<summary><b>▶ Example: POST /api/v1/queue/5/priority</b></summary>

```json
// Request Body
{
  "priority": "EMERGENCY",
  "reason": "Acute chest pain during triage intake"
}

// Response
{
  "success": true,
  "entry_id": 5,
  "new_priority": "EMERGENCY",
  "recalculated_doctor_id": 1
}
```
</details>

---

## ⚙️ Environment Variables

| Variable | Required | Scope | Purpose |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | Backend / Secret | Supabase PostgreSQL Connection Pooler URL (`postgresql://...:6543/postgres?pgbouncer=true`). |
| `DIRECT_URL` | **Yes** | Backend / Secret | Supabase PostgreSQL Direct connection URL for migrations (`postgresql://...:5432/postgres`). |
| `JWT_SECRET` | **Yes** | Backend / Secret | Secret key (min 32 characters) for signing API tokens. |
| `CORS_ORIGIN` | Optional | Backend | Allowed frontend origin URLs (e.g. `https://queuesense.vercel.app,http://localhost:5173`). |
| `PORT` | Optional | Backend | API server port (default: `8000`). |
| `VITE_API_URL` | **Yes** | Frontend / Public | Render API URL (e.g. `https://queuesense-api.onrender.com`). |
| `VITE_SUPABASE_URL` | **Yes** | Frontend / Public | Supabase project URL (`https://<project-ref>.supabase.co`). |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Frontend / Public | Supabase anonymous public publishable API key. |

> [!CAUTION]
> **Security Notice**: Never commit `.env`, production secrets, database passwords, or private service-role API keys to Git.

---

## 💻 Local Development

### Prerequisites
- **Node.js**: `v20+` or `v22+`
- **npm**: `v10+`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/SauravCodes07/QueueSense.git
cd QueueSense

# Install all monorepo dependencies
npm install
```

### 2. Configure Environment Files
```bash
# Copy environment templates
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
```

### 3. Generate Prisma Client & Sync Database
```bash
# Generate Prisma Client
npx prisma generate --schema=apps/api/prisma/schema.prisma

# (Optional) Push schema to database
npx prisma db push --schema=apps/api/prisma/schema.prisma
```

### 4. Start Development Servers
```bash
# Start both Frontend (5173) and Backend (8000) simultaneously
npm run dev

# Or run individually:
npm run dev --workspace=@queuesense/api    # Backend API on http://localhost:8000
npm run dev --workspace=@queuesense/web    # Frontend App on http://localhost:5173
```

- **Web Frontend**: [http://localhost:5173/](http://localhost:5173/)
- **Fastify Backend**: [http://localhost:8000/](http://localhost:8000/) *(Health Check: [http://localhost:8000/health](http://localhost:8000/health))*

### 5. Production Build
```bash
# Verify typechecking and bundle creation across all workspaces
npm run build
```

---

## 🚀 Deployment Guide

### Frontend Deployment (Vercel)
1. Import the GitHub repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `apps/web`.
3. Framework Preset: **Vite**.
4. Configure Environment Variables:
   - `VITE_API_URL`: `https://<your-render-backend-url>.onrender.com`
   - `VITE_SUPABASE_URL`: `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `sb_publishable_...`

### Backend Deployment (Render)
1. Create a new **Web Service** in [Render](https://render.com).
2. Set **Root Directory** to `apps/api`.
3. Runtime: **Node**.
4. Build Command: `npm install && npm run build`
5. Start Command: `node dist/server.js`
6. Configure Environment Variables (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `CORS_ORIGIN`).

---

## 🗺️ Product Roadmap

- [x] Exponential Moving Average ($\text{EMA}$) Clinician Velocity Engine
- [x] Probabilistic Arrival Windows ($\text{ETA}_{\text{low}}$ & $\text{ETA}_{\text{high}}$)
- [x] High-Acuity Emergency Prioritization with Mandatory Reason Logging
- [x] Dual-Queue Workload Scoring and 1-Click Patient Transfers
- [x] Server-Sent Events ($\text{SSE}$) Live Push Streams
- [x] Production Supabase Auth with Google OAuth & Email/Password
- [x] Enterprise Operational Command Center with Recharts Visualizations
- [ ] Multilingual Audio Queue Broadcasts (Hindi / English / Regional)
- [ ] Automated SMS / WhatsApp Token Status Webhooks

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/clinical-improvement`.
3. Commit your changes: `git commit -m "feat: enhance queue explainability"`.
4. Push to the branch: `git push origin feature/clinical-improvement`.
5. Open a Pull Request.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).

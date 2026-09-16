# MedIntel — Project Progress Report
**AI-Assisted Clinical Decision Support & Healthcare Operations System**  
*Course: Software Architecture (Semester 5)*

---

## 1. Project Overview & Team Members

### Project Title
**MedIntel: A Layered, AI-Assisted Clinical Decision Support System with Deterministic Red-Flag Triage and Hospital Operations Management**

### Team Members & Contributions
| Roll / ID | Name | Core Responsibilities & Architectural Ownership |
| :--- | :--- | :--- |
| **Team Lead / Dev 1** | Aryan Gupta | Full-stack architecture, 5-tier system design, 7-stage AI pipeline, Groq/Gemini circuit breakers, seed data & API security. |
| **Developer 2** | Eeramalla Teja (*777tejaes*) | Hospital Administration portal, doctor rostering, appointment booking lifecycle, community health drives & MongoDB repo integration. |
| **Developer 3** | Sathwik | Client UI/UX architecture, responsive Tailwind v4 design system, state synchronization, symptom intake flows & client route guards. |
| **Developer 4** | *(Member 4 / Contributor)* | QA testing, test suite implementation (126 rules tests, 118 API smoke tests), and system documentation. |

---

## 2. Executive Summary
MedIntel is an enterprise-grade medical companion and healthcare facility operations system designed according to strict **N-tier Layered Architectural Principles**. Unlike conventional healthcare applications that act as naive wrappers around Large Language Models (LLMs), MedIntel is built upon a fundamental architectural invariant:

> **Core Safety Principle (ADR-02):** Probabilistic AI models must **never** sit unchaperoned on a safety-critical clinical path. All patient symptom intake passes through a pure, deterministic 20-rule Red-Flag Triage Engine *before* any AI model is consulted. Immediate life-threatening emergencies short-circuit directly to emergency protocols with zero network latency and zero hallucination risk.

MedIntel additionally bridges the gap between patient personal health records (PHRs) and healthcare providers through a dedicated **Hospital Administration Desk**, enabling doctor rostering, appointment slot confirmations, and community health drives.

---

## 3. Functionality Status Matrix

| Module / Feature | Status | Description |
| :--- | :---: | :--- |
| **Module 01: Dual-Role Authentication & RBAC** | **Completed** | Secure JWT authentication with refresh token rotation, bcrypt hashing, and distinct roles (`patient` vs `hospital`). 1-click demo accounts provided. |
| **Module 02: Deterministic Red-Flag Triage Engine** | **Completed** | 20 clinical red-flag rules (meningitis, MI, stroke, anaphylaxis, etc.) evaluated in 0ms before AI invocation. Pure, total, monotonic. |
| **Module 03: 7-Stage AI Health Companion** | **Completed** | Multi-turn medical chat with input normalization, PII redaction, context assembly, Groq (Llama-3.3) provider, Gemini fallback, circuit breakers, and schema validation. |
| **Module 04: Hospital Geolocation & Directory** | **Completed** | GPS browser geolocation, Haversine formula distance calculation, city/department filters, and real-time facility search. |
| **Module 05: Doctor Rostering & Scheduling** | **Completed** | Hospital staff can add/edit doctor profiles, qualifications, consultation fees, and weekly day/time slot availability. |
| **Module 06: Direct Appointment Booking** | **Completed** | Patients book appointments with specific doctors; hospital administrators review, confirm, or reject appointments via an operations desk. |
| **Module 07: Community Health Camps & Blood Drives** | **Completed** | Hospital portal publishes blood donation drives and health marathons with date, target donor limits, and location tags. |
| **Module 08: Medication Reminders & Adherence** | **Completed** | Daily/weekly dosage scheduling, dose acknowledgment log (`taken`, `skipped`, `missed`), and adherence rate computation. |
| **Module 09: Medical Lab Reports (CBC Parsing)** | **Partially Completed** | Asynchronous report upload, job queue processing, and automated out-of-range flag detection for CBC lab values. (Plain-text & structured parsing complete; OCR image/PDF parsing pending paid cloud API key). |
| **Module 10: Unified Audit History Timeline** | **Completed** | Append-only chronological timeline aggregating triage sessions, AI chats, lab reports, medication logs, and facility audit logs. |
| **Hospital EHR / HL7-FHIR Interoperability** | **Pending** | Direct bi-directional synchronization with external hospital Electronic Health Record (EHR) systems via FHIR JSON standards. |
| **WebRTC Teleconsultation** | **Pending** | Live audio/video peer-to-peer consultation rooms between patients and confirmed doctors. |
| **Push Notifications via Web Workers** | **Pending** | Real-time browser push notifications for medication alerts and appointment updates (currently polled/local). |

---

## 4. Current Status of UI, Backend, and Database

### 4.1. User Interface (UI / Presentation Layer — Layer 1)
- **Framework & Tooling**: Built with **React 19**, **Vite 8**, and **Tailwind CSS v4** using modern tokenized styles (`@theme` variables in `client/src/index.css`).
- **Routing & State**: **React Router v7** with centralized `AuthProvider` and `AppLayout` providing client-side route guards. Patients and Hospital Administrators have dedicated contextual navigation bars and role banners.
- **Aesthetics & Usability**: Responsive glassmorphic cards, custom SVG icon system, unified error boundaries, and zero flash-of-unauthenticated-content (FOUC).
- **Quality**: Verified clean build with `vite build` (<1s compile time) and **0 lint errors** via `oxlint`.

### 4.2. Backend API & Business Logic (Layers 2, 3 & 4)
- **API Gateway (Layer 2)**: **Express 5** server implementing 4-tier rate limiting (Auth, AI, Upload, General), strict Zod schema validation, unified JSON error envelopes, and HTTP-only cookie support.
- **Business Layer (Layer 3)**: Orchestrators for triage, chat sessions, hospital scheduling, appointment lifecycles, report analysis, and reminder tracking.
- **AI Service Layer (Layer 4)**: 7-stage pipeline executing:
  1. *Normalise* (NFKC unicode, whitespace clamp)
  2. *Redact* (regex masking of emails, phone numbers, SSN/IDs)
  3. *Rules Evaluation* (business layer red-flag check)
  4. *Context Assembly* (minimal clinical background)
  5. *Provider Call* (Groq Llama-3.3 primary, Google Gemini Flash secondary)
  6. *Schema Validation & Safety Gate* (regex check against direct prescription verbs and medication dosages)
  7. *Guardrail Wrapping* (disclaimer attachment and confidence attribution)
- **Test Suite**:
  - **126/126 passed** in unit & safety rules tests (`npm test`).
  - **118/118 passed** in end-to-end API smoke tests (`npm run test:api`).

### 4.3. Database & Persistence (Layer 5)
- **Database Engine**: **MongoDB Atlas M0** cloud replica set (`medintel` database).
- **Models & Repositories**: 10 Mongoose schemas with strict encapsulation behind repository interfaces (`User`, `TriageSession`, `Conversation`, `Report`, `Reminder`, `TimelineEvent`, `Hospital`, `Doctor`, `HospitalEvent`, `Appointment`).
- **Cache & Queues**: Modular cache abstraction supporting in-memory caching and Redis, alongside an in-process asynchronous job queue for report parsing.
- **Audit Logging**: Append-only audit logger capturing sensitive events across system lifecycles.

---

## 5. Major Changes Made to Original Design

During the architectural evolution of MedIntel, five significant changes were made from the initial concept pitch to satisfy rigorous Software Architecture criteria:

```
[Initial Concept]                               [Current Architecture]
Naive CRUD App             ───►  5-Tier Layered Modular Monolith (Strict Downward Calling)
Direct AI Prompting        ───►  Deterministic 20-Rule Red-Flag Engine BEFORE AI
Single Patient Scope       ───►  Dual-Role Ecosystem (Patient Portal + Hospital Operations Desk)
Single Provider Call       ───►  7-Stage Pipeline with Circuit Breaker & Groq ➔ Gemini Failover
Unrestricted AI Answers    ───►  Safety Gate (Prohibiting Drug Prescriptions & Hallucinated Dosages)
```

1. **Deterministic Red-Flag Engine Fronting the AI (ADR-02)**:
   - *Original Design*: User symptoms were directly formatted into a prompt and submitted to an LLM.
   - *Reason for Change*: AI models can hallucinate or fail silently on acute emergencies.
   - *Current Implementation*: A pure rule engine evaluates 20 clinical red flags (e.g., crushing chest pain radiating to arm, thunderclap headache, anaphylaxis). If an emergency is detected, the AI call is completely bypassed (0ms delay), routing the user directly to emergency actions.
2. **5-Tier Modular Monolith Architecture (ADR-01)**:
   - *Original Design*: A flat MVC express backend.
   - *Reason for Change*: Microservices would incur excessive operational and distributed transaction overhead for a semester project; flat MVC risked severe layer-bleed.
   - *Current Implementation*: Strict 5-tier downward-calling architecture (`client` $\rightarrow$ `api` $\rightarrow$ `business` $\rightarrow$ `ai` $\rightarrow$ `data`). No upward imports or layer skipping are permitted.
3. **Introduction of the Hospital Operations Desk**:
   - *Original Design*: The application was purely a patient self-triage tool.
   - *Reason for Change*: Triage has little value if the patient cannot take clinical action.
   - *Current Implementation*: Added a dedicated Hospital Admin role with doctor roster management, appointment status workflow (`Booked` $\rightarrow$ `Confirmed` / `Cancelled`), and community event creation.
4. **Resilient AI Provider Adapter with Automated Circuit Breakers (ADR-04)**:
   - *Original Design*: Hardcoded Gemini SDK calls.
   - *Reason for Change*: External AI APIs experience intermittent rate limits and outages.
   - *Current Implementation*: Adapter pattern chaining Groq $\rightarrow$ Gemini with half-open circuit breaker states. If both fail, the system degrades to deterministic self-care guidance without crashing.
5. **Strict "Clinical Decision Support" Boundary**:
   - *Original Design*: General diagnosis assistant.
   - *Reason for Change*: Legal and safety constraints.
   - *Current Implementation*: Explicit "Is Not" design constraint. The safety gate strictly validates that output contains ranked possibilities, confidence levels, and consultations recommendations—prohibiting drug prescriptions and dosages.

---

## 6. Problems Encountered & Solutions

### Problem 1: MongoDB Atlas SRV DNS Resolution Failure on Windows
- **Symptom**: Application startup crashed with `querySrv ECONNREFUSED` when connecting to `mongodb+srv://...` on Windows local Wi-Fi.
- **Root Cause**: Node.js default DNS resolver (`c-ares`) on certain Windows network configurations fails to resolve DNS SRV records for Atlas clusters, even though standard `A` records resolve.
- **Solution**:
  1. Ran `nslookup -type=SRV _mongodb._tcp.medintelcluster...` to identify all underlying shard replica set hosts.
  2. Formatted `MONGODB_URI` using the explicit standard seed-list connection string:
     ```
     mongodb://user:pass@shard-00-00.net:27017,shard-00-01.net:27017,shard-00-02.net:27017/medintel?ssl=true&replicaSet=...&authSource=admin
     ```
  3. Added public DNS server fallbacks (`8.8.8.8`, `1.1.1.1`) inside the database bootstrapper.

### Problem 2: In-Memory MongoDB Binary Download Abort (`ECONNRESET`)
- **Symptom**: Fallback to `mongodb-memory-server` failed during local offline testing.
- **Root Cause**: The library attempts to download a ~600MB pre-compiled MongoDB binary from `fastdl.mongodb.org`, which repeatedly timed out with `ECONNRESET` on throttled connections.
- **Solution**: Deprecated reliance on local binary downloads and connected the test suite and dev server to a cloud-hosted MongoDB Atlas M0 cluster, with an in-memory repository mock for offline rule unit tests.

### Problem 3: LLM Hallucination and Drug Dosage Generation
- **Symptom**: Early tests of the AI chat revealed that LLMs would occasionally suggest specific over-the-counter or prescription dosages (e.g., "Take 500mg Amoxicillin").
- **Root Cause**: Standard LLM prompts cannot guarantee that medical advice will remain within clinical decision support boundaries.
- **Solution**:
  - Implemented **Stage 6 (Safety Gate)** in `server/src/ai/validator.js`.
  - Built regex checks detecting drug stems (`-cillin`, `-mycin`, `-olol`, `-statin`), dosage indicators (`mg`, `ml`, `mcg`), and prescription verbs (`prescribe`, `take daily`).
  - If triggered, the response is rejected and retried with a corrective prompt; if violated again, it degrades to safe lifestyle guidance with doctor referral.

### Problem 4: OCR Space Cloud API Rate Limits on Lab Report Uploads
- **Symptom**: Lab report PDF/image uploads failed when the third-party OCR API key was unconfigured or exceeded free quota limits.
- **Root Cause**: Reliance on a synchronous external cloud OCR provider created a single point of failure.
- **Solution**:
  - Decoupled report upload from processing via an asynchronous job queue.
  - Implemented local regular-expression parsing for standard text/CBC reports (e.g., WBC, Hemoglobin, Platelets).
  - Gracefully updated report status to `Failed` with human-readable error messages when binary OCR is unconfigured, allowing plain-text lab summaries to continue functioning seamlessly.

### Problem 5: Role Bleed and Navigation State Inconsistencies
- **Symptom**: Hospital admin accounts could inadvertently access patient-only intake forms (like personal symptom checks or medication logs), causing confusing UX.
- **Root Cause**: Single client route tree without explicit role-level component guards.
- **Solution**:
  - Implemented `PatientOnlyNotice` and `HospitalOnlyNotice` barrier components.
  - Updated `AppLayout.jsx` to dynamically switch the entire sidebar navigation between **Patient View** (Dashboard, Symptoms, AI Chat, Hospitals, Reports, Reminders, History) and **Hospital Operations Desk** (Overview, Appointments Queue, Doctors Roster, Health Camps, Facility Profile, Audit Timeline).

---

## 7. Key Pages, Working System Visual Guide & Curated Code Highlights

This section provides a screen-by-screen breakdown of MedIntel. For each module, we provide:
1. **Screen Details & Purpose**
2. **Visual Screenshot Capture Guide** (exact steps to capture live in the running system)
3. **Curated Code Highlight** (the critical 15–30 lines of code powering that feature)

---

### Page 1: Landing Page & Dual-Role Sign In
- **Route**: `/` and `/signin`
- **Purpose**: Welcomes visitors, explains the architecture, and provides instant 1-click demo logins for both **Patient** (`aarav.menon@example.com`) and **Hospital Admin** (`hospital@example.com`).
- **Visual Capture Guide**:
  1. Open browser to `http://localhost:5173/`. Capture the hero section with the 5-layer architecture diagram badge.
  2. Click **"Sign In"** (`/signin`). Capture the dual-role demo account selector cards showing 1-click login buttons.

#### Curated Code Highlight: Dual-Role Demo Authentication (`client/src/pages/SignIn.jsx`)
```jsx
// Quick 1-click demo credentials for evaluation
const DEMOS = {
  patient: { email: 'aarav.menon@example.com', password: 'MedIntel2025!', label: 'Patient Demo (Aarav Menon)' },
  hospital: { email: 'hospital@example.com', password: 'MedIntel2025!', label: 'Hospital Admin (City Hospital)' },
}

const handleSubmit = async (e) => {
  e.preventDefault()
  setError(null)
  setLoading(true)
  try {
    const user = await login(email, password)
    // Redirect based on authenticated user role
    navigate(user.role === 'hospital' ? '/app/appointments' : '/app')
  } catch (err) {
    setError(err.message || 'Invalid email or password')
  } finally {
    setLoading(false)
  }
}
```

---

### Page 2: Patient Dashboard
- **Route**: `/app` (as Patient)
- **Purpose**: Central health hub showing quick triage actions, active medication adherence percentage, upcoming appointments, and recent timeline events.
- **Visual Capture Guide**:
  1. Log in as Patient. Capture the main overview dashboard showing the KPI cards (Adherence rate, Triage status, Upcoming Visits).

#### Curated Code Highlight: Aggregated Dashboard Service (`server/src/business/dashboardService.js`)
```javascript
export async function getPatientDashboard(userId) {
  const [sessions, reminders, appointments, reports] = await Promise.all([
    triageRepository.listByUserId(userId, { limit: 1 }),
    reminderRepository.listByUserId(userId),
    appointmentRepository.listByPatient(userId),
    reportRepository.listByUserId(userId, { limit: 3 }),
  ])
  
  // Calculate real-time 7-day medication adherence
  const adherence = calculateAdherence(reminders)
  const latestTriage = sessions[0] || null
  const upcomingVisits = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Booked')

  return { stats: { adherenceRate: adherence.rate, activeReminders: reminders.length }, latestTriage, upcomingVisits }
}
```

---

### Page 3: Deterministic Red-Flag Triage Engine
- **Route**: `/app/symptoms`
- **Purpose**: 3-step structured clinical intake (Symptom selection $\rightarrow$ Duration/Severity $\rightarrow$ Analysis). Immediately intercepts emergencies before any AI invocation.
- **Visual Capture Guide**:
  1. Navigate to `/app/symptoms`.
  2. Select "Chest pain" and "Shortness of breath", set severity to 9, and click **Analyse Symptoms**.
  3. Capture the resulting screen showing the **Emergency Alert Banner** and direct emergency escalation guidance.

#### Curated Code Highlight: Deterministic Triage Rule Evaluation (`server/src/business/triage/rulesEngine.js`)
```javascript
export function evaluate(input, profile = {}) {
  const features = extractFeatures(input, profile)

  // Pure evaluation of 20 clinical red-flag rules (ADR-02)
  const matched = RED_FLAG_RULES.filter((rule) => {
    try { return rule.match(features) } catch { return false }
  }).map(({ id, rule, action, urgency, rationale }) => ({
    id, rule, action, urgency, rationale, tone: URGENCY_TONE[urgency], severity: urgency.toLowerCase(),
  }))

  const urgency = matched.reduce(
    (highest, flag) => (URGENCY_RANK[flag.urgency] > URGENCY_RANK[highest] ? flag.urgency : highest),
    baselineUrgency(features)
  )

  return {
    urgency,
    tone: URGENCY_TONE[urgency],
    redFlags: matched,
    // Escalation bypasses the AI entirely: no model call, no waiting on a network
    requiresImmediateEscalation: urgency === URGENCY.EMERGENCY,
    shouldConsultAI: urgency !== URGENCY.EMERGENCY,
  }
}
```

---

### Page 4: 7-Stage AI Health Companion
- **Route**: `/app/chat`
- **Purpose**: Conversational medical context explorer with multi-turn memory, automated PII sanitization, and fallback circuit breakers.
- **Visual Capture Guide**:
  1. Navigate to `/app/chat`.
  2. Send a query such as: *"I have had a mild dry cough for 2 days with no fever. What could it be?"*
  3. Capture the AI response displaying the medical disclaimer and structured guidance.

#### Curated Code Highlight: Provider Failover & Circuit Breaker (`server/src/ai/providers/registry.js`)
```javascript
export async function completeWithFallback(request) {
  // Ordered provider chain: Groq (Llama-3.3) -> Gemini (Flash)
  for (const provider of providers) {
    if (!provider.isConfigured()) continue
    const breaker = breakers.get(provider.name)
    if (!breaker.canAttempt()) continue // Skip if circuit is OPEN

    for (let attempt = 0; attempt <= env.ai.maxRetries; attempt += 1) {
      try {
        const result = await callWithTimeout(provider, request)
        breaker.recordSuccess()
        return result
      } catch (err) {
        breaker.recordFailure()
        logger.warn({ provider: provider.name, attempt, err: err.message }, 'provider call failed')
      }
    }
  }
  // If all AI providers fail, degrade gracefully to rules-only guidance
  throw new ServiceUnavailableError('AI service currently degraded. Please consult emergency guidelines.')
}
```

---

### Page 5: Hospitals Directory & Geolocation Search
- **Route**: `/app/hospitals`
- **Purpose**: GPS-assisted discovery of nearby hospitals, specialty filtering, and direct access to doctor rosters.
- **Visual Capture Guide**:
  1. Navigate to `/app/hospitals`.
  2. Click **"Detect Location"** or filter by City ("Bangalore").
  3. Capture the list of hospitals displaying calculated distance in km and department badges.

#### Curated Code Highlight: Haversine Geolocation Distance Sorting (`server/src/data/repositories/hospital.repository.js`)
```javascript
export const hospitalRepository = {
  async search({ city, department, name, lat, lng, limit = 20, skip = 0 }) {
    const query = {}
    if (city) query.city = new RegExp(city, 'i')
    if (department) query.departments = new RegExp(department, 'i')

    let items = await Hospital.find(query).limit(limit).skip(skip).lean()

    // Calculate real-time distance using the Haversine formula if coordinates provided
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      items = items.map((h) => {
        const coords = h.location?.coordinates || [77.5946, 12.9716]
        const dist = getDistanceKm(lat, lng, coords[1], coords[0])
        return { ...h, distanceKm: dist }
      })
      items.sort((a, b) => a.distanceKm - b.distanceKm)
    }
    return { items, total: items.length }
  }
}
```

---

### Page 6: Doctor Consultation & Direct Booking
- **Route**: `/app/hospitals/:id` $\rightarrow$ "Book Consultation" Modal
- **Purpose**: Allows patients to browse verified doctors, view degrees and fees, select an available day/slot, and book an appointment.
- **Visual Capture Guide**:
  1. Click on a hospital (e.g., "Manipal Hospital").
  2. Click **"Book Appointment"** on any doctor card.
  3. Capture the booking modal showing the date picker, slot selector, and reason text field.

#### Curated Code Highlight: Appointment Booking Request Controller (`client/src/pages/hospitals/AppointmentModal.jsx`)
```jsx
const handleBooking = async (e) => {
  e.preventDefault()
  setLoading(true)
  try {
    await api.hospitals.bookAppointment({
      hospitalId: hospital._id,
      doctorId: doctor._id,
      date: selectedDate,
      timeSlot: selectedSlot,
      reason: reason.trim(),
    })
    onSuccess()
    onClose()
  } catch (err) {
    setError(err.message || 'Booking failed')
  } finally {
    setLoading(false)
  }
}
```

---

### Page 7: Hospital Admin Operations Desk
- **Route**: `/app/appointments` (as Hospital Admin)
- **Purpose**: Operational management dashboard where facility staff confirm, re-schedule, or complete patient appointments.
- **Visual Capture Guide**:
  1. Sign in as Hospital Admin (`hospital@example.com`).
  2. Navigate to **Appointments Desk** (`/app/appointments`).
  3. Capture the appointments management table showing KPI counters (`Booked`, `Confirmed`, `Completed`) and action buttons.

#### Curated Code Highlight: Appointment Status Transition (`client/src/pages/hospital/AppointmentsPage.jsx`)
```jsx
const handleStatus = async (id, newStatus) => {
  setUpdatingId(id)
  try {
    // Transitions state: Booked -> Confirmed -> Completed / Cancelled
    await api.hospitals.updateAppointmentStatus(id, newStatus)
    await reload()
  } catch (err) {
    alert(err.message || 'Failed to update appointment status')
  } finally {
    setUpdatingId(null)
  }
}
```

---

### Page 8: Doctor Roster & Facility Schedule Management
- **Route**: `/app/doctors` (as Hospital Admin)
- **Purpose**: Hospital administrators add new specialist doctors, update consultation fees, and configure active schedule days.
- **Visual Capture Guide**:
  1. While signed in as Hospital Admin, navigate to **Doctors Roster** (`/app/doctors`).
  2. Click **"Add Doctor"** to open the modal. Capture the doctor creation form.

#### Curated Code Highlight: Doctor Creation Endpoint (`server/src/business/hospitals/hospitalService.js`)
```javascript
async addDoctor(userId, doctorData) {
  const hospital = await hospitalRepository.findByUserId(userId)
  if (!hospital) throw new NotFoundError('Hospital record not found for user')

  const doctor = await doctorRepository.create({
    ...doctorData,
    hospitalId: hospital._id,
    active: true,
  })

  // Log to audit history
  await timelineRepository.create({
    userId,
    kind: 'Account',
    title: `Doctor Added: Dr. ${doctor.name}`,
    detail: `Speciality: ${doctor.specialization}, Fee: ₹${doctor.fee}`,
  })
  return doctor
}
```

---

### Page 9: Medical Lab Reports & Extraction
- **Route**: `/app/reports` (as Patient)
- **Purpose**: Uploads clinical lab reports, processes values through an asynchronous job queue, and flags abnormal values (e.g., low hemoglobin, elevated WBC).
- **Visual Capture Guide**:
  1. Sign in as Patient and navigate to `/app/reports`.
  2. Upload `Sample_CBC_Lab_Report.txt` (available in project root).
  3. Capture the report details card displaying parsed biomarkers with Red/Amber warning badges.

#### Curated Code Highlight: Lab Biomarker Extraction & Range Checking (`server/src/business/reports/reportParser.js`)
```javascript
export function evaluateBiomarkers(extractedValues) {
  const RANGES = {
    hemoglobin: { min: 13.0, max: 17.0, unit: 'g/dL' },
    wbc: { min: 4000, max: 11000, unit: '/mcL' },
    platelets: { min: 150000, max: 450000, unit: '/mcL' },
  }

  return Object.entries(extractedValues).map(([key, val]) => {
    const ref = RANGES[key]
    if (!ref) return { name: key, value: val, flag: 'Normal' }
    const flag = val < ref.min ? 'Low' : val > ref.max ? 'High' : 'Normal'
    return { name: key, value: val, unit: ref.unit, flag, referenceRange: `${ref.min} - ${ref.max}` }
  })
}
```

---

### Page 10: Medication Reminders & Adherence Tracker
- **Route**: `/app/reminders` (as Patient)
- **Purpose**: Configures recurring medication schedules and logs patient adherence (`Taken`, `Skipped`, `Missed`).
- **Visual Capture Guide**:
  1. Navigate to `/app/reminders`.
  2. Add a medication (e.g., *"Metformin 500mg - Daily at 08:00"*).
  3. Click **"Mark as Taken"** on the today dose card. Capture the adherence percentage meter updating in real-time.

#### Curated Code Highlight: Medication Dose Logging (`client/src/pages/Reminders.jsx`)
```jsx
const acknowledge = async (reminder, doseId, status) => {
  // status: 'taken' | 'skipped'
  await api.reminders.acknowledge(reminder.id, doseId, status)
  reload()
}

// Visual Adherence Progress
<div className="flex items-center gap-3">
  <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
    <div className="h-full bg-teal transition-all duration-500" style={{ width: `${adherenceRate}%` }} />
  </div>
  <span className="text-xs font-semibold text-teal-dark">{adherenceRate}% taken</span>
</div>
```

---

### Page 11: Unified Audit Timeline & Medical History
- **Route**: `/app/history`
- **Purpose**: Aggregates all patient and hospital operations into a single tamper-evident chronological audit trail with printable export.
- **Visual Capture Guide**:
  1. Navigate to `/app/history`.
  2. Filter by "Triage" or "All".
  3. Capture the chronological event timeline showing timestamped cards with action badges.

#### Curated Code Highlight: Unified Timeline Assembly (`server/src/business/history/historyService.js`)
```javascript
export async function getUnifiedHistory(userId, { kind, limit = 50, skip = 0 }) {
  const query = { userId }
  if (kind && kind !== 'All') query.kind = kind

  const [events, total] = await Promise.all([
    timelineRepository.find(query, { sort: { timestamp: -1 }, limit, skip }),
    timelineRepository.count(query),
  ])

  return { events, total, generatedAt: new Date().toISOString() }
}
```

---

## 8. Summary of Verification & Testing Status

| Test Suite | Total Assertions | Passing | Failing | Execution Time | Command |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Rules & Safety Engine Tests** | 126 | **126** | 0 | ~1.4s | `npm test` (in `/server`) |
| **End-to-End API Smoke Tests** | 118 | **118** | 0 | ~4.2s | `npm run test:api` (in `/server`) |
| **Frontend Production Build** | N/A | **Clean (0 errors)** | 0 | 780ms | `npm run build` (in `/client`) |
| **Frontend Code Linter** | N/A | **0 errors, 0 warnings**| 0 | 120ms | `npm run lint` (in `/client`) |

---

## 9. Next Steps / Project Roadmap for Final Submission

1. **Automated Optical Character Recognition (OCR) Engine**:
   - Transition from fallback plain-text biomarker parsing to client-side WebAssembly Tesseract OCR for zero-dependency image-based lab report scanning.
2. **WebRTC Direct Teleconsultation**:
   - Establish live peer-to-peer audio/video rooms directly accessible from the Hospital Appointments Desk once an appointment status is marked `Confirmed`.
3. **FHIR / HL7 Diagnostic Export**:
   - Enable patients to download their unified history as a standard HL7-FHIR JSON bundle compatible with national digital health infrastructure.
4. **Offline-First PWA Support**:
   - Integrate Service Workers to support offline viewing of medical history and medication reminders when internet access is unavailable.

---
*Report generated and validated against MedIntel Release v1.0.0.*

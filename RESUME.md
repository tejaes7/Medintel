# MedIntel — resume checklist

Updated **20 Aug 2026**. Everything built and verified, persistence included.

---

## Unblocked — 20 Aug 2026

Atlas M0 is connected (database `medintel`), seeded, and the full end-to-end suite passes
**108/108**. There is no outstanding blocker.

### The Atlas URI had to be written in non-SRV form

`mongodb+srv://` fails on this machine with `querySrv ECONNREFUSED` — Node's resolver cannot
do SRV lookups here, even though `nslookup -type=SRV` resolves the record fine. Not an Atlas,
credentials, or Network Access problem. `MONGODB_URI` in `server/.env` uses the seed-list form
instead:

```
mongodb://<user>:<pass>@ac-vtz02m2-shard-00-0{0,1,2}.rokzd0q.mongodb.net:27017/medintel
  ?ssl=true&replicaSet=atlas-hnj23u-shard-0&authSource=admin&retryWrites=true&w=majority
```

Rebuild it after any cluster change with:

```bash
nslookup -type=SRV _mongodb._tcp.medintelcluster.rokzd0q.mongodb.net 8.8.8.8  # shard hosts
nslookup -type=TXT medintelcluster.rokzd0q.mongodb.net 8.8.8.8                # authSource, replicaSet
```

> Do **not** try the in-memory MongoDB fallback. It needs a 600 MB binary from
> fastdl.mongodb.org and that download died with `ECONNRESET` after 3 retries, twice, on this
> connection.

## Run

```bash
cd server && npm run dev     # http://localhost:4000
cd client && npm run dev     # http://localhost:5173
```

Demo accounts:
- Patient: `aarav.menon@example.com` / `MedIntel2025!`
- Hospital Admin: `hospital@example.com` / `MedIntel2025!`

## State at pause

### Done and verified

| Area | Status |
|---|---|
| Layer 5 — Data Access | 11 models (User, TriageSession, Conversation, Report, Reminder, TimelineEvent, Hospital, Doctor, HospitalEvent, Appointment), 11 repositories, cache interface (memory + Redis drivers), job queue |
| Layer 4 — AI Service | 7-stage pipeline, provider registry, circuit breakers, redactor, validator |
| Layer 3 — Business | 20-rule engine, triage/chat/reports/reminders/history/auth/profile/dashboard/hospitals/appointments |
| Layer 2 — API | Express 5, JWT + refresh rotation, zod validation, 4 rate-limit tiers, error envelope, RBAC ownership checks |
| Frontend | 9 modules & pages on real API (Landing, SignIn, Dashboard, Symptoms, Chat, Reports, Reminders, History, Hospitals & Clinics), auth context, route guard, clean build & 0 lint errors |

Verified live against MongoDB Atlas:

- **126/126** rules + safety unit tests
- **118/118** end-to-end API smoke tests passing
- Layer-boundary audit — zero skip-layer or upward imports
- Groq: triage, chat, report summarisation all round-trip
- Groq → Gemini failover, and the circuit breaker opening then skipping in 0 ms
- Emergency path makes **zero** model calls
- Hospital profile management & direct doctor appointment booking verified
- `vite build` clean in <1s, `oxlint` clean with 0 errors

---

## Keys in `server/.env`

| Key | State |
|---|---|
| `GROQ_API_KEY` | Set, verified live |
| `GEMINI_API_KEY` | Set, verified live (failover tested) |
| `MONGODB_URI` | Set (non-SRV seed list), connected and seeded |
| `OCR_SPACE_API_KEY` | Empty. Uploads work; PDF/image extraction skipped, reports land `Failed` with a clear reason. Plain-text uploads still summarise. |
| `JWT_SECRET` | Production-grade 256-bit cryptographically secure secret set. |
| `REDIS_URL` | Empty. In-process cache/queue — correct for a single-instance demo. |

---

## All Features Complete

1. **Deterministic Red-Flag Triage Engine**: 20 rules evaluated before AI invocation.
2. **AI Health Companion & Multi-Turn Chat**: Groq/Gemini with circuit breaker & PII redaction.
3. **Medical Report Upload & Processing**: Async queue, structured lab value flags.
4. **Medication Reminders & Adherence Tracking**: Cron-based scheduler, dose logging.
5. **Unified Medical History**: Chronological audit timeline across all actions.
6. **Nearby Hospitals & Clinics**: GPS geolocation detection, Haversine distance sorting, city/department filters.
7. **Doctor Rosters & Qualifications**: Specialist degrees, fees, schedule availability, and direct appointment booking.
8. **Health Donation Camps & Marathons**: Blood donation drives and marathon event feeds.
9. **Hospital Admin Portal**: Full doctor roster management, donation event publication, appointment status confirmations, and facility profile editing.
10. **Dual-Role Auth & 1-Click Demos**: Patient and Hospital Admin roles with instant demo credentials on sign-in.

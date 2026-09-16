# MedIntel

A layered, AI-assisted health companion with a **deterministic red-flag triage engine in
front of the AI** — safety-critical decisions never depend on a model call.

## Layout

| Path      | What it is                                                          |
| --------- | ------------------------------------------------------------------- |
| `client/` | Presentation layer — React 19 · React Router · Vite · Tailwind v4    |
| `server/` | Layers 2–5 — API, business rules, AI service, data access (Express 5)|
| `docs/`   | Report, UML, slides, concept notes                                   |
| `RESUME.md` | Current state and restart checklist                               |

## Run

```bash
cd server && npm install && npm run dev     # http://localhost:4000
cd client && npm install && npm run dev     # http://localhost:5173
```

`server/.env` must have `MONGODB_URI` set first — see `RESUME.md`.

## Architecture

Five layers, strictly downward-calling. A layer-boundary audit enforces no skip-layer and
no upward imports.

| Layer | Name          | Lives in                                                      |
| ----- | ------------- | ------------------------------------------------------------- |
| 1     | Presentation  | `client/src`                                                  |
| 2     | API           | `server/src/api` — JWT + refresh rotation, zod, rate limiting |
| 3     | Business      | `server/src/business` — 20-rule triage engine, safety rules   |
| 4     | AI Service    | `server/src/ai` — 7-stage pipeline, provider failover, circuit breakers |
| 5     | Data Access   | `server/src/data` — 11 models, 11 repositories, cache, job queue |

The emergency path short-circuits at Layer 3 and makes **zero** model calls.

## Routes

| Route             | Module | Screen                                    |
| ----------------- | ------ | ----------------------------------------- |
| `/`               | —      | Marketing / architecture overview          |
| `/signin`         | 01     | Authentication (Patient & Hospital roles)  |
| `/app`            | —      | Overview dashboard                         |
| `/app/symptoms`   | 02     | Symptom analysis (3-step intake + result)  |
| `/app/chat`       | 03     | AI health chat                             |
| `/app/reports`    | 04     | Report upload + extracted values           |
| `/app/reminders`  | 05     | Medicine schedules + adherence log         |
| `/app/history`    | 06     | Unified timeline                           |
| `/app/hospitals`  | 07     | Nearby hospitals, doctors & direct booking |
| `/app/profile`    | 01     | Profile, clinical background, security     |

## Demo Accounts

- **Patient Demo**: `aarav.menon@example.com` / `MedIntel2025!`
- **Hospital Admin Demo**: `hospital@example.com` / `MedIntel2025!`

## Tests

```bash
cd server
npm test        # 126 rules + safety unit tests, no DB needed
npm run test:api  # 118 end-to-end assertions, needs the server running
```

Design tokens (colour, shadow, font) live in the `@theme` block at the top of
`client/src/index.css`.

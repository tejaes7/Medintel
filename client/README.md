# MedIntel — Client (UI)

Presentation layer for MedIntel: a layered, AI-assisted health companion with a
deterministic red-flag triage engine in front of the AI.

## Run

```bash
npm install
npm run dev
```

## Stack

React 19 · React Router · Vite · Tailwind CSS v4

## Routes

| Route             | Module | Screen                                   |
| ----------------- | ------ | ---------------------------------------- |
| `/`               | —      | Marketing / architecture overview         |
| `/signin`         | 01     | Authentication                            |
| `/app`            | —      | Overview dashboard                        |
| `/app/symptoms`   | 02     | Symptom analysis (3-step intake + result) |
| `/app/chat`       | 03     | AI health chat                            |
| `/app/reports`    | 04     | Report upload + extracted values          |
| `/app/reminders`  | 05     | Medicine schedules + adherence log        |
| `/app/history`    | 06     | Unified timeline                          |
| `/app/profile`    | 01     | Profile, clinical background, security    |

## Notes

This is the presentation layer only. All data comes from `src/data/mock.js`; no
network calls are made. Swap that module for an Axios-backed service layer when
the API is ready — components take data as props or import from one place, so
the seam is a single file.

Design tokens (colour, shadow, font) live in the `@theme` block at the top of
`src/index.css`.

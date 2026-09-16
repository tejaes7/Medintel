# MedIntel API

Layered modular monolith serving the MedIntel React client. Node 20+, Express 5, MongoDB.

## Quick start

```bash
cd server
npm install
cp .env.example .env      # then fill in MONGODB_URI and GROQ_API_KEY
npm run dev               # http://localhost:4000
```

```bash
npm test                  # rules engine + safety gate — no DB, no API key needed
npm run seed              # demo account matching the UI mockups
npm run test:api          # full end-to-end smoke test against a running server
```

## Free-tier services

| Service | Purpose | Where to get a key | Required? |
|---|---|---|---|
| MongoDB Atlas M0 | Persistence | <https://mongodb.com/cloud/atlas> | Yes |
| Groq | Primary AI provider | <https://console.groq.com/keys> | No — degrades to rules-only |
| Google Gemini | Fallback AI provider | <https://aistudio.google.com/apikey> | No — dormant until set |
| OCR.space | Report text extraction | <https://ocr.space/ocrapi> | No — reports queue without extraction |
| Upstash Redis | Cache + queue at scale | <https://upstash.com> | No — in-process driver by default |

Every optional service is behind an adapter and reports its absence at boot. The app runs
with only `MONGODB_URI` set; missing providers degrade, they do not crash.

> **Groq retires models regularly.** A `Groq responded 404` in the logs means `GROQ_MODEL` no
> longer exists. List what your key can currently reach and pick a chat model:
>
> ```bash
> curl -s https://api.groq.com/openai/v1/models \
>   -H "Authorization: Bearer $GROQ_API_KEY" | jq -r '.data[].id' | sort
> ```
>
> Current default is `openai/gpt-oss-120b`. It is a reasoning model and takes 10–12 s per
> call, which is why `AI_TIMEOUT_MS` defaults to 45000. `openai/gpt-oss-20b` is faster if you
> would rather trade some quality for latency.
>
> Google retires models too — `gemini-2.0-flash` is already gone. `GEMINI_MODEL` therefore
> defaults to the **alias** `gemini-flash-latest` rather than a pinned version: this is the
> fallback provider, so surviving a retirement matters more than reproducible output. Pin a
> specific version if you need determinism. List what your key can reach with:
>
> ```bash
> curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" \
>   | jq -r '.models[] | select(.supportedGenerationMethods[]? == "generateContent") | .name'
> ```

## The layers

```
src/
  api/            Layer 2 — Gateway: authN, validation, rate limit, error envelope
  business/       Layer 3 — Rules engine, orchestrators, scheduler
  ai/             Layer 4 — Adapter, prompts, redaction, validator, circuit breaker
  data/           Layer 5 — Models, repositories, cache, queue
  shared/         Cross-cutting: logger, errors, audit
  index.js        Composition root — the only file that sees every layer
```

Two rules make the style real, and both are enforced by the import graph:

1. **Strict downward dependency.** A layer imports only from the layer directly beneath it.
2. **No layer skipping.** Routes never touch a repository; services never touch a model.

The one deliberate exception is `shared/`, which is cross-cutting by definition and may be
imported from anywhere.

## The safety claim (ADR-02)

The load-bearing architectural claim is that **a probabilistic component never decides
escalation**. It is enforced in three places and verified by `npm test`:

- `business/triage/rulesEngine.js` is pure, total and deterministic. It sets urgency.
- When urgency is `Emergency`, `triageService` short-circuits: `shouldConsultAI` is false and
  no model is called at all. The same holds for every inbound chat message.
- The AI schema in `ai/validator.js` has **no urgency field**. The model cannot return one
  even if it tries.

`npm test` covers all 20 rules, negation handling, purity, monotonicity, predicate-failure
isolation, redaction, and the banned-content gate — 126 assertions, no I/O.

## The 7-stage AI pipeline (ADR-04)

Every AI-touching feature enters through `ai/pipeline.js`; there is no other route to a provider.

| # | Stage | File | What it guarantees |
|---|---|---|---|
| 1 | Normalise | `pipeline.js` | Predictable input, bounded length |
| 2 | Redact | `redactor.js` | No PII crosses the provider boundary |
| 3 | Rules | `business/triage/rulesEngine.js` | Urgency is already fixed |
| 4 | Context | `pipeline.js` | Minimum necessary profile only |
| 5 | Call | `providers/registry.js` | Timeout, retries, circuit breaker, fallback chain |
| 6 | Validate | `validator.js` | Schema gate + safety gate, both must pass |
| 7 | Wrap | `pipeline.js` | Provenance and disclaimer attached by us, not the model |

Provider order is `groq → gemini`. Unconfigured providers are skipped; a provider whose
circuit is open is skipped; if all fail, the caller degrades to deterministic guidance and
sets `degraded: true` on the response.

## Response envelope

```jsonc
// success
{ "ok": true,  "data": { }, "meta": { "requestId": "…" } }
// failure
{ "ok": false, "error": { "code": "VALIDATION_FAILED", "message": "…", "details": { } },
  "meta": { "requestId": "…" } }
```

`x-request-id` is echoed on every response and appears in every log line for that request.

## Endpoints

`GET /api` returns the live route inventory. Summary:

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | Liveness + dependency health. Unauthenticated. |
| POST | `/api/auth/register` · `/login` · `/refresh` · `/logout` | JWT, 15 min access + 7 day rotating refresh |
| GET | `/api/auth/me` | |
| GET | `/api/triage/rules` | The rule table. Public — transparency feature. |
| POST | `/api/triage/analyse` | Rules engine, then AI if safe to wait |
| GET | `/api/triage/sessions` · `/latest` · `/:id` | |
| GET/POST | `/api/chat/conversations` · `/latest` · `/:id` | |
| POST | `/api/chat/messages` | Rules engine screens every turn |
| GET/POST/DELETE | `/api/reports` · `/:id` | Multipart upload, processed on the queue |
| GET/POST/PATCH/DELETE | `/api/reminders` · `/:id` | |
| POST | `/api/reminders/:id/doses/:doseId` | Acknowledge a dose |
| GET | `/api/history` | Unified timeline, filterable by `kind` |
| GET/PATCH | `/api/profile` | |
| GET | `/api/dashboard` | Composed read model |

## Rate limits

| Scope | Window | Max | Why |
|---|---|---|---|
| Global | 1 min | 300 | Broad ceiling |
| Auth | 15 min | 20 | Blunt brute force |
| AI endpoints | 1 min | 12 | Free-tier provider quota is a real constraint |
| Upload | 1 hour | 30 | |

Authenticated callers are keyed per account; anonymous callers per IP, with IPv6 normalised
to a /64 subnet so a client cannot rotate addresses within its own prefix.

## Notes on the accepted trade-offs

- **Single instance assumed.** The scheduler and the in-process queue both assume one
  process. Behind a load balancer they need a distributed lock and BullMQ respectively.
  The interfaces already allow for it; the drivers do not yet exist.
- **Eventual consistency on reports.** Upload returns `Queued` immediately (ADR-06). The
  client polls. This is the price of keeping OCR off the request path.
- **Audit is best-effort.** `shared/audit.js` swallows its own failures so it can never break
  the request it is recording. A real deployment would ship it to an append-only store.

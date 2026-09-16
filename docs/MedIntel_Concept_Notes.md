# MedIntel — Polished Concept Notes

Companion to `MedIntel_Project_Overview.pptx`. Use this for the written report and for
answering panel questions.

---

## 1. What changed from the original pitch, and why

The original idea was architecturally thin: a CRUD app that forwards text to an AI API.
For a Software Architecture subject that is a problem, because there are no **decisions**
to defend — and decisions are what gets graded. Five changes fix that.

| # | Change | Why it matters architecturally |
|---|--------|-------------------------------|
| 1 | Added a **deterministic red-flag triage engine that runs before the AI** | A probabilistic component now never sits alone on a safety-critical path. Generates real quality-attribute scenarios and the strongest ADR in the deck. |
| 2 | Repositioned as **clinical decision *support*, with an explicit "is not" list** | The safety boundary becomes a design constraint that visibly shapes the architecture, not a disclaimer bolted on at the end. |
| 3 | Split the AI layer into a **7-stage pipeline** (normalise → redact → rules → context → call → validate → wrap) | Turns "we call Gemini" into a designed subsystem with privacy, resilience and auditability built in. |
| 4 | Added an **ADR log with rejected alternatives and accepted trade-offs** | Shows engineering judgement. "We chose X *and here is what it costs us*" beats "we chose X". |
| 5 | Added **quality attributes as measurable scenarios** paired with tactics | Converts vague adjectives ("fast", "secure") into things an architecture can actually be evaluated against. |

Also sharpened: modular monolith (not just "monolith"), stated layer contracts including
what each layer **must never** do, and a phased roadmap so six modules in one semester
reads as planned rather than optimistic.

---

## 2. The one-line pitch

> MedIntel is a layered, AI-assisted health companion that triages symptoms, keeps a
> unified medical history, and supports medication adherence — with a deterministic
> safety engine in front of the AI so that escalation decisions never depend on a
> language model being right.

---

## 3. The architectural spine

**Style:** Layered (N-tier) modular monolith.

```
Presentation (React SPA)
        ↓
API / Gateway (Express: authN/Z, validation, rate limit, error envelope)
        ↓
Business Logic (Triage rules engine · orchestrator · scheduler · history)
        ↓
AI Service (adapter · prompts · redaction · validator · circuit breaker)
        ↓
Data Access (repositories · Mongoose · Redis · object storage)
```

Two rules make the style real, and you should say both out loud:
1. **Strict downward dependency** — a layer calls only the layer directly beneath it.
2. **No layer skipping** — the React client cannot reach MongoDB; it does not know MongoDB exists.

Cross-cutting concerns (auth, validation, logging, error handling, config, caching)
run vertically as the Express middleware chain.

---

## 4. Decisions you must be able to defend

| ADR | Decision | Rejected alternative | Price we accept |
|-----|----------|---------------------|-----------------|
| 01 | Modular monolith | Microservices | Whole app scales together |
| 02 | Rules engine before AI | AI-only triage | Rules table needs manual curation |
| 03 | MongoDB | MySQL | Weaker cross-collection integrity |
| 04 | AI provider behind an Adapter | Direct SDK calls | One extra indirection layer |
| 05 | Stateless JWT | Server-side sessions | Revocation needs short TTL + refresh rotation |
| 06 | Async queue for OCR/reminders | Synchronous processing | Extra worker, eventual consistency |

**ADR-01 is the one you will be challenged on.** The answer: microservices buy
independent scaling and deployment, but cost distributed tracing, network-failure
handling and multi-service DevOps — which four students on a semester deadline cannot
absorb. We keep clean module seams so the AI service can be extracted later. That is
*deferring* the decision, not avoiding it.

---

## 5. Likely panel questions

| Question | Answer |
|----------|--------|
| What if the AI is wrong / hallucinates? | It never owns escalation — the rules engine does. Output is schema-validated and banned-content checked (no drug names, no dosages). Confidence and disclaimer always attached. |
| Why Node, not Java or Python? | The workload is I/O-bound — most request time is spent waiting on the AI API and DB, not computing. Node's non-blocking event loop suits that, and one language across the stack suits a 4-person team. |
| Why MongoDB, not MySQL? | Symptom sessions and reports are nested, schema-evolving documents; our workload has no join-heavy queries. (ADR-03) |
| How does it scale? | Stateless JWT → any instance serves any request → horizontal instances behind a load balancer, plus Redis cache and an async job queue. |
| How is health data protected? | PII redacted before the AI boundary, encryption at rest and in transit, RBAC with per-resource ownership checks, append-only audit log. |
| Biggest architectural risk? | Dependence on a third-party AI provider — mitigated by the adapter, circuit breaker and fallback provider, degrading to rules-only guidance. |
| Is this legal? | Positioned as decision *support*, not diagnosis. We follow the principles of health-data regulation (minimisation, encryption, access control, auditability) without claiming certification for a student project. |

---

## 6. Two honesty notes

- **No invented statistics.** The problem slide is deliberately qualitative. If a panel
  asks for numbers, say the framing comes from common observation and secondary reading
  rather than quoting a figure you cannot source.
- **Phase 1 is the real commitment.** Modules 1–3 plus history form the graded core;
  report upload and reminders follow. Say this plainly rather than implying all six
  modules will ship.

---

## 7. Regenerating the deck

```
python make_medintel_ppt.py     # writes MedIntel_Project_Overview.pptx
```

Edit content in `make_medintel_ppt.py` — colours and fonts are the tokens at the top of
the file. Every slide already carries speaker notes; open **View → Notes Page** in
PowerPoint to rehearse from them.

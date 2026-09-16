import { evaluate, fallbackGuidance, URGENCY } from './rulesEngine.js'
import { publicRuleTable } from './rules.js'
import { aiService } from '../../ai/aiService.js'
import { triageRepository, userRepository } from '../../data/repositories/index.js'
import { historyService } from '../history/historyService.js'
import { audit, AUDIT } from '../../shared/audit.js'
import { logger } from '../../shared/logger.js'
import { NotFoundError } from '../../shared/errors.js'

/**
 * Triage orchestrator. The sequence below is the architecture's central claim:
 * the rules engine decides urgency, and only afterwards — and only when the rules
 * engine says it is safe to wait — is the AI consulted for differentiation.
 */
export const triageService = {
  async analyse({ userId, input, ip }) {
    const user = await userRepository.findById(userId)
    if (!user) throw new NotFoundError('User')
    const profile = user.profile?.toObject?.() ?? user.profile ?? {}

    // ── 1. Deterministic evaluation. Cannot fail, cannot be overridden. ──────────
    const verdict = evaluate(input, profile)

    let conditions = []
    let advice = []
    let confidence = 0
    let decidedBy = 'rules-engine'
    let aiProvider = 'none'
    let degraded = false

    if (!verdict.shouldConsultAI) {
      // ── 2a. Emergency: short-circuit. No model call on a time-critical path. ──
      const fb = fallbackGuidance(verdict.urgency, verdict.redFlags)
      advice = fb.advice
      confidence = fb.confidence
      logger.info('triage escalated by rules engine, ai bypassed', {
        userId: String(userId),
        rules: verdict.redFlags.map((f) => f.id),
      })
      await audit({
        actorId: userId,
        action: AUDIT.TRIAGE_ESCALATE,
        resource: 'triage',
        ip,
        metadata: { urgency: verdict.urgency, rules: verdict.redFlags.map((f) => f.id) },
      })
    } else {
      // ── 2b. Non-emergency: enrich with AI, degrade safely if it cannot deliver. ─
      try {
        const ai = await aiService.differentiate({
          text: input.text,
          profile,
          urgency: verdict.urgency,
          redFlags: verdict.redFlags,
          actorId: userId,
        })
        conditions = normaliseLikelihoods(ai.conditions)
        advice = ai.advice
        confidence = ai.confidence
        decidedBy = 'ai-assisted'
        aiProvider = ai.provider
      } catch (err) {
        degraded = true
        const fb = fallbackGuidance(verdict.urgency, verdict.redFlags)
        advice = fb.advice
        confidence = 0
        logger.warn('triage degraded to rules-only guidance', { userId: String(userId), err: err.message })
      }
    }

    // ── 3. Persist with full provenance. ────────────────────────────────────────
    const session = await triageRepository.create({
      userId,
      input: {
        text: input.text,
        durationDays: verdict.features.durationDays ?? undefined,
        temperatureC: verdict.features.temperatureC ?? undefined,
        symptoms: verdict.features.symptoms,
      },
      urgency: verdict.urgency,
      tone: verdict.tone,
      confidence,
      redFlags: verdict.redFlags,
      conditions,
      advice,
      disclaimer: aiService.DISCLAIMER,
      decidedBy,
      aiProvider,
      degraded,
    })

    // ── 4. Write to the unified history. ────────────────────────────────────────
    await historyService.record({
      userId,
      kind: 'Triage',
      tone: verdict.tone,
      title: `Symptom session — ${summariseSymptoms(verdict.features.symptoms, input.text)}`,
      body:
        `${verdict.urgency} urgency.` +
        (conditions.length
          ? ` ${conditions[0].name} ranked highest at ${Math.round(conditions[0].likelihood * 100)}%.`
          : verdict.redFlags.length
            ? ` Escalated by ${verdict.redFlags.length} red-flag rule(s).`
            : ' No red flags triggered.'),
      sourceId: session._id,
      occurredAt: session.createdAt,
    })

    await audit({
      actorId: userId,
      action: AUDIT.TRIAGE_CREATE,
      resource: 'triage',
      resourceId: String(session._id),
      ip,
      metadata: { urgency: verdict.urgency, decidedBy, aiProvider, degraded },
    })

    return present(session, verdict)
  },

  async get({ userId, sessionId }) {
    const session = await triageRepository.findByIdForUser(sessionId, userId)
    if (!session) throw new NotFoundError('Triage session')
    return present(session)
  },

  async list({ userId, limit, skip }) {
    const [items, total] = await Promise.all([
      triageRepository.listForUser(userId, { limit, skip }),
      triageRepository.countForUser(userId),
    ])
    return { items: items.map((s) => present(s)), total }
  },

  async latest({ userId }) {
    const session = await triageRepository.latestForUser(userId)
    return session ? present(session) : null
  },

  /** The rule table, for the client's transparency panel. */
  rules: () => publicRuleTable(),
}

/** Likelihoods must sum to 1 so the client can render them as a distribution. */
function normaliseLikelihoods(conditions) {
  const sum = conditions.reduce((t, c) => t + c.likelihood, 0)
  if (sum <= 0) return conditions
  return conditions.map((c) => ({ ...c, likelihood: Number((c.likelihood / sum).toFixed(2)) }))
}

function summariseSymptoms(symptoms, text) {
  if (symptoms.length) return symptoms.slice(0, 3).map((s) => s.replace(/_/g, ' ')).join(', ')
  return String(text).slice(0, 40) + (text.length > 40 ? '…' : '')
}

/** Presentation shape — matches exactly what the React client renders. */
function present(session, verdict) {
  return {
    id: String(session._id),
    urgency: session.urgency,
    tone: session.tone,
    confidence: session.confidence,
    redFlags: session.redFlags,
    conditions: session.conditions,
    advice: session.advice,
    disclaimer: session.disclaimer,
    decidedBy: session.decidedBy,
    aiProvider: session.aiProvider,
    degraded: session.degraded,
    input: session.input,
    createdAt: session.createdAt,
    ...(verdict ? { features: verdict.features } : {}),
  }
}

export { URGENCY }

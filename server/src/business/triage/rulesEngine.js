import { RED_FLAG_RULES, URGENCY, URGENCY_RANK, URGENCY_TONE } from './rules.js'
import { extractFeatures } from './featureExtractor.js'

/**
 * STAGE 3 of the pipeline, and the safety spine of the whole system (ADR-02).
 *
 * Properties this function guarantees, all of which are testable:
 *   - Pure. Same input, same output, no I/O, no network, no clock.
 *   - Total. Always returns an urgency; there is no "unknown" branch.
 *   - Monotonic. Adding a symptom can only raise urgency, never lower it.
 *
 * The AI layer is never consulted here and cannot override the result.
 */
export function evaluate(input, profile = {}) {
  const features = extractFeatures(input, profile)

  const matched = RED_FLAG_RULES.filter((rule) => {
    try {
      return rule.match(features)
    } catch {
      // A throwing predicate must never take the safety path down with it.
      return false
    }
  }).map(({ id, rule, action, urgency, rationale }) => ({
    id,
    rule,
    action,
    urgency,
    rationale,
    tone: URGENCY_TONE[urgency],
    severity: urgency.toLowerCase(),
  }))

  const urgency = matched.reduce(
    (highest, flag) => (URGENCY_RANK[flag.urgency] > URGENCY_RANK[highest] ? flag.urgency : highest),
    baselineUrgency(features)
  )

  return {
    urgency,
    tone: URGENCY_TONE[urgency],
    redFlags: matched,
    features: describeFeatures(features),
    // Escalation bypasses the AI entirely: no model call, no waiting on a network.
    requiresImmediateEscalation: urgency === URGENCY.EMERGENCY,
    // Emergency and self-care are both fully determined; only the middle needs differentiation.
    shouldConsultAI: urgency !== URGENCY.EMERGENCY,
  }
}

/** Floor urgency when no red flag fires, from symptom count and duration alone. */
function baselineUrgency(features) {
  const n = features.symptoms.size
  if (n === 0) return URGENCY.SELF_CARE
  if (features.severity === 'severe') return URGENCY.URGENT
  if ((features.durationDays ?? 0) >= 7) return URGENCY.ROUTINE
  if (n >= 3) return URGENCY.ROUTINE
  return URGENCY.SELF_CARE
}

/** Serialisable view of the features, for the audit trail and the "why" panel. */
function describeFeatures(features) {
  return {
    symptoms: [...features.symptoms],
    temperatureC: features.temperatureC,
    durationDays: features.durationDays,
    severity: features.severity,
    isPregnant: features.isPregnant,
    hasRespiratoryCondition: features.hasRespiratoryCondition,
  }
}

/**
 * Deterministic guidance used when the AI is unavailable or its output was rejected.
 * The user always gets something safe, never an error page.
 */
export function fallbackGuidance(urgency, redFlags) {
  if (urgency === URGENCY.EMERGENCY) {
    return {
      conditions: [],
      advice: [
        'Seek emergency care now — call your local emergency number or go to the nearest emergency department.',
        'Do not drive yourself. Stay with someone who can call for help if your condition changes.',
        redFlags.length
          ? `This was escalated because: ${redFlags.map((f) => f.rule.toLowerCase()).join('; ')}.`
          : 'Your description matched an emergency escalation rule.',
      ],
      confidence: 1,
    }
  }
  if (urgency === URGENCY.URGENT) {
    return {
      conditions: [],
      advice: [
        'Arrange to be seen by a clinician within the next 24 hours.',
        'Write down when each symptom started and how it has changed — it speeds up the consultation.',
        'If anything worsens sharply before your appointment, seek emergency care instead.',
      ],
      confidence: 1,
    }
  }
  if (urgency === URGENCY.ROUTINE) {
    return {
      conditions: [],
      advice: [
        'Book a routine appointment with your regular clinician.',
        'Rest, keep your fluid intake up, and record your symptoms daily in your history.',
        'Seek care sooner if you develop breathing difficulty, a high fever, or severe pain.',
      ],
      confidence: 1,
    }
  }
  return {
    conditions: [],
    advice: [
      'Your description does not currently match an escalation rule. Self-care and monitoring are reasonable.',
      'Record your symptoms daily so a trend is visible if this continues.',
      'Contact a clinician if symptoms persist beyond a week or worsen.',
    ],
    confidence: 1,
  }
}

export { URGENCY }

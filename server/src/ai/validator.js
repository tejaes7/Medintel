import { z } from 'zod'
import { logger } from '../shared/logger.js'

/**
 * STAGE 6 — Validation. Two independent gates, both of which must pass:
 *   1. Schema gate  — the response is the shape the business layer expects.
 *   2. Safety gate  — the response contains no banned content.
 * A model that fails either gate is treated as a provider failure, not as an answer.
 */

export const triageAiSchema = z.object({
  conditions: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        likelihood: z.number().min(0).max(1),
        note: z.string().min(2).max(400),
      })
    )
    .min(1)
    .max(6),
  advice: z.array(z.string().min(2).max(300)).min(1).max(6),
  confidence: z.number().min(0).max(1),
})

export const reportAiSchema = z.object({
  summary: z.string().min(2).max(2000),
  findings: z
    .array(
      z.object({
        label: z.string().max(120),
        value: z.string().max(80),
        unit: z.string().max(40).default(''),
        referenceRange: z.string().max(80).default(''),
        flagged: z.boolean().default(false),
      })
    )
    .max(60)
    .default([]),
})

// Common drug stems + explicit dosage patterns. Deliberately broad: a false positive costs
// one retry, a false negative puts a dose instruction in front of a patient.
const BANNED_PATTERNS = [
  { rule: 'dosage', re: /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|g|ml|iu|units?)\b/i },
  { rule: 'frequency', re: /\b(?:once|twice|thrice|\d+\s?times)\s+(?:a|per)\s+day\b/i },
  { rule: 'latin-frequency', re: /\b(?:b\.?i\.?d|t\.?i\.?d|q\.?i\.?d|q\.?d|p\.?r\.?n|o\.?d)\b\.?/i },
  { rule: 'prescribe-verb', re: /\b(?:take|prescribe[ds]?|administer|inject|swallow)\s+(?:\d|a\s+tablet|one\s+tablet)/i },
  { rule: 'drug-stem', re: /\b\w+(?:cillin|mycin|azole|statin|prazole|olol|sartan|dipine|profen|caine|codone|azepam)\b/i },
  { rule: 'common-drug', re: /\b(?:paracetamol|acetaminophen|ibuprofen|aspirin|antibiotics?|steroids?|painkillers?)\b/i },
  { rule: 'definitive-diagnosis', re: /\byou (?:have|are suffering from|definitely have)\b/i },
  { rule: 'discourages-care', re: /\b(?:no need to|don'?t need to|avoid)\s+(?:see|visit|consult)\s+(?:a\s+)?(?:doctor|physician|clinician)\b/i },
]

/** @returns {{ safe: boolean, violations: string[] }} */
export function checkSafety(text) {
  const violations = []
  for (const { rule, re } of BANNED_PATTERNS) if (re.test(text)) violations.push(rule)
  return { safe: violations.length === 0, violations }
}

/** Models sometimes fence JSON despite instructions. Recover before declaring failure. */
export function parseJsonLoose(raw) {
  const trimmed = String(raw).trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('no JSON object found in response')
  return JSON.parse(candidate.slice(start, end + 1))
}

/**
 * Runs both gates.
 * @returns {{ ok: true, data: any } | { ok: false, reason: string, detail: any }}
 */
export function validateStructured(raw, schema, { safetyText } = {}) {
  let parsed
  try {
    parsed = parseJsonLoose(raw)
  } catch (err) {
    return { ok: false, reason: 'unparseable', detail: err.message }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    return { ok: false, reason: 'schema', detail: result.error.issues.slice(0, 5) }
  }

  const text = safetyText ? safetyText(result.data) : JSON.stringify(result.data)
  const safety = checkSafety(text)
  if (!safety.safe) {
    logger.warn('ai response failed safety gate', { violations: safety.violations })
    return { ok: false, reason: 'safety', detail: safety.violations }
  }

  return { ok: true, data: result.data }
}

/** Free-text (chat) path: safety gate only, plus a length ceiling. */
export function validateFreeText(raw, { maxChars = 2500 } = {}) {
  const text = String(raw).trim()
  if (!text) return { ok: false, reason: 'empty', detail: null }
  if (text.length > maxChars) return { ok: false, reason: 'too-long', detail: text.length }
  const safety = checkSafety(text)
  if (!safety.safe) {
    logger.warn('ai chat response failed safety gate', { violations: safety.violations })
    return { ok: false, reason: 'safety', detail: safety.violations }
  }
  return { ok: true, data: text }
}

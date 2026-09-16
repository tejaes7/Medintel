import { logger } from '../shared/logger.js'
import { audit, AUDIT } from '../shared/audit.js'
import { getCache } from '../data/cache/index.js'
import { redact } from './redactor.js'
import { completeWithFallback } from './providers/registry.js'
import { validateStructured, validateFreeText } from './validator.js'
import { DISCLAIMER } from './prompts/index.js'

/**
 * The 7-stage AI pipeline (ADR-04). Every AI-touching feature enters here — there is no
 * other route from the business layer to a model provider.
 *
 *   1 normalise -> 2 redact -> 3 rules (owned by the business layer, passed in as rule context)
 *   -> 4 context -> 5 call -> 6 validate -> 7 wrap
 */

/** STAGE 1 — Normalisation. Predictable input reduces prompt-injection surface and cache misses. */
export function normalise(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/[​-‍﻿]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, 4000)
}

/** STAGE 4 — Context assembly. Only the minimum clinically-relevant profile crosses the boundary. */
export function buildContext(profile = {}) {
  const parts = []
  if (profile.age != null) parts.push(`age ${profile.age}`)
  if (profile.sex) parts.push(String(profile.sex).toLowerCase())
  if (profile.conditions?.length) parts.push(`known conditions: ${profile.conditions.join(', ')}`)
  if (profile.allergies?.length) parts.push(`known allergies: ${profile.allergies.join(', ')}`)
  return parts.length ? parts.join('; ') : 'no clinically relevant profile on file'
}

const hash = (s) => {
  let h = 5381
  for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

/**
 * Runs stages 5-7 for a structured (JSON) request, with validation-driven retry.
 * A response that fails the schema or safety gate is retried once with a corrective nudge;
 * if it fails again the caller degrades rather than showing unvalidated output.
 */
export async function runStructured({
  system,
  user,
  schema,
  safetyText,
  actorId,
  purpose,
  cacheTtl = 0,
  cacheKeyParts = [],
}) {
  const cache = getCache()
  const cacheKey = cacheTtl ? `ai:${purpose}:${hash(JSON.stringify([system, user, ...cacheKeyParts]))}` : null

  if (cacheKey) {
    const hit = await cache.get(cacheKey)
    if (hit) {
      logger.debug('ai cache hit', { purpose })
      return { ...hit, cached: true }
    }
  }

  let lastReason = 'unknown'
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const nudge =
      attempt === 0
        ? ''
        : `\n\nYour previous response was rejected (${lastReason}). Return ONLY the required JSON object, and remember: no drug names, no dosages, no definitive diagnosis.`

    const started = Date.now()
    const completion = await completeWithFallback({ system: system + nudge, user, json: true })
    const check = validateStructured(completion.text, schema, { safetyText })

    await audit({
      actorId,
      action: AUDIT.AI_CALL,
      resource: purpose,
      outcome: check.ok ? 'success' : 'failure',
      metadata: {
        provider: completion.provider,
        model: completion.model,
        ms: Date.now() - started,
        attempt: attempt + 1,
        ...(check.ok ? {} : { rejectedBecause: check.reason }),
      },
    })

    if (check.ok) {
      // STAGE 7 — Wrap. Provenance and disclaimer are attached here, never by the model.
      const wrapped = {
        data: check.data,
        provider: completion.provider,
        model: completion.model,
        disclaimer: DISCLAIMER,
        cached: false,
      }
      if (cacheKey) await cache.set(cacheKey, wrapped, cacheTtl)
      return wrapped
    }

    lastReason = check.reason
    logger.warn('ai structured response rejected', { purpose, reason: check.reason, detail: check.detail })
  }

  const err = new Error(`AI response failed validation twice (${lastReason})`)
  err.code = 'AI_VALIDATION_FAILED'
  throw err
}

/** Stages 5-7 for a free-text (chat) request. */
export async function runFreeText({ system, user, actorId, purpose }) {
  let lastReason = 'unknown'
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const nudge =
      attempt === 0
        ? ''
        : `\n\nYour previous reply was rejected (${lastReason}). Rewrite it with no drug names, no dosages and no definitive diagnosis.`

    const started = Date.now()
    const completion = await completeWithFallback({ system: system + nudge, user, json: false, temperature: 0.4 })
    const check = validateFreeText(completion.text)

    await audit({
      actorId,
      action: AUDIT.AI_CALL,
      resource: purpose,
      outcome: check.ok ? 'success' : 'failure',
      metadata: {
        provider: completion.provider,
        model: completion.model,
        ms: Date.now() - started,
        attempt: attempt + 1,
        ...(check.ok ? {} : { rejectedBecause: check.reason }),
      },
    })

    if (check.ok) {
      return { data: check.data, provider: completion.provider, model: completion.model, disclaimer: DISCLAIMER }
    }
    lastReason = check.reason
  }

  const err = new Error(`AI chat response failed validation twice (${lastReason})`)
  err.code = 'AI_VALIDATION_FAILED'
  throw err
}

export { redact }

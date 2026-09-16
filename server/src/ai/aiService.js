import {
  triageSystemPrompt,
  triageUserPrompt,
  chatSystemPrompt,
  chatUserPrompt,
  reportSystemPrompt,
  reportUserPrompt,
  DISCLAIMER,
} from './prompts/index.js'
import { normalise, buildContext, runStructured, runFreeText } from './pipeline.js'
import { redact } from './redactor.js'
import { triageAiSchema, reportAiSchema } from './validator.js'
import { providerHealth, anyProviderConfigured } from './providers/registry.js'
import { logger } from '../shared/logger.js'

/**
 * The AI Service facade. This is the only surface the business layer may import from the
 * AI layer — prompts, providers, redaction and validation are all internal to it.
 * Swapping providers or reordering pipeline stages never reaches the business layer.
 */
export const aiService = {
  available: anyProviderConfigured,
  health: providerHealth,
  DISCLAIMER,

  /**
   * Differentiates conditions for a triage session whose urgency the rules engine already fixed.
   * The AI never returns an urgency — that field is not even in its schema.
   */
  async differentiate({ text, profile, urgency, redFlags, actorId }) {
    const normalised = normalise(text) // stage 1
    const { text: safeText, redactions } = redact(normalised) // stage 2
    if (redactions.length) logger.debug('redacted before ai boundary', { redactions })

    const context = buildContext(profile) // stage 4
    const result = await runStructured({
      // stages 5-7
      system: triageSystemPrompt(),
      user: triageUserPrompt({ text: safeText, context, urgency, redFlags }),
      schema: triageAiSchema,
      safetyText: (d) => [...d.conditions.map((c) => `${c.name} ${c.note}`), ...d.advice].join(' '),
      actorId,
      purpose: 'triage.differentiate',
      cacheTtl: 300,
      cacheKeyParts: [urgency],
    })

    return { ...result.data, provider: result.provider, cached: result.cached }
  },

  /** Answers a follow-up chat turn. */
  async chat({ message, history, profile, actorId }) {
    const { text: safeMessage } = redact(normalise(message))
    const safeHistory = history.map((m) => ({ from: m.from, text: redact(normalise(m.text)).text }))

    const result = await runFreeText({
      system: chatSystemPrompt(),
      user: chatUserPrompt({ context: buildContext(profile), history: safeHistory, message: safeMessage }),
      actorId,
      purpose: 'chat.reply',
    })

    return { text: result.data, provider: result.provider }
  },

  /** Summarises OCR-extracted report text. */
  async summariseReport({ text, actorId }) {
    const { text: safeText } = redact(normalise(text))

    const result = await runStructured({
      system: reportSystemPrompt(),
      user: reportUserPrompt({ text: safeText }),
      schema: reportAiSchema,
      safetyText: (d) => d.summary,
      actorId,
      purpose: 'report.summarise',
    })

    return { ...result.data, provider: result.provider }
  },
}

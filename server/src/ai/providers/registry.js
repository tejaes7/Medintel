import { env } from '../../config/env.js'
import { logger } from '../../shared/logger.js'
import { ServiceUnavailableError } from '../../shared/errors.js'
import { createCircuitBreaker } from '../circuitBreaker.js'
import { assertProvider } from './provider.interface.js'
import { createGroqProvider } from './groq.provider.js'
import { createGeminiProvider } from './gemini.provider.js'

/**
 * Ordered provider chain: groq → gemini. Each is wrapped in its own circuit breaker,
 * a per-call timeout and bounded retries. If every configured provider fails the
 * caller receives ServiceUnavailableError and degrades to rules-only output.
 */
const providers = [assertProvider(createGroqProvider()), assertProvider(createGeminiProvider())]

const breakers = new Map(
  providers.map((p) => [
    p.name,
    createCircuitBreaker({
      name: p.name,
      threshold: env.ai.breakerThreshold,
      cooldownMs: env.ai.breakerCooldownMs,
    }),
  ])
)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function callWithTimeout(provider, request) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), env.ai.timeoutMs)
  try {
    return await provider.complete({ ...request, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * STAGE 5 — the provider call.
 * @returns {Promise<import('./provider.interface.js').CompletionResult>}
 */
export async function completeWithFallback(request) {
  const attempted = []

  for (const provider of providers) {
    if (!provider.isConfigured()) {
      attempted.push({ provider: provider.name, skipped: 'not-configured' })
      continue
    }
    const breaker = breakers.get(provider.name)
    if (!breaker.canAttempt()) {
      attempted.push({ provider: provider.name, skipped: 'circuit-open' })
      continue
    }

    for (let attempt = 0; attempt <= env.ai.maxRetries; attempt += 1) {
      try {
        const result = await callWithTimeout(provider, request)
        breaker.recordSuccess()
        return result
      } catch (err) {
        const last = attempt === env.ai.maxRetries
        logger.warn('ai provider attempt failed', {
          provider: provider.name,
          attempt: attempt + 1,
          err: err.message,
          willRetry: !last,
        })
        if (last) {
          breaker.recordFailure()
          attempted.push({ provider: provider.name, error: err.message })
        } else {
          await sleep(2 ** attempt * 400)
        }
      }
    }
  }

  throw new ServiceUnavailableError('No AI provider could serve this request', { attempted })
}

export function providerHealth() {
  return providers.map((p) => ({
    provider: p.name,
    configured: p.isConfigured(),
    ...breakers.get(p.name).snapshot(),
  }))
}

export const anyProviderConfigured = () => providers.some((p) => p.isConfigured())

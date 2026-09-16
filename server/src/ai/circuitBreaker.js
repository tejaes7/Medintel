import { logger } from '../shared/logger.js'

/**
 * Circuit breaker per provider. Three states:
 *   closed    → calls pass through
 *   open      → calls rejected immediately, no upstream traffic
 *   half-open → one probe call allowed; success closes, failure re-opens
 */
export function createCircuitBreaker({ name, threshold = 3, cooldownMs = 30000 }) {
  let failures = 0
  let state = 'closed'
  let openedAt = 0

  function currentState() {
    if (state === 'open' && Date.now() - openedAt >= cooldownMs) {
      state = 'half-open'
      logger.info('circuit half-open', { provider: name })
    }
    return state
  }

  return {
    name,
    get state() {
      return currentState()
    },
    canAttempt() {
      return currentState() !== 'open'
    },
    recordSuccess() {
      if (state !== 'closed') logger.info('circuit closed', { provider: name })
      failures = 0
      state = 'closed'
    },
    recordFailure() {
      failures += 1
      if (state === 'half-open' || failures >= threshold) {
        state = 'open'
        openedAt = Date.now()
        logger.warn('circuit opened', { provider: name, failures })
      }
    },
    snapshot: () => ({ provider: name, state: currentState(), failures }),
  }
}

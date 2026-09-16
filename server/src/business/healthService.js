import { databaseHealth } from '../data/db.js'
import { getCache } from '../data/cache/index.js'
import { jobQueue } from '../data/queue/index.js'
import { aiService } from '../ai/aiService.js'

/**
 * Composes the health read model.
 *
 * This exists so the API layer does not have to reach past the business layer into the data
 * layer to answer /api/health. Without it the health route would be the one place in the
 * codebase that skips a layer — and an architecture rule with one exception is not a rule.
 */
export const healthService = {
  async snapshot() {
    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database: databaseHealth(),
      cache: await getCache().health(),
      queue: jobQueue.health(),
      ai: { configured: aiService.available(), providers: aiService.health() },
    }
  },
}

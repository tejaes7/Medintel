import { timelineRepository } from '../../data/repositories/index.js'
import { getCache } from '../../data/cache/index.js'
import { logger } from '../../shared/logger.js'

const cacheKey = (userId) => `timeline:${userId}`

/**
 * Unified medical history. Every other module writes here rather than owning its own
 * activity feed, which keeps the timeline a single consistent read model.
 */
export const historyService = {
  /** Append-only write. Never throws into the caller — history must not break a triage. */
  async record({ userId, kind, tone = 'brand', title, body = '', sourceId, occurredAt }) {
    try {
      const event = await timelineRepository.append({
        userId,
        kind,
        tone,
        title,
        body,
        sourceId,
        occurredAt: occurredAt ?? new Date(),
      })
      await getCache().clearPrefix(cacheKey(userId))
      return event
    } catch (err) {
      logger.error('timeline append failed', { userId: String(userId), kind, err: err.message })
      return null
    }
  },

  async list({ userId, limit = 50, skip = 0, kind }) {
    const cache = getCache()
    const key = `${cacheKey(userId)}:${kind ?? 'all'}:${limit}:${skip}`
    const hit = await cache.get(key)
    if (hit) return hit

    const [events, total] = await Promise.all([
      timelineRepository.listForUser(userId, { limit, skip, kind }),
      timelineRepository.countForUser(userId, { kind }),
    ])

    const payload = {
      items: events.map((e) => ({
        id: String(e._id),
        date: formatDate(e.occurredAt),
        occurredAt: e.occurredAt,
        kind: e.kind,
        tone: e.tone,
        title: e.title,
        body: e.body,
        sourceId: e.sourceId ? String(e.sourceId) : null,
      })),
      total,
    }

    await cache.set(key, payload, 60)
    return payload
  },
}

/** "18 Aug 2025" — the format the client already renders. */
function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

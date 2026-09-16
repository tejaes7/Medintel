import { logger } from '../../shared/logger.js'

/**
 * Redis driver — same CacheProvider contract as the memory driver.
 * Activated only when REDIS_URL is set. `redis` is an optional dependency:
 * if it is not installed the caller falls back to memory rather than crashing.
 */
export async function createRedisCache(url) {
  let createClient
  try {
    ;({ createClient } = await import('redis'))
  } catch {
    throw new Error("REDIS_URL is set but the 'redis' package is not installed (npm i redis)")
  }

  const client = createClient({ url })
  client.on('error', (err) => logger.error('redis error', { err: err.message }))
  await client.connect()

  return {
    name: 'redis',
    async get(key) {
      const raw = await client.get(key)
      return raw === null ? null : JSON.parse(raw)
    },
    async set(key, value, ttlSeconds) {
      const raw = JSON.stringify(value)
      if (ttlSeconds) await client.set(key, raw, { EX: ttlSeconds })
      else await client.set(key, raw)
    },
    async del(key) {
      await client.del(key)
    },
    async clearPrefix(prefix) {
      for await (const key of client.scanIterator({ MATCH: `${prefix}*`, COUNT: 200 })) await client.del(key)
    },
    async health() {
      const pong = await client.ping()
      return { driver: 'redis', healthy: pong === 'PONG' }
    },
  }
}

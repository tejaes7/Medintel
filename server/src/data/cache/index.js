import { env } from '../../config/env.js'
import { logger } from '../../shared/logger.js'
import { createMemoryCache } from './memory.driver.js'
import { createRedisCache } from './redis.driver.js'

let cache = createMemoryCache()

/** Selects the driver at boot. Everything above this file is driver-agnostic. */
export async function initCache() {
  if (!env.redisUrl) {
    logger.info('cache driver selected', { driver: 'memory' })
    return cache
  }
  try {
    cache = await createRedisCache(env.redisUrl)
    logger.info('cache driver selected', { driver: 'redis' })
  } catch (err) {
    logger.warn('redis unavailable, falling back to memory cache', { err: err.message })
    cache = createMemoryCache()
  }
  return cache
}

export const getCache = () => cache

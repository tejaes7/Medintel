/** In-process cache driver. Correct for a single instance; swapped for Redis when scaling out. */
export function createMemoryCache() {
  const store = new Map()

  const alive = (entry) => !entry.expiresAt || entry.expiresAt > Date.now()

  return {
    name: 'memory',
    async get(key) {
      const entry = store.get(key)
      if (!entry) return null
      if (!alive(entry)) {
        store.delete(key)
        return null
      }
      return entry.value
    },
    async set(key, value, ttlSeconds) {
      store.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null })
    },
    async del(key) {
      store.delete(key)
    },
    async clearPrefix(prefix) {
      for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key)
    },
    async health() {
      for (const [key, entry] of store) if (!alive(entry)) store.delete(key)
      return { driver: 'memory', healthy: true, keys: store.size }
    },
  }
}

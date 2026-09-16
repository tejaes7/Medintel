/**
 * CacheProvider — the contract every cache driver implements.
 * The business layer depends on this shape, never on Redis or on a Map.
 *
 * @typedef {Object} CacheProvider
 * @property {string} name
 * @property {(key: string) => Promise<any|null>} get
 * @property {(key: string, value: any, ttlSeconds?: number) => Promise<void>} set
 * @property {(key: string) => Promise<void>} del
 * @property {(prefix: string) => Promise<void>} clearPrefix
 * @property {() => Promise<{driver: string, healthy: boolean, keys?: number}>} health
 */
export const CACHE_CONTRACT = ['get', 'set', 'del', 'clearPrefix', 'health']

import mongoose from 'mongoose'
import dns from 'node:dns'
import { env } from '../config/env.js'
import { logger } from '../shared/logger.js'

// Direct Node to use fast public resolvers to avoid local Wi-Fi DNS timeouts
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])
} catch {
  // Ignore in restricted sandboxes
}

function robustLookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = {}
  }
  dns.resolve4(hostname, (err, addrs) => {
    if (err || !addrs?.length) {
      return dns.lookup(hostname, options, callback)
    }
    if (options?.all) {
      return callback(null, addrs.map((a) => ({ address: a, family: 4 })))
    }
    return callback(null, addrs[0], 4)
  })
}

let memoryServer = null

/**
 * Connects the Data Access layer. Uses MONGODB_URI when present (Atlas M0 free tier),
 * otherwise boots an in-process MongoDB so the app runs with zero external setup.
 */
export async function connectDatabase() {
  let uri = env.mongoUri
  let mode = 'external'

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    uri = memoryServer.getUri('medintel')
    mode = 'in-memory'
  }

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, { lookup: robustLookup, serverSelectionTimeoutMS: 15000 })
  logger.info('database connected', { mode, db: mongoose.connection.name })
  return { mode }
}

export async function disconnectDatabase() {
  await mongoose.connection.close()
  if (memoryServer) await memoryServer.stop()
}

export function databaseHealth() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  return { status: states[mongoose.connection.readyState] ?? 'unknown', mode: memoryServer ? 'in-memory' : 'external' }
}

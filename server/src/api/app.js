import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from '../config/env.js'
import { api } from './routes/index.js'
import { requestId, requestLogger, rateLimiters, notFound, errorHandler } from './middleware/index.js'

/**
 * The API / Gateway layer. Cross-cutting concerns run vertically as this middleware chain;
 * every route below it is a thin adapter onto a business service and contains no domain logic.
 */
export function createApp() {
  const app = express()

  // Behind a proxy in deployment, so rate limiting keys on the real client IP.
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(
    cors({
      origin: env.corsOrigin.split(',').map((o) => o.trim()),
      credentials: true,
      exposedHeaders: ['x-request-id'],
    })
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))
  app.use(requestId)
  app.use(requestLogger)
  app.use(rateLimiters.global)

  app.use('/api', api)

  app.use(notFound)
  app.use(errorHandler)

  return app
}

import { env, configWarnings } from './config/env.js'
import { logger } from './shared/logger.js'
import { connectDatabase, disconnectDatabase } from './data/db.js'
import { initCache } from './data/cache/index.js'
import { jobQueue, JOBS } from './data/queue/index.js'
import { reportService } from './business/reports/reportService.js'
import { reminderService } from './business/reminders/reminderService.js'
import { startScheduler, stopScheduler } from './business/reminders/scheduler.js'
import { autoSeedIfNeeded } from './data/autoSeed.js'
import { createApp } from './api/app.js'

/**
 * Composition root. This is the only file that knows about every layer at once —
 * it wires them together and owns the process lifecycle. Nothing else calls into it.
 */
async function bootstrap() {
  for (const warning of configWarnings()) logger.warn(warning)

  await connectDatabase()
  await initCache()
  await autoSeedIfNeeded()

  // Register async job handlers before anything can enqueue work (ADR-06).
  jobQueue.register(JOBS.PROCESS_REPORT, (payload) => reportService.processReport(payload))
  jobQueue.register(JOBS.MATERIALISE_DOSES, () => reminderService.materialiseAll())

  startScheduler()

  const app = createApp()
  const server = app.listen(env.port, () => {
    logger.info('medintel api listening', { port: env.port, env: env.nodeEnv, cors: env.corsOrigin })
  })

  const shutdown = async (signal) => {
    logger.info('shutting down', { signal })
    stopScheduler()
    server.close(async () => {
      await disconnectDatabase()
      logger.info('shutdown complete')
      process.exit(0)
    })
    // Do not hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('unhandledRejection', (reason) => logger.error('unhandled rejection', { reason: String(reason) }))
  process.on('uncaughtException', (err) => {
    logger.error('uncaught exception', { err: err.message, stack: err.stack })
    process.exit(1)
  })
}

bootstrap().catch((err) => {
  logger.error('bootstrap failed', { err: err.message, stack: err.stack })
  process.exit(1)
})

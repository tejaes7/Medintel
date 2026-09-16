import cron from 'node-cron'
import { reminderService } from './reminderService.js'
import { logger } from '../../shared/logger.js'

let task = null

/**
 * Hourly dose materialisation and miss detection. Runs in-process for a single instance;
 * behind a load balancer this becomes a queue job with a distributed lock so exactly one
 * instance performs the sweep.
 */
export function startScheduler() {
  if (task) return task

  task = cron.schedule(
    '0 * * * *',
    async () => {
      try {
        const result = await reminderService.materialiseAll()
        logger.info('reminder sweep complete', result)
      } catch (err) {
        logger.error('reminder sweep failed', { err: err.message })
      }
    },
    { name: 'reminder-sweep' }
  )

  logger.info('scheduler started', { job: 'reminder-sweep', cron: '0 * * * *' })

  // One sweep at boot so a restarted server is immediately consistent.
  reminderService
    .materialiseAll()
    .then((r) => logger.info('reminder sweep complete (boot)', r))
    .catch((err) => logger.error('boot reminder sweep failed', { err: err.message }))

  return task
}

export function stopScheduler() {
  if (task) {
    task.stop()
    task = null
    logger.info('scheduler stopped')
  }
}

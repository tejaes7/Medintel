import { logger } from '../../shared/logger.js'

/**
 * JobQueue (ADR-06) — asynchronous work so a slow OCR call never blocks an HTTP response.
 * In-process driver: a promise chain with bounded concurrency and retry-with-backoff.
 * The same enqueue/register surface fronts BullMQ+Redis when REDIS_URL is provisioned.
 */
function createInProcessQueue({ concurrency = 2 } = {}) {
  const handlers = new Map()
  const pending = []
  const stats = { enqueued: 0, completed: 0, failed: 0 }
  let running = 0

  async function runJob(job) {
    const handler = handlers.get(job.name)
    if (!handler) {
      logger.warn('no handler registered for job', { job: job.name })
      return
    }
    try {
      await handler(job.payload)
      stats.completed += 1
      logger.debug('job completed', { job: job.name })
    } catch (err) {
      if (job.attempt < job.maxAttempts) {
        const delay = 2 ** job.attempt * 500
        job.attempt += 1
        logger.warn('job failed, retrying', { job: job.name, attempt: job.attempt, delay })
        setTimeout(() => {
          pending.push(job)
          drain()
        }, delay)
      } else {
        stats.failed += 1
        logger.error('job exhausted retries', { job: job.name, err: err.message })
      }
    }
  }

  function drain() {
    while (running < concurrency && pending.length > 0) {
      const job = pending.shift()
      running += 1
      runJob(job).finally(() => {
        running -= 1
        drain()
      })
    }
  }

  return {
    name: 'in-process',
    register(name, handler) {
      handlers.set(name, handler)
    },
    enqueue(name, payload, { maxAttempts = 3 } = {}) {
      stats.enqueued += 1
      pending.push({ name, payload, attempt: 0, maxAttempts })
      setImmediate(drain)
    },
    health: () => ({ driver: 'in-process', pending: pending.length, running, ...stats }),
  }
}

export const jobQueue = createInProcessQueue()
export const JOBS = { PROCESS_REPORT: 'report.process', MATERIALISE_DOSES: 'reminder.materialise' }

import { auditRepository } from '../data/repositories/index.js'
import { logger } from './logger.js'

/**
 * Audit is cross-cutting: it must never break the request it is recording,
 * so failures are logged and swallowed rather than propagated.
 */
export async function audit({ actorId, action, resource, resourceId, outcome = 'success', ip, metadata }) {
  try {
    await auditRepository.append({ actorId, action, resource, resourceId, outcome, ip, metadata })
  } catch (err) {
    logger.error('audit append failed', { action, err: err.message })
  }
}

export const AUDIT = {
  AUTH_REGISTER: 'auth.register',
  AUTH_LOGIN: 'auth.login',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_LOGOUT: 'auth.logout',
  TRIAGE_CREATE: 'triage.create',
  TRIAGE_ESCALATE: 'triage.escalate',
  CHAT_MESSAGE: 'chat.message',
  REPORT_UPLOAD: 'report.upload',
  REPORT_DELETE: 'report.delete',
  REMINDER_CREATE: 'reminder.create',
  REMINDER_UPDATE: 'reminder.update',
  REMINDER_DELETE: 'reminder.delete',
  DOSE_ACK: 'reminder.dose.ack',
  PROFILE_UPDATE: 'profile.update',
  AI_CALL: 'ai.call',
}

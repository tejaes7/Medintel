import { AuditLog } from '../models/index.js'

/** Append and read only — deliberately no update or delete method exists. */
export const auditRepository = {
  append: (doc) => AuditLog.create(doc),
  listForActor: (actorId, { limit = 100 } = {}) =>
    AuditLog.find({ actorId }).sort({ at: -1 }).limit(limit),
}

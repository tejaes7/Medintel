import mongoose from 'mongoose'

/**
 * Append-only audit trail. No update or delete path exists anywhere in the codebase —
 * the repository exposes append and query only.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    resource: String,
    resourceId: String,
    outcome: { type: String, enum: ['success', 'failure'], default: 'success' },
    ip: String,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
)

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)

import mongoose from 'mongoose'

/**
 * Unified medical history. Every module writes here through the history service so the
 * timeline stays the single read model for "what happened to this patient".
 */
const timelineEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['Triage', 'Chat', 'Report', 'Medication', 'Account', 'Appointment'], required: true },
    tone: { type: String, enum: ['rose', 'amber', 'teal', 'brand'], default: 'brand' },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    occurredAt: { type: Date, default: Date.now, index: true },
    sourceId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true }
)

timelineEventSchema.index({ userId: 1, occurredAt: -1 })

export const TimelineEvent = mongoose.model('TimelineEvent', timelineEventSchema)

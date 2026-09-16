import mongoose from 'mongoose'

const doseSchema = new mongoose.Schema(
  {
    scheduledFor: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'taken', 'missed', 'skipped'], default: 'pending' },
    actedAt: Date,
  },
  { _id: true }
)

const reminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    drug: { type: String, required: true, trim: true },
    dosage: { type: String, trim: true },
    time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    frequency: { type: String, enum: ['daily', 'weekly', 'custom'], default: 'daily' },
    daysOfWeek: { type: [Number], default: [] }, // 0=Sun … 6=Sat, used when frequency=weekly
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    active: { type: Boolean, default: true },
    doses: { type: [doseSchema], default: [] },
  },
  { timestamps: true }
)

reminderSchema.index({ userId: 1, active: 1 })

/** Adherence = taken / (taken + missed). Pending doses are excluded — they are not yet a miss. */
reminderSchema.methods.adherence = function () {
  const taken = this.doses.filter((d) => d.status === 'taken').length
  const missed = this.doses.filter((d) => d.status === 'missed').length
  const total = taken + missed
  return total === 0 ? null : Number((taken / total).toFixed(2))
}

export const Reminder = mongoose.model('Reminder', reminderSchema)

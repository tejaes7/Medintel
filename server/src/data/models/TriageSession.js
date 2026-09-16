import mongoose from 'mongoose'

const conditionSchema = new mongoose.Schema(
  { name: String, likelihood: Number, note: String },
  { _id: false }
)

const redFlagSchema = new mongoose.Schema(
  { id: String, rule: String, action: String, tone: String, severity: String },
  { _id: false }
)

const triageSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    input: {
      text: { type: String, required: true },
      durationDays: Number,
      temperatureC: Number,
      symptoms: { type: [String], default: [] },
    },
    urgency: { type: String, enum: ['Emergency', 'Urgent', 'Routine', 'Self-care'], required: true },
    tone: { type: String, enum: ['rose', 'amber', 'teal', 'brand'], default: 'teal' },
    confidence: { type: Number, min: 0, max: 1, default: 0 },
    redFlags: { type: [redFlagSchema], default: [] },
    conditions: { type: [conditionSchema], default: [] },
    advice: { type: [String], default: [] },
    disclaimer: String,
    // Provenance: which layer actually decided the urgency, and which provider spoke.
    decidedBy: { type: String, enum: ['rules-engine', 'ai-assisted'], required: true },
    aiProvider: { type: String, default: 'none' },
    degraded: { type: Boolean, default: false },
  },
  { timestamps: true }
)

triageSessionSchema.index({ userId: 1, createdAt: -1 })

export const TriageSession = mongoose.model('TriageSession', triageSessionSchema)

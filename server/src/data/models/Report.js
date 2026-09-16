import mongoose from 'mongoose'

const findingSchema = new mongoose.Schema(
  {
    label: String,
    value: String,
    unit: String,
    referenceRange: String,
    flagged: { type: Boolean, default: false },
  },
  { _id: false }
)

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    lab: { type: String, default: 'Unknown lab' },
    reportDate: { type: Date, default: Date.now },
    file: { originalName: String, storedName: String, mimeType: String, sizeBytes: Number },
    status: { type: String, enum: ['Queued', 'Processing', 'Summarised', 'Failed'], default: 'Queued' },
    tone: { type: String, enum: ['rose', 'amber', 'teal', 'brand'], default: 'amber' },
    extractedText: { type: String, select: false },
    summary: String,
    findings: { type: [findingSchema], default: [] },
    flags: { type: Number, default: 0 },
    failureReason: String,
  },
  { timestamps: true }
)

reportSchema.index({ userId: 1, createdAt: -1 })

export const Report = mongoose.model('Report', reportSchema)

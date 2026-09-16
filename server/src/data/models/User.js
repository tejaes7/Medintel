import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['patient', 'clinician', 'admin', 'hospital'], default: 'patient' },
    profile: {
      age: { type: Number, min: 0, max: 130 },
      sex: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
      allergies: { type: [String], default: [] },
      conditions: { type: [String], default: [] },
    },
    refreshTokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
)

userSchema.virtual('initials').get(function () {
  return (this.name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
})
userSchema.set('toJSON', { virtuals: true })

export const User = mongoose.model('User', userSchema)

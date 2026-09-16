import mongoose from 'mongoose'

const hospitalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Hospital', 'Clinic', 'Specialty Center'], default: 'Hospital' },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true },
    emergencyPhone: { type: String, trim: true },
    rating: { type: Number, default: 4.8, min: 1, max: 5 },
    departments: { type: [String], default: [] },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [77.5946, 12.9716] }, // [lng, lat]
    },
  },
  { timestamps: true }
)

hospitalSchema.index({ location: '2dsphere' })

export const Hospital = mongoose.model('Hospital', hospitalSchema)

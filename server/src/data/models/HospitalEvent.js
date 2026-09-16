import mongoose from 'mongoose'

const hospitalEventSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ['Blood Donation', 'Stem Cell Drive', 'Marathon', 'Other'], default: 'Other' },
    date: { type: Date, required: true },
    time: { type: String, default: '09:00 AM' },
    location: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
)

export const HospitalEvent = mongoose.model('HospitalEvent', hospitalEventSchema)

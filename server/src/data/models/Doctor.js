import mongoose from 'mongoose'

const doctorSchema = new mongoose.Schema(
  {
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    name: { type: String, required: true, trim: true },
    qualification: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true, index: true },
    experienceYears: { type: Number, default: 5 },
    availableDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    availableTime: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
    },
    fee: { type: Number, default: 500 },
  },
  { timestamps: true }
)

export const Doctor = mongoose.model('Doctor', doctorSchema)

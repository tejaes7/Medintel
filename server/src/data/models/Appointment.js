import mongoose from 'mongoose'

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    appointmentDate: { type: Date, required: true },
    timeSlot: { type: String, required: true },
    reason: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Booked', 'Confirmed', 'Completed', 'Cancelled'],
      default: 'Booked',
      index: true,
    },
  },
  { timestamps: true }
)

// Compound unique index to prevent double-booking at DB level (excluding cancelled appointments)
appointmentSchema.index(
  { doctorId: 1, appointmentDate: 1, timeSlot: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'Cancelled' } } }
)

export const Appointment = mongoose.model('Appointment', appointmentSchema)

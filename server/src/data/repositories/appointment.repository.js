import { Appointment } from '../models/Appointment.js'

export const appointmentRepository = {
  async findById(id) {
    return Appointment.findById(id)
      .populate('patientId', 'name email profile')
      .populate('hospitalId', 'name city address phone')
      .populate('doctorId', 'name qualification department fee')
  },

  async findExistingSlot({ doctorId, appointmentDate, timeSlot }) {
    const d = new Date(appointmentDate)
    const startOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0))
    const endOfDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999))

    return Appointment.findOne({
      doctorId,
      timeSlot,
      status: { $ne: 'Cancelled' },
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    })
  },

  async listForPatient(patientId) {
    return Appointment.find({ patientId })
      .sort({ appointmentDate: -1, createdAt: -1 })
      .populate('hospitalId', 'name city address phone')
      .populate('doctorId', 'name qualification department fee')
  },

  async listForHospital(hospitalId) {
    return Appointment.find({ hospitalId })
      .sort({ appointmentDate: 1, createdAt: -1 })
      .populate('patientId', 'name email profile')
      .populate('doctorId', 'name qualification department fee')
  },

  async create(data) {
    return Appointment.create(data)
  },

  async updateStatus(id, status) {
    return Appointment.findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .populate('patientId', 'name email')
      .populate('hospitalId', 'name city')
      .populate('doctorId', 'name qualification department')
  },
}

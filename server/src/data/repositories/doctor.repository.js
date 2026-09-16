import { Doctor } from '../models/Doctor.js'

export const doctorRepository = {
  async findById(id) {
    return Doctor.findById(id)
  },

  async listForHospital(hospitalId) {
    return Doctor.find({ hospitalId }).sort({ department: 1, name: 1 })
  },

  async create(data) {
    return Doctor.create(data)
  },

  async deleteForHospital(id, hospitalId) {
    return Doctor.findOneAndDelete({ _id: id, hospitalId })
  },
}

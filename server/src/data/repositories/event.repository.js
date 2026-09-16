import { HospitalEvent } from '../models/HospitalEvent.js'

export const eventRepository = {
  async findById(id) {
    return HospitalEvent.findById(id)
  },

  async listForHospital(hospitalId) {
    return HospitalEvent.find({ hospitalId }).sort({ date: 1 })
  },

  async listUpcoming({ limit = 20 } = {}) {
    return HospitalEvent.find({ date: { $gte: new Date(Date.now() - 86400000) } })
      .sort({ date: 1 })
      .limit(limit)
      .populate('hospitalId', 'name city address')
  },

  async create(data) {
    return HospitalEvent.create(data)
  },

  async deleteForHospital(id, hospitalId) {
    return HospitalEvent.findOneAndDelete({ _id: id, hospitalId })
  },
}

import { Hospital } from '../models/Hospital.js'

export const hospitalRepository = {
  async findByUserId(userId) {
    return Hospital.findOne({ userId })
  },

  async findById(id) {
    return Hospital.findById(id)
  },

  async create(data) {
    return Hospital.create(data)
  },

  async update(id, updates) {
    return Hospital.findByIdAndUpdate(id, { $set: updates }, { new: true })
  },

  async search({ city, department, name, lat, lng, limit = 20, skip = 0 }) {
    const query = {}
    if (city) query.city = new RegExp(city, 'i')
    if (department) query.departments = new RegExp(department, 'i')
    if (name) query.name = new RegExp(name, 'i')

    let items = await Hospital.find(query).limit(limit).skip(skip).lean()
    const total = await Hospital.countDocuments(query)

    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      items = items.map((h) => {
        const coords = h.location?.coordinates || [77.5946, 12.9716]
        const dist = getDistanceKm(lat, lng, coords[1], coords[0])
        return { ...h, distanceKm: dist }
      })
      items.sort((a, b) => a.distanceKm - b.distanceKm)
    } else {
      items.sort((a, b) => b.rating - a.rating)
    }

    return { items, total }
  },

  async listCities() {
    return Hospital.distinct('city')
  },

  async listDepartments() {
    return Hospital.distinct('departments')
  },
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

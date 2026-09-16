import {
  hospitalRepository,
  doctorRepository,
  eventRepository,
  userRepository,
} from '../../data/repositories/index.js'
import { NotFoundError, ForbiddenError, ValidationError } from '../../shared/errors.js'

export const hospitalService = {
  async searchHospitals({ city, department, name, lat, lng, limit = 20, skip = 0 }) {
    const { items, total } = await hospitalRepository.search({ city, department, name, lat, lng, limit, skip })
    const cities = await hospitalRepository.listCities()
    const departments = await hospitalRepository.listDepartments()

    return {
      hospitals: items.map(presentHospital),
      cities,
      departments,
      total,
    }
  },

  async getHospitalDetails(id) {
    const hospital = await hospitalRepository.findById(id)
    if (!hospital) throw new NotFoundError('Hospital')

    const [doctors, events] = await Promise.all([
      doctorRepository.listForHospital(id),
      eventRepository.listForHospital(id),
    ])

    return {
      hospital: presentHospital(hospital),
      doctors: doctors.map(presentDoctor),
      events: events.map(presentEvent),
    }
  },

  async getHospitalForUser(userId) {
    const hospital = await hospitalRepository.findByUserId(userId)
    if (!hospital) return null

    const [doctors, events] = await Promise.all([
      doctorRepository.listForHospital(hospital._id),
      eventRepository.listForHospital(hospital._id),
    ])

    return {
      hospital: presentHospital(hospital),
      doctors: doctors.map(presentDoctor),
      events: events.map(presentEvent),
    }
  },

  async updateHospitalProfile(userId, data) {
    let hospital = await hospitalRepository.findByUserId(userId)
    if (!hospital) {
      const user = await userRepository.findById(userId)
      if (!user) throw new NotFoundError('User')
      if (user.role !== 'hospital') {
        throw new ForbiddenError('Only hospital accounts can manage a hospital profile')
      }
      hospital = await hospitalRepository.create({
        userId,
        name: data.name || user.name,
        type: data.type || 'Hospital',
        address: data.address || 'Address not set',
        city: data.city || 'City not set',
        phone: data.phone || '',
        emergencyPhone: data.emergencyPhone || '',
        departments: data.departments || ['General Medicine'],
      })
    } else {
      hospital = await hospitalRepository.update(hospital._id, data)
    }
    return presentHospital(hospital)
  },

  async addDoctor(userId, doctorData) {
    const hospital = await hospitalRepository.findByUserId(userId)
    if (!hospital) throw new NotFoundError('Hospital profile for user')
    if (String(hospital.userId) !== String(userId)) {
      throw new ForbiddenError('You do not own this hospital profile')
    }

    if (!doctorData.name || !doctorData.qualification || !doctorData.department) {
      throw new ValidationError('Doctor name, qualification, and department are required')
    }

    const doctor = await doctorRepository.create({
      hospitalId: hospital._id,
      name: doctorData.name,
      qualification: doctorData.qualification,
      department: doctorData.department,
      experienceYears: Number(doctorData.experienceYears) || 5,
      availableDays: doctorData.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      availableTime: doctorData.availableTime || { start: '09:00', end: '17:00' },
      fee: Number(doctorData.fee) || 500,
    })

    // Auto-append department to hospital's departments array if not present
    if (!hospital.departments.includes(doctorData.department)) {
      await hospitalRepository.update(hospital._id, {
        departments: [...hospital.departments, doctorData.department],
      })
    }

    return presentDoctor(doctor)
  },

  async deleteDoctor(userId, doctorId) {
    const hospital = await hospitalRepository.findByUserId(userId)
    if (!hospital) throw new NotFoundError('Hospital profile')

    const deleted = await doctorRepository.deleteForHospital(doctorId, hospital._id)
    if (!deleted) throw new NotFoundError('Doctor or permission denied')
    return { success: true }
  },

  async addEvent(userId, eventData) {
    const hospital = await hospitalRepository.findByUserId(userId)
    if (!hospital) throw new NotFoundError('Hospital profile for user')
    if (String(hospital.userId) !== String(userId)) {
      throw new ForbiddenError('You do not own this hospital profile')
    }

    if (!eventData.title || !eventData.date || !eventData.location) {
      throw new ValidationError('Event title, date, and location are required')
    }

    const event = await eventRepository.create({
      hospitalId: hospital._id,
      title: eventData.title,
      type: eventData.type || 'Other',
      date: new Date(eventData.date),
      time: eventData.time || '09:00 AM',
      location: eventData.location,
      description: eventData.description || '',
    })

    return presentEvent(event)
  },

  async deleteEvent(userId, eventId) {
    const hospital = await hospitalRepository.findByUserId(userId)
    if (!hospital) throw new NotFoundError('Hospital profile')

    const deleted = await eventRepository.deleteForHospital(eventId, hospital._id)
    if (!deleted) throw new NotFoundError('Event or permission denied')
    return { success: true }
  },

  async listUpcomingEvents() {
    const events = await eventRepository.listUpcoming()
    return events.map(presentEvent)
  },
}

function presentHospital(h) {
  return {
    id: String(h._id || h.id),
    userId: String(h.userId),
    name: h.name,
    type: h.type,
    address: h.address,
    city: h.city,
    phone: h.phone,
    emergencyPhone: h.emergencyPhone,
    rating: h.rating,
    departments: h.departments || [],
    location: h.location,
    distanceKm: h.distanceKm ?? null,
  }
}

function presentDoctor(d) {
  return {
    id: String(d._id),
    hospitalId: String(d.hospitalId),
    name: d.name,
    qualification: d.qualification,
    department: d.department,
    experienceYears: d.experienceYears,
    availableDays: d.availableDays,
    availableTime: d.availableTime,
    fee: d.fee,
  }
}

function presentEvent(e) {
  return {
    id: String(e._id),
    hospitalId: String(e.hospitalId?._id || e.hospitalId),
    hospitalName: e.hospitalId?.name || null,
    title: e.title,
    type: e.type,
    date: e.date,
    time: e.time,
    location: e.location,
    description: e.description,
  }
}

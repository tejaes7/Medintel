import {
  appointmentRepository,
  doctorRepository,
  hospitalRepository,
} from '../../data/repositories/index.js'
import { historyService } from '../history/historyService.js'
import { NotFoundError, ValidationError, ForbiddenError } from '../../shared/errors.js'

const ALLOWED_TRANSITIONS = {
  Booked: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const appointmentService = {
  async bookAppointment({ patientId, doctorId, appointmentDate, timeSlot, reason }) {
    if (!doctorId || !appointmentDate || !timeSlot) {
      throw new ValidationError('Doctor, appointment date, and time slot are required')
    }

    const doctor = await doctorRepository.findById(doctorId)
    if (!doctor) throw new NotFoundError('Doctor')

    const hospital = await hospitalRepository.findById(doctor.hospitalId)
    if (!hospital) throw new NotFoundError('Hospital')

    const dateStr = typeof appointmentDate === 'string'
      ? appointmentDate.split('T')[0]
      : new Date(appointmentDate).toISOString().split('T')[0]

    const [year, month, day] = dateStr.split('-').map(Number)
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid appointment date')
    }

    const dayName = DAY_NAMES[dateObj.getUTCDay()]
    if (doctor.availableDays?.length > 0 && !doctor.availableDays.includes(dayName)) {
      throw new ValidationError(`Dr. ${doctor.name} is not available on ${dayName}s. Available days: ${doctor.availableDays.join(', ')}`)
    }

    const existing = await appointmentRepository.findExistingSlot({
      doctorId,
      appointmentDate: dateObj,
      timeSlot,
    })

    if (existing) {
      throw new ValidationError('This time slot is already booked for this doctor')
    }

    try {
      const appt = await appointmentRepository.create({
        patientId,
        hospitalId: hospital._id,
        doctorId: doctor._id,
        appointmentDate: dateObj,
        timeSlot,
        reason: reason || '',
        status: 'Booked',
      })

      const dateFormatted = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      await historyService.record({
        userId: patientId,
        kind: 'Appointment',
        tone: 'brand',
        title: `Appointment booked with Dr. ${doctor.name}`,
        body: `${hospital.name} · ${dateFormatted} at ${timeSlot}`,
        sourceId: appt._id,
      })

      const populated = await appointmentRepository.findById(appt._id)
      return presentAppointment(populated)
    } catch (err) {
      if (err.code === 11000) {
        throw new ValidationError('This time slot is already booked for this doctor')
      }
      throw err
    }
  },

  async listPatientAppointments(patientId) {
    const list = await appointmentRepository.listForPatient(patientId)
    return list.map(presentAppointment)
  },

  async listHospitalAppointments(hospitalUserId) {
    const hospital = await hospitalRepository.findByUserId(hospitalUserId)
    if (!hospital) throw new NotFoundError('Hospital profile')
    const list = await appointmentRepository.listForHospital(hospital._id)
    return list.map(presentAppointment)
  },

  async updateStatus({ appointmentId, userId, userRole, newStatus }) {
    const appt = await appointmentRepository.findById(appointmentId)
    if (!appt) throw new NotFoundError('Appointment')

    const currentStatus = appt.status
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || []

    if (!allowed.includes(newStatus)) {
      throw new ValidationError(`Cannot transition appointment status from '${currentStatus}' to '${newStatus}'`)
    }

    const isPatientOwner = String(appt.patientId._id || appt.patientId) === String(userId)
    const hospital = await hospitalRepository.findByUserId(userId)
    const isHospitalOwner = hospital && String(appt.hospitalId._id || appt.hospitalId) === String(hospital._id)

    if (userRole === 'patient' || isPatientOwner) {
      if (newStatus !== 'Cancelled') {
        throw new ForbiddenError('Patients can only cancel their own appointments')
      }
      if (!isPatientOwner) {
        throw new ForbiddenError('You can only cancel your own appointments')
      }
    } else if (userRole === 'hospital' || isHospitalOwner) {
      if (!isHospitalOwner) {
        throw new ForbiddenError('You do not own the hospital for this appointment')
      }
    } else {
      throw new ForbiddenError('Permission denied')
    }

    const updated = await appointmentRepository.updateStatus(appointmentId, newStatus)

    await historyService.record({
      userId: appt.patientId._id || appt.patientId,
      kind: 'Appointment',
      tone: newStatus === 'Confirmed' ? 'teal' : newStatus === 'Cancelled' ? 'rose' : 'brand',
      title: `Appointment ${newStatus}`,
      body: `Dr. ${appt.doctorId?.name || 'Doctor'} at ${appt.hospitalId?.name || 'Hospital'} (${newStatus})`,
      sourceId: appt._id,
    })

    return presentAppointment(updated)
  },
}

function presentAppointment(a) {
  return {
    id: String(a._id),
    patientId: String(a.patientId?._id || a.patientId),
    patientName: a.patientId?.name || 'Patient',
    patientEmail: a.patientId?.email || '',
    hospitalId: String(a.hospitalId?._id || a.hospitalId),
    hospitalName: a.hospitalId?.name || 'Hospital',
    hospitalCity: a.hospitalId?.city || '',
    hospitalAddress: a.hospitalId?.address || '',
    hospitalPhone: a.hospitalId?.phone || '',
    doctorId: String(a.doctorId?._id || a.doctorId),
    doctorName: a.doctorId?.name || 'Doctor',
    qualification: a.doctorId?.qualification || '',
    department: a.doctorId?.department || '',
    fee: a.doctorId?.fee || 0,
    appointmentDate: a.appointmentDate,
    timeSlot: a.timeSlot,
    reason: a.reason,
    status: a.status,
    createdAt: a.createdAt,
  }
}

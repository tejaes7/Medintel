import { Router } from 'express'
import { hospitalService } from '../../business/hospitals/hospitalService.js'
import { appointmentService } from '../../business/hospitals/appointmentService.js'
import { authenticate, rateLimiters } from '../middleware/index.js'
import { ok, created, handle } from '../envelope.js'

export const hospitalRoutes = Router()

hospitalRoutes.use(authenticate)

// ── Search & Browse (Patient / Public) ───────────────────────────────────────
hospitalRoutes.get(
  '/',
  handle(async (req, res) => {
    const { city, department, name, lat, lng, limit, skip } = req.query
    return ok(
      res,
      await hospitalService.searchHospitals({
        city,
        department,
        name,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        limit: Number(limit) || 20,
        skip: Number(skip) || 0,
      })
    )
  })
)

hospitalRoutes.get(
  '/events/upcoming',
  handle(async (req, res) => ok(res, await hospitalService.listUpcomingEvents()))
)

hospitalRoutes.get(
  '/appointments/my',
  handle(async (req, res) => ok(res, await appointmentService.listPatientAppointments(req.user.id)))
)

hospitalRoutes.post(
  '/appointments',
  rateLimiters.api,
  handle(async (req, res) => {
    const { doctorId, appointmentDate, timeSlot, reason } = req.body
    return created(
      res,
      await appointmentService.bookAppointment({
        patientId: req.user.id,
        doctorId,
        appointmentDate,
        timeSlot,
        reason,
      })
    )
  })
)

hospitalRoutes.patch(
  '/appointments/:id/cancel',
  handle(async (req, res) =>
    ok(
      res,
      await appointmentService.updateStatus({
        appointmentId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        newStatus: 'Cancelled',
      })
    )
  )
)

// ── Hospital Management (Hospital Role) ──────────────────────────────────────
hospitalRoutes.get(
  '/my-profile',
  handle(async (req, res) => ok(res, await hospitalService.getHospitalForUser(req.user.id)))
)

hospitalRoutes.post(
  '/my-profile',
  handle(async (req, res) => ok(res, await hospitalService.updateHospitalProfile(req.user.id, req.body)))
)

hospitalRoutes.post(
  '/doctors',
  handle(async (req, res) => created(res, await hospitalService.addDoctor(req.user.id, req.body)))
)

hospitalRoutes.delete(
  '/doctors/:id',
  handle(async (req, res) => ok(res, await hospitalService.deleteDoctor(req.user.id, req.params.id)))
)

hospitalRoutes.post(
  '/events',
  handle(async (req, res) => created(res, await hospitalService.addEvent(req.user.id, req.body)))
)

hospitalRoutes.delete(
  '/events/:id',
  handle(async (req, res) => ok(res, await hospitalService.deleteEvent(req.user.id, req.params.id)))
)

hospitalRoutes.get(
  '/manage/appointments',
  handle(async (req, res) => ok(res, await appointmentService.listHospitalAppointments(req.user.id)))
)

hospitalRoutes.patch(
  '/manage/appointments/:id',
  handle(async (req, res) =>
    ok(
      res,
      await appointmentService.updateStatus({
        appointmentId: req.params.id,
        userId: req.user.id,
        userRole: req.user.role,
        newStatus: req.body.status,
      })
    )
  )
)

// ── Details View ─────────────────────────────────────────────────────────────
hospitalRoutes.get(
  '/:id',
  handle(async (req, res) => ok(res, await hospitalService.getHospitalDetails(req.params.id)))
)

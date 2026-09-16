import { Router } from 'express'
import mongoose from 'mongoose'
import { authRoutes } from './auth.routes.js'
import { triageRoutes } from './triage.routes.js'
import { chatRoutes } from './chat.routes.js'
import { reportRoutes } from './report.routes.js'
import { reminderRoutes } from './reminder.routes.js'
import { hospitalRoutes } from './hospital.routes.js'
import { historyService } from '../../business/history/historyService.js'
import { profileService } from '../../business/profile/profileService.js'
import { dashboardService } from '../../business/dashboardService.js'
import { healthService } from '../../business/healthService.js'
import { schemas } from '../schemas/index.js'
import { authenticate, validate } from '../middleware/index.js'
import { ok, handle } from '../envelope.js'

export const api = Router()

/** Liveness + dependency health. Never authenticated — a monitor must be able to reach it. */
api.get(
  '/health',
  handle(async (req, res) => ok(res, await healthService.snapshot()))
)

api.use('/auth', authRoutes)
api.use('/triage', triageRoutes)
api.use('/chat', chatRoutes)
api.use('/reports', reportRoutes)
api.use('/reminders', reminderRoutes)
api.use('/hospitals', hospitalRoutes)

api.get(
  '/history',
  authenticate,
  validate(schemas.historyQuery),
  handle(async (req, res) => {
    const { limit, skip, kind } = req.validatedQuery
    const { items, total } = await historyService.list({ userId: req.user.id, limit, skip, kind })
    return ok(res, items, { meta: { total, limit, skip, kind: kind ?? null } })
  })
)

api.get(
  '/profile',
  authenticate,
  handle(async (req, res) => ok(res, await profileService.get({ userId: req.user.id })))
)

api.patch(
  '/profile',
  authenticate,
  validate(schemas.updateProfile),
  handle(async (req, res) => ok(res, await profileService.update({ userId: req.user.id, patch: req.body, ip: req.ip })))
)

api.get(
  '/dashboard',
  authenticate,
  handle(async (req, res) => ok(res, await dashboardService.overview({ userId: req.user.id })))
)

/** Route inventory, handy for the report appendix and for smoke testing. */
api.get(
  '/',
  handle(async (req, res) =>
    ok(res, {
      service: 'MedIntel API',
      layer: 'API / Gateway',
      mongooseVersion: mongoose.version,
      endpoints: [
        'GET    /api/health',
        'POST   /api/auth/register',
        'POST   /api/auth/login',
        'POST   /api/auth/refresh',
        'POST   /api/auth/logout',
        'GET    /api/auth/me',
        'GET    /api/triage/rules',
        'POST   /api/triage/analyse',
        'GET    /api/triage/sessions',
        'GET    /api/triage/sessions/latest',
        'GET    /api/triage/sessions/:id',
        'GET    /api/chat/conversations',
        'POST   /api/chat/conversations',
        'GET    /api/chat/conversations/latest',
        'GET    /api/chat/conversations/:id',
        'POST   /api/chat/messages',
        'GET    /api/reports',
        'POST   /api/reports',
        'GET    /api/reports/:id',
        'DELETE /api/reports/:id',
        'GET    /api/reminders',
        'POST   /api/reminders',
        'PATCH  /api/reminders/:id',
        'DELETE /api/reminders/:id',
        'POST   /api/reminders/:id/doses/:doseId',
        'GET    /api/history',
        'GET    /api/profile',
        'PATCH  /api/profile',
        'GET    /api/dashboard',
      ],
    })
  )
)

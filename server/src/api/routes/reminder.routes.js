import { Router } from 'express'
import { reminderService } from '../../business/reminders/reminderService.js'
import { schemas } from '../schemas/index.js'
import { authenticate, validate } from '../middleware/index.js'
import { ok, created, handle } from '../envelope.js'

export const reminderRoutes = Router()

reminderRoutes.use(authenticate)

reminderRoutes.get(
  '/',
  handle(async (req, res) =>
    ok(res, await reminderService.list({ userId: req.user.id, activeOnly: req.query.active === 'true' }))
  )
)

reminderRoutes.post(
  '/',
  validate(schemas.createReminder),
  handle(async (req, res) => created(res, await reminderService.create({ userId: req.user.id, data: req.body, ip: req.ip })))
)

reminderRoutes.patch(
  '/:id',
  validate(schemas.updateReminder),
  handle(async (req, res) =>
    ok(res, await reminderService.update({ userId: req.user.id, reminderId: req.params.id, patch: req.body, ip: req.ip }))
  )
)

reminderRoutes.delete(
  '/:id',
  validate(schemas.idParam),
  handle(async (req, res) =>
    ok(res, await reminderService.remove({ userId: req.user.id, reminderId: req.params.id, ip: req.ip }))
  )
)

reminderRoutes.post(
  '/:id/doses/:doseId',
  validate(schemas.acknowledgeDose),
  handle(async (req, res) =>
    ok(
      res,
      await reminderService.acknowledgeDose({
        userId: req.user.id,
        reminderId: req.params.id,
        doseId: req.params.doseId,
        status: req.body.status,
        ip: req.ip,
      })
    )
  )
)

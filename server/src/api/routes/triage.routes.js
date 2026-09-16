import { Router } from 'express'
import { triageService } from '../../business/triage/triageService.js'
import { schemas } from '../schemas/index.js'
import { authenticate, validate, rateLimiters } from '../middleware/index.js'
import { ok, created, handle } from '../envelope.js'

export const triageRoutes = Router()

/** Public: the rule table is a transparency feature, not a secret. */
triageRoutes.get(
  '/rules',
  handle(async (req, res) => ok(res, { rules: triageService.rules() }))
)

triageRoutes.use(authenticate)

triageRoutes.post(
  '/analyse',
  rateLimiters.ai,
  validate(schemas.analyseSymptoms),
  handle(async (req, res) =>
    created(res, await triageService.analyse({ userId: req.user.id, input: req.body, ip: req.ip }))
  )
)

triageRoutes.get(
  '/sessions',
  validate(schemas.listQuery),
  handle(async (req, res) => {
    const { limit, skip } = req.validatedQuery
    const { items, total } = await triageService.list({ userId: req.user.id, limit, skip })
    return ok(res, items, { meta: { total, limit, skip } })
  })
)

triageRoutes.get(
  '/sessions/latest',
  handle(async (req, res) => ok(res, await triageService.latest({ userId: req.user.id })))
)

triageRoutes.get(
  '/sessions/:id',
  validate(schemas.idParam),
  handle(async (req, res) => ok(res, await triageService.get({ userId: req.user.id, sessionId: req.params.id })))
)

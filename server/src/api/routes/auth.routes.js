import { Router } from 'express'
import { authService } from '../../business/auth/authService.js'
import { schemas } from '../schemas/index.js'
import { authenticate, validate, rateLimiters } from '../middleware/index.js'
import { ok, created, handle } from '../envelope.js'

export const authRoutes = Router()

authRoutes.post(
  '/register',
  rateLimiters.auth,
  validate(schemas.register),
  handle(async (req, res) => {
    const { name, email, password, role = 'patient', ...profile } = req.body
    const result = await authService.register({ name, email, password, role, profile }, req.ip)
    return created(res, result)
  })
)

authRoutes.post(
  '/login',
  rateLimiters.auth,
  validate(schemas.login),
  handle(async (req, res) => ok(res, await authService.login(req.body, req.ip)))
)

authRoutes.post(
  '/refresh',
  rateLimiters.auth,
  validate(schemas.refresh),
  handle(async (req, res) => ok(res, await authService.refresh(req.body, req.ip)))
)

authRoutes.post(
  '/logout',
  authenticate,
  handle(async (req, res) => ok(res, await authService.logout({ userId: req.user.id }, req.ip)))
)

authRoutes.get(
  '/me',
  authenticate,
  handle(async (req, res) => ok(res, await authService.me({ userId: req.user.id })))
)

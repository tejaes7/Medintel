import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { env } from '../../config/env.js'
import { logger } from '../../shared/logger.js'
import { AppError, AuthError, ForbiddenError, ValidationError } from '../../shared/errors.js'
import { fail } from '../envelope.js'

/** Correlation id on every request, echoed in every envelope and every log line. */
export function requestId(req, res, next) {
  const id = req.get('x-request-id') || randomUUID()
  res.locals.requestId = id
  res.set('x-request-id', id)
  next()
}

export function requestLogger(req, res, next) {
  const started = Date.now()
  res.on('finish', () => {
    logger.info('request', {
      requestId: res.locals.requestId,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      ms: Date.now() - started,
      userId: req.user?.id,
    })
  })
  next()
}

/**
 * Authentication. Verifies the access token and attaches req.user.
 * Authorisation (per-resource ownership) is enforced in the business layer, which is the
 * only place that knows what "owning" a resource means.
 */
export function authenticate(req, res, next) {
  const header = req.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) return next(new AuthError('Missing bearer token'))

  try {
    const payload = jwt.verify(token, env.jwt.secret)
    if (payload.typ !== 'access') return next(new AuthError('Wrong token type', 'INVALID_TOKEN'))
    req.user = { id: payload.sub, role: payload.role }
    next()
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
    next(new AuthError(err.name === 'TokenExpiredError' ? 'Access token expired' : 'Access token is invalid', code))
  }
}

/** Role gate. Ownership checks stay in the services; this only filters by role. */
export const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : next(new ForbiddenError())

/** Zod validation for body, query and params. Rejects unknown keys by schema design. */
export const validate = (schemas) => (req, res, next) => {
  for (const key of ['body', 'query', 'params']) {
    if (!schemas[key]) continue
    const result = schemas[key].safeParse(req[key])
    if (!result.success) {
      return next(
        new ValidationError(`Invalid request ${key}`, {
          in: key,
          issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        })
      )
    }
    // Express 5 makes req.query a getter — assign to a parallel field instead of mutating.
    if (key === 'query') req.validatedQuery = result.data
    else req[key] = result.data
  }
  next()
}

const limiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Authenticated users are limited per account; anonymous callers per IP.
    // ipKeyGenerator normalises IPv6 to a /64 subnet so a single client cannot
    // rotate through addresses in its own prefix to reset the counter.
    keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
    handler: (req, res) => fail(res, { status: 429, code: 'RATE_LIMITED', message }),
  })

export const rateLimiters = {
  // Broad ceiling for the whole API.
  global: limiter(60_000, 300, 'Too many requests. Slow down and try again shortly.'),
  api: limiter(60_000, 60, 'Too many API requests. Slow down and try again.'),
  // Credential endpoints get a tight window to blunt brute force.
  auth: limiter(15 * 60_000, 200, 'Too many authentication attempts. Try again in a few minutes.'),
  // AI endpoints are the expensive ones — free-tier quota is a real constraint.
  ai: limiter(60_000, 12, 'You are sending requests faster than the analysis service can serve them.'),
  upload: limiter(60 * 60_000, 30, 'Upload limit reached for this hour.'),
}

export function notFound(req, res) {
  return fail(res, { status: 404, code: 'NOT_FOUND', message: `No route for ${req.method} ${req.originalUrl}` })
}

/** Terminal error handler. Nothing below this leaks a stack trace to a client. */
// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    if (!err.expected) {
      logger.error('handled server error', { requestId: res.locals.requestId, code: err.code, err: err.message })
    }
    return fail(res, { status: err.status, code: err.code, message: err.message, details: err.details })
  }

  if (err?.name === 'ValidationError' && err?.errors) {
    return fail(res, {
      status: 422,
      code: 'VALIDATION_FAILED',
      message: 'The data did not satisfy the schema',
      details: Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message])),
    })
  }
  if (err?.name === 'CastError') {
    return fail(res, { status: 400, code: 'BAD_IDENTIFIER', message: `"${err.value}" is not a valid identifier` })
  }
  if (err?.code === 11000) {
    return fail(res, { status: 409, code: 'CONFLICT', message: 'That value is already taken' })
  }
  if (err?.type === 'entity.too.large') {
    return fail(res, { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' })
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return fail(res, { status: 413, code: 'FILE_TOO_LARGE', message: 'That file exceeds the 10 MB limit' })
  }

  logger.error('unhandled error', {
    requestId: res.locals.requestId,
    err: err?.message,
    stack: env.isProd ? undefined : err?.stack,
  })
  return fail(res, {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong on our side. The request id can be used to trace it.',
  })
}

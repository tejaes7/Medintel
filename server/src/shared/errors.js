/** Error taxonomy. Every thrown error carries an HTTP status and a stable machine code. */
export class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details = undefined } = {}) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
    this.details = details
    this.expected = status < 500
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Request failed validation', details) {
    super(message, { status: 422, code: 'VALIDATION_FAILED', details })
  }
}
export class AuthError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    super(message, { status: 401, code })
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super(message, { status: 403, code: 'FORBIDDEN' })
  }
}
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, { status: 404, code: 'NOT_FOUND' })
  }
}
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, { status: 409, code: 'CONFLICT' })
  }
}
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, { status: 429, code: 'RATE_LIMITED' })
  }
}
export class UpstreamError extends AppError {
  constructor(message = 'Upstream provider failed', details) {
    super(message, { status: 502, code: 'UPSTREAM_FAILED', details })
  }
}
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details) {
    super(message, { status: 503, code: 'SERVICE_UNAVAILABLE', details })
  }
}

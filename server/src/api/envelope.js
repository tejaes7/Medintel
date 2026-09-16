/**
 * One response envelope for the whole API. The client parses exactly two shapes, so a new
 * endpoint never introduces a new error-handling branch in React.
 *
 *   success: { ok: true,  data, meta? }
 *   failure: { ok: false, error: { code, message, details? }, meta }
 */

export function ok(res, data, { status = 200, meta } = {}) {
  return res.status(status).json({
    ok: true,
    data,
    meta: { requestId: res.locals.requestId, ...meta },
  })
}

export function created(res, data, meta) {
  return ok(res, data, { status: 201, meta })
}

export function fail(res, { status = 500, code = 'INTERNAL_ERROR', message, details }) {
  return res.status(status).json({
    ok: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
    meta: { requestId: res.locals.requestId },
  })
}

/** Wraps an async handler so a rejected promise reaches the error middleware. */
export const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

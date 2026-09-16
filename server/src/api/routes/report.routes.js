import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'
import { reportService } from '../../business/reports/reportService.js'
import { schemas } from '../schemas/index.js'
import { authenticate, validate, rateLimiters } from '../middleware/index.js'
import { ok, created, handle } from '../envelope.js'
import { ValidationError } from '../../shared/errors.js'

const UPLOAD_DIR = fileURLToPath(new URL('../../../uploads/', import.meta.url))

const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/tiff',
  'text/plain',
])

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED.has(file.mimetype)
      ? cb(null, true)
      : cb(new ValidationError(`Unsupported file type "${file.mimetype}". Upload a PDF, image or text file.`)),
})

export const reportRoutes = Router()

reportRoutes.use(authenticate)

reportRoutes.post(
  '/',
  rateLimiters.upload,
  upload.single('file'),
  validate(schemas.uploadReport),
  handle(async (req, res) => {
    if (!req.file) throw new ValidationError('A file is required under the "file" field')
    return created(
      res,
      await reportService.upload({
        userId: req.user.id,
        file: req.file,
        name: req.body.name,
        lab: req.body.lab,
        reportDate: req.body.reportDate,
        ip: req.ip,
      })
    )
  })
)

reportRoutes.get(
  '/',
  handle(async (req, res) => ok(res, await reportService.list({ userId: req.user.id })))
)

reportRoutes.get(
  '/:id',
  validate(schemas.idParam),
  handle(async (req, res) => ok(res, await reportService.get({ userId: req.user.id, reportId: req.params.id })))
)

reportRoutes.delete(
  '/:id',
  validate(schemas.idParam),
  handle(async (req, res) =>
    ok(res, await reportService.remove({ userId: req.user.id, reportId: req.params.id, ip: req.ip }))
  )
)

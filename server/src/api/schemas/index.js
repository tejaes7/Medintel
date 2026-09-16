import { z } from 'zod'
import { KNOWN_SYMPTOMS } from '../../business/triage/featureExtractor.js'

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'must be a 24-character identifier')
const intFromQuery = (def, max) =>
  z.coerce.number().int().min(1).max(max).default(def).catch(def)

export const schemas = {
  register: {
    body: z.object({
      name: z.string().trim().min(2).max(80),
      email: z.email().max(160),
      password: z.string().min(8, 'Password must be at least 8 characters').max(128),
      role: z.enum(['patient', 'hospital']).default('patient'),
      age: z.number().int().min(0).max(130).optional(),
      sex: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).optional(),
      allergies: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
      conditions: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    }),
  },

  login: {
    body: z.object({ email: z.email(), password: z.string().min(1).max(128) }).strict(),
  },

  refresh: {
    body: z.object({ refreshToken: z.string().min(10) }).strict(),
  },

  updateProfile: {
    body: z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        age: z.number().int().min(0).max(130).nullable().optional(),
        sex: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']).nullable().optional(),
        allergies: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
        conditions: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
      })
      .strict()
      .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update'),
  },

  analyseSymptoms: {
    body: z
      .object({
        text: z.string().trim().min(10, 'Describe your symptoms in at least 10 characters').max(4000),
        durationDays: z.number().min(0).max(3650).optional(),
        temperatureC: z.number().min(30).max(45).optional(),
        symptoms: z.array(z.enum(KNOWN_SYMPTOMS)).max(30).optional(),
      })
      .strict(),
  },

  listQuery: {
    query: z.object({ limit: intFromQuery(20, 100), skip: z.coerce.number().int().min(0).default(0).catch(0) }),
  },

  historyQuery: {
    query: z.object({
      limit: intFromQuery(50, 100),
      skip: z.coerce.number().int().min(0).default(0).catch(0),
      kind: z.enum(['Triage', 'Chat', 'Report', 'Medication', 'Account']).optional(),
    }),
  },

  idParam: { params: z.object({ id: objectId }) },

  sendMessage: {
    body: z
      .object({
        message: z.string().trim().min(1).max(2000),
        conversationId: objectId.optional(),
      })
      .strict(),
  },

  uploadReport: {
    body: z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        lab: z.string().trim().min(1).max(120).optional(),
        reportDate: z.iso.date().optional(),
      })
      .strict(),
  },

  createReminder: {
    body: z
      .object({
        drug: z.string().trim().min(1).max(120),
        dosage: z.string().trim().max(60).optional(),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM'),
        frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
        startDate: z.iso.date().optional(),
        endDate: z.iso.date().optional(),
      })
      .strict(),
  },

  updateReminder: {
    params: z.object({ id: objectId }),
    body: z
      .object({
        drug: z.string().trim().min(1).max(120).optional(),
        dosage: z.string().trim().max(60).optional(),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
        frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
        daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
        endDate: z.iso.date().nullable().optional(),
        active: z.boolean().optional(),
      })
      .strict()
      .refine((v) => Object.keys(v).length > 0, 'Provide at least one field to update'),
  },

  acknowledgeDose: {
    params: z.object({ id: objectId, doseId: objectId }),
    body: z.object({ status: z.enum(['taken', 'skipped', 'missed']) }).strict(),
  },
}

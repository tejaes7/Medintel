import { TriageSession } from '../models/index.js'

export const triageRepository = {
  create: (doc) => TriageSession.create(doc),
  findByIdForUser: (id, userId) => TriageSession.findOne({ _id: id, userId }),
  listForUser: (userId, { limit = 20, skip = 0 } = {}) =>
    TriageSession.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
  countForUser: (userId) => TriageSession.countDocuments({ userId }),
  latestForUser: (userId) => TriageSession.findOne({ userId }).sort({ createdAt: -1 }),
}

import { Report } from '../models/index.js'

export const reportRepository = {
  create: (doc) => Report.create(doc),
  findByIdForUser: (id, userId) => Report.findOne({ _id: id, userId }),
  listForUser: (userId, { limit = 50 } = {}) =>
    Report.find({ userId }).sort({ createdAt: -1 }).limit(limit),
  update: (id, patch) => Report.findByIdAndUpdate(id, { $set: patch }, { new: true }),
  deleteForUser: (id, userId) => Report.findOneAndDelete({ _id: id, userId }),
  countForUser: (userId) => Report.countDocuments({ userId }),
  countFlaggedForUser: (userId) => Report.countDocuments({ userId, flags: { $gt: 0 } }),
}

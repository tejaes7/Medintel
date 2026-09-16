import { Reminder } from '../models/index.js'

export const reminderRepository = {
  create: (doc) => Reminder.create(doc),
  findByIdForUser: (id, userId) => Reminder.findOne({ _id: id, userId }),
  listForUser: (userId, { activeOnly = false } = {}) =>
    Reminder.find({ userId, ...(activeOnly ? { active: true } : {}) }).sort({ time: 1 }),
  listAllActive: () => Reminder.find({ active: true }),
  update: (id, userId, patch) =>
    Reminder.findOneAndUpdate({ _id: id, userId }, { $set: patch }, { new: true, runValidators: true }),
  deleteForUser: (id, userId) => Reminder.findOneAndDelete({ _id: id, userId }),
  countActiveForUser: (userId) => Reminder.countDocuments({ userId, active: true }),
}

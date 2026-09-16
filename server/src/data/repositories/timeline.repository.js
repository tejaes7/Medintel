import { TimelineEvent } from '../models/index.js'

export const timelineRepository = {
  append: (doc) => TimelineEvent.create(doc),
  listForUser: (userId, { limit = 50, skip = 0, kind } = {}) =>
    TimelineEvent.find({ userId, ...(kind ? { kind } : {}) })
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit),
  countForUser: (userId, { kind } = {}) =>
    TimelineEvent.countDocuments({ userId, ...(kind ? { kind } : {}) }),
}

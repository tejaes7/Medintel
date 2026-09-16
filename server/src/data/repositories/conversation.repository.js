import { Conversation } from '../models/index.js'

export const conversationRepository = {
  create: (doc) => Conversation.create(doc),
  findByIdForUser: (id, userId) => Conversation.findOne({ _id: id, userId }),
  listForUser: (userId, { limit = 20 } = {}) =>
    Conversation.find({ userId }).sort({ lastMessageAt: -1 }).limit(limit).select('-messages'),
  latestForUser: (userId) => Conversation.findOne({ userId }).sort({ lastMessageAt: -1 }),
  appendMessages: (id, userId, messages) =>
    Conversation.findOneAndUpdate(
      { _id: id, userId },
      { $push: { messages: { $each: messages } }, $set: { lastMessageAt: new Date() } },
      { new: true }
    ),
  countForUser: (userId) => Conversation.countDocuments({ userId }),
}

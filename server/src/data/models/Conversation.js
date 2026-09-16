import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    from: { type: String, enum: ['user', 'bot'], required: true },
    text: { type: String, required: true },
    meta: { type: Boolean, default: false },
    provider: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
)

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Health chat' },
    messages: { type: [messageSchema], default: [] },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

conversationSchema.index({ userId: 1, lastMessageAt: -1 })

export const Conversation = mongoose.model('Conversation', conversationSchema)

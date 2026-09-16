import { Router } from 'express'
import { chatService } from '../../business/chat/chatService.js'
import { schemas } from '../schemas/index.js'
import { authenticate, validate, rateLimiters } from '../middleware/index.js'
import { ok, created, handle } from '../envelope.js'

export const chatRoutes = Router()

chatRoutes.use(authenticate)

chatRoutes.get(
  '/conversations',
  handle(async (req, res) => ok(res, await chatService.listConversations({ userId: req.user.id })))
)

chatRoutes.post(
  '/conversations',
  handle(async (req, res) => created(res, await chatService.startConversation({ userId: req.user.id })))
)

/** Latest conversation, or null when the user has never chatted. */
chatRoutes.get(
  '/conversations/latest',
  handle(async (req, res) => ok(res, await chatService.getConversation({ userId: req.user.id })))
)

chatRoutes.get(
  '/conversations/:id',
  validate(schemas.idParam),
  handle(async (req, res) =>
    ok(res, await chatService.getConversation({ userId: req.user.id, conversationId: req.params.id }))
  )
)

chatRoutes.post(
  '/messages',
  rateLimiters.ai,
  validate(schemas.sendMessage),
  handle(async (req, res) =>
    created(
      res,
      await chatService.send({
        userId: req.user.id,
        conversationId: req.body.conversationId,
        message: req.body.message,
        ip: req.ip,
      })
    )
  )
)

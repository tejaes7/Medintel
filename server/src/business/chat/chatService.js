import { aiService } from '../../ai/aiService.js'
import { evaluate } from '../triage/rulesEngine.js'
import { conversationRepository, userRepository, triageRepository } from '../../data/repositories/index.js'
import { historyService } from '../history/historyService.js'
import { audit, AUDIT } from '../../shared/audit.js'
import { logger } from '../../shared/logger.js'
import { NotFoundError } from '../../shared/errors.js'

const HISTORY_WINDOW = 8

/**
 * Health chat. The same safety ordering as triage applies: the rules engine screens every
 * inbound message first, and an emergency match is answered deterministically without
 * ever reaching a model.
 */
export const chatService = {
  async listConversations({ userId }) {
    const items = await conversationRepository.listForUser(userId)
    return items.map((c) => ({
      id: String(c._id),
      title: c.title,
      lastMessageAt: c.lastMessageAt,
      createdAt: c.createdAt,
    }))
  },

  async getConversation({ userId, conversationId }) {
    const convo = conversationId
      ? await conversationRepository.findByIdForUser(conversationId, userId)
      : await conversationRepository.latestForUser(userId)
    if (!convo) return null
    return presentConversation(convo)
  },

  /** Creates a conversation seeded with an opener that references the latest triage session. */
  async startConversation({ userId }) {
    const user = await userRepository.findById(userId)
    if (!user) throw new NotFoundError('User')
    const latest = await triageRepository.latestForUser(userId)

    const opener = latest
      ? `Hello ${user.name.split(' ')[0]}. I have your session from ${formatDate(latest.createdAt)} on file — ` +
        `${latest.input.symptoms?.length ? latest.input.symptoms.join(', ').replace(/_/g, ' ') : 'your reported symptoms'}. ` +
        `How are you feeling today?`
      : `Hello ${user.name.split(' ')[0]}. Tell me what you would like to talk through, and I will help you make sense of it.`

    const convo = await conversationRepository.create({
      userId,
      title: 'Health chat',
      messages: [{ from: 'bot', text: opener }],
    })
    return presentConversation(convo)
  },

  async send({ userId, conversationId, message, ip }) {
    const user = await userRepository.findById(userId)
    if (!user) throw new NotFoundError('User')
    const profile = user.profile?.toObject?.() ?? user.profile ?? {}

    let convo = conversationId
      ? await conversationRepository.findByIdForUser(conversationId, userId)
      : await conversationRepository.latestForUser(userId)
    if (!convo) convo = await conversationRepository.create({ userId, title: 'Health chat', messages: [] })

    // ── Rules engine screens the message before anything else. ──────────────────
    const verdict = evaluate({ text: message }, profile)

    const outgoing = [{ from: 'user', text: message }]
    let provider = 'none'
    let degraded = false

    if (verdict.requiresImmediateEscalation) {
      outgoing.push({
        from: 'bot',
        text:
          'What you have described matches an emergency escalation rule, so I am not going to offer self-care advice.\n\n' +
          'Please seek emergency care now — call your local emergency number or go to the nearest emergency department. ' +
          'If you can, have someone stay with you until help arrives.',
        provider: 'rules-engine',
      })
      logger.info('chat escalated by rules engine, ai bypassed', {
        userId: String(userId),
        rules: verdict.redFlags.map((f) => f.id),
      })
      await audit({
        actorId: userId,
        action: AUDIT.TRIAGE_ESCALATE,
        resource: 'chat',
        ip,
        metadata: { rules: verdict.redFlags.map((f) => f.id) },
      })
    } else {
      const history = convo.messages.slice(-HISTORY_WINDOW).map((m) => ({ from: m.from, text: m.text }))
      try {
        const reply = await aiService.chat({ message, history, profile, actorId: userId })
        provider = reply.provider
        outgoing.push({ from: 'bot', text: reply.text, provider })
      } catch (err) {
        degraded = true
        logger.warn('chat degraded, ai unavailable', { userId: String(userId), err: err.message })
        outgoing.push({
          from: 'bot',
          text:
            'I cannot reach my reasoning service at the moment, so I will not guess. ' +
            'Nothing in your message matched an urgent escalation rule. ' +
            'If your symptoms worsen or you feel breathless, please contact a clinician.',
          provider: 'rules-engine',
        })
      }
    }

    // Disclaimer is appended by the application, never authored by the model.
    outgoing.push({ from: 'bot', text: aiService.DISCLAIMER, meta: true })

    const updated = await conversationRepository.appendMessages(convo._id, userId, outgoing)

    if (convo.messages.length === 0) {
      await historyService.record({
        userId,
        kind: 'Chat',
        tone: 'brand',
        title: 'Health chat started',
        body: message.slice(0, 140),
        sourceId: convo._id,
      })
    }

    await audit({
      actorId: userId,
      action: AUDIT.CHAT_MESSAGE,
      resource: 'conversation',
      resourceId: String(convo._id),
      ip,
      metadata: { provider, degraded, escalated: verdict.requiresImmediateEscalation },
    })

    return {
      conversation: presentConversation(updated),
      escalated: verdict.requiresImmediateEscalation,
      redFlags: verdict.redFlags,
      degraded,
      provider,
    }
  },
}

function presentConversation(convo) {
  return {
    id: String(convo._id),
    title: convo.title,
    lastMessageAt: convo.lastMessageAt,
    messages: convo.messages.map((m) => ({
      id: String(m._id),
      from: m.from,
      text: m.text,
      meta: m.meta ?? false,
      provider: m.provider,
      createdAt: m.createdAt,
    })),
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

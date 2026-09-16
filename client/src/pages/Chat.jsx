import { useState, useRef, useEffect } from 'react'
import Icon from '../components/Icon'
import { Card, CardHead, Badge, Button, PageHead } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import PatientOnlyNotice from '../components/PatientOnlyNotice'

const suggestions = [
  'How long does a cough usually last after a cold?',
  'What should I tell my doctor at the appointment?',
  'When should I see a doctor in person?',
]

export default function Chat() {
  const { user } = useAuth()
  if (user?.role === 'hospital') {
    return <PatientOnlyNotice featureName="Clinical AI triage support chat" />
  }
  return <PatientChat user={user} />
}

function PatientChat({ user }) {
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [escalated, setEscalated] = useState(false)
  const endRef = useRef(null)

  // Load the most recent conversation, or start one if the user has never chatted.
  const { data: conversation, setData: setConversation, loading } = useApi(async () => {
    const existing = await api.chat.latest()
    if (existing.data) return existing
    return api.chat.start()
  }, [])

  const latestTriage = useApi(() => api.triage.latest(), [])

  const messages = conversation?.messages ?? []

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, typing])

  const send = async (text) => {
    const body = (text ?? draft).trim()
    if (!body || typing) return

    setDraft('')
    setSendError(null)
    setTyping(true)

    // Optimistic echo so the input feels immediate; the server response replaces it.
    setConversation((c) => ({ ...c, messages: [...(c?.messages ?? []), { id: `tmp-${Date.now()}`, from: 'user', text: body }] }))

    try {
      const { data } = await api.chat.send({ message: body, conversationId: conversation?.id })
      setConversation(data.conversation)
      setEscalated(data.escalated)
    } catch (err) {
      setSendError(err)
      // Roll the optimistic message back so the transcript never lies about what was sent.
      setConversation((c) => ({ ...c, messages: (c?.messages ?? []).filter((m) => !String(m.id).startsWith('tmp-')) }))
      setDraft(body)
    } finally {
      setTyping(false)
    }
  }

  const context = [
    ['Profile', [user?.age && `Age ${user.age}`, user?.sex?.toLowerCase(), user?.conditions?.join(', ')].filter(Boolean).join(' · ') || 'Not provided'],
    ['Allergies', user?.allergies?.length ? user.allergies.join(', ') : 'None recorded'],
    [
      'Last session',
      latestTriage.data
        ? `${new Date(latestTriage.data.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} · ${latestTriage.data.urgency}${latestTriage.data.conditions?.[0] ? `, ${Math.round(latestTriage.data.conditions[0].likelihood * 100)}%` : ''}`
        : 'No sessions yet',
    ],
  ]

  return (
    <>
      <PageHead
        eyebrow="Module 03"
        title="Health chat"
        sub="Follow-up conversation that carries your session context and stored history into every turn — under the same guardrails as triage."
      />

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <Card className="flex h-[calc(100vh-13rem)] max-h-[620px] min-h-[440px] flex-col">
          <CardHead
            title={conversation?.id ? `Conversation ${conversation.id.slice(-6)}` : 'Health chat'}
            sub={
              latestTriage.data
                ? `Context: session from ${new Date(latestTriage.data.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
                : 'No prior session on file'
            }
            action={escalated ? <Badge tone="rose">Escalated</Badge> : latestTriage.data && <Badge tone={latestTriage.data.tone}>{latestTriage.data.urgency}</Badge>}
          />

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {loading && <p className="text-center text-[13px] text-muted">Loading your conversation…</p>}

            {messages.map((m) =>
              m.meta ? (
                <div key={m.id} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface p-3.5">
                  <Icon name="alert" className="mt-px size-4 shrink-0 text-amber" />
                  <p className="text-[12.5px] leading-relaxed text-slate">{m.text}</p>
                </div>
              ) : (
                <div key={m.id} className={`flex gap-3 ${m.from === 'user' ? 'justify-end' : ''}`}>
                  {m.from === 'bot' && (
                    <span
                      className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg text-white ${
                        m.provider === 'rules-engine' ? 'bg-rose' : 'bg-ink'
                      }`}
                      title={m.provider === 'rules-engine' ? 'Answered by the rules engine' : 'Answered by the AI service'}
                    >
                      <Icon name={m.provider === 'rules-engine' ? 'shield' : 'spark'} className="size-3.5" />
                    </span>
                  )}
                  <div
                    className={`max-w-[78%] whitespace-pre-line rounded-xl px-4 py-2.5 text-[13.5px] leading-relaxed ${
                      m.from === 'user'
                        ? 'bg-brand text-white'
                        : m.provider === 'rules-engine'
                          ? 'bg-rose-soft text-slate ring-1 ring-rose/20'
                          : 'bg-surface text-slate ring-1 ring-line'
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.from === 'user' && (
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-surface text-[10.5px] font-semibold text-slate ring-1 ring-line">
                      {user?.initials}
                    </span>
                  )}
                </div>
              )
            )}

            {typing && (
              <div className="flex gap-3">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-ink text-white">
                  <Icon name="spark" className="size-3.5" />
                </span>
                <div className="flex items-center gap-1 rounded-xl bg-surface px-4 py-3 ring-1 ring-line">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-1.5 animate-bounce rounded-full bg-muted"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {sendError && (
              <div className="flex items-start gap-2.5 rounded-lg bg-rose-soft p-3.5">
                <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
                <p className="text-[12.5px] leading-relaxed text-slate">{sendError.message}</p>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-line p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={typing}
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-slate ring-1 ring-line transition hover:text-ink hover:ring-[#cfd8e3] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a follow-up question…"
                className="h-8 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted"
              />
              <Button type="submit" size="sm" disabled={!draft.trim() || typing}>
                <Icon name="send" className="size-3.5" /> Send
              </Button>
            </form>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHead title="Context in this conversation" sub="What the model was given" />
            <ul className="divide-y divide-line">
              {context.map(([k, v]) => (
                <li key={k} className="px-5 py-3">
                  <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">{k}</p>
                  <p className="mt-0.5 text-[13px] text-ink">{v}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHead title="Applied guardrails" />
            <ul className="space-y-3 p-5">
              {[
                'PII redacted before the provider boundary',
                'Response schema-validated on return',
                'No drug names or dosages permitted',
                'Red-flag rules re-run on every turn',
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[13px] leading-relaxed text-slate">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-teal" strokeWidth={2.2} />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}

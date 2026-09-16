import { useState, useEffect } from 'react'
import Icon from '../components/Icon'
import { Card, CardHead, Badge, Button, Field, inputCls, PageHead } from '../components/ui'
import { api } from '../lib/api'
import { useAction } from '../lib/useApi'
import { useAuth } from '../lib/auth'

/** Editable chip list — used for both allergies and chronic conditions. */
function ChipEditor({ label, tone, items, onChange, placeholder }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    if (!value || items.includes(value)) return
    onChange([...items, value])
    setDraft('')
  }

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-slate">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((a) => (
          <span key={a} className="inline-flex items-center gap-1">
            <Badge tone={tone}>
              {a}
              <button
                type="button"
                onClick={() => onChange(items.filter((x) => x !== a))}
                aria-label={`Remove ${a}`}
                className="ml-0.5 opacity-60 hover:opacity-100"
              >
                ×
              </button>
            </Badge>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder}
          className={`${inputCls} h-9 py-1.5 text-[13px]`}
        />
        <Button type="button" variant="secondary" size="sm" onClick={add} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  if (user?.role === 'hospital') {
    return <HospitalAdminProfile />
  }
  return <PatientProfile />
}

function HospitalAdminProfile() {
  const { user, setUser, signOut } = useAuth()
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
    }
  }, [user])

  const save = useAction(async () => {
    const { data } = await api.profile.update({ name })
    setUser(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  })

  return (
    <>
      <PageHead
        eyebrow="Hospital Administration"
        title="Hospital Account & Security"
        sub="Manage administrator credentials, facility identity, session tokens, and security settings."
      >
        <Button onClick={() => save.run()} disabled={save.pending}>
          {save.pending ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </Button>
      </PageHead>

      {save.error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-rose-soft p-4">
          <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
          <p className="text-[13px] leading-relaxed text-slate">{save.error.message}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHead title="Administrator & Facility Identity" />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-full bg-brand text-[16px] font-semibold text-white">
                  {user?.initials}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-bold text-ink">{user?.name}</p>
                    <Badge tone="brand">Hospital Administrator</Badge>
                  </div>
                  <p className="text-[13px] text-muted">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Administrator / Contact Name">
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Hospital Account Email" hint="Your email is your sign-in identity and cannot be changed here.">
                  <input className={`${inputCls} bg-surface text-muted`} value={user?.email ?? ''} readOnly />
                </Field>
              </div>

              <div className="rounded-lg bg-surface p-4 ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11.5px] font-semibold uppercase tracking-wider text-brand">Facility Operations Profile</span>
                    <p className="mt-0.5 text-[13px] text-slate">
                      Update facility address, 24/7 emergency phone, specialist departments, and GPS coordinates.
                    </p>
                  </div>
                  <Button as="link" to="/app/facility" size="sm" variant="secondary">
                    Edit Facility Profile →
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHead title="Session & Credentials" />
            <div className="px-5 py-4">
              <p className="text-[13px] leading-relaxed text-slate">
                Signing out revokes every active refresh token issued to this hospital administrator account across all workstations.
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={signOut}>
                <Icon name="logout" className="size-4" /> Sign out everywhere
              </Button>
            </div>
          </Card>

          <Card>
            <CardHead title="Enterprise Security & Privacy" />
            <ul className="space-y-3 p-5">
              {[
                'Strict Role-Based Access Control (RBAC) enforced',
                'Patient PII isolation compliant with healthcare privacy standards',
                'Encrypted in transit (TLS 1.3) and at rest (AES-256)',
                'Deterministic red-flag safety pipeline audits',
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[13px] leading-relaxed text-slate">
                  <Icon name="shield" className="mt-0.5 size-4 shrink-0 text-teal" />
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

function PatientProfile() {
  const { user, setUser } = useAuth()

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [allergies, setAllergies] = useState([])
  const [conditions, setConditions] = useState([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    setName(user.name ?? '')
    setAge(user.age ?? '')
    setSex(user.sex ?? '')
    setAllergies(user.allergies ?? [])
    setConditions(user.conditions ?? [])
  }, [user])

  const save = useAction(async () => {
    const parsedAge = parseInt(age, 10)
    const { data } = await api.profile.update({
      name,
      age: Number.isFinite(parsedAge) ? parsedAge : null,
      ...(sex ? { sex } : {}),
      allergies,
      conditions,
    })
    setUser(data)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  })

  return (
    <>
      <PageHead
        eyebrow="Module 01"
        title="Profile & account"
        sub="Everything here is injected as context before the AI is called, and every field is redacted at the provider boundary."
      >
        <Button onClick={() => save.run()} disabled={save.pending}>
          {save.pending ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </Button>
      </PageHead>

      {save.error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-rose-soft p-4">
          <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
          <p className="text-[13px] leading-relaxed text-slate">{save.error.message}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHead title="Personal details" />
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-4">
                <span className="grid size-14 place-items-center rounded-full bg-ink text-[16px] font-semibold text-white">
                  {user?.initials}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-ink">{user?.name}</p>
                  <p className="text-[13px] text-muted">{user?.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Email" hint="Your email is your sign-in identity and cannot be changed here.">
                  <input className={`${inputCls} bg-surface text-muted`} value={user?.email ?? ''} readOnly />
                </Field>
                <Field label="Age">
                  <input className={inputCls} value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
                </Field>
                <Field label="Sex">
                  <select className={inputCls} value={sex} onChange={(e) => setSex(e.target.value)}>
                    <option value="">Not specified</option>
                    {['Male', 'Female', 'Other', 'Prefer not to say'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead title="Clinical background" sub="Raises or lowers baseline probability during triage" />
            <div className="space-y-5 p-5">
              <ChipEditor
                label="Allergies"
                tone="rose"
                items={allergies}
                onChange={setAllergies}
                placeholder="e.g. Penicillin"
              />
              <ChipEditor
                label="Chronic conditions"
                tone="amber"
                items={conditions}
                onChange={setConditions}
                placeholder="e.g. Mild asthma"
              />
              <p className="text-[12.5px] leading-relaxed text-muted">
                Respiratory conditions listed here lower the escalation threshold in the rules engine — rule RF-15
                fires on any breathlessness when asthma or COPD is on file.
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHead title="Session" />
            <div className="px-5 py-4">
              <p className="text-[13px] leading-relaxed text-slate">
                Signing out revokes every refresh token issued to this account, on every device.
              </p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={signOut}>
                <Icon name="logout" className="size-4" /> Sign out everywhere
              </Button>
            </div>
          </Card>

          <Card>
            <CardHead title="Data & privacy" />
            <ul className="space-y-3 p-5">
              {[
                'Identifiers stripped before any AI request',
                'Encrypted in transit and at rest',
                'Per-resource ownership checks on every read',
                'Append-only audit log of access',
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[13px] leading-relaxed text-slate">
                  <Icon name="shield" className="mt-0.5 size-4 shrink-0 text-teal" />
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

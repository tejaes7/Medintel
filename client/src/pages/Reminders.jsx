import { useState } from 'react'
import Icon from '../components/Icon'
import { Card, CardHead, Badge, Button, Field, inputCls, PageHead, Empty } from '../components/ui'
import { api } from '../lib/api'
import { useApi, useAction } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import PatientOnlyNotice from '../components/PatientOnlyNotice'

const WEEK = [
  ['S', 0],
  ['M', 1],
  ['T', 2],
  ['W', 3],
  ['T', 4],
  ['F', 5],
  ['S', 6],
]

export default function Reminders() {
  const { user } = useAuth()
  if (user?.role === 'hospital') {
    return <PatientOnlyNotice featureName="Personal medication tracking and reminders" />
  }
  return <PatientReminders />
}

function PatientReminders() {
  const { data: items, loading, reload } = useApi(() => api.reminders.list(), [])

  const [drug, setDrug] = useState('')
  const [dosage, setDosage] = useState('')
  const [time, setTime] = useState('21:00')
  const [frequency, setFrequency] = useState('daily')
  const [daysOfWeek, setDaysOfWeek] = useState([0])

  const create = useAction(async () => {
    await api.reminders.create({
      drug,
      ...(dosage ? { dosage } : {}),
      time,
      frequency,
      ...(frequency === 'weekly' ? { daysOfWeek } : {}),
    })
    setDrug('')
    setDosage('')
    reload()
  })

  const toggleActive = async (r) => {
    await api.reminders.update(r.id, { active: !r.active })
    reload()
  }

  const remove = async (r) => {
    await api.reminders.remove(r.id)
    reload()
  }

  const acknowledge = async (r, doseId, status) => {
    await api.reminders.acknowledge(r.id, doseId, status)
    reload()
  }

  const toggleDay = (d) =>
    setDaysOfWeek((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))

  const list = items ?? []
  const activeCount = list.filter((r) => r.active).length

  // Next 24 hours across every schedule.
  const soon = list
    .filter((r) => r.active && r.nextDoseAt && new Date(r.nextDoseAt) - Date.now() < 86400000)
    .sort((a, b) => new Date(a.nextDoseAt) - new Date(b.nextDoseAt))

  return (
    <>
      <PageHead
        eyebrow="Module 05"
        title="Medicine reminders"
        sub="Schedules run as recurring jobs off the request path. Every dose is logged as taken or missed, which is what the adherence figure is built from."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHead
              title="Active schedules"
              sub={list.length ? `${activeCount} of ${list.length} enabled` : '—'}
            />
            {list.length ? (
              <ul className="divide-y divide-line">
                {list.map((r) => (
                  <li key={r.id} className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-slate ring-1 ring-line">
                        <Icon name="clock" className="size-[18px]" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-ink">
                          {r.drug} {r.dosage}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {r.freq} · next {r.next.toLowerCase()}
                        </p>
                      </div>

                      <div className="hidden text-right sm:block">
                        <p
                          className={`text-[13px] font-semibold ${
                            r.tone === 'rose' ? 'text-rose' : r.tone === 'amber' ? 'text-amber' : r.tone === 'teal' ? 'text-teal' : 'text-muted'
                          }`}
                        >
                          {r.adherence != null ? `${Math.round(r.adherence * 100)}%` : '—'}
                        </p>
                        <p className="text-[11.5px] text-muted">adherence</p>
                      </div>

                      <button
                        onClick={() => toggleActive(r)}
                        role="switch"
                        aria-checked={r.active}
                        aria-label={`Toggle ${r.drug}`}
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${r.active ? 'bg-brand' : 'bg-line'}`}
                      >
                        <span
                          className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform ${
                            r.active ? 'translate-x-[18px]' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {r.nextDoseId && r.active && (
                      <div className="mt-3 flex gap-2 pl-13">
                        <Button size="sm" variant="secondary" onClick={() => acknowledge(r, r.nextDoseId, 'taken')}>
                          Mark taken
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => acknowledge(r, r.nextDoseId, 'skipped')}>
                          Skip
                        </Button>
                        <Button size="sm" variant="ghost" className="ml-auto text-rose" onClick={() => remove(r)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title={loading ? 'Loading schedules…' : 'No schedules yet'}
                sub="Add a medication on the right and adherence tracking starts immediately."
              />
            )}
          </Card>

          <Card>
            <CardHead title="Dose log" sub="Most recent doses per schedule" />
            <div className="space-y-4 p-5">
              {list.length === 0 && <p className="text-[13px] text-muted">Nothing logged yet.</p>}
              {list.map((r) => (
                <div key={r.id}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[13px] font-medium text-ink">{r.drug}</span>
                    <span className="text-[11.5px] text-muted">{r.doses.length} slots</span>
                  </div>
                  <div className="flex gap-1">
                    {r.doses.slice(0, 14).map((d) => (
                      <span
                        key={d.id}
                        title={`${new Date(d.scheduledFor).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} — ${d.status}`}
                        className={`h-7 flex-1 rounded-md ${
                          d.status === 'taken'
                            ? 'bg-teal/85'
                            : d.status === 'missed'
                              ? 'bg-rose/60'
                              : d.status === 'skipped'
                                ? 'bg-amber/70'
                                : 'bg-line'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-4 pt-1 text-[11.5px] text-muted">
                {[
                  ['bg-teal/85', 'Taken'],
                  ['bg-amber/70', 'Skipped'],
                  ['bg-rose/60', 'Missed'],
                  ['bg-line', 'Pending'],
                ].map(([c, l]) => (
                  <span key={l} className="flex items-center gap-1.5">
                    <span className={`size-2.5 rounded-sm ${c}`} /> {l}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHead title="New schedule" sub="Fields only — nothing is dispensed or prescribed" />
            <form
              className="space-y-4 p-5"
              onSubmit={(e) => {
                e.preventDefault()
                create.run()
              }}
            >
              <Field label="Medication name">
                <input
                  className={inputCls}
                  placeholder="As written on your prescription"
                  value={drug}
                  onChange={(e) => setDrug(e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Dose">
                  <input
                    className={inputCls}
                    placeholder="e.g. 10 mg"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                  />
                </Field>
                <Field label="Time">
                  <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} required />
                </Field>
              </div>
              <Field label="Repeat">
                <select className={inputCls} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom</option>
                </select>
              </Field>

              {frequency === 'weekly' && (
                <Field label="Days">
                  <div className="flex gap-1.5">
                    {WEEK.map(([label, d]) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`h-9 flex-1 rounded-lg text-[13px] font-medium transition ${
                          daysOfWeek.includes(d)
                            ? 'bg-brand-soft text-brand ring-1 ring-brand/30'
                            : 'text-slate ring-1 ring-line hover:ring-[#cfd8e3]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              {create.error && (
                <div className="flex items-start gap-2.5 rounded-lg bg-rose-soft p-3">
                  <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
                  <p className="text-[12.5px] leading-relaxed text-slate">{create.error.message}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={create.pending || !drug.trim()}>
                {create.pending ? 'Creating…' : 'Create schedule'}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHead title="Next 24 hours" />
            {soon.length ? (
              <ul className="divide-y divide-line">
                {soon.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-11 text-[12.5px] font-semibold text-ink">{r.time}</span>
                    <span className="flex-1 truncate text-[13px] text-slate">
                      {r.drug} {r.dosage}
                    </span>
                    <Badge tone="slate">{r.next}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-[13px] text-muted">No doses scheduled in the next 24 hours.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

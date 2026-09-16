import { useState } from 'react'
import Icon from '../components/Icon'
import { Card, CardHead, Badge, Button, PageHead, Empty } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { useAuth } from '../lib/auth'

const patientFilters = ['All', 'Triage', 'Chat', 'Report', 'Medication']
const hospitalFilters = ['All', 'Account', 'Triage', 'Report', 'Medication']

export default function History() {
  const { user } = useAuth()
  const isHospital = user?.role === 'hospital'
  const filters = isHospital ? hospitalFilters : patientFilters

  const [filter, setFilter] = useState('All')

  const { data: events, meta, loading } = useApi(
    () => api.history({ limit: 100, ...(filter === 'All' ? {} : { kind: filter }) }),
    [filter]
  )
  const dashboard = useApi(() => api.dashboard(), [])
  const sessions = useApi(() => api.triage.sessions({ limit: 100 }), [])
  const hospitalProfile = useApi(
    () => (isHospital ? api.hospitals.myProfile() : Promise.resolve(null)),
    [isHospital]
  )
  const managedAppts = useApi(
    () => (isHospital ? api.hospitals.managedAppointments() : Promise.resolve(null)),
    [isHospital]
  )

  const shown = events ?? []
  const escalations = (sessions.data ?? []).filter((s) => s.urgency === 'Emergency').length
  const s = dashboard.data?.stats

  return (
    <>
      <PageHead
        eyebrow={isHospital ? 'Facility Audit' : 'Module 06'}
        title={isHospital ? 'Operations & Audit Timeline' : 'Medical history'}
        sub={
          isHospital
            ? 'One chronological audit trail of facility actions, specialist changes, and administrative events.'
            : 'One chronological record of every session, report and medication change — assembled for a real consultation, not for legal or insurance use.'
        }
      >
        <Button variant="secondary" onClick={() => window.print()}>
          Export as PDF
        </Button>
      </PageHead>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
              filter === f ? 'bg-ink text-white' : 'bg-white text-slate ring-1 ring-line hover:ring-[#cfd8e3]'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-[12.5px] text-muted">
          {loading ? 'Loading…' : `${meta?.total ?? shown.length} entries`}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        <Card className="overflow-hidden">
          {shown.length === 0 ? (
            <Empty
              title={loading ? 'Loading audit events…' : 'Nothing recorded yet'}
              sub={
                isHospital
                  ? 'Audit events will appear here as you manage appointments, doctor rosters, and facility operations.'
                  : 'Entries appear here as you complete sessions, upload reports or change medication.'
              }
              action={
                !loading && (
                  <Button as="link" to={isHospital ? '/app/appointments' : '/app/symptoms'} size="sm">
                    {isHospital ? 'Appointments Desk' : 'Start a session'}
                  </Button>
                )
              }
            />
          ) : (
            <ol className="relative px-5 py-5">
              <span className="absolute bottom-8 left-[38px] top-8 w-px bg-line" />
              {shown.map((t) => (
                <li key={t.id} className="relative flex gap-4 pb-6 last:pb-0">
                  <span className="relative z-10 mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white ring-1 ring-line">
                    <span
                      className={`size-2 rounded-full ${
                        { brand: 'bg-brand', teal: 'bg-teal', amber: 'bg-amber', rose: 'bg-rose' }[t.tone]
                      }`}
                    />
                  </span>
                  <div className="min-w-0 flex-1 rounded-lg border border-line p-4 transition hover:border-[#cfd8e3]">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={t.tone}>{t.kind}</Badge>
                      <span className="text-[12px] text-muted">{t.date}</span>
                    </div>
                    <p className="mt-2 text-[14px] font-medium text-ink">{t.title}</p>
                    {t.body && <p className="mt-1 text-[13px] leading-relaxed text-slate">{t.body}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHead
              title={isHospital ? 'Facility at a glance' : 'At a glance'}
              sub={isHospital ? 'Operational metrics' : 'Your complete record'}
            />
            <dl className="divide-y divide-line text-[13px]">
              {isHospital
                ? [
                    ['Specialist Doctors', String(hospitalProfile.data?.doctors?.length ?? 0)],
                    ['Scheduled Camps', String(hospitalProfile.data?.events?.length ?? 0)],
                    ['Consultations Managed', String(managedAppts.data?.length ?? 0)],
                    ['Audit Log Entries', String(meta?.total ?? shown.length)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-5 py-3">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium text-ink">{v}</dd>
                    </div>
                  ))
                : [
                    ['Symptom sessions', s ? String(s.triageSessions) : '—'],
                    ['Escalations triggered', sessions.data ? String(escalations) : '—'],
                    ['Reports uploaded', s ? String(s.reports) : '—'],
                    ['Active medication', s ? String(s.activeReminders) : '—'],
                    ['Average adherence', s?.overallAdherence != null ? `${Math.round(s.overallAdherence * 100)}%` : '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between px-5 py-3">
                      <dt className="text-muted">{k}</dt>
                      <dd className="font-medium text-ink">{v}</dd>
                    </div>
                  ))}
            </dl>
          </Card>

          <Card>
            <CardHead
              title={isHospital ? 'Audit Compliance' : 'Export'}
              sub={isHospital ? 'Regulatory guarantees' : 'What a physician receives'}
            />
            <ul className="space-y-3 p-5">
              {(isHospital
                ? [
                    'Append-only immutable audit trail',
                    'Role-based authorization and session logging',
                    'Per-facility data isolation',
                    'Timestamped clinician roster updates',
                  ]
                : [
                    'Chronological session and report list',
                    'Profile: age, sex, allergies, conditions',
                    'Current medication and adherence figures',
                    'Every AI output marked as decision support',
                  ]
              ).map((t) => (
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

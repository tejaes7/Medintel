import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { Card, CardHead, Badge, Button, PageHead, Empty } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import HospitalDashboard from './HospitalDashboard'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  if (user?.role === 'hospital') {
    return <HospitalDashboard />
  }
  return <PatientDashboard user={user} />
}

function PatientDashboard({ user }) {
  const { data, loading, error, reload } = useApi(() => api.dashboard(), [])
  const reminders = useApi(() => api.reminders.list(), [])
  const rules = useApi(() => api.triage.rules(), [])
  const appointments = useApi(
    () => (user?.role === 'hospital' ? api.hospitals.managedAppointments() : api.hospitals.myAppointments()),
    [user?.role]
  )

  const shortcuts =
    user?.role === 'hospital'
      ? [
          { to: '/app/hospitals', icon: 'shield', title: 'Hospital Management', body: 'Review bookings, manage doctor roster & post camps.' },
          { to: '/app/chat', icon: 'chat', title: 'Clinical Decision Chat', body: 'Context-aware AI decision support.' },
          { to: '/app/history', icon: 'timeline', title: 'Audit Timeline', body: 'Log of triage, reports & medication events.' },
          { to: '/app/profile', icon: 'user', title: 'Account Settings', body: 'Security & login credentials.' },
        ]
      : [
          { to: '/app/symptoms', icon: 'pulse', title: 'Start a symptom session', body: 'Structured intake, rules first, AI second.' },
          { to: '/app/hospitals', icon: 'shield', title: 'Hospitals & Appointments', body: 'Find nearby clinics, view doctors & book visits.' },
          { to: '/app/chat', icon: 'chat', title: 'Ask a follow-up', body: 'Context-aware chat over your history.' },
          { to: '/app/reports', icon: 'upload', title: 'Upload a report', body: 'PDF or image — OCR runs in the background.' },
        ]

  const markTaken = async (reminder) => {
    if (!reminder.nextDoseId) return
    await api.reminders.acknowledge(reminder.id, reminder.nextDoseId, 'taken')
    reminders.reload()
    reload()
  }

  const s = data?.stats
  const stats = [
    { label: 'Symptom sessions', value: s ? String(s.triageSessions) : '—', delta: data?.latestTriage ? `Last: ${data.latestTriage.urgency.toLowerCase()} urgency` : 'None yet' },
    { label: 'Reports on file', value: s ? String(s.reports) : '—', delta: s?.flaggedReports ? `${s.flaggedReports} with flagged values` : 'No flagged values' },
    { label: 'Active medication', value: s ? String(s.activeReminders) : '—', delta: s?.activeReminders ? 'Doses tracked daily' : 'No schedules yet' },
    {
      label: 'Adherence',
      value: s?.overallAdherence != null ? `${Math.round(s.overallAdherence * 100)}%` : '—',
      delta: s?.overallAdherence != null ? 'Across active schedules' : 'No doses recorded yet',
    },
  ]

  const upcoming = (reminders.data ?? []).filter((r) => r.active && r.nextDoseId).slice(0, 2)

  return (
    <>
      <PageHead
        eyebrow="Overview"
        title={`${greeting()}, ${user?.name?.split(' ')[0] ?? 'there'}.`}
        sub={
          data?.latestTriage?.urgency === 'Emergency'
            ? 'Your most recent session was escalated. Please follow the guidance on that session.'
            : 'Nothing on your record requires urgent attention.'
        }
      >
        <Button as="link" to="/app/symptoms">
          <Icon name="plus" className="size-4" /> New session
        </Button>
      </PageHead>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-rose-soft p-4">
          <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
          <div className="text-[13px] leading-relaxed text-slate">
            <p className="font-medium text-ink">{error.message}</p>
            <button onClick={reload} className="mt-1 font-medium text-brand hover:text-brand-dark">
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="bg-white px-5 py-4">
            <p className="text-[12.5px] font-medium text-muted">{st.label}</p>
            <p className="mt-1.5 text-[26px] font-semibold tracking-[-0.03em] text-ink">
              {loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-line align-middle" /> : st.value}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">{st.delta}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHead
            title="Recent activity"
            sub="Sessions, reports and medication in one timeline"
            action={
              <Link to="/app/history" className="text-[13px] font-medium text-brand hover:text-brand-dark">
                View all
              </Link>
            }
          />
          {data?.recentActivity?.length ? (
            <ul className="divide-y divide-line">
              {data.recentActivity.slice(0, 5).map((t) => (
                <li key={t.id} className="flex gap-4 px-5 py-4 transition-colors hover:bg-surface">
                  <Badge tone={t.tone} className="mt-0.5 shrink-0">
                    {t.kind}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">{t.title}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-slate">{t.body}</p>
                  </div>
                  <span className="shrink-0 text-[12px] text-muted">{t.date}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title={loading ? 'Loading your history…' : 'Nothing recorded yet'}
              sub="Run a symptom session or upload a report and it will appear here."
              action={
                !loading && (
                  <Button as="link" to="/app/symptoms" size="sm">
                    Start a session
                  </Button>
                )
              }
            />
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHead title="Today" sub="Doses scheduled next" />
            {upcoming.length ? (
              <ul className="divide-y divide-line">
                {upcoming.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-slate ring-1 ring-line">
                      <Icon name="clock" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">
                        {r.drug} {r.dosage}
                      </p>
                      <p className="text-[12px] text-muted">
                        {r.time} · {r.next}
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => markTaken(r)}>
                      Mark taken
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title="No doses scheduled"
                sub="Add a medication schedule to start tracking adherence."
                action={
                  <Button as="link" to="/app/reminders" size="sm">
                    Add medication
                  </Button>
                }
              />
            )}
          </Card>

          {appointments.data?.length > 0 && (
            <Card>
              <CardHead
                title={user?.role === 'hospital' ? 'Incoming Appointments' : 'Booked Consultations'}
                sub={user?.role === 'hospital' ? 'Patient bookings' : 'Upcoming doctor visits'}
                action={
                  <Link to="/app/hospitals" className="text-[12.5px] font-medium text-brand hover:text-brand-dark">
                    Manage
                  </Link>
                }
              />
              <ul className="divide-y divide-line">
                {appointments.data.slice(0, 2).map((appt) => (
                  <li key={appt.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge tone={appt.status === 'Confirmed' ? 'teal' : appt.status === 'Completed' ? 'brand' : 'amber'}>
                        {appt.status}
                      </Badge>
                      <span className="text-[12px] font-medium text-slate">
                        {new Date(appt.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} • {appt.timeSlot}
                      </span>
                    </div>
                    <p className="text-[13.5px] font-semibold text-ink">
                      {user?.role === 'hospital' ? appt.patientName : `Dr. ${appt.doctorName}`}
                    </p>
                    <p className="text-[12px] text-muted">
                      {user?.role === 'hospital' ? `With Dr. ${appt.doctorName} (${appt.department})` : appt.hospitalName}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHead title="Red-flag rules" sub="Evaluated before any AI call" />
            <ul className="divide-y divide-line">
              {(rules.data?.rules ?? []).slice(0, 4).map((r) => (
                <li key={r.id} className="px-5 py-3.5">
                  <p className="text-[13px] font-medium text-ink">{r.rule}</p>
                  <p className={`mt-1 text-[12px] font-medium ${r.tone === 'rose' ? 'text-rose' : 'text-amber'}`}>
                    → {r.action}
                  </p>
                </li>
              ))}
            </ul>
            {rules.data?.rules?.length > 4 && (
              <p className="border-t border-line px-5 py-3 text-[12px] text-muted">
                {rules.data.rules.length - 4} more rules in the table.
              </p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
        {shortcuts.map((sc) => (
          <Link key={sc.to} to={sc.to} className="group bg-white px-5 py-5 transition-colors hover:bg-surface">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
              <Icon name={sc.icon} className="size-[18px]" />
            </span>
            <p className="mt-3.5 flex items-center gap-1.5 text-[14px] font-semibold text-ink">
              {sc.title}
              <Icon name="arrow" className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="mt-1 text-[13px] text-slate">{sc.body}</p>
          </Link>
        ))}
      </div>
    </>
  )
}

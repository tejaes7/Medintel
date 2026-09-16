import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { Card, CardHead, Badge, Button, PageHead, Empty } from '../components/ui'
import { api } from '../lib/api'
import { useApi } from '../lib/useApi'
import { useAuth } from '../lib/auth'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function HospitalDashboard() {
  const { user } = useAuth()
  const { data: profileData, loading: profileLoading, error: profileError, reload: reloadProfile } = useApi(
    () => api.hospitals.myProfile(),
    []
  )
  const { data: managedAppts, loading: apptsLoading, error: apptsError, reload: reloadAppts } = useApi(
    () => api.hospitals.managedAppointments(),
    []
  )

  const [apptFilter, setApptFilter] = useState('all')
  const [actionInProgress, setActionInProgress] = useState(null)

  const hospital = profileData?.hospital
  const doctors = profileData?.doctors ?? []
  const events = profileData?.events ?? []
  const appointments = managedAppts ?? []

  const pendingBookings = appointments.filter((a) => a.status === 'Booked')
  const confirmedBookings = appointments.filter((a) => a.status === 'Confirmed')
  const completedBookings = appointments.filter((a) => a.status === 'Completed')

  const filteredAppointments = appointments.filter((a) => {
    if (apptFilter === 'Booked') return a.status === 'Booked'
    if (apptFilter === 'Confirmed') return a.status === 'Confirmed'
    if (apptFilter === 'Completed') return a.status === 'Completed'
    return true
  })

  const handleStatusUpdate = async (id, status) => {
    setActionInProgress(id)
    try {
      await api.hospitals.updateAppointmentStatus(id, status)
      await reloadAppts()
    } catch (err) {
      alert(err.message || 'Failed to update appointment status')
    } finally {
      setActionInProgress(null)
    }
  }

  const stats = [
    {
      label: 'Incoming Bookings',
      value: String(pendingBookings.length),
      delta: pendingBookings.length > 0 ? `${pendingBookings.length} awaiting confirmation` : 'All caught up',
      tone: pendingBookings.length > 0 ? 'text-amber' : 'text-muted',
    },
    {
      label: 'Confirmed Visits',
      value: String(confirmedBookings.length),
      delta: `${confirmedBookings.length} scheduled visits`,
      tone: 'text-teal',
    },
    {
      label: 'Specialist Doctors',
      value: String(doctors.length),
      delta: doctors.length > 0 ? 'On active facility roster' : 'Add specialists to roster',
      tone: 'text-brand',
    },
    {
      label: 'Camps & Drives',
      value: String(events.length),
      delta: events.length > 0 ? 'Scheduled donation drives' : 'Post blood donation camps',
      tone: 'text-ink',
    },
  ]

  const shortcuts = [
    {
      to: '/app/appointments',
      icon: 'clock',
      title: 'Appointments Desk',
      body: 'Confirm or reschedule incoming patient visit requests.',
    },
    {
      to: '/app/doctors',
      icon: 'user',
      title: 'Specialist Doctors',
      body: 'Manage medical qualifications, consultation fees & schedules.',
    },
    {
      to: '/app/events',
      icon: 'pulse',
      title: 'Donation Drives & Camps',
      body: 'Host blood donation marathons and stem cell drives.',
    },
    {
      to: '/app/facility',
      icon: 'shield',
      title: 'Facility Profile & GPS',
      body: 'Configure emergency hotlines, departments & coordinates.',
    },
  ]

  const loading = profileLoading || apptsLoading
  const error = profileError || apptsError

  return (
    <>
      <PageHead
        eyebrow="Hospital Operations Console"
        title={`${greeting()}, ${hospital?.name || user?.name || 'Facility Administrator'}.`}
        sub={
          hospital
            ? `${hospital.type || 'Hospital'} • ${hospital.address ? `${hospital.address}, ` : ''}${hospital.city} • 24/7 Helpline: ${hospital.emergencyPhone || hospital.phone || 'Configured in profile'}`
            : 'Welcome to your facility management desk. Manage patient consultations, rostered doctors, and community health drives.'
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button as="link" to="/app/appointments">
            <Icon name="clock" className="size-4" /> Appointments Desk
          </Button>
          <Button as="link" to="/app/doctors" variant="secondary">
            <Icon name="plus" className="size-4" /> Add Doctor
          </Button>
        </div>
      </PageHead>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-lg bg-rose-soft p-4">
          <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
          <div className="text-[13px] leading-relaxed text-slate">
            <p className="font-medium text-ink">{error.message}</p>
            <button
              onClick={() => {
                reloadProfile()
                reloadAppts()
              }}
              className="mt-1 font-medium text-brand hover:text-brand-dark"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Top Facility KPI Cards */}
      <div className="grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="bg-white px-5 py-4">
            <p className="text-[12.5px] font-medium text-muted">{st.label}</p>
            <p className="mt-1.5 text-[26px] font-semibold tracking-[-0.03em] text-ink">
              {loading ? <span className="inline-block h-6 w-10 animate-pulse rounded bg-line align-middle" /> : st.value}
            </p>
            <p className={`mt-0.5 text-[12px] font-medium ${st.tone}`}>{st.delta}</p>
          </div>
        ))}
      </div>

      {/* Main Operations Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Left Column: Appointments Management Desk */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHead
              title="Patient Appointments Desk"
              sub="Incoming and confirmed consultations for your medical staff"
              action={
                <Link
                  to="/app/appointments"
                  className="text-[13px] font-medium text-brand hover:text-brand-dark"
                >
                  View full queue →
                </Link>
              }
            />

            {/* Filter Tabs */}
            <div className="flex border-b border-line px-5 pt-2 text-[12.5px]">
              <button
                onClick={() => setApptFilter('all')}
                className={`border-b-2 px-3 py-2 font-medium transition ${
                  apptFilter === 'all' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                All ({appointments.length})
              </button>
              <button
                onClick={() => setApptFilter('Booked')}
                className={`border-b-2 px-3 py-2 font-medium transition ${
                  apptFilter === 'Booked' ? 'border-amber text-amber' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                Pending ({pendingBookings.length})
              </button>
              <button
                onClick={() => setApptFilter('Confirmed')}
                className={`border-b-2 px-3 py-2 font-medium transition ${
                  apptFilter === 'Confirmed' ? 'border-teal text-teal' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                Confirmed ({confirmedBookings.length})
              </button>
              <button
                onClick={() => setApptFilter('Completed')}
                className={`border-b-2 px-3 py-2 font-medium transition ${
                  apptFilter === 'Completed' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                Completed ({completedBookings.length})
              </button>
            </div>

            {filteredAppointments.length > 0 ? (
              <ul className="divide-y divide-line">
                {filteredAppointments.slice(0, 6).map((appt) => (
                  <li key={appt.id} className="p-5 transition-colors hover:bg-surface/50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            tone={
                              appt.status === 'Confirmed'
                                ? 'teal'
                                : appt.status === 'Completed'
                                ? 'brand'
                                : appt.status === 'Cancelled'
                                ? 'slate'
                                : 'amber'
                            }
                          >
                            {appt.status}
                          </Badge>
                          <span className="text-[12px] text-muted">
                            Booking #{appt.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <h4 className="mt-1.5 text-[15px] font-semibold text-ink">{appt.patientName}</h4>
                        <p className="text-[12.5px] text-muted">{appt.patientEmail}</p>
                      </div>

                      <div className="text-right">
                        <span className="block text-[13px] font-semibold text-ink">
                          {new Date(appt.appointmentDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="block text-[12px] font-medium text-slate">
                          ⏰ {appt.timeSlot}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg bg-surface p-3 text-[12.5px] ring-1 ring-line">
                      <p className="font-semibold text-brand">
                        Assigned Specialist: Dr. {appt.doctorName}{' '}
                        <span className="font-normal text-muted">({appt.department})</span>
                      </p>
                      {appt.reason && (
                        <p className="mt-1 text-slate">
                          <span className="font-medium text-ink">Patient Reason:</span> "{appt.reason}"
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2 pt-2">
                      {appt.status === 'Booked' && (
                        <Button
                          size="sm"
                          disabled={actionInProgress === appt.id}
                          onClick={() => handleStatusUpdate(appt.id, 'Confirmed')}
                        >
                          <Icon name="check" className="size-3.5" /> Confirm Booking
                        </Button>
                      )}
                      {appt.status === 'Confirmed' && (
                        <Button
                          size="sm"
                          disabled={actionInProgress === appt.id}
                          onClick={() => handleStatusUpdate(appt.id, 'Completed')}
                        >
                          <Icon name="check" className="size-3.5" /> Mark Completed
                        </Button>
                      )}
                      {(appt.status === 'Booked' || appt.status === 'Confirmed') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionInProgress === appt.id}
                          className="text-rose hover:bg-rose-soft"
                          onClick={() => handleStatusUpdate(appt.id, 'Cancelled')}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                title={loading ? 'Loading appointment queue…' : 'No appointments in this category'}
                sub="Incoming patient appointment requests from the MedIntel directory will appear here in real-time."
                action={
                  <Button as="link" to="/app/facility" size="sm" variant="secondary">
                    Verify Hospital Profile
                  </Button>
                }
              />
            )}
          </Card>
        </div>

        {/* Right Column: Facility Quick Panels */}
        <div className="space-y-6">
          {/* Active Doctor Roster */}
          <Card>
            <CardHead
              title="Doctor Roster"
              sub={`${doctors.length} specialists listed`}
              action={
                <Link
                  to="/app/doctors"
                  className="text-[12.5px] font-medium text-brand hover:text-brand-dark"
                >
                  + Add Doctor
                </Link>
              }
            />
            {doctors.length > 0 ? (
              <ul className="divide-y divide-line">
                {doctors.slice(0, 4).map((doc) => (
                  <li key={doc.id} className="px-5 py-3.5 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13.5px] font-semibold text-ink">{doc.name}</p>
                      <p className="text-[12px] font-medium text-brand">{doc.qualification}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted">
                        {doc.department} • ₹{doc.fee} • {doc.experienceYears}y exp
                      </p>
                    </div>
                    <span className="rounded bg-teal-soft px-1.5 py-0.5 text-[11px] font-medium text-teal">
                      Available
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5 text-center text-[12.5px] text-muted">
                <p>No doctors added to this hospital yet.</p>
                <Button as="link" to="/app/doctors" size="sm" className="mt-3">
                  + Add First Doctor
                </Button>
              </div>
            )}
          </Card>

          {/* Emergency & Helpline Info */}
          <Card>
            <CardHead
              title="Helpline & Contact"
              sub="Publicly displayed for emergency triage"
              action={
                <Link
                  to="/app/facility"
                  className="text-[12.5px] font-medium text-brand hover:text-brand-dark"
                >
                  Edit
                </Link>
              }
            />
            <div className="space-y-3 p-5">
              <div className="rounded-lg bg-rose-soft p-3 ring-1 ring-rose/20">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-rose">
                  24/7 Emergency Line
                </span>
                <p className="mt-0.5 text-[15px] font-bold text-rose">
                  {hospital?.emergencyPhone || 'Not set (e.g. 1066)'}
                </p>
              </div>

              <div className="rounded-lg bg-surface p-3 ring-1 ring-line">
                <span className="text-[11px] font-medium text-muted">Hospital Reception Phone</span>
                <p className="mt-0.5 text-[13px] font-medium text-ink">
                  {hospital?.phone || 'Not set'}
                </p>
              </div>

              <div>
                <span className="text-[11.5px] font-medium text-muted">Active Departments</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(hospital?.departments || ['General Medicine']).map((dept) => (
                    <span
                      key={dept}
                      className="rounded-md bg-surface px-2 py-0.5 text-[11.5px] font-medium text-slate ring-1 ring-line"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Upcoming Community Drives */}
          <Card>
            <CardHead
              title="Donation Camps & Drives"
              sub={`${events.length} campaigns scheduled`}
              action={
                <Link
                  to="/app/events"
                  className="text-[12.5px] font-medium text-brand hover:text-brand-dark"
                >
                  + Post Drive
                </Link>
              }
            />
            {events.length > 0 ? (
              <ul className="divide-y divide-line">
                {events.slice(0, 3).map((evt) => (
                  <li key={evt.id} className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge
                        tone={
                          evt.type === 'Blood Donation'
                            ? 'rose'
                            : evt.type === 'Stem Cell Drive'
                            ? 'teal'
                            : 'brand'
                        }
                      >
                        {evt.type}
                      </Badge>
                      <span className="text-[11.5px] text-muted">
                        {new Date(evt.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-ink">{evt.title}</p>
                    <p className="text-[11.5px] text-slate">📍 {evt.location}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5 text-center text-[12.5px] text-muted">
                <p>No community drives currently scheduled.</p>
                <Button as="link" to="/app/events" size="sm" variant="secondary" className="mt-3">
                  + Create Donation Event
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Operational Shortcuts */}
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

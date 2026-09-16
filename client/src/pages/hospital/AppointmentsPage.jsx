import { useState } from 'react'
import Icon from '../../components/Icon'
import { Card, Badge, Button, PageHead, Empty } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'

export default function AppointmentsPage() {
  const { data: appointments, loading, reload } = useApi(() => api.hospitals.managedAppointments(), [])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const list = appointments ?? []

  const pending = list.filter((a) => a.status === 'Booked')
  const confirmed = list.filter((a) => a.status === 'Confirmed')
  const completed = list.filter((a) => a.status === 'Completed')
  const cancelled = list.filter((a) => a.status === 'Cancelled')

  const filtered = list.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchName = a.patientName?.toLowerCase().includes(q)
      const matchEmail = a.patientEmail?.toLowerCase().includes(q)
      const matchDoc = a.doctorName?.toLowerCase().includes(q)
      const matchDept = a.department?.toLowerCase().includes(q)
      const matchReason = a.reason?.toLowerCase().includes(q)
      return matchName || matchEmail || matchDoc || matchDept || matchReason
    }
    return true
  })

  const handleStatus = async (id, newStatus) => {
    setUpdatingId(id)
    try {
      await api.hospitals.updateAppointmentStatus(id, newStatus)
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to update appointment status')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Hospital Operations"
        title="Patient Appointments Desk"
        sub="Review incoming booking requests from patients, confirm consultation slots, and track visit status."
      >
        <Button onClick={reload} variant="secondary" size="sm">
          <Icon name="pulse" className="size-4" /> Refresh Queue
        </Button>
      </PageHead>

      {/* Summary KPI Bar */}
      <div className="grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line grid-cols-2 sm:grid-cols-4">
        <div className="bg-white px-5 py-4">
          <p className="text-[12px] font-medium text-muted">Total Consultations</p>
          <p className="mt-1 text-[24px] font-semibold text-ink">{list.length}</p>
          <p className="text-[11.5px] text-muted">All-time bookings</p>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[12px] font-medium text-amber">Pending Confirmation</p>
          <p className="mt-1 text-[24px] font-semibold text-amber">{pending.length}</p>
          <p className="text-[11.5px] text-amber">Awaiting review</p>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[12px] font-medium text-teal">Confirmed Visits</p>
          <p className="mt-1 text-[24px] font-semibold text-teal">{confirmed.length}</p>
          <p className="text-[11.5px] text-teal">Upcoming consultations</p>
        </div>
        <div className="bg-white px-5 py-4">
          <p className="text-[12px] font-medium text-brand">Completed Visits</p>
          <p className="mt-1 text-[24px] font-semibold text-brand">{completed.length}</p>
          <p className="text-[11.5px] text-brand">Successfully seen</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2 sm:border-0 sm:pb-0">
          {[
            ['all', `All (${list.length})`],
            ['Booked', `Pending (${pending.length})`],
            ['Confirmed', `Confirmed (${confirmed.length})`],
            ['Completed', `Completed (${completed.length})`],
            ['Cancelled', `Cancelled (${cancelled.length})`],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                filter === val
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-white text-slate ring-1 ring-line hover:bg-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, doctor, reason..."
            className="h-9 w-full rounded-lg bg-white pl-9 pr-3 text-[13px] text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      {/* Appointment Queue Cards */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Empty
            title={loading ? 'Loading appointment queue…' : 'No appointments matching filter'}
            sub={
              search
                ? `No consultations match "${search}". Try clearing your search.`
                : 'Incoming patient bookings will appear here in real-time as patients book via MedIntel.'
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((appt) => (
            <Card key={appt.id} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
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
                      <span className="text-[11.5px] text-muted">
                        #{appt.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="mt-2 text-[16px] font-bold text-ink">{appt.patientName}</h3>
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

                <div className="mt-3.5 rounded-lg bg-surface p-3 text-[12.5px] ring-1 ring-line">
                  <p className="font-semibold text-brand">
                    Dr. {appt.doctorName}{' '}
                    <span className="font-normal text-muted">({appt.department})</span>
                  </p>
                  {appt.reason && (
                    <p className="mt-1 text-slate">
                      <strong className="font-medium text-ink">Reason:</strong> "{appt.reason}"
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-line/60 pt-3">
                {appt.status === 'Booked' && (
                  <Button
                    size="sm"
                    disabled={updatingId === appt.id}
                    onClick={() => handleStatus(appt.id, 'Confirmed')}
                  >
                    <Icon name="check" className="size-3.5" /> Confirm Booking
                  </Button>
                )}
                {appt.status === 'Confirmed' && (
                  <Button
                    size="sm"
                    disabled={updatingId === appt.id}
                    onClick={() => handleStatus(appt.id, 'Completed')}
                  >
                    <Icon name="check" className="size-3.5" /> Mark Completed
                  </Button>
                )}
                {(appt.status === 'Booked' || appt.status === 'Confirmed') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={updatingId === appt.id}
                    className="text-rose hover:bg-rose-soft"
                    onClick={() => handleStatus(appt.id, 'Cancelled')}
                  >
                    Cancel Appointment
                  </Button>
                )}
                {(appt.status === 'Completed' || appt.status === 'Cancelled') && (
                  <span className="text-[12px] text-muted italic">No further actions needed</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

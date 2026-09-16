import { useState } from 'react'
import Icon from '../../components/Icon'
import { Card, Badge, Button } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'

export default function MyAppointments() {
  const { data: appointments, loading, error, reload } = useApi(() => api.hospitals.myAppointments(), [])
  const [cancellingId, setCancellingId] = useState(null)

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return
    setCancellingId(id)
    try {
      await api.hospitals.cancelAppointment(id)
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment')
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-[13px] text-muted">Loading your appointments...</div>
  }

  if (error) {
    return (
      <Card className="p-12 text-center">
        <Icon name="alert" className="mx-auto size-8 text-rose" />
        <h3 className="mt-2 text-[15px] font-semibold text-ink">Failed to load appointments</h3>
        <p className="mt-1 text-[13px] text-muted">{error.message}</p>
        <Button variant="secondary" size="sm" onClick={reload} className="mt-4">
          Try again
        </Button>
      </Card>
    )
  }

  const items = appointments ?? []

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card className="p-12 text-center">
          <Icon name="clock" className="mx-auto size-8 text-muted" />
          <h3 className="mt-2 text-[15px] font-semibold text-ink">No appointments booked yet</h3>
          <p className="mt-1 text-[13px] text-muted">
            Search for nearby hospitals or clinics and book an appointment directly with a specialist.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((appt) => {
            const dateStr = new Date(appt.appointmentDate).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
            const tone =
              appt.status === 'Confirmed'
                ? 'teal'
                : appt.status === 'Completed'
                ? 'brand'
                : appt.status === 'Cancelled'
                ? 'rose'
                : 'amber'

            return (
              <Card key={appt.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge tone={tone}>{appt.status}</Badge>
                    <h4 className="mt-2 text-[16px] font-semibold text-ink">{appt.doctorName}</h4>
                    <p className="text-[12.5px] font-medium text-brand">{appt.qualification}</p>
                    <p className="text-[12px] text-muted">{appt.department}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[13px] font-semibold text-ink">📅 {dateStr}</span>
                    <span className="block text-[12px] font-medium text-slate">⏰ {appt.timeSlot}</span>
                    <span className="mt-1 block text-[12px] font-medium text-teal">₹{appt.fee}</span>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-surface p-3 ring-1 ring-line text-[12.5px]">
                  <p className="font-medium text-ink">🏥 {appt.hospitalName}</p>
                  <p className="text-muted">{appt.hospitalAddress}, {appt.hospitalCity}</p>
                  {appt.reason && <p className="mt-1.5 text-slate border-t border-line/60 pt-1.5">Note: "{appt.reason}"</p>}
                </div>

                {(appt.status === 'Booked' || appt.status === 'Confirmed') && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={cancellingId === appt.id}
                      onClick={() => handleCancel(appt.id)}
                      className="text-rose hover:bg-rose-soft"
                    >
                      {cancellingId === appt.id ? 'Cancelling...' : 'Cancel Appointment'}
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

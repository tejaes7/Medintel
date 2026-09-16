import { useState } from 'react'
import Icon from '../../components/Icon'
import { Button, Badge } from '../../components/ui'
import { api } from '../../lib/api'

const TIME_SLOTS = [
  '09:00 AM',
  '09:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '02:00 PM',
  '02:30 PM',
  '03:00 PM',
  '03:30 PM',
  '04:00 PM',
]

const DAY_MAP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function BookingForm({ hospital, doctor, onClose, onSuccess }) {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const [date, setDate] = useState(tomorrow)
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[2])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [year, month, day] = (date || '').split('-').map(Number)
  const selectedDateObj = year && month && day ? new Date(year, month - 1, day) : new Date(NaN)
  const selectedDayName = isNaN(selectedDateObj.getTime()) ? '' : DAY_MAP[selectedDateObj.getDay()]
  const isAvailableDay = doctor.availableDays?.length
    ? doctor.availableDays.includes(selectedDayName)
    : true

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAvailableDay) {
      setError(`Dr. ${doctor.name} is not available on ${selectedDayName}s.`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      await api.hospitals.bookAppointment({
        doctorId: doctor.id,
        appointmentDate: date,
        timeSlot,
        reason,
      })
      onSuccess?.()
    } catch (err) {
      setError(err.message || 'Failed to book appointment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-line animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between border-b border-line pb-4">
          <div>
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brand">Direct Booking</span>
            <h3 className="text-lg font-semibold text-ink">Book Appointment</h3>
            <p className="mt-0.5 text-[12.5px] text-muted">{hospital.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <div className="my-4 rounded-xl bg-surface p-4 ring-1 ring-line">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[14px] font-semibold text-ink">{doctor.name}</p>
              <p className="text-[12px] font-medium text-brand">{doctor.qualification}</p>
              <p className="text-[11.5px] text-muted">{doctor.department} • {doctor.experienceYears} yrs experience</p>
            </div>
            <Badge tone="teal">₹{doctor.fee} fee</Badge>
          </div>
          <div className="mt-2.5 flex items-center gap-2 border-t border-line/60 pt-2 text-[11.5px] text-slate">
            <Icon name="clock" className="size-3.5 text-muted" />
            <span>Available: {doctor.availableDays?.join(', ')} ({doctor.availableTime?.start} - {doctor.availableTime?.end})</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-rose-soft p-3 text-[12.5px] text-slate ring-1 ring-rose/20">
            <Icon name="alert" className="mt-0.5 size-4 shrink-0 text-rose" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.05em] text-muted mb-1">
              Select Appointment Date
            </label>
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setError(null)
              }}
              required
              className="w-full rounded-lg bg-surface px-3.5 py-2 text-[13.5px] text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
            />
            {!isAvailableDay && selectedDayName && (
              <p className="mt-1 text-[11.5px] text-rose">
                ⚠️ Dr. {doctor.name} does not take appointments on {selectedDayName}s.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.05em] text-muted mb-1.5">
              Available Time Slot
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => setTimeSlot(slot)}
                  className={`rounded-lg py-2 text-[12.5px] font-medium transition ring-1 ${
                    timeSlot === slot
                      ? 'bg-brand text-white ring-brand shadow-sm'
                      : 'bg-surface text-slate ring-line hover:text-ink hover:ring-[#cfd8e3]'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-medium uppercase tracking-[0.05em] text-muted mb-1">
              Reason / Symptoms (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Regular cardiac follow-up, persistent cough, etc."
              className="w-full rounded-lg bg-surface px-3.5 py-2 text-[13.5px] text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !isAvailableDay}>
              {loading ? 'Confirming...' : 'Confirm Appointment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

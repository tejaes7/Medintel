import { useState } from 'react'
import Icon from '../../components/Icon'
import { Card, Badge, Button } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'
import BookingForm from './BookingForm'

export default function HospitalDetail({ hospitalId, onBack, onBookedSuccess }) {
  const { data, loading, error } = useApi(() => api.hospitals.getDetails(hospitalId), [hospitalId])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [activeTab, setActiveTab] = useState('doctors')

  if (loading) {
    return (
      <div className="py-12 text-center text-[13px] text-muted">
        Loading hospital details...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center">
        <p className="text-[13px] text-rose">Failed to load hospital details.</p>
        <Button variant="secondary" size="sm" onClick={onBack} className="mt-3">
          ← Back to Directory
        </Button>
      </div>
    )
  }

  const { hospital, doctors, events } = data

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-[13px] font-medium text-slate hover:text-ink"
      >
        <Icon name="chevron-left" className="size-4" /> Back to Hospitals Directory
      </button>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-soft via-white to-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge tone="teal">{hospital.type}</Badge>
                <span className="flex items-center gap-1 text-[12.5px] font-semibold text-amber">
                  ★ {hospital.rating}
                </span>
              </div>
              <h2 className="mt-2 text-2xl font-bold text-ink">{hospital.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-[13px] text-slate">
                <Icon name="location" className="size-4 text-muted shrink-0" />
                {hospital.address}, {hospital.city}
              </p>
              {hospital.phone && (
                <p className="mt-0.5 text-[12.5px] text-muted">Phone: {hospital.phone}</p>
              )}
            </div>

            {hospital.emergencyPhone && (
              <div className="rounded-xl border border-rose/30 bg-rose-soft p-3.5 text-right">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-rose">
                  🚨 Emergency Helpline
                </span>
                <span className="text-lg font-bold text-rose">{hospital.emergencyPhone}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5 pt-2 border-t border-line/60">
            <span className="text-[12px] font-medium text-muted mr-1">Departments:</span>
            {hospital.departments.map((d) => (
              <span key={d} className="rounded-md bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-slate ring-1 ring-line">
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className="flex border-b border-line px-6 pt-2">
          <button
            onClick={() => setActiveTab('doctors')}
            className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
              activeTab === 'doctors'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
              activeTab === 'events'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Upcoming Events ({events.length})
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'doctors' && (
            <div>
              {doctors.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted">No doctors listed for this hospital yet.</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {doctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 transition hover:border-[#cfd8e3]"
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-[15px] font-semibold text-ink">{doc.name}</h4>
                            <p className="text-[12.5px] font-medium text-brand">{doc.qualification}</p>
                          </div>
                          <Badge tone="teal">₹{doc.fee}</Badge>
                        </div>
                        <p className="mt-1 text-[12px] font-medium text-slate">
                          {doc.department} • {doc.experienceYears} Years Experience
                        </p>
                        <div className="mt-3 space-y-1 border-t border-line/60 pt-2 text-[12px] text-muted">
                          <p>📅 Days: {doc.availableDays?.join(', ')}</p>
                          <p>⏰ Hours: {doc.availableTime?.start} - {doc.availableTime?.end}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="mt-4 w-full"
                        onClick={() => setSelectedDoctor(doc)}
                      >
                        Book Appointment
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div>
              {events.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-muted">No upcoming events or drives scheduled.</p>
              ) : (
                <div className="space-y-4">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded-xl border border-line bg-white p-4 transition hover:shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <Badge tone={evt.type === 'Blood Donation' ? 'rose' : evt.type === 'Stem Cell Drive' ? 'teal' : 'brand'}>
                            {evt.type}
                          </Badge>
                          <h4 className="mt-1.5 text-[15px] font-semibold text-ink">{evt.title}</h4>
                        </div>
                        <span className="text-[12.5px] font-semibold text-brand">
                          🗓️ {new Date(evt.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-slate">{evt.description}</p>
                      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-muted border-t border-line/50 pt-2">
                        <span>⏰ Time: {evt.time}</span>
                        <span>📍 Location: {evt.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {selectedDoctor && (
        <BookingForm
          hospital={hospital}
          doctor={selectedDoctor}
          onClose={() => setSelectedDoctor(null)}
          onSuccess={() => {
            setSelectedDoctor(null)
            onBookedSuccess?.()
          }}
        />
      )}
    </div>
  )
}

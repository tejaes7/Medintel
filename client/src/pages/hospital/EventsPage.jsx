import { useState } from 'react'
import { Card, CardHead, Badge, Button, PageHead, Empty } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'

export default function EventsPage() {
  const { data, loading, reload } = useApi(() => api.hospitals.myProfile(), [])

  const [evtTitle, setEvtTitle] = useState('')
  const [evtType, setEvtType] = useState('Blood Donation')
  const [evtDate, setEvtDate] = useState('')
  const [evtTime, setEvtTime] = useState('09:00 AM - 04:00 PM')
  const [evtLocation, setEvtLocation] = useState('')
  const [evtDesc, setEvtDesc] = useState('')
  const [postingEvt, setPostingEvt] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const events = data?.events ?? []
  const hospital = data?.hospital

  const handlePostEvent = async (e) => {
    e.preventDefault()
    setPostingEvt(true)
    try {
      await api.hospitals.addEvent({
        title: evtTitle,
        type: evtType,
        date: evtDate,
        time: evtTime,
        location: evtLocation,
        description: evtDesc,
      })
      setEvtTitle('')
      setEvtLocation('')
      setEvtDesc('')
      setEvtDate('')
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to post event')
    } finally {
      setPostingEvt(false)
    }
  }

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this community donation event?')) return
    setDeletingId(id)
    try {
      await api.hospitals.deleteEvent(id)
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to delete event')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Community Outreach"
        title="Donation Camps, Blood Drives & Marathons"
        sub={`Publish public health initiatives, voluntary blood donor camps, and stem cell registries hosted by ${hospital?.name || 'your hospital'}.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr] lg:items-start">
        {/* Left: Create Event Form */}
        <Card className="p-6">
          <CardHead
            title="Publish New Drive or Camp"
            sub="Create public donation drive or health marathon"
          />

          <form onSubmit={handlePostEvent} className="mt-5 space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate">Campaign Title</label>
              <input
                required
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                placeholder="e.g. Annual Blood Donation Camp 2026"
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate">Event Category</label>
              <select
                value={evtType}
                onChange={(e) => setEvtType(e.target.value)}
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="Blood Donation">🩸 Blood Donation Marathon</option>
                <option value="Stem Cell Drive">🧬 Stem Cell Donor Registry</option>
                <option value="Marathon">🏃 Health & Wellness Marathon</option>
                <option value="Other">🏥 Community Health Camp / Checkup</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate">Event Date</label>
                <input
                  type="date"
                  required
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate">Operating Hours</label>
                <input
                  value={evtTime}
                  onChange={(e) => setEvtTime(e.target.value)}
                  placeholder="09:00 AM - 04:00 PM"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate">Venue / Location</label>
              <input
                required
                value={evtLocation}
                onChange={(e) => setEvtLocation(e.target.value)}
                placeholder="e.g. Hospital Main Auditorium / Campus Grounds"
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate">Instructions for Donors</label>
              <textarea
                rows={3}
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                placeholder="e.g. Bring government ID, eat a light breakfast, open to all healthy donors aged 18-60..."
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <Button type="submit" disabled={postingEvt} className="w-full">
              {postingEvt ? 'Publishing Campaign...' : 'Publish Event to Public Directory'}
            </Button>
          </form>
        </Card>

        {/* Right: Active Campaigns */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink">Active Community Campaigns</h3>
            <span className="text-[12px] font-medium text-muted">{events.length} Campaigns</span>
          </div>

          {events.length === 0 ? (
            <Card className="p-12 text-center">
              <Empty
                title={loading ? 'Loading scheduled events…' : 'No community drives currently posted'}
                sub="Publish a blood donation camp or wellness marathon to engage donors in your community."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {events.map((evt) => (
                <Card key={evt.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
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
                        <span className="text-[12px] font-semibold text-slate">
                          🗓️ {new Date(evt.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h4 className="mt-2 text-[16px] font-bold text-ink">{evt.title}</h4>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={deletingId === evt.id}
                      className="text-rose hover:bg-rose-soft"
                      onClick={() => handleDeleteEvent(evt.id)}
                    >
                      Delete
                    </Button>
                  </div>

                  {evt.description && (
                    <p className="mt-2.5 text-[13px] leading-relaxed text-slate">
                      {evt.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-4 border-t border-line/60 pt-3 text-[12px] text-muted">
                    <span className="flex items-center gap-1 font-medium text-ink">
                      ⏰ {evt.time}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-ink">
                      📍 {evt.location}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Card, CardHead, Badge, Button, PageHead, Empty } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'

const DEPARTMENTS = [
  'All',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Nephrology',
  'Dermatology',
  'Neurology',
  'Oncology',
  'General Medicine',
]

export default function DoctorsPage() {
  const { data, loading, reload } = useApi(() => api.hospitals.myProfile(), [])

  const [deptFilter, setDeptFilter] = useState('All')
  const [docName, setDocName] = useState('')
  const [docQual, setDocQual] = useState('')
  const [docDept, setDocDept] = useState('Cardiology')
  const [docFee, setDocFee] = useState('750')
  const [docExp, setDocExp] = useState('8')
  const [addingDoc, setAddingDoc] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const doctors = data?.doctors ?? []
  const hospital = data?.hospital

  const filteredDoctors = doctors.filter((d) => {
    if (deptFilter !== 'All' && d.department !== deptFilter) return false
    return true
  })

  const handleAddDoctor = async (e) => {
    e.preventDefault()
    setAddingDoc(true)
    try {
      await api.hospitals.addDoctor({
        name: docName,
        qualification: docQual,
        department: docDept,
        fee: Number(docFee) || 500,
        experienceYears: Number(docExp) || 1,
        availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        availableTime: { start: '09:00', end: '17:00' },
      })
      setDocName('')
      setDocQual('')
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to add doctor')
    } finally {
      setAddingDoc(false)
    }
  }

  const handleDeleteDoctor = async (id) => {
    if (!window.confirm('Remove this doctor from your active hospital roster?')) return
    setDeletingId(id)
    try {
      await api.hospitals.deleteDoctor(id)
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to remove doctor')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Staff Management"
        title="Specialist Doctors & Medical Staff"
        sub={`Manage the active consulting doctors for ${hospital?.name || 'your facility'}. Configured specialists appear in the public booking directory.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr] lg:items-start">
        {/* Left: Add Doctor Form */}
        <Card className="p-6">
          <CardHead
            title="Add Specialist Doctor"
            sub="Register a doctor to receive patient bookings"
          />

          <form onSubmit={handleAddDoctor} className="mt-5 space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate">Doctor Full Name</label>
              <input
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Dr. Ananya Rao"
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate">Medical Qualification</label>
              <input
                required
                value={docQual}
                onChange={(e) => setDocQual(e.target.value)}
                placeholder="e.g. MD, DM Cardiology (AIIMS)"
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate">Clinical Department</label>
              <select
                value={docDept}
                onChange={(e) => setDocDept(e.target.value)}
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              >
                {DEPARTMENTS.filter((d) => d !== 'All').map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-slate">Consultation Fee (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={docFee}
                  onChange={(e) => setDocFee(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate">Experience (Years)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={docExp}
                  onChange={(e) => setDocExp(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="rounded-lg bg-surface p-3 text-[12px] text-muted ring-1 ring-line">
              <span className="font-semibold text-ink">Schedule:</span> Monday – Friday (09:00 AM – 05:00 PM)
            </div>

            <Button type="submit" disabled={addingDoc} className="w-full">
              {addingDoc ? 'Adding Specialist...' : '+ Add Doctor to Active Roster'}
            </Button>
          </form>
        </Card>

        {/* Right: Active Specialists List */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(dept)}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
                    deptFilter === dept
                      ? 'bg-ink text-white'
                      : 'bg-white text-slate ring-1 ring-line hover:bg-surface'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <span className="text-[12px] font-medium text-muted">
              {filteredDoctors.length} {filteredDoctors.length === 1 ? 'Specialist' : 'Specialists'}
            </span>
          </div>

          {filteredDoctors.length === 0 ? (
            <Card className="p-12 text-center">
              <Empty
                title={loading ? 'Loading specialist roster…' : 'No doctors in this department'}
                sub="Add a specialist doctor using the form on the left to activate booking slots for this department."
              />
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredDoctors.map((doc) => (
                <Card key={doc.id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-[15px] font-bold text-ink truncate">{doc.name}</h4>
                        <p className="text-[12px] font-semibold text-brand truncate">{doc.qualification}</p>
                      </div>
                      <Badge tone="teal" className="shrink-0">
                        {doc.department}
                      </Badge>
                    </div>

                    <div className="mt-3.5 space-y-1 rounded-lg bg-surface p-2.5 text-[12px] text-slate ring-1 ring-line">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Consultation Fee:</span>
                        <span className="font-semibold text-ink">₹{doc.fee}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Clinical Experience:</span>
                        <span className="font-semibold text-ink">{doc.experienceYears} Years</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3">
                    <span className="text-[11.5px] font-medium text-teal flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-teal" /> Active
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={deletingId === doc.id}
                      className="text-rose hover:bg-rose-soft"
                      onClick={() => handleDeleteDoctor(doc.id)}
                    >
                      Remove
                    </Button>
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

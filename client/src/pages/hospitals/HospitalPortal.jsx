import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon'
import { Card, CardHead, Badge, Button } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'

const VALID_TABS = ['appointments', 'doctors', 'events', 'profile']

export default function HospitalPortal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')

  const { data, loading, reload } = useApi(() => api.hospitals.myProfile(), [])
  const { data: managedAppts, reload: reloadAppts } = useApi(() => api.hospitals.managedAppointments(), [])

  const [activeTab, setActiveTab] = useState(
    VALID_TABS.includes(tabFromUrl) ? tabFromUrl : 'appointments'
  )

  useEffect(() => {
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

  const setTab = (newTab) => {
    setActiveTab(newTab)
    setSearchParams({ tab: newTab })
  }

  // New doctor state
  const [docName, setDocName] = useState('')
  const [docQual, setDocQual] = useState('')
  const [docDept, setDocDept] = useState('Cardiology')
  const [docFee, setDocFee] = useState('750')
  const [docExp, setDocExp] = useState('8')
  const [addingDoc, setAddingDoc] = useState(false)

  // New event state
  const [evtTitle, setEvtTitle] = useState('')
  const [evtType, setEvtType] = useState('Blood Donation')
  const [evtDate, setEvtDate] = useState('')
  const [evtTime, setEvtTime] = useState('09:00 AM')
  const [evtLocation, setEvtLocation] = useState('')
  const [evtDesc, setEvtDesc] = useState('')
  const [postingEvt, setPostingEvt] = useState(false)

  // Profile edit state
  const [hospName, setHospName] = useState('')
  const [hospType, setHospType] = useState('Hospital')
  const [hospAddress, setHospAddress] = useState('')
  const [hospCity, setHospCity] = useState('Bangalore')
  const [phone, setPhone] = useState('')
  const [emergPhone, setEmergPhone] = useState('')
  const [deptInput, setDeptInput] = useState('')
  const [lat, setLat] = useState('12.9716')
  const [lng, setLng] = useState('77.5946')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [initDone, setInitDone] = useState(false)

  const hospital = data?.hospital
  const doctors = data?.doctors ?? []
  const events = data?.events ?? []
  const appointments = managedAppts ?? []

  useEffect(() => {
    if (hospital && !initDone) {
      setHospName(hospital.name || '')
      setHospType(hospital.type || 'Hospital')
      setHospAddress(hospital.address || '')
      setHospCity(hospital.city || 'Bangalore')
      setPhone(hospital.phone || '')
      setEmergPhone(hospital.emergencyPhone || '')
      setDeptInput((hospital.departments || []).join(', '))
      if (hospital.location?.coordinates) {
        setLng(String(hospital.location.coordinates[0]))
        setLat(String(hospital.location.coordinates[1]))
      }
      setInitDone(true)
    }
  }, [hospital, initDone])

  if (loading) return <div className="py-12 text-center text-[13px] text-muted">Loading Hospital Portal...</div>

  const handleAddDoctor = async (e) => {
    e.preventDefault()
    setAddingDoc(true)
    try {
      await api.hospitals.addDoctor({
        name: docName,
        qualification: docQual,
        department: docDept,
        fee: Number(docFee),
        experienceYears: Number(docExp),
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
    if (!window.confirm('Remove this doctor?')) return
    try {
      await api.hospitals.deleteDoctor(id)
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to delete doctor')
    }
  }

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
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to post event')
    } finally {
      setPostingEvt(false)
    }
  }

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return
    try {
      await api.hospitals.deleteEvent(id)
      await reload()
    } catch (err) {
      alert(err.message || 'Failed to delete event')
    }
  }

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.hospitals.updateAppointmentStatus(id, status)
      await reloadAppts()
    } catch (err) {
      alert(err.message || 'Failed to update appointment status')
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileSuccess(false)
    try {
      const depts = deptInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
      await api.hospitals.updateMyProfile({
        name: hospName,
        type: hospType,
        address: hospAddress,
        city: hospCity,
        phone,
        emergencyPhone: emergPhone,
        departments: depts.length > 0 ? depts : ['General Medicine'],
        location: {
          type: 'Point',
          coordinates: [Number(lng) || 77.5946, Number(lat) || 12.9716],
        },
      })
      await reload()
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 4000)
    } catch (err) {
      alert(err.message || 'Failed to update hospital profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(4)))
        setLng(String(pos.coords.longitude.toFixed(4)))
      },
      (_err) => {
        alert('Could not retrieve current location')
      }
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-r from-brand-soft via-white to-surface">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="brand">Hospital Actor</Badge>
              {hospital && <Badge tone="teal">{hospital.type}</Badge>}
            </div>
            <h2 className="mt-1.5 text-2xl font-bold text-ink">
              {hospital?.name || 'Hospital Administration Portal'}
            </h2>
            <p className="text-[13px] text-slate flex items-center gap-2 mt-1">
              <Icon name="location" className="size-4 text-muted" />
              {hospital ? `${hospital.address}, ${hospital.city}` : 'Setup hospital details & staff'}
            </p>
            {hospital?.phone && (
              <p className="text-[12px] text-muted mt-0.5">
                Phone: {hospital.phone} {hospital.emergencyPhone ? `• Emergency: ${hospital.emergencyPhone}` : ''}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[12px] font-medium text-muted">Active Staff: {doctors.length} Doctors</p>
            <p className="text-[12px] font-medium text-muted">Upcoming Drives: {events.length} Events</p>
          </div>
        </div>
      </Card>

      <div className="flex border-b border-line flex-wrap">
        <button
          onClick={() => setTab('appointments')}
          className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
            activeTab === 'appointments' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Patient Appointments ({appointments.length})
        </button>
        <button
          onClick={() => setTab('doctors')}
          className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
            activeTab === 'doctors' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Manage Doctors ({doctors.length})
        </button>
        <button
          onClick={() => setTab('events')}
          className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
            activeTab === 'events' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Post Donation Events & Marathons ({events.length})
        </button>
        <button
          onClick={() => setTab('profile')}
          className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
            activeTab === 'profile' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          Hospital Profile & Facilities
        </button>
      </div>

      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <Card className="p-8 text-center text-[13px] text-muted">
              No patient appointment requests currently booked.
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {appointments.map((appt) => (
                <Card key={appt.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge tone={appt.status === 'Confirmed' ? 'teal' : appt.status === 'Completed' ? 'brand' : 'amber'}>
                        {appt.status}
                      </Badge>
                      <h4 className="mt-2 text-[15px] font-semibold text-ink">{appt.patientName}</h4>
                      <p className="text-[12px] text-muted">{appt.patientEmail}</p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[12.5px] font-semibold text-ink">
                        {new Date(appt.appointmentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="block text-[12px] text-slate">{appt.timeSlot}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-surface p-3 text-[12.5px] ring-1 ring-line">
                    <p className="font-medium text-brand">Dr. {appt.doctorName} ({appt.department})</p>
                    {appt.reason && <p className="mt-1 text-slate">Reason: "{appt.reason}"</p>}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 justify-end border-t border-line/60 pt-3">
                    {appt.status === 'Booked' && (
                      <Button size="sm" onClick={() => handleStatusUpdate(appt.id, 'Confirmed')}>
                        Confirm Booking
                      </Button>
                    )}
                    {appt.status === 'Confirmed' && (
                      <Button size="sm" onClick={() => handleStatusUpdate(appt.id, 'Completed')}>
                        Mark Completed
                      </Button>
                    )}
                    {(appt.status === 'Booked' || appt.status === 'Confirmed') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="text-rose hover:bg-rose-soft"
                        onClick={() => handleStatusUpdate(appt.id, 'Cancelled')}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'doctors' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <Card className="p-5 h-fit">
            <CardHead title="Add Specialist Doctor" sub="Specify qualification & department" />
            <form onSubmit={handleAddDoctor} className="mt-4 space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-slate">Doctor Name</label>
                <input
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Dr. Ananya Rao"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate">Qualification</label>
                <input
                  required
                  value={docQual}
                  onChange={(e) => setDocQual(e.target.value)}
                  placeholder="e.g. MD, DM Cardiology (AIIMS)"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate">Department</label>
                <select
                  value={docDept}
                  onChange={(e) => setDocDept(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                >
                  {['Cardiology', 'Orthopedics', 'Pediatrics', 'Nephrology', 'Dermatology', 'Neurology', 'Oncology', 'General Medicine'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[12px] font-medium text-slate">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate">Experience (Yrs)</label>
                  <input
                    type="number"
                    value={docExp}
                    onChange={(e) => setDocExp(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none"
                  />
                </div>
              </div>

              <Button type="submit" disabled={addingDoc} className="w-full mt-2">
                {addingDoc ? 'Adding...' : 'Add Doctor to Roster'}
              </Button>
            </form>
          </Card>

          <div className="space-y-3">
            {doctors.length === 0 ? (
              <Card className="p-8 text-center text-[13px] text-muted">No doctors currently added.</Card>
            ) : (
              doctors.map((doc) => (
                <Card key={doc.id} className="p-4 flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-[15px] font-semibold text-ink">{doc.name}</h4>
                    <p className="text-[12.5px] font-medium text-brand">{doc.qualification}</p>
                    <p className="text-[12px] text-slate">{doc.department} • ₹{doc.fee} • {doc.experienceYears} yrs exp</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-rose hover:bg-rose-soft"
                    onClick={() => handleDeleteDoctor(doc.id)}
                  >
                    Remove
                  </Button>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <Card className="p-5 h-fit">
            <CardHead title="Post Donation Drive or Marathon" sub="Blood donation, stem cell drives & marathons" />
            <form onSubmit={handlePostEvent} className="mt-4 space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-slate">Event Title</label>
                <input
                  required
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  placeholder="e.g. Blood Donation Camp 2026"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate">Event Category</label>
                <select
                  value={evtType}
                  onChange={(e) => setEvtType(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="Blood Donation">🩸 Blood Donation Marathon</option>
                  <option value="Stem Cell Drive">🧬 Stem Cell Donor Registry</option>
                  <option value="Marathon">🏃 Health & Wellness Marathon</option>
                  <option value="Other">🏥 Health Camp / Other Drive</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[12px] font-medium text-slate">Date</label>
                  <input
                    type="date"
                    required
                    value={evtDate}
                    onChange={(e) => setEvtDate(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-slate">Time</label>
                  <input
                    value={evtTime}
                    onChange={(e) => setEvtTime(e.target.value)}
                    placeholder="09:00 AM - 04:00 PM"
                    className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate">Location</label>
                <input
                  required
                  value={evtLocation}
                  onChange={(e) => setEvtLocation(e.target.value)}
                  placeholder="e.g. Main Hospital Grounds, Bangalore"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate">Description</label>
                <textarea
                  rows={2}
                  value={evtDesc}
                  onChange={(e) => setEvtDesc(e.target.value)}
                  placeholder="Details for participants..."
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-1.5 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <Button type="submit" disabled={postingEvt} className="w-full mt-2">
                {postingEvt ? 'Posting...' : 'Publish Event to Hospital Page'}
              </Button>
            </form>
          </Card>

          <div className="space-y-3">
            {events.length === 0 ? (
              <Card className="p-8 text-center text-[13px] text-muted">No events currently posted.</Card>
            ) : (
              events.map((evt) => (
                <Card key={evt.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge tone={evt.type === 'Blood Donation' ? 'rose' : evt.type === 'Stem Cell Drive' ? 'teal' : 'brand'}>
                        {evt.type}
                      </Badge>
                      <h4 className="mt-1 text-[15px] font-semibold text-ink">{evt.title}</h4>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-rose hover:bg-rose-soft"
                      onClick={() => handleDeleteEvent(evt.id)}
                    >
                      Delete
                    </Button>
                  </div>
                  <p className="mt-2 text-[12.5px] text-slate">{evt.description}</p>
                  <div className="mt-3 text-[11.5px] text-muted border-t border-line/50 pt-2 flex flex-wrap gap-3">
                    <span>🗓️ {new Date(evt.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <span>⏰ {evt.time}</span>
                    <span>📍 {evt.location}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <Card className="p-6 max-w-3xl">
          <CardHead
            title="Hospital & Clinic Information"
            sub="Update your facility profile, emergency contact numbers, and departments"
          />

          {profileSuccess && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-teal-soft p-3 text-[13px] text-teal">
              <Icon name="check" className="size-4 shrink-0" strokeWidth={2.5} />
              <span>Hospital profile successfully updated and published to the directory!</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-slate">Hospital / Clinic Name</label>
                <input
                  required
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  placeholder="e.g. Apollo City Hospital"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate">Facility Type</label>
                <select
                  value={hospType}
                  onChange={(e) => setHospType(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="Hospital">Hospital</option>
                  <option value="Clinic">Clinic</option>
                  <option value="Specialty Center">Specialty Center</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-slate">City</label>
                <input
                  required
                  value={hospCity}
                  onChange={(e) => setHospCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate">Street Address</label>
                <input
                  required
                  value={hospAddress}
                  onChange={(e) => setHospAddress(e.target.value)}
                  placeholder="e.g. 154/11 Bannerghatta Road"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-medium text-slate">General Phone / Reception</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 80 2630 4050"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-slate">24/7 Emergency Helpline</label>
                <input
                  value={emergPhone}
                  onChange={(e) => setEmergPhone(e.target.value)}
                  placeholder="e.g. 1066 or +91 80 2630 1122"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-rose text-rose font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-slate">
                Departments (comma separated)
              </label>
              <input
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                placeholder="Cardiology, Neurology, Pediatrics, Orthopedics, General Medicine"
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="mt-1 text-[11px] text-muted">
                These departments will be searchable by patients in the directory.
              </p>
            </div>

            <div className="rounded-lg bg-surface p-4 ring-1 ring-line space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold text-ink flex items-center gap-1.5">
                  <Icon name="location" className="size-4 text-brand" /> Geographic Coordinates (GPS)
                </span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[12px] font-medium text-brand hover:underline"
                >
                  📍 Use My Current Location
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium text-slate">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-white px-3 py-1.5 text-[12.5px] ring-1 ring-line outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-white px-3 py-1.5 text-[12.5px] ring-1 ring-line outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={savingProfile} className="min-w-[140px]">
                {savingProfile ? 'Saving...' : 'Save Hospital Profile'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}

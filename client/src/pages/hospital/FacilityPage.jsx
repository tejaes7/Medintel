import { useState, useEffect } from 'react'
import Icon from '../../components/Icon'
import { Card, CardHead, Badge, Button, PageHead } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'

export default function FacilityPage() {
  const { data, reload } = useApi(() => api.hospitals.myProfile(), [])

  const [hospName, setHospName] = useState('')
  const [hospType, setHospType] = useState('Hospital')
  const [hospAddress, setHospAddress] = useState('')
  const [hospCity, setHospCity] = useState('Bangalore')
  const [phone, setPhone] = useState('')
  const [emergPhone, setEmergPhone] = useState('')
  const [deptInput, setDeptInput] = useState('')
  const [lat, setLat] = useState('12.9716')
  const [lng, setLng] = useState('77.5946')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [initDone, setInitDone] = useState(false)

  const hospital = data?.hospital

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

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
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
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3500)
    } catch (err) {
      alert(err.message || 'Failed to update hospital profile')
    } finally {
      setSaving(false)
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

  const departmentsList = deptInput
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean)

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Hospital Profile"
        title="Facility Details & Emergency Directory Settings"
        sub="Configure how your hospital appears to patients in directory searches, triage emergency referrals, and navigation maps."
      />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        {/* Left: Edit Form */}
        <Card className="p-6">
          <CardHead
            title="Hospital & Emergency Contacts"
            sub="Official public listing details"
          />

          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-teal-soft p-3.5 text-[13px] font-medium text-teal ring-1 ring-teal/30">
              <Icon name="check" className="size-4 shrink-0" strokeWidth={2.5} />
              <span>Hospital facility profile and GPS coordinates successfully updated!</span>
            </div>
          )}

          <form onSubmit={handleSave} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[12px] font-semibold text-slate">Hospital / Clinic Name</label>
                <input
                  required
                  value={hospName}
                  onChange={(e) => setHospName(e.target.value)}
                  placeholder="e.g. Apollo City Hospital"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate">Facility Classification</label>
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
                <label className="block text-[12px] font-semibold text-slate">City</label>
                <input
                  required
                  value={hospCity}
                  onChange={(e) => setHospCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-slate">Street Address</label>
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
                <label className="block text-[12px] font-semibold text-slate">General Reception / Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 80 2630 4050"
                  className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-rose">24/7 Emergency Hotline</label>
                <input
                  value={emergPhone}
                  onChange={(e) => setEmergPhone(e.target.value)}
                  placeholder="e.g. 1066 or +91 80 2630 1122"
                  className="mt-1 w-full rounded-lg bg-rose-soft/40 px-3 py-2 text-[13px] font-semibold text-rose ring-1 ring-rose/30 outline-none focus:ring-2 focus:ring-rose"
                />
                <p className="mt-0.5 text-[11px] text-muted">
                  Called automatically during red-flag AI triage escalation.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-slate">
                Active Departments (comma separated)
              </label>
              <input
                value={deptInput}
                onChange={(e) => setDeptInput(e.target.value)}
                placeholder="Cardiology, Neurology, Pediatrics, Orthopedics, General Medicine"
                className="mt-1 w-full rounded-lg bg-surface px-3 py-2 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* GPS Coordinates */}
            <div className="rounded-lg bg-surface p-4 ring-1 ring-line space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
                  <Icon name="location" className="size-4 text-brand" /> Facility GPS Location
                </span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[12px] font-semibold text-brand hover:underline"
                >
                  📍 Detect My Current Location
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
                    className="mt-1 w-full rounded-lg bg-white px-3 py-1.5 text-[12.5px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-slate">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-white px-3 py-1.5 text-[12.5px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving Changes...' : 'Save Hospital Profile'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Right: Live Public Card Preview */}
        <div className="space-y-4">
          <h3 className="text-[14px] font-bold text-ink">Directory Card Preview</h3>
          <Card className="p-5 border-brand/40 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Badge tone="teal">{hospType}</Badge>
                <h4 className="mt-2 text-[17px] font-bold text-ink">{hospName || 'Your Hospital Name'}</h4>
                <p className="mt-1 text-[12.5px] text-slate">
                  📍 {hospAddress ? `${hospAddress}, ` : ''}{hospCity}
                </p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2 rounded-lg bg-surface p-3 text-[12px] ring-1 ring-line">
              <div className="flex items-center justify-between">
                <span className="text-muted">Emergency Line:</span>
                <span className="font-bold text-rose">{emergPhone || '1066'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Reception:</span>
                <span className="font-medium text-ink">{phone || '+91 80 0000 0000'}</span>
              </div>
            </div>

            <div className="mt-3">
              <span className="text-[11px] font-medium text-muted">Active Specialties</span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(departmentsList.length > 0 ? departmentsList : ['General Medicine']).map((dept) => (
                  <span
                    key={dept}
                    className="rounded bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

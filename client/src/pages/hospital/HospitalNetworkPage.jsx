import { useState } from 'react'
import Icon from '../../components/Icon'
import { Card, Badge, Button, PageHead, Empty } from '../../components/ui'
import { useApi } from '../../lib/useApi'
import { api } from '../../lib/api'
import HospitalDetail from '../hospitals/HospitalDetail'

export default function HospitalNetworkPage() {
  const [city, setCity] = useState('')
  const [dept, setDept] = useState('')
  const [search, setSearch] = useState('')
  const [selectedHospitalId, setSelectedHospitalId] = useState(null)

  const { data, loading } = useApi(
    () => api.hospitals.search({ city, department: dept, name: search }),
    [city, dept, search]
  )

  const hospitals = data?.hospitals ?? []
  const cities = data?.cities ?? ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune']
  const departments = data?.departments ?? [
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Nephrology',
    'Dermatology',
    'Neurology',
    'Oncology',
    'General Medicine',
  ]

  return (
    <div className="space-y-6">
      <PageHead
        eyebrow="Healthcare Ecosystem"
        title="Regional Hospital & Clinic Network"
        sub="Explore verified healthcare facilities across your region. Inspect specialist rosters, emergency helplines, bed departments, and community drives for cross-referrals."
      />

      {selectedHospitalId ? (
        <HospitalDetail
          hospitalId={selectedHospitalId}
          onBack={() => setSelectedHospitalId(null)}
          onBookedSuccess={() => setSelectedHospitalId(null)}
        />
      ) : (
        <>
          {/* Search & Filter Controls */}
          <Card className="p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11.5px] font-semibold text-slate">Search Facility Name</label>
                <div className="relative mt-1">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="e.g. Apollo, Fortis, Manipal..."
                    className="h-9 w-full rounded-lg bg-surface pl-9 pr-3 text-[13px] text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate">Filter by City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg bg-surface px-3 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">All Cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate">Clinical Specialty</label>
                <select
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg bg-surface px-3 text-[13px] ring-1 ring-line outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">All Specialties</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Hospital Directory Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-slate">
                Showing <strong className="text-ink">{hospitals.length}</strong> network facilities
              </p>
              {(city || dept || search) && (
                <button
                  onClick={() => {
                    setCity('')
                    setDept('')
                    setSearch('')
                  }}
                  className="text-[12px] font-semibold text-brand hover:underline"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {hospitals.length === 0 ? (
              <Card className="p-12 text-center">
                <Empty
                  title={loading ? 'Searching regional medical network…' : 'No facilities found'}
                  sub="Try searching for a different city or clearing specialty filters."
                />
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {hospitals.map((hosp) => (
                  <Card
                    key={hosp.id}
                    className="p-5 flex flex-col justify-between transition-shadow hover:shadow-md border border-line"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge tone="teal">{hosp.type || 'Hospital'}</Badge>
                          <h4 className="mt-2 text-[17px] font-bold text-ink">{hosp.name}</h4>
                          <p className="mt-0.5 text-[12.5px] text-slate">
                            📍 {hosp.address}, {hosp.city}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 rounded-lg bg-surface p-3 text-[12px] ring-1 ring-line">
                        <div className="flex items-center justify-between">
                          <span className="text-muted font-medium">24/7 Emergency Line:</span>
                          <span className="font-bold text-rose">{hosp.emergencyPhone || '1066'}</span>
                        </div>
                        {hosp.phone && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted font-medium">Reception:</span>
                            <span className="font-medium text-ink">{hosp.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-muted font-medium">Specialist Doctors:</span>
                          <span className="font-semibold text-brand">{hosp.doctorCount ?? 'Multiple'} on duty</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                          Departments
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(hosp.departments || []).slice(0, 4).map((d) => (
                            <span
                              key={d}
                              className="rounded bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand"
                            >
                              {d}
                            </span>
                          ))}
                          {(hosp.departments || []).length > 4 && (
                            <span className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted ring-1 ring-line">
                              +{hosp.departments.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3">
                      <span className="text-[11.5px] text-muted">Network Facility</span>
                      <Button
                        size="sm"
                        onClick={() => setSelectedHospitalId(hosp.id)}
                      >
                        Inspect Details & Doctors →
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHead } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import HospitalsDirectory from './HospitalsDirectory'
import HospitalDetail from './HospitalDetail'
import MyAppointments from './MyAppointments'
import HospitalPortal from './HospitalPortal'

export default function HospitalsModule() {
  const { user } = useAuth()
  const isHospitalRole = user?.role === 'hospital'
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState(
    isHospitalRole ? (tabFromUrl === 'directory' ? 'directory' : 'portal') : 'directory'
  )
  const [selectedHospitalId, setSelectedHospitalId] = useState(null)

  useEffect(() => {
    if (isHospitalRole) {
      if (tabFromUrl === 'directory') {
        setActiveTab('directory')
      } else {
        setActiveTab('portal')
      }
    }
  }, [tabFromUrl, isHospitalRole])

  return (
    <>
      <PageHead
        eyebrow={isHospitalRole ? 'Hospital Administration' : 'Module 07'}
        title={
          isHospitalRole
            ? 'Hospital Facilities & Operations Portal'
            : 'Nearby Hospitals, Clinics & Appointments'
        }
        sub={
          isHospitalRole
            ? 'Review patient appointment bookings, manage specialist doctor rosters, post donation events, and update public facility info.'
            : 'Browse medical facilities by city or department, view doctor qualifications, register for donation drives, and book appointments directly.'
        }
      />

      <div className="space-y-6">
        <div className="flex border-b border-line">
          {isHospitalRole ? (
            <>
              <button
                onClick={() => {
                  setSelectedHospitalId(null)
                  setActiveTab('portal')
                  setSearchParams({ tab: 'appointments' })
                }}
                className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
                  activeTab === 'portal'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                👨‍⚕️ Hospital Operations Portal
              </button>

              <button
                onClick={() => {
                  setSelectedHospitalId(null)
                  setActiveTab('directory')
                  setSearchParams({ tab: 'directory' })
                }}
                className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
                  activeTab === 'directory' && !selectedHospitalId
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                🏥 Public Directory Preview
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setSelectedHospitalId(null)
                  setActiveTab('directory')
                }}
                className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
                  activeTab === 'directory' && !selectedHospitalId
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                🏥 Nearby Hospitals & Clinics
              </button>

              <button
                onClick={() => {
                  setSelectedHospitalId(null)
                  setActiveTab('appointments')
                }}
                className={`border-b-2 px-4 py-3 text-[13.5px] font-semibold transition ${
                  activeTab === 'appointments'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                🗓️ My Appointments
              </button>
            </>
          )}
        </div>

        {selectedHospitalId ? (
          <HospitalDetail
            hospitalId={selectedHospitalId}
            onBack={() => setSelectedHospitalId(null)}
            onBookedSuccess={() => {
              setSelectedHospitalId(null)
              setActiveTab(isHospitalRole ? 'portal' : 'appointments')
            }}
          />
        ) : activeTab === 'directory' ? (
          <HospitalsDirectory onSelectHospital={(id) => setSelectedHospitalId(id)} />
        ) : activeTab === 'appointments' ? (
          <MyAppointments />
        ) : (
          <HospitalPortal />
        )}
      </div>
    </>
  )
}

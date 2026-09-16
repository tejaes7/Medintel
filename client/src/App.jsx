import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './lib/auth'
import AppLayout from './components/AppLayout'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import Symptoms from './pages/Symptoms'
import Chat from './pages/Chat'
import Reports from './pages/Reports'
import Reminders from './pages/Reminders'
import History from './pages/History'
import HospitalsModule from './pages/hospitals'
import Profile from './pages/Profile'
import AppointmentsPage from './pages/hospital/AppointmentsPage'
import DoctorsPage from './pages/hospital/DoctorsPage'
import EventsPage from './pages/hospital/EventsPage'
import FacilityPage from './pages/hospital/FacilityPage'
import HospitalNetworkPage from './pages/hospital/HospitalNetworkPage'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        {/* AppLayout guards this whole subtree — no session, no access. */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="symptoms" element={<Symptoms />} />
          <Route path="chat" element={<Chat />} />
          <Route path="hospitals/*" element={<HospitalsModule />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="facility" element={<FacilityPage />} />
          <Route path="network" element={<HospitalNetworkPage />} />
          <Route path="reports" element={<Reports />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="history" element={<History />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

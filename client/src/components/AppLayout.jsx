import { useState } from 'react'
import { Outlet, Link, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'
import Logo from './Logo'
import { useAuth } from '../lib/auth'

const patientNav = [
  { to: '/app', label: 'Overview', icon: 'home', end: true },
  { to: '/app/symptoms', label: 'Symptom analysis', icon: 'pulse' },
  { to: '/app/chat', label: 'Health chat', icon: 'chat' },
  { to: '/app/hospitals', label: 'Hospitals & Clinics', icon: 'shield' },
  { to: '/app/reports', label: 'Reports', icon: 'file' },
  { to: '/app/reminders', label: 'Reminders', icon: 'clock' },
  { to: '/app/history', label: 'History', icon: 'timeline' },
  { to: '/app/profile', label: 'Profile', icon: 'user' },
]

const hospitalNav = [
  { to: '/app', label: 'Operations Desk', icon: 'home', end: true },
  { to: '/app/appointments', label: 'Appointments Desk', icon: 'clock' },
  { to: '/app/doctors', label: 'Doctor Roster', icon: 'user' },
  { to: '/app/events', label: 'Camps & Drives', icon: 'pulse' },
  { to: '/app/network', label: 'Hospital Network', icon: 'shield' },
  { to: '/app/facility', label: 'Facility Profile', icon: 'home' },
  { to: '/app/history', label: 'Audit Timeline', icon: 'timeline' },
  { to: '/app/profile', label: 'Account Settings', icon: 'spark' },
]

export default function AppLayout() {
  const [open, setOpen] = useState(false)
  const { user, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Route guard: the whole /app subtree requires a session.
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <p className="text-[13px] text-muted">Loading your session…</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/signin" replace />

  const isHospital = user.role === 'hospital'
  const navItems = isHospital ? hospitalNav : patientNav

  const isItemActive = (item) => {
    if (item.end) {
      return location.pathname === item.to
    }
    return location.pathname.startsWith(item.to)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-line bg-white transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center px-5">
          <Link to="/"><Logo /></Link>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {navItems.map((item) => {
            const active = isItemActive(item)
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                  active ? 'bg-brand-soft text-brand' : 'text-slate hover:bg-surface hover:text-ink'
                }`}
              >
                <Icon name={item.icon} className="size-[18px]" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {isHospital ? (
          <div className="m-3 rounded-lg bg-surface p-3.5 ring-1 ring-line">
            <div className="mb-1.5 flex items-center gap-1.5 text-brand">
              <Icon name="shield" className="size-[15px]" strokeWidth={1.8} />
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em]">Hospital Console</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-slate">
              Facility operations desk for appointments, doctors, and community health camps.
            </p>
          </div>
        ) : (
          <div className="m-3 rounded-lg bg-surface p-3.5 ring-1 ring-line">
            <div className="mb-1.5 flex items-center gap-1.5 text-teal">
              <Icon name="shield" className="size-[15px]" strokeWidth={1.8} />
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em]">Safety engine</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-slate">
              Red-flag rules run before any AI call. Escalation is deterministic.
            </p>
          </div>
        )}

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Link to="/app/profile" className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-[11.5px] font-semibold text-white">
              {user.initials}
            </Link>
            <Link to="/app/profile" className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate text-[13px] font-medium text-ink">
                {user.name}
                {isHospital && (
                  <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[9.5px] font-bold text-brand uppercase tracking-wider">
                    Hospital
                  </span>
                )}
              </span>
              <span className="block truncate text-[11.5px] text-muted">{user.email}</span>
            </Link>
            <button onClick={handleSignOut} aria-label="Sign out" className="shrink-0 rounded-md p-1 text-muted hover:bg-surface hover:text-ink">
              <Icon name="logout" className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-ink/20 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-5 backdrop-blur-md sm:px-8">
          <button
            onClick={() => setOpen(true)}
            className="-ml-1 grid size-9 place-items-center rounded-lg text-slate hover:bg-surface lg:hidden"
            aria-label="Open navigation"
          >
            <Icon name="timeline" />
          </button>

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              placeholder={isHospital ? "Search patient bookings, doctors, events..." : "Search sessions, reports, medication"}
              className="h-9 w-full rounded-lg bg-surface pl-9 pr-3 text-[13px] text-ink ring-1 ring-line transition placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isHospital && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[11.5px] font-semibold text-brand">
                <span className="size-1.5 rounded-full bg-brand animate-pulse" />
                Hospital Console
              </span>
            )}
            <button className="relative grid size-9 place-items-center rounded-lg text-slate hover:bg-surface" aria-label="Notifications">
              <Icon name="bell" className="size-[18px]" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-brand ring-2 ring-white" />
            </button>
            <span className="grid size-8 place-items-center rounded-full bg-ink text-[11.5px] font-semibold text-white">
              {user.initials}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

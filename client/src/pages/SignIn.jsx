import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { Button, Field, inputCls } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function SignIn() {
  const navigate = useNavigate()
  const { user, loading, signIn, signUp } = useAuth()

  const [mode, setMode] = useState('signin')
  const [role, setRole] = useState('patient')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(false)

  if (!loading && user) return <Navigate to="/app" replace />

  const isSignUp = mode === 'signup'

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      if (isSignUp) await signUp({ name, email, password, role })
      else await signIn({ email, password })
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/">
          <Logo />
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-[27px] font-semibold tracking-[-0.03em] text-ink">
            {isSignUp ? 'Create your MedIntel account' : 'Sign in to MedIntel'}
          </h1>
          <p className="mt-2 text-[14px] text-slate">
            {isSignUp ? 'Already have an account?' : 'New here?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(isSignUp ? 'signin' : 'signup')
                setError(null)
              }}
              className="font-medium text-brand hover:text-brand-dark"
            >
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            {isSignUp && (
              <>
                <Field label="Account Type">
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setRole('patient')}
                      className={`rounded-lg py-2.5 px-3 text-[12.5px] font-semibold transition ring-1 flex flex-col items-center gap-1 ${
                        role === 'patient'
                          ? 'bg-brand text-white ring-brand shadow-sm'
                          : 'bg-surface text-slate ring-line hover:text-ink'
                      }`}
                    >
                      <span>👤 Patient</span>
                      <span className="text-[10px] font-normal opacity-80">Personal Health Record</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('hospital')}
                      className={`rounded-lg py-2.5 px-3 text-[12.5px] font-semibold transition ring-1 flex flex-col items-center gap-1 ${
                        role === 'hospital'
                          ? 'bg-brand text-white ring-brand shadow-sm'
                          : 'bg-surface text-slate ring-line hover:text-ink'
                      }`}
                    >
                      <span>🏥 Hospital / Clinic</span>
                      <span className="text-[10px] font-normal opacity-80">Admin & Doctor Portal</span>
                    </button>
                  </div>
                </Field>

                <Field label={role === 'hospital' ? 'Hospital / Clinic Name' : 'Full name'}>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputCls}
                    placeholder={role === 'hospital' ? 'Apollo Healthcare Clinic' : 'Aarav Menon'}
                    required
                    minLength={2}
                  />
                </Field>
              </>
            )}

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </Field>

            <Field label="Password" hint={isSignUp ? 'At least 8 characters.' : undefined}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                required
                minLength={isSignUp ? 8 : 1}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg bg-rose-soft p-3.5">
                <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
                <p className="text-[12.5px] leading-relaxed text-slate">{error.message}</p>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {pending ? 'Please wait…' : isSignUp ? 'Create account' : 'Continue'}{' '}
              <Icon name="arrow" className="size-4" />
            </Button>
          </form>

          <div className="mt-5 border-t border-line/60 pt-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">Quick Demo Accounts</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setEmail('aarav.menon@example.com')
                  setPassword('MedIntel2025!')
                  setError(null)
                }}
                className="flex flex-col items-start rounded-lg bg-surface p-2.5 text-left ring-1 ring-line transition hover:bg-brand-soft/50 hover:ring-brand/30"
              >
                <span className="text-[12px] font-semibold text-ink">👤 Patient Demo</span>
                <span className="text-[11px] text-muted">Aarav Menon</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setEmail('hospital@example.com')
                  setPassword('MedIntel2025!')
                  setError(null)
                }}
                className="flex flex-col items-start rounded-lg bg-surface p-2.5 text-left ring-1 ring-line transition hover:bg-brand-soft/50 hover:ring-brand/30"
              >
                <span className="text-[12px] font-semibold text-ink">🏥 Hospital Admin</span>
                <span className="text-[11px] text-muted">Apollo City Admin</span>
              </button>
            </div>
          </div>

          <p className="mt-5 flex items-start gap-2 rounded-lg bg-surface p-3.5 text-[12.5px] leading-relaxed text-slate ring-1 ring-line">
            <Icon name="shield" className="mt-px size-4 shrink-0 text-teal" />
            Credentials are hashed with bcrypt and sessions are stateless JWTs with short TTL and refresh rotation.
          </p>
        </div>

        <p className="text-[12.5px] text-muted">© 2025 MedIntel · Academic project</p>
      </div>

      <div className="hero-wash relative hidden overflow-hidden border-l border-line bg-surface lg:block">
        <div className="grid-lines absolute inset-0 opacity-70" />
        <div className="relative flex h-full items-center justify-center p-14">
          <div className="w-full max-w-md">
            <div className="rounded-xl bg-white p-5 shadow-lift ring-1 ring-line">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-[13px] font-semibold text-ink">Triage pipeline</span>
                <span className="text-[11.5px] font-medium text-muted">7 stages</span>
              </div>
              <ol className="mt-3 space-y-2">
                {[
                  ['Normalise', 'Structured intake'],
                  ['Redact', 'PII stripped at the boundary'],
                  ['Rules', 'Deterministic red-flag check'],
                  ['Context', 'Profile + history injected'],
                  ['Call', 'Provider behind adapter'],
                  ['Validate', 'Schema + banned content'],
                  ['Wrap', 'Confidence · urgency · notice'],
                ].map(([stage, detail], i) => (
                  <li key={stage} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-surface text-[11px] font-semibold text-slate ring-1 ring-line">
                      {i + 1}
                    </span>
                    <span className="text-[13px] font-medium text-ink">{stage}</span>
                    <span className="ml-auto text-[12px] text-muted">{detail}</span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-6 text-[14px] leading-relaxed text-slate">
              “A probabilistic component never sits alone on a safety-critical path.”
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

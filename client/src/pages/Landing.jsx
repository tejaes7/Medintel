import { Link } from 'react-router-dom'
import Logo from '../components/Logo'
import Icon from '../components/Icon'
import { Button, Badge } from '../components/ui'

const modules = [
  { n: '01', title: 'Authentication & profile', body: 'JWT sessions, hashed credentials, and a profile that carries age, allergies and chronic conditions into every reasoning step.' },
  { n: '02', title: 'Symptom analysis', body: 'Structured intake passes through the red-flag rules engine before the AI is ever called. Output is a ranked possibility list, never a verdict.' },
  { n: '03', title: 'AI health chat', body: 'Follow-up conversation that remembers the session context and the stored history — with the same guardrails applied to every turn.' },
  { n: '04', title: 'Report upload', body: 'PDF and image upload, OCR extraction off the request path, and a plain-language summary of key values attached to the timeline.' },
  { n: '05', title: 'Medicine reminders', body: 'Dose schedules driven by recurring jobs, delivered by push or e-mail, with a taken-or-missed adherence log.' },
  { n: '06', title: 'Medical history', body: 'One chronological timeline of sessions, reports and medication — exportable for a real consultation.' },
  { n: '07', title: 'Hospitals & appointments', body: 'GPS-powered discovery of nearby clinics, doctor rosters & qualifications, blood donation marathons, and direct appointment scheduling.' },
]

const layers = [
  ['Presentation', 'React SPA'],
  ['API / Gateway', 'Express · auth, validation, rate limit'],
  ['Business logic', 'Triage rules · orchestrator · scheduler'],
  ['AI service', 'Adapter · redaction · validator · breaker'],
  ['Data access', 'Repositories · Mongoose · Redis'],
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">
            {['Modules', 'Architecture', 'Safety'].map((l) => (
              <a key={l} href={'#' + l.toLowerCase()} className="text-[13.5px] font-medium text-slate transition hover:text-ink">
                {l}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button as="link" to="/signin" variant="ghost" size="sm">Sign in</Button>
            <Button as="link" to="/app" size="sm" variant="dark">
              Open dashboard <Icon name="arrow" className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="hero-wash relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-20 sm:px-8 sm:pt-28">
          <div className="rise max-w-3xl">
            <Badge tone="teal" className="mb-6">
              <span className="size-1.5 rounded-full bg-teal" /> Clinical decision support — not diagnosis
            </Badge>
            <h1 className="text-[42px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[60px]">
              A safety engine
              <span className="block bg-gradient-to-r from-brand to-teal bg-clip-text text-transparent">
                in front of the AI.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-slate">
              MedIntel triages symptoms, keeps a unified medical history and supports medication
              adherence. Escalation decisions are made by deterministic rules — never by a language
              model being right.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button as="link" to="/app" size="lg">
                Explore the product <Icon name="arrow" className="size-4" />
              </Button>
              <Button as="link" to="/app/symptoms" size="lg" variant="secondary">
                Start a symptom session
              </Button>
            </div>
          </div>

          <div className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-8 sm:grid-cols-4">
            {[
              ['7', 'functional modules'],
              ['5', 'architectural layers'],
              ['7', 'stage AI pipeline'],
              ['0', 'AI-owned escalations'],
            ].map(([k, v]) => (
              <div key={v}>
                <p className="text-[28px] font-semibold tracking-[-0.03em] text-ink">{k}</p>
                <p className="mt-0.5 text-[13px] text-muted">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand">Scope — version 1.0</p>
        <h2 className="mt-3 max-w-xl text-[32px] font-semibold tracking-[-0.03em] text-ink">
          Seven modules, one product surface.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-xl bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.n} className="bg-white p-6 transition-colors hover:bg-surface">
              <span className="inline-grid h-6 min-w-6 place-items-center rounded-md bg-brand-soft px-1.5 text-[11.5px] font-semibold text-brand">
                {m.n}
              </span>
              <h3 className="mt-4 text-[15.5px] font-semibold text-ink">{m.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="architecture" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand">Logical view</p>
            <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.03em] text-ink">
              Layered, and strictly so.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-slate">
              A modular monolith with two rules that make the style real: a layer calls only the
              layer directly beneath it, and no layer may be skipped. The React client cannot reach
              MongoDB — it does not know MongoDB exists.
            </p>
            <ul className="mt-7 space-y-3">
              {[
                'Cross-cutting concerns run vertically as the Express middleware chain.',
                'The AI provider sits behind an adapter — swapped by config, never by code.',
                'Clean module seams keep the AI service extractable into its own process later.',
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[14px] leading-relaxed text-slate">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-teal" strokeWidth={2.2} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl bg-white p-2 shadow-lift ring-1 ring-line">
            <div className="space-y-2 rounded-lg bg-white p-4">
              {layers.map(([name, detail], i) => (
                <div key={name}>
                  <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3.5 transition hover:border-brand/40">
                    <span className="text-[13.5px] font-semibold text-ink">{name}</span>
                    <span className="hidden text-[12.5px] text-muted sm:block">{detail}</span>
                  </div>
                  {i < layers.length - 1 && (
                    <div className="mx-auto h-4 w-px bg-gradient-to-b from-brand/50 to-line" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="safety" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-brand">The guardrail principle</p>
            <h2 className="mt-3 text-[32px] font-semibold tracking-[-0.03em] text-ink">
              A probabilistic component never sits alone on a safety-critical path.
            </h2>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-slate">
              Every AI response is schema-validated, checked against banned content, and wrapped with
              a confidence band, an urgency level and a mandatory notice to consult a physician.
              Red-flag symptom combinations bypass the model entirely.
            </p>
          </div>

          <div className="rounded-xl border border-line bg-white p-6 shadow-card">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-rose">MedIntel is not</p>
            <ul className="mt-4 space-y-3">
              {[
                'A diagnosis — output is possibility, never verdict',
                'A prescription engine — no drug names, no dosages',
                'An emergency service — it escalates, it does not treat',
                'A replacement for a licensed clinician',
                'A store of record for legal or insurance purposes',
              ].map((t) => (
                <li key={t} className="flex gap-2.5 text-[13.5px] leading-relaxed text-slate">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-rose" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="gradient-rule h-0.5" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-8">
          <Logo />
          <p className="text-[12.5px] text-muted">
            Academic project · Software Architecture · Version 1.0
          </p>
          <Link to="/app" className="text-[13px] font-medium text-brand hover:text-brand-dark">
            Open dashboard →
          </Link>
        </div>
      </footer>
    </div>
  )
}

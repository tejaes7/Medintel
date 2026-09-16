import { useState } from 'react'
import Icon from '../components/Icon'
import { Card, CardHead, Badge, Button, Field, inputCls, PageHead } from '../components/ui'
import { api } from '../lib/api'
import { useAction } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import PatientOnlyNotice from '../components/PatientOnlyNotice'

/** Label shown to the user → symptom key the rules engine understands. */
const symptomOptions = [
  ['Sore throat', 'sore_throat'],
  ['Fever', 'fever'],
  ['Cough', 'cough'],
  ['Headache', 'headache'],
  ['Fatigue', 'fatigue'],
  ['Shortness of breath', 'breathlessness'],
  ['Chest pain', 'chest_pain'],
  ['Nausea', 'nausea'],
  ['Dizziness', 'dizziness'],
  ['Abdominal pain', 'abdominal_pain'],
  ['Runny nose', 'runny_nose'],
  ['Diarrhoea', 'diarrhoea'],
]

const durationOptions = [
  ['Less than a day', 0.5],
  ['1–2 days', 2],
  ['3 days', 3],
  ['About a week', 7],
  ['More than two weeks', 15],
]

const steps = ['Symptoms', 'Details', 'Result']

const PIPELINE = [
  'Normalise',
  'Redact PII',
  'Red-flag rules',
  'Context assembly',
  'Provider call',
  'Schema validation',
  'Guardrail wrap',
]

function Meter({ value, tone = 'brand' }) {
  const bar = { brand: 'bg-brand', teal: 'bg-teal', amber: 'bg-amber', rose: 'bg-rose', slate: 'bg-muted' }[tone]
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full ${bar} transition-[width] duration-500`} style={{ width: `${value * 100}%` }} />
    </div>
  )
}

export default function Symptoms() {
  const { user } = useAuth()
  if (user?.role === 'hospital') {
    return <PatientOnlyNotice featureName="Symptom analysis and triage intake" />
  }
  return <PatientSymptoms />
}

function PatientSymptoms() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState([])
  const [freeText, setFreeText] = useState('')
  const [durationDays, setDurationDays] = useState(3)
  const [temperature, setTemperature] = useState('')
  const [severity, setSeverity] = useState(4)
  const [trend, setTrend] = useState('Stable')
  const [result, setResult] = useState(null)

  const analyse = useAction(async () => {
    const labels = symptomOptions.filter(([, key]) => selected.includes(key)).map(([label]) => label.toLowerCase())
    const severityWord = severity >= 8 ? 'severe' : severity >= 5 ? 'moderate' : 'mild'

    // Compose one description: the rules engine reads text, structured fields sharpen it.
    const text = [
      labels.length ? `I have ${labels.join(', ')}.` : '',
      freeText.trim(),
      `The symptoms are ${severityWord} and ${trend.toLowerCase()}.`,
      durationDays >= 1 ? `This has been going on for ${Math.round(durationDays)} days.` : 'This started today.',
    ]
      .filter(Boolean)
      .join(' ')

    const temperatureC = parseFloat(temperature)

    const { data } = await api.triage.analyse({
      text,
      symptoms: selected,
      durationDays,
      ...(Number.isFinite(temperatureC) && temperatureC >= 30 && temperatureC <= 45 ? { temperatureC } : {}),
    })
    setResult(data)
    setStep(2)
    return data
  })

  const toggle = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]))

  const canSubmit = selected.length > 0 || freeText.trim().length >= 10

  return (
    <>
      <PageHead
        eyebrow="Module 02"
        title="Symptom analysis"
        sub="Structured intake runs through the deterministic rules engine before the AI is called. The result is a ranked list of possibilities — never a diagnosis."
      />

      <div className="mb-6 flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <button
              onClick={() => (i < 2 || result) && setStep(i)}
              disabled={i === 2 && !result}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition disabled:cursor-not-allowed ${
                i === step ? 'bg-brand-soft text-brand' : i < step ? 'text-ink hover:bg-surface' : 'text-muted'
              }`}
            >
              <span
                className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${
                  i <= step ? 'bg-brand text-white' : 'bg-line text-muted'
                }`}
              >
                {i < step ? <Icon name="check" className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              {s}
            </button>
            {i < steps.length - 1 && <span className="h-px w-6 bg-line sm:w-10" />}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <Card>
          {step === 0 && (
            <>
              <CardHead title="What are you experiencing?" sub="Select everything that applies — you can refine next." />
              <div className="p-5">
                <div className="flex flex-wrap gap-2">
                  {symptomOptions.map(([label, key]) => {
                    const on = selected.includes(key)
                    return (
                      <button
                        key={key}
                        onClick={() => toggle(key)}
                        className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                          on ? 'bg-ink text-white' : 'bg-white text-slate ring-1 ring-line hover:ring-[#cfd8e3]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <div className="mt-5">
                  <Field
                    label="Anything not listed above"
                    hint="Free text is normalised and redacted before it leaves the API layer."
                  >
                    <textarea
                      rows={3}
                      value={freeText}
                      onChange={(e) => setFreeText(e.target.value)}
                      className={inputCls}
                      placeholder="Describe in your own words…"
                    />
                  </Field>
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <CardHead title="A little more context" sub="These fields sharpen the rules engine, not just the prompt." />
              <div className="space-y-5 p-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="How long has this been going on?">
                    <select
                      className={inputCls}
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                    >
                      {durationOptions.map(([label, days]) => (
                        <option key={label} value={days}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Highest recorded temperature (°C)" hint="Leave blank if you have not measured it.">
                    <input
                      className={inputCls}
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      placeholder="38.1"
                      inputMode="decimal"
                    />
                  </Field>
                </div>

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="text-[13px] font-medium text-slate">Overall severity</span>
                    <span className="text-[13px] font-semibold text-ink">{severity} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full accent-[#635bff]"
                  />
                  <div className="mt-1 flex justify-between text-[11.5px] text-muted">
                    <span>Barely noticeable</span>
                    <span>Unbearable</span>
                  </div>
                </div>

                <Field label="Is it getting better or worse?">
                  <div className="flex gap-2">
                    {['Improving', 'Stable', 'Worsening'].map((o) => (
                      <label key={o} className="flex-1">
                        <input
                          type="radio"
                          name="trend"
                          checked={trend === o}
                          onChange={() => setTrend(o)}
                          className="peer sr-only"
                        />
                        <span className="block cursor-pointer rounded-lg py-2 text-center text-[13px] font-medium text-slate ring-1 ring-line transition peer-checked:bg-brand-soft peer-checked:text-brand peer-checked:ring-brand/30">
                          {o}
                        </span>
                      </label>
                    ))}
                  </div>
                </Field>

                {analyse.error && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-rose-soft p-3.5">
                    <Icon name="alert" className="mt-px size-4 shrink-0 text-rose" />
                    <p className="text-[13px] leading-relaxed text-slate">{analyse.error.message}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && result && (
            <>
              <CardHead
                title="Assessment"
                sub={`Generated ${new Date(result.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · session ${result.id.slice(-6)}`}
                action={<Badge tone={result.tone}>{result.urgency}</Badge>}
              />
              <div className="p-5">
                {result.redFlags.length > 0 ? (
                  <div
                    className={`flex items-start gap-3 rounded-lg p-4 ${
                      result.urgency === 'Emergency' ? 'bg-rose-soft' : 'bg-amber-soft'
                    }`}
                  >
                    <Icon
                      name="alert"
                      className={`mt-0.5 size-[18px] shrink-0 ${result.urgency === 'Emergency' ? 'text-rose' : 'text-amber'}`}
                    />
                    <div className="text-[13px] leading-relaxed text-slate">
                      <p>
                        <span className="font-semibold text-ink">
                          {result.redFlags.length} red-flag rule{result.redFlags.length > 1 ? 's' : ''} matched.
                        </span>{' '}
                        The rules engine set this to {result.urgency.toLowerCase()} urgency
                        {result.aiProvider === 'none' ? ' and the AI was not called at all.' : '.'}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {result.redFlags.map((f) => (
                          <li key={f.id} className="flex gap-2">
                            <span className="font-mono text-[11.5px] text-muted">{f.id}</span>
                            <span>{f.rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 rounded-lg bg-teal-soft p-4">
                    <Icon name="shield" className="mt-0.5 size-[18px] shrink-0 text-teal" />
                    <p className="text-[13px] leading-relaxed text-slate">
                      <span className="font-semibold text-ink">No red flags triggered.</span> The rules engine
                      cleared this session before the AI was called. Urgency is {result.urgency.toLowerCase()}.
                    </p>
                  </div>
                )}

                {result.degraded && (
                  <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-amber-soft p-3.5">
                    <Icon name="alert" className="mt-px size-4 shrink-0 text-amber" />
                    <p className="text-[12.5px] leading-relaxed text-slate">
                      The AI service was unavailable, so this result comes from the rules engine alone. The safety
                      assessment above is unaffected — it never depended on the AI.
                    </p>
                  </div>
                )}

                {result.conditions.length > 0 && (
                  <>
                    <p className="mb-3 mt-6 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Ranked possibilities
                    </p>
                    <ul className="space-y-4">
                      {result.conditions.map((c, i) => (
                        <li key={c.name}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-4">
                            <span className="text-[14px] font-medium text-ink">{c.name}</span>
                            <span className="text-[13px] font-semibold text-slate">
                              {Math.round(c.likelihood * 100)}%
                            </span>
                          </div>
                          <Meter value={c.likelihood} tone={i === 0 ? 'brand' : 'slate'} />
                          <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{c.note}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <p className="mb-3 mt-7 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Suggested next steps
                </p>
                <ul className="space-y-2.5">
                  {result.advice.map((a) => (
                    <li key={a} className="flex gap-2.5 text-[13.5px] leading-relaxed text-slate">
                      <Icon
                        name={result.urgency === 'Emergency' ? 'alert' : 'check'}
                        className={`mt-0.5 size-4 shrink-0 ${result.urgency === 'Emergency' ? 'text-rose' : 'text-teal'}`}
                        strokeWidth={2.2}
                      />
                      {a}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-soft/40 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-brand text-white shrink-0">
                      <Icon name="shield" className="size-5" />
                    </span>
                    <div>
                      <p className="text-[13.5px] font-semibold text-ink">Need clinical evaluation?</p>
                      <p className="text-[12px] text-slate">
                        Find verified nearby clinics, specialists & emergency helplines.
                      </p>
                    </div>
                  </div>
                  <Button as="link" to="/app/hospitals" size="sm" variant="dark">
                    Nearby Hospitals <Icon name="arrow" className="size-3.5" />
                  </Button>
                </div>

                <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-line bg-surface p-3.5">
                  <Icon name="alert" className="mt-px size-4 shrink-0 text-amber" />
                  <p className="text-[12.5px] leading-relaxed text-slate">{result.disclaimer}</p>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between border-t border-line px-5 py-4">
            <Button variant="ghost" disabled={step === 0 || analyse.pending} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step === 0 && (
              <Button disabled={!canSubmit} onClick={() => setStep(1)}>
                Continue <Icon name="arrow" className="size-4" />
              </Button>
            )}
            {step === 1 && (
              <Button disabled={analyse.pending} onClick={() => analyse.run()}>
                {analyse.pending ? 'Analysing…' : 'Run analysis'} <Icon name="arrow" className="size-4" />
              </Button>
            )}
            {step === 2 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setResult(null)
                    setStep(0)
                  }}
                >
                  New session
                </Button>
                <Button as="link" to="/app/hospitals" variant="secondary">
                  Find Hospitals
                </Button>
                <Button as="link" to="/app/chat">
                  Discuss in chat <Icon name="arrow" className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHead title="Session summary" />
            <dl className="divide-y divide-line text-[13px]">
              {[
                ['Symptoms', selected.length ? `${selected.length} selected` : 'None yet'],
                ['Severity', `${severity} / 10`],
                ['Red flags', result ? `${result.redFlags.length} matched` : '—'],
                ['Urgency', result ? result.urgency : '—'],
                ['Confidence', result ? `${Math.round(result.confidence * 100)}%` : '—'],
                ['Decided by', result ? (result.decidedBy === 'rules-engine' ? 'Rules engine' : 'Rules + AI') : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHead title="Pipeline trace" sub="What the request passed through" />
            <ol className="divide-y divide-line">
              {PIPELINE.map((s, i) => {
                // Stages 5-7 are skipped entirely when the rules engine escalates.
                const aiStage = i >= 4
                const skipped = result && result.aiProvider === 'none' && aiStage
                const done = result && !skipped
                return (
                  <li key={s} className="flex items-center gap-3 px-5 py-2.5">
                    <span
                      className={`grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold ${
                        done ? 'bg-teal-soft text-teal' : 'bg-surface text-muted ring-1 ring-line'
                      }`}
                    >
                      {done ? <Icon name="check" className="size-3" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="text-[13px] text-slate">{s}</span>
                    <span className="ml-auto text-[11.5px] text-muted">
                      {!result ? '—' : skipped ? 'bypassed' : 'done'}
                    </span>
                  </li>
                )
              })}
            </ol>
            {result?.aiProvider === 'none' && (
              <p className="border-t border-line px-5 py-3 text-[12px] leading-relaxed text-muted">
                Stages 5–7 were bypassed: escalation is time-critical, so no model was called.
              </p>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

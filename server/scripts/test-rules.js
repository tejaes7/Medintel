/**
 * Unit tests for the rules engine and the AI safety gate.
 *
 * These need no database, no network and no API key — that is the point. The safety-critical
 * path is pure, so it can be verified exhaustively and cheaply.
 *
 *   node scripts/test-rules.js
 */
import { evaluate, fallbackGuidance } from '../src/business/triage/rulesEngine.js'
import { extractFeatures } from '../src/business/triage/featureExtractor.js'
import { publicRuleTable, RED_FLAG_RULES } from '../src/business/triage/rules.js'
import { redact } from '../src/ai/redactor.js'
import { checkSafety, validateStructured, triageAiSchema } from '../src/ai/validator.js'
import { normalise, buildContext } from '../src/ai/pipeline.js'

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail) {
  if (condition) {
    passed += 1
  } else {
    failed += 1
    failures.push({ name, detail })
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 200)}` : ''}`)
  }
}

function section(t) {
  console.log(`\n\x1b[1m${t}\x1b[0m`)
}

const triage = (text, profile = {}, extra = {}) => evaluate({ text, ...extra }, profile)

// ── Emergency escalation ────────────────────────────────────────────────────
section('Emergency escalation')
{
  const cases = [
    ['chest pain + breathlessness', 'I have chest pain and I am short of breath', 'RF-01'],
    ['radiating chest pain', 'Chest pain radiating to my arm since this morning', 'RF-02'],
    ['stroke: slurred speech', 'My speech is slurred and I feel confused', 'RF-03'],
    ['stroke: facial droop', 'One side of my face is drooping', 'RF-03'],
    ['severe breathlessness', 'I cannot breathe properly, I am gasping', 'RF-04'],
    ['anaphylaxis', 'My throat is swelling and I have a rash all over', 'RF-05'],
    ['haemorrhage', 'I am vomiting blood', 'RF-06'],
    ['loss of consciousness', 'I fainted at work this morning', 'RF-07'],
    ['thunderclap headache', 'Sudden severe headache, the worst headache of my life', 'RF-08'],
    ['meningitis triad', 'I have a stiff neck with fever and the light hurts my eyes', 'RF-09'],
    ['self-harm intent', 'I want to hurt myself', 'RF-10'],
    ['non-blanching rash', 'I have purple spots that do not fade under pressure', 'RF-20'],
  ]

  for (const [label, text, expectedRule] of cases) {
    const v = triage(text)
    check(`${label} → Emergency`, v.urgency === 'Emergency', { text, got: v.urgency })
    check(`${label} → ${expectedRule} fires`, v.redFlags.some((f) => f.id === expectedRule), v.redFlags.map((f) => f.id))
    check(`${label} → AI is bypassed`, v.shouldConsultAI === false, v)
    check(`${label} → escalation flag set`, v.requiresImmediateEscalation === true, v)
  }
}

// ── Urgent escalation ───────────────────────────────────────────────────────
section('Urgent escalation')
{
  const fever = evaluate({ text: 'high fever for four days', temperatureC: 39.5, durationDays: 4 }, {})
  check('sustained high fever → Urgent', fever.urgency === 'Urgent', fever.urgency)
  check('sustained high fever → RF-11', fever.redFlags.some((f) => f.id === 'RF-11'), fever.redFlags)

  const infant = evaluate({ text: 'my baby has a fever' }, { age: 0.1 })
  check('infant fever → RF-12', infant.redFlags.some((f) => f.id === 'RF-12'), infant.redFlags)

  const abdo = triage('I have severe abdominal pain')
  check('severe abdominal pain → RF-13', abdo.redFlags.some((f) => f.id === 'RF-13'), abdo.redFlags)

  const asthma = triage('I am a little short of breath', { conditions: ['Mild asthma'] })
  check('breathlessness + asthma → RF-15', asthma.redFlags.some((f) => f.id === 'RF-15'), asthma.redFlags)
  check('breathlessness + asthma → Urgent', asthma.urgency === 'Urgent', asthma.urgency)

  const noAsthma = triage('I am a little short of breath', {})
  check('same symptom without asthma does NOT fire RF-15', !noAsthma.redFlags.some((f) => f.id === 'RF-15'), noAsthma.redFlags)

  const chronic = evaluate({ text: 'cough that will not go away', durationDays: 20 }, {})
  check('20-day duration → RF-16', chronic.redFlags.some((f) => f.id === 'RF-16'), chronic.redFlags)

  const pregnant = triage('I have a headache and I am pregnant')
  check('pregnancy + symptoms → RF-17', pregnant.redFlags.some((f) => f.id === 'RF-17'), pregnant.redFlags)

  const elderly = evaluate({ text: 'fever', temperatureC: 38.4 }, { age: 80 })
  check('fever in an 80-year-old → RF-19', elderly.redFlags.some((f) => f.id === 'RF-19'), elderly.redFlags)
}

// ── Negation must not create false emergencies ──────────────────────────────
section('Negation handling')
{
  const cases = [
    'I have a sore throat but no chest pain',
    'Cough and fever, without shortness of breath',
    'Headache, denies chest pain',
    'Sore throat. No chest pain. No shortness of breath.',
  ]
  for (const text of cases) {
    const v = triage(text)
    check(`negated: "${text.slice(0, 40)}…" is not an emergency`, v.urgency !== 'Emergency', {
      urgency: v.urgency,
      flags: v.redFlags.map((f) => f.id),
    })
  }

  // The negation window must not cross a clause boundary.
  const crossClause = triage('No fever. I have chest pain and shortness of breath.')
  check('negation does not leak across sentences', crossClause.urgency === 'Emergency', crossClause.urgency)
}

// ── Engine invariants ───────────────────────────────────────────────────────
section('Engine invariants')
{
  check('empty input is total (returns Self-care)', triage('').urgency === 'Self-care', triage('').urgency)
  check('gibberish is total', Boolean(triage('asdfgh qwerty').urgency))

  // Purity: same input, same output.
  const a = JSON.stringify(triage('sore throat and cough for three days'))
  const b = JSON.stringify(triage('sore throat and cough for three days'))
  check('engine is pure (identical output for identical input)', a === b)

  // Monotonicity: adding an emergency symptom can only raise urgency.
  const RANK = { 'Self-care': 1, Routine: 2, Urgent: 3, Emergency: 4 }
  const base = triage('I have a mild cough')
  const worse = triage('I have a mild cough and chest pain and shortness of breath')
  check('adding symptoms never lowers urgency', RANK[worse.urgency] >= RANK[base.urgency], {
    base: base.urgency,
    worse: worse.urgency,
  })

  // A throwing predicate must not take the engine down.
  const original = RED_FLAG_RULES[0].match
  RED_FLAG_RULES[0].match = () => {
    throw new Error('boom')
  }
  let survived = true
  try {
    triage('chest pain and shortness of breath')
  } catch {
    survived = false
  }
  RED_FLAG_RULES[0].match = original
  check('a throwing rule predicate does not crash the engine', survived)

  check('every rule has a unique id', new Set(RED_FLAG_RULES.map((r) => r.id)).size === RED_FLAG_RULES.length)
  check('public rule table leaks no predicates', publicRuleTable().every((r) => !('match' in r)))
  check('public rule table has every rule', publicRuleTable().length === RED_FLAG_RULES.length)
}

// ── Feature extraction ──────────────────────────────────────────────────────
section('Feature extraction')
{
  check('celsius parsed', extractFeatures({ text: 'temperature of 38.5 C' }).temperatureC === 38.5)
  check('fahrenheit converted', extractFeatures({ text: 'my temp is 102 F' }).temperatureC === 38.9)
  check('bare temperature parsed', extractFeatures({ text: 'temperature 39' }).temperatureC === 39)
  check('implausible temperature ignored', extractFeatures({ text: 'I drank 500 ml' }).temperatureC === null)

  check('days parsed', extractFeatures({ text: 'for 5 days' }).durationDays === 5)
  check('weeks converted to days', extractFeatures({ text: 'for 2 weeks' }).durationDays === 14)
  check('worded duration parsed', extractFeatures({ text: 'for three days' }).durationDays === 3)

  check('severity: severe', extractFeatures({ text: 'unbearable pain' }).severity === 'severe')
  check('severity: mild', extractFeatures({ text: 'a mild ache' }).severity === 'mild')

  check(
    'structured symptom input is trusted',
    extractFeatures({ text: 'nothing much', symptoms: ['chest_pain'] }).symptoms.has('chest_pain')
  )
  check(
    'respiratory condition detected from profile',
    extractFeatures({ text: 'x' }, { conditions: ['Moderate COPD'] }).hasRespiratoryCondition === true
  )
}

// ── Redaction ───────────────────────────────────────────────────────────────
section('Redaction (privacy at the AI boundary)')
{
  const cases = [
    ['email', 'contact me at aarav.menon@example.com', 'aarav.menon@example.com'],
    ['phone', 'call me on 9876543210', '9876543210'],
    ['aadhaar', 'my id is 1234 5678 9012', '1234 5678 9012'],
    ['MRN', 'MRN: ABC12345 on the form', 'ABC12345'],
    ['url', 'see https://portal.example.com/x', 'https://portal.example.com/x'],
    ['dob', 'born 14/08/1998', '14/08/1998'],
  ]
  for (const [label, input, secret] of cases) {
    const { text, redactions } = redact(input)
    check(`${label} is removed from the text`, !text.includes(secret), text)
    check(`${label} is reported in the redaction log`, redactions.length > 0, redactions)
  }

  const clean = redact('I have a sore throat and a mild fever')
  check('clinical text survives redaction unchanged', clean.text === 'I have a sore throat and a mild fever', clean.text)
  check('clean text reports no redactions', clean.redactions.length === 0, clean.redactions)
}

// ── Safety gate ─────────────────────────────────────────────────────────────
section('AI safety gate (banned content)')
{
  const unsafe = [
    ['dosage', 'Take 500 mg of the tablet'],
    ['frequency', 'Use it twice a day for a week'],
    ['latin frequency', 'Apply b.i.d. until symptoms resolve'],
    ['drug stem', 'Amoxicillin would be appropriate here'],
    ['common drug', 'You should take some paracetamol'],
    ['definitive diagnosis', 'You have bacterial pneumonia'],
    ['discourages care', "There is no need to see a doctor about this"],
  ]
  for (const [label, text] of unsafe) {
    check(`blocks: ${label}`, checkSafety(text).safe === false, text)
  }

  const safe = [
    'Rest and keep your fluid intake up over the next two days.',
    'Monitor your temperature twice daily and record it.',
    'A residual cough after a viral infection often lasts one to three weeks.',
    'Arrange to be seen by a clinician within 24 hours.',
  ]
  for (const text of safe) {
    check(`allows safe guidance: "${text.slice(0, 40)}…"`, checkSafety(text).safe === true, checkSafety(text).violations)
  }
}

// ── Structured validation ───────────────────────────────────────────────────
section('Structured response validation')
{
  const good = JSON.stringify({
    conditions: [{ name: 'Viral upper respiratory infection', likelihood: 0.7, note: 'Consistent with the onset.' }],
    advice: ['Rest and keep your fluid intake up.'],
    confidence: 0.7,
  })
  const okResult = validateStructured(good, triageAiSchema, {
    safetyText: (d) => [...d.conditions.map((c) => c.note), ...d.advice].join(' '),
  })
  check('valid payload passes both gates', okResult.ok === true, okResult)

  const fenced = '```json\n' + good + '\n```'
  check('fenced JSON is recovered', validateStructured(fenced, triageAiSchema).ok === true)

  check('non-JSON is rejected', validateStructured('I think you have a cold.', triageAiSchema).reason === 'unparseable')

  const badSchema = JSON.stringify({ conditions: [], advice: [], confidence: 5 })
  check('schema violation is rejected', validateStructured(badSchema, triageAiSchema).reason === 'schema')

  const unsafePayload = JSON.stringify({
    conditions: [{ name: 'Sinusitis', likelihood: 0.8, note: 'Amoxicillin 500 mg would help.' }],
    advice: ['Take 500 mg twice a day.'],
    confidence: 0.8,
  })
  const unsafeResult = validateStructured(unsafePayload, triageAiSchema, {
    safetyText: (d) => [...d.conditions.map((c) => c.note), ...d.advice].join(' '),
  })
  check('schema-valid but unsafe payload is rejected', unsafeResult.reason === 'safety', unsafeResult)
}

// ── Pipeline helpers ────────────────────────────────────────────────────────
section('Pipeline helpers')
{
  check('normalise collapses whitespace', normalise('a   b') === 'a b')
  check('normalise strips zero-width characters', normalise('a​b') === 'ab')
  check('normalise caps length at 4000', normalise('x'.repeat(9000)).length === 4000)

  check(
    'context includes clinically relevant profile only',
    buildContext({ age: 27, sex: 'Male', conditions: ['Mild asthma'], allergies: ['Penicillin'] }) ===
      'age 27; male; known conditions: Mild asthma; known allergies: Penicillin'
  )
  check('empty context is stated explicitly', buildContext({}) === 'no clinically relevant profile on file')
}

// ── Fallback guidance ───────────────────────────────────────────────────────
section('Degraded-mode guidance')
{
  for (const urgency of ['Emergency', 'Urgent', 'Routine', 'Self-care']) {
    const fb = fallbackGuidance(urgency, [])
    check(`${urgency} fallback provides advice`, fb.advice.length > 0, fb)
    check(`${urgency} fallback is safety-clean`, checkSafety(fb.advice.join(' ')).safe, checkSafety(fb.advice.join(' ')).violations)
  }
  check(
    'Emergency fallback tells the user to seek emergency care',
    /emergency care now/i.test(fallbackGuidance('Emergency', []).advice[0])
  )
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`)
console.log(`\x1b[1mRules & safety unit tests:\x1b[0m ${passed} passed, ${failed} failed`)
if (failed > 0) {
  console.log('\n\x1b[31mFailures:\x1b[0m')
  for (const f of failures) console.log(`  · ${f.name}`)
}
process.exit(failed === 0 ? 0 : 1)

/**
 * Turns free-text symptom input plus structured fields into the deterministic feature
 * object the rule predicates read. Deliberately keyword-based, not model-based: the whole
 * point of ADR-02 is that nothing probabilistic sits on the escalation path.
 *
 * Negation is handled explicitly — "no chest pain" must not set chest_pain.
 */

const SYMPTOM_LEXICON = {
  chest_pain: ['chest pain', 'chest tightness', 'chest pressure', 'pain in my chest', 'tight chest', 'crushing chest'],
  radiating_pain: ['radiating to my arm', 'pain in my left arm', 'jaw pain', 'pain spreading to', 'radiates to'],
  breathlessness: ['short of breath', 'shortness of breath', 'breathless', 'hard to breathe', 'difficulty breathing', 'wheez'],
  severe_breathlessness: ['cannot breathe', "can't breathe", 'gasping', 'struggling to breathe', 'unable to speak in full sentences'],
  unilateral_weakness: ['one side of my body', 'left side weak', 'right side weak', 'one-sided weakness', 'unilateral weakness', 'arm went numb'],
  facial_droop: ['face is drooping', 'facial droop', 'mouth drooping', 'one side of my face'],
  // Word order varies a lot in how people report this, and it is a stroke sign — cover both.
  speech_difficulty: [
    'slurred speech',
    'speech is slurred',
    'speech was slurred',
    'slurring my words',
    'cannot speak',
    "can't speak properly",
    'trouble speaking',
    'difficulty speaking',
    'words come out wrong',
  ],
  swelling_face_throat: ['throat is swelling', 'swollen throat', 'face is swollen', 'tongue swelling', 'throat closing'],
  rash: ['rash', 'hives', 'welts', 'skin eruption'],
  non_blanching_rash: ['rash that does not fade', "rash that doesn't fade", 'non-blanching', 'purple spots', 'glass test'],
  severe_bleeding: ['bleeding heavily', 'will not stop bleeding', "won't stop bleeding", 'uncontrolled bleeding', 'heavy bleeding'],
  vomiting_blood: ['vomiting blood', 'blood in my vomit', 'coughing up blood', 'blood in my stool', 'black stool'],
  loss_of_consciousness: ['passed out', 'fainted', 'blacked out', 'lost consciousness', 'unresponsive'],
  seizure: ['seizure', 'convulsion', 'fit', 'shaking uncontrollably'],
  headache: ['headache', 'head pain', 'migraine'],
  thunderclap: ['worst headache', 'worst headache of my life', 'sudden severe headache', 'thunderclap', 'came on instantly'],
  neck_stiffness: ['stiff neck', 'neck stiffness', 'cannot bend my neck', 'neck is rigid'],
  photophobia: ['light hurts', 'sensitive to light', 'photophobia', 'bright light hurts'],
  fever: ['fever', 'temperature', 'feverish', 'high temp', 'burning up', 'chills'],
  abdominal_pain: ['stomach pain', 'abdominal pain', 'belly pain', 'tummy pain', 'stomach ache', 'cramping in my abdomen'],
  persistent_vomiting: ['keep vomiting', 'cannot keep anything down', "can't keep anything down", 'vomiting repeatedly', 'constant vomiting'],
  no_urine_output: ['not passed urine', 'no urine', 'not urinating', 'cannot urinate', "haven't peed"],
  dizziness: ['dizzy', 'lightheaded', 'light-headed', 'room is spinning', 'vertigo'],
  weight_loss: ['losing weight', 'lost weight', 'weight loss'],
  night_sweats: ['night sweats', 'sweating at night', 'drenched at night'],
  self_harm: ['kill myself', 'end my life', 'suicidal', 'self harm', 'self-harm', 'want to die', 'hurt myself'],
  sore_throat: ['sore throat', 'throat pain', 'painful swallowing'],
  cough: ['cough', 'coughing'],
  fatigue: ['tired', 'fatigue', 'exhausted', 'no energy'],
  nausea: ['nausea', 'feel sick', 'queasy'],
  diarrhoea: ['diarrhoea', 'diarrhea', 'loose stools', 'watery stools'],
  runny_nose: ['runny nose', 'blocked nose', 'stuffy nose', 'congestion', 'sneezing'],
}

const NEGATORS = ['no ', 'not ', 'without ', 'denies ', 'never ', 'free of ', 'ruled out ']
const SEVERITY_MARKERS = {
  severe: ['severe', 'unbearable', 'excruciating', 'worst', '10/10', 'agonising', 'agonizing', 'intense'],
  moderate: ['moderate', 'quite bad', 'uncomfortable', 'bothering me'],
  mild: ['mild', 'slight', 'a little', 'minor', 'manageable'],
}

/** True when `phrase` appears in `text` preceded by a negator within the same clause. */
function isNegated(text, phrase) {
  const idx = text.indexOf(phrase)
  if (idx === -1) return false
  // Look back to the start of the clause (sentence or comma boundary).
  const clauseStart = Math.max(
    text.lastIndexOf('.', idx),
    text.lastIndexOf(',', idx),
    text.lastIndexOf(';', idx),
    -1
  )
  const window = text.slice(clauseStart + 1, idx)
  return NEGATORS.some((n) => window.includes(n))
}

function extractTemperature(text) {
  // "39.2 C", "39°C", "102 F", "temperature of 38.5"
  const celsius = text.match(/(\d{2}(?:\.\d)?)\s*(?:°\s*)?c\b/)
  if (celsius) {
    const v = Number(celsius[1])
    if (v >= 30 && v <= 45) return v
  }
  const fahrenheit = text.match(/(\d{2,3}(?:\.\d)?)\s*(?:°\s*)?f\b/)
  if (fahrenheit) {
    const v = Number(fahrenheit[1])
    if (v >= 90 && v <= 115) return Number((((v - 32) * 5) / 9).toFixed(1))
  }
  const bare = text.match(/temperature\s*(?:of|is|was|:)?\s*(\d{2}(?:\.\d)?)/)
  if (bare) {
    const v = Number(bare[1])
    if (v >= 30 && v <= 45) return v
  }
  return null
}

function extractDurationDays(text) {
  const m = text.match(/(?:for|since|past|last)?\s*(\d{1,3})\s*(hour|day|week|month)s?\b/)
  if (m) {
    const n = Number(m[1])
    const unit = m[2]
    if (unit === 'hour') return Number((n / 24).toFixed(2))
    if (unit === 'day') return n
    if (unit === 'week') return n * 7
    if (unit === 'month') return n * 30
  }
  const worded = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, ten: 10, fourteen: 14 }
  const w = text.match(/(?:for|since|past|last)\s+(a|one|two|three|four|five|six|seven|ten|fourteen)\s+(day|week|month)s?\b/)
  if (w) {
    const n = worded[w[1]]
    return w[2] === 'day' ? n : w[2] === 'week' ? n * 7 : n * 30
  }
  if (/\bday (\d{1,2})\b/.test(text)) return Number(text.match(/\bday (\d{1,2})\b/)[1])
  return null
}

function extractSeverity(text) {
  for (const [level, markers] of Object.entries(SEVERITY_MARKERS)) {
    if (markers.some((m) => text.includes(m))) return level
  }
  return null
}

const RESPIRATORY_CONDITIONS = ['asthma', 'copd', 'emphysema', 'bronchitis', 'cystic fibrosis']

/**
 * @param {{ text: string, durationDays?: number, temperatureC?: number, symptoms?: string[] }} input
 * @param {{ age?: number, sex?: string, conditions?: string[], allergies?: string[] }} profile
 * @returns feature object consumed by rule predicates
 */
export function extractFeatures(input, profile = {}) {
  const text = String(input.text ?? '').toLowerCase()
  const symptoms = new Set()
  const matchedPhrases = []

  for (const [symptom, phrases] of Object.entries(SYMPTOM_LEXICON)) {
    for (const phrase of phrases) {
      if (text.includes(phrase) && !isNegated(text, phrase)) {
        symptoms.add(symptom)
        matchedPhrases.push({ symptom, phrase })
        break
      }
    }
  }

  // Structured checkbox input from the client is trusted over text inference.
  for (const s of input.symptoms ?? []) if (SYMPTOM_LEXICON[s]) symptoms.add(s)

  const conditions = (profile.conditions ?? []).map((c) => String(c).toLowerCase())

  return {
    symptoms,
    matchedPhrases,
    temperatureC: input.temperatureC ?? extractTemperature(text),
    durationDays: input.durationDays ?? extractDurationDays(text),
    severity: extractSeverity(text),
    ageYears: profile.age ?? null,
    isPregnant: /\bpregnan/.test(text) || conditions.some((c) => c.includes('pregnan')),
    hasRespiratoryCondition: conditions.some((c) => RESPIRATORY_CONDITIONS.some((r) => c.includes(r))),
  }
}

export const KNOWN_SYMPTOMS = Object.keys(SYMPTOM_LEXICON)

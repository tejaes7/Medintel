/**
 * The red-flag rule table (ADR-02).
 *
 * This is the curated cost we accepted in exchange for never letting a probabilistic
 * component decide escalation. Every rule is data, not code: `match` is a pure predicate
 * over a normalised feature object, so the table can be reviewed by a clinician, unit
 * tested exhaustively, and one day moved into a database without touching the engine.
 *
 * Severity ordering (highest wins):
 *   emergency > urgent > routine > self-care
 */

export const URGENCY = {
  EMERGENCY: 'Emergency',
  URGENT: 'Urgent',
  ROUTINE: 'Routine',
  SELF_CARE: 'Self-care',
}

export const URGENCY_RANK = {
  [URGENCY.EMERGENCY]: 4,
  [URGENCY.URGENT]: 3,
  [URGENCY.ROUTINE]: 2,
  [URGENCY.SELF_CARE]: 1,
}

export const URGENCY_TONE = {
  [URGENCY.EMERGENCY]: 'rose',
  [URGENCY.URGENT]: 'amber',
  [URGENCY.ROUTINE]: 'teal',
  [URGENCY.SELF_CARE]: 'brand',
}

/** Helper: does the feature set contain every listed symptom? */
const all = (f, ...keys) => keys.every((k) => f.has(k))
/** Helper: does the feature set contain any listed symptom? */
const any = (f, ...keys) => keys.some((k) => f.has(k))

export const RED_FLAG_RULES = [
  {
    id: 'RF-01',
    rule: 'Chest pain with shortness of breath',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Possible acute coronary syndrome or pulmonary embolism; both are time-critical.',
    match: (f) => all(f.symptoms, 'chest_pain', 'breathlessness'),
  },
  {
    id: 'RF-02',
    rule: 'Chest pain radiating to arm, jaw or back',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Classic referred pattern for myocardial infarction.',
    match: (f) => all(f.symptoms, 'chest_pain', 'radiating_pain'),
  },
  {
    id: 'RF-03',
    rule: 'Sudden one-sided weakness, facial droop or speech difficulty',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Stroke window is measured in minutes.',
    match: (f) => any(f.symptoms, 'unilateral_weakness', 'facial_droop', 'speech_difficulty'),
  },
  {
    id: 'RF-04',
    rule: 'Severe difficulty breathing or inability to speak in full sentences',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Respiratory compromise can deteriorate rapidly.',
    match: (f) => f.symptoms.has('severe_breathlessness'),
  },
  {
    id: 'RF-05',
    rule: 'Signs of anaphylaxis (facial or throat swelling with rash or breathlessness)',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Airway compromise is imminent without emergency treatment.',
    match: (f) => f.symptoms.has('swelling_face_throat') && any(f.symptoms, 'rash', 'breathlessness'),
  },
  {
    id: 'RF-06',
    rule: 'Uncontrolled bleeding or vomiting blood',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Haemorrhage risks rapid haemodynamic collapse.',
    match: (f) => any(f.symptoms, 'severe_bleeding', 'vomiting_blood'),
  },
  {
    id: 'RF-07',
    rule: 'Loss of consciousness, seizure or unresponsiveness',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Requires in-person assessment for cause and airway safety.',
    match: (f) => any(f.symptoms, 'loss_of_consciousness', 'seizure'),
  },
  {
    id: 'RF-08',
    rule: 'Sudden severe headache described as the worst ever',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Thunderclap headache suggests subarachnoid haemorrhage.',
    match: (f) => all(f.symptoms, 'headache', 'thunderclap'),
  },
  {
    id: 'RF-09',
    rule: 'Stiff neck with fever and light sensitivity',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Meningitis triad; mortality rises steeply with delay.',
    match: (f) => all(f.symptoms, 'neck_stiffness', 'fever') && f.symptoms.has('photophobia'),
  },
  {
    id: 'RF-10',
    rule: 'Expressed intent to self-harm',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Safety-critical; must route to a human, never to an AI reply.',
    match: (f) => f.symptoms.has('self_harm'),
  },

  {
    id: 'RF-11',
    rule: 'Fever above 39 °C persisting three days or more',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Sustained high fever suggests a bacterial process needing assessment.',
    match: (f) => f.temperatureC != null && f.temperatureC >= 39 && (f.durationDays ?? 0) >= 3,
  },
  {
    id: 'RF-12',
    rule: 'Fever in an infant under three months',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Neonatal fever is treated as sepsis until proven otherwise.',
    match: (f) => f.symptoms.has('fever') && f.ageYears != null && f.ageYears < 0.25,
  },
  {
    id: 'RF-13',
    rule: 'Severe abdominal pain, or abdominal pain with persistent vomiting',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Possible surgical abdomen.',
    match: (f) =>
      (f.symptoms.has('abdominal_pain') && f.severity === 'severe') ||
      all(f.symptoms, 'abdominal_pain', 'persistent_vomiting'),
  },
  {
    id: 'RF-14',
    rule: 'Signs of dehydration (no urine output, dizziness on standing)',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Volume depletion can progress to renal injury.',
    match: (f) => any(f.symptoms, 'no_urine_output') || all(f.symptoms, 'dizziness', 'persistent_vomiting'),
  },
  {
    id: 'RF-15',
    rule: 'Asthma or COPD history presenting with any breathlessness',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Known airway disease lowers the threshold for escalation.',
    match: (f) => f.symptoms.has('breathlessness') && f.hasRespiratoryCondition,
  },
  {
    id: 'RF-16',
    rule: 'Symptoms persisting beyond fourteen days',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Chronicity changes the differential and warrants examination.',
    match: (f) => (f.durationDays ?? 0) >= 14,
  },
  {
    id: 'RF-17',
    rule: 'New or worsening symptoms in pregnancy',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Pregnancy alters both risk and safe management.',
    match: (f) => f.isPregnant && f.symptoms.size > 0,
  },
  {
    id: 'RF-18',
    rule: 'Unexplained weight loss with night sweats',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Constitutional symptoms warrant investigation.',
    match: (f) => all(f.symptoms, 'weight_loss', 'night_sweats'),
  },
  {
    id: 'RF-19',
    rule: 'Fever above 38 °C in a patient over seventy-five',
    action: 'Urgent review',
    urgency: URGENCY.URGENT,
    rationale: 'Older adults decompensate with fewer warning signs.',
    match: (f) => f.temperatureC != null && f.temperatureC >= 38 && f.ageYears != null && f.ageYears >= 75,
  },
  {
    id: 'RF-20',
    rule: 'Rash that does not fade under pressure',
    action: 'Immediate escalation',
    urgency: URGENCY.EMERGENCY,
    rationale: 'Non-blanching rash is a meningococcal sepsis marker.',
    match: (f) => f.symptoms.has('non_blanching_rash'),
  },
]

/** Rules exposed to the client for the "how triage works" panel. No predicates leak out. */
export function publicRuleTable() {
  return RED_FLAG_RULES.map(({ id, rule, action, urgency, rationale }) => ({
    id,
    rule,
    action,
    urgency,
    rationale,
    tone: URGENCY_TONE[urgency],
  }))
}

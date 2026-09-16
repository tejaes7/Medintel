/**
 * End-to-end smoke test. Exercises every endpoint against a running server and asserts the
 * architecture's load-bearing claims — most importantly that the rules engine, not the AI,
 * owns escalation, and that the system still answers correctly with no AI provider configured.
 *
 *   node scripts/smoke.js            (defaults to http://localhost:4000)
 *   BASE=http://host:port node scripts/smoke.js
 */
const BASE = process.env.BASE ?? 'http://localhost:4000'

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail) {
  if (condition) {
    passed += 1
    console.log(`  \x1b[32mPASS\x1b[0m  ${name}`)
  } else {
    failed += 1
    failures.push({ name, detail })
    console.log(`  \x1b[31mFAIL\x1b[0m  ${name}${detail ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ''}`)
  }
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`)
}

let accessToken = null

async function call(method, path, { body, token = accessToken, raw } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body && !raw) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: raw ? body : body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => null)
  return { status: res.status, ...json }
}

async function main() {
  console.log(`\x1b[1mMedIntel API smoke test\x1b[0m  →  ${BASE}\n`)

  // ── Health ────────────────────────────────────────────────────────────────
  section('Health & discovery')
  const health = await call('GET', '/api/health')
  check('GET /api/health returns 200', health.status === 200, health)
  check('database is connected', health.data?.database?.status === 'connected', health.data?.database)
  check('cache driver reports healthy', health.data?.cache?.healthy === true, health.data?.cache)
  check('queue is reported', Boolean(health.data?.queue?.driver), health.data?.queue)
  check('ai provider health is listed', Array.isArray(health.data?.ai?.providers), health.data?.ai)
  const aiConfigured = health.data?.ai?.configured === true
  console.log(`  \x1b[2m(AI providers configured: ${aiConfigured})\x1b[0m`)

  const index = await call('GET', '/api')
  check('GET /api lists endpoints', Array.isArray(index.data?.endpoints), index)

  // ── Rules engine, unauthenticated ─────────────────────────────────────────
  section('Rules engine (public)')
  const rules = await call('GET', '/api/triage/rules')
  check('GET /api/triage/rules returns the table', rules.data?.rules?.length >= 20, rules.data?.rules?.length)
  check(
    'every rule has an id, action and urgency',
    rules.data?.rules?.every((r) => r.id && r.action && r.urgency),
    rules.data?.rules?.[0]
  )

  // ── Auth ──────────────────────────────────────────────────────────────────
  section('Authentication')
  const email = `smoke.${Date.now()}@medintel.test`
  const password = 'Str0ngPassw0rd!'

  const badRegister = await call('POST', '/api/auth/register', { body: { name: 'X', email: 'nope', password: '123' } })
  check('register rejects invalid payload with 422', badRegister.status === 422, badRegister.error)
  check('validation error names the failing fields', Array.isArray(badRegister.error?.details?.issues), badRegister.error)

  const reg = await call('POST', '/api/auth/register', {
    body: {
      name: 'Aarav Menon',
      email,
      password,
      age: 27,
      sex: 'Male',
      allergies: ['Penicillin', 'Dust mites'],
      conditions: ['Mild asthma'],
    },
  })
  check('register returns 201', reg.status === 201, reg.error)
  check('register returns an access token', Boolean(reg.data?.tokens?.accessToken), reg.data)
  check('register computes initials', reg.data?.user?.initials === 'AM', reg.data?.user)
  accessToken = reg.data?.tokens?.accessToken
  const refreshToken = reg.data?.tokens?.refreshToken

  const dupe = await call('POST', '/api/auth/register', { body: { name: 'Aarav Menon', email, password } })
  check('duplicate email returns 409', dupe.status === 409, dupe.error)

  const hospReg = await call('POST', '/api/auth/register', {
    body: {
      name: 'Smoke Test Clinic',
      email: `clinic.${Date.now()}@medintel.test`,
      password,
      role: 'hospital',
    },
  })
  check('register hospital role returns 201', hospReg.status === 201, hospReg.error)
  check('register hospital role assigns role', hospReg.data?.user?.role === 'hospital', hospReg.data?.user)

  const badLogin = await call('POST', '/api/auth/login', { body: { email, password: 'wrongpassword' } })
  check('wrong password returns 401', badLogin.status === 401, badLogin.error)
  check('wrong password does not reveal whether the user exists', badLogin.error?.code === 'INVALID_CREDENTIALS')

  const login = await call('POST', '/api/auth/login', { body: { email, password } })
  check('login returns 200 with tokens', login.status === 200 && Boolean(login.data?.tokens?.accessToken), login.error)
  accessToken = login.data.tokens.accessToken

  const noToken = await call('GET', '/api/auth/me', { token: null })
  check('protected route without a token returns 401', noToken.status === 401, noToken.error)

  const badToken = await call('GET', '/api/auth/me', { token: 'not.a.jwt' })
  check('protected route with a bad token returns 401', badToken.status === 401, badToken.error)

  const me = await call('GET', '/api/auth/me')
  check('GET /api/auth/me returns the profile', me.data?.email === email, me.data)

  const refreshed = await call('POST', '/api/auth/refresh', { body: { refreshToken } })
  check('refresh issues a new access token', Boolean(refreshed.data?.tokens?.accessToken), refreshed.error)

  // ── Triage: the safety claim ──────────────────────────────────────────────
  section('Triage — rules engine owns escalation (ADR-02)')

  const emergency = await call('POST', '/api/triage/analyse', {
    body: { text: 'I have severe chest pain and I am short of breath, it started an hour ago' },
  })
  check('emergency case returns 201', emergency.status === 201, emergency.error)
  check('emergency urgency is Emergency', emergency.data?.urgency === 'Emergency', emergency.data?.urgency)
  check('emergency matched a red flag', emergency.data?.redFlags?.length > 0, emergency.data?.redFlags)
  check('RF-01 fired for chest pain + breathlessness', emergency.data?.redFlags?.some((f) => f.id === 'RF-01'), emergency.data?.redFlags)
  check(
    'emergency decided by rules-engine, NOT the AI',
    emergency.data?.decidedBy === 'rules-engine',
    emergency.data?.decidedBy
  )
  check('emergency bypassed the AI entirely', emergency.data?.aiProvider === 'none', emergency.data?.aiProvider)
  check('emergency advice tells the user to seek emergency care', /emergency care now/i.test(emergency.data?.advice?.[0] ?? ''), emergency.data?.advice)
  check('emergency carries the disclaimer', Boolean(emergency.data?.disclaimer), emergency.data?.disclaimer)

  const stroke = await call('POST', '/api/triage/analyse', {
    body: { text: 'My speech is slurred and one side of my face is drooping' },
  })
  check('stroke signs escalate to Emergency', stroke.data?.urgency === 'Emergency', stroke.data?.urgency)
  check('RF-03 fired for stroke signs', stroke.data?.redFlags?.some((f) => f.id === 'RF-03'), stroke.data?.redFlags)

  const selfHarm = await call('POST', '/api/triage/analyse', {
    body: { text: 'I have been feeling low and I want to hurt myself' },
  })
  check('self-harm intent escalates to Emergency', selfHarm.data?.urgency === 'Emergency', selfHarm.data?.urgency)
  check('self-harm never reaches the AI', selfHarm.data?.aiProvider === 'none', selfHarm.data?.aiProvider)

  const negated = await call('POST', '/api/triage/analyse', {
    body: { text: 'I have a sore throat and a cough, but no chest pain and no shortness of breath' },
  })
  check('negation is respected — no false emergency', negated.data?.urgency !== 'Emergency', negated.data)
  check('negated red flags list is empty', (negated.data?.redFlags ?? []).length === 0, negated.data?.redFlags)

  const fever = await call('POST', '/api/triage/analyse', {
    body: { text: 'I have had a fever of 39.5 C for 4 days now with body aches', temperatureC: 39.5, durationDays: 4 },
  })
  check('sustained high fever escalates to Urgent', fever.data?.urgency === 'Urgent', fever.data?.urgency)
  check('RF-11 fired for fever duration', fever.data?.redFlags?.some((f) => f.id === 'RF-11'), fever.data?.redFlags)

  const asthma = await call('POST', '/api/triage/analyse', {
    body: { text: 'I am a bit short of breath today and wheezing slightly' },
  })
  check(
    'profile asthma lowers the escalation threshold (RF-15)',
    asthma.data?.redFlags?.some((f) => f.id === 'RF-15'),
    asthma.data?.redFlags
  )

  const routine = await call('POST', '/api/triage/analyse', {
    body: { text: 'I have had a runny nose, a mild sore throat and a cough for the past three days' },
  })
  check('mild case returns 201', routine.status === 201, routine.error)
  check('mild case is not an emergency', routine.data?.urgency !== 'Emergency', routine.data?.urgency)
  if (aiConfigured) {
    check('AI enriched the routine case with conditions', routine.data?.conditions?.length > 0, routine.data)
    check('AI provenance is recorded', routine.data?.decidedBy === 'ai-assisted', routine.data?.decidedBy)
    const sum = (routine.data?.conditions ?? []).reduce((t, c) => t + c.likelihood, 0)
    check('condition likelihoods are normalised to ~1', Math.abs(sum - 1) < 0.05, sum)
    const joined = JSON.stringify(routine.data)
    check('no dosage leaked past the safety gate', !/\b\d+\s?(mg|ml|mcg)\b/i.test(joined))
  } else {
    check('degraded gracefully with no AI provider', routine.data?.degraded === true, routine.data)
    check('degraded response still carries safe advice', routine.data?.advice?.length > 0, routine.data?.advice)
    console.log('  \x1b[2m(AI-enrichment assertions skipped — no provider key set)\x1b[0m')
  }

  const shortText = await call('POST', '/api/triage/analyse', { body: { text: 'sick' } })
  check('too-short symptom text returns 422', shortText.status === 422, shortText.error)

  const sessions = await call('GET', '/api/triage/sessions?limit=5')
  check('GET /api/triage/sessions lists sessions', Array.isArray(sessions.data) && sessions.data.length > 0, sessions)
  check('session list reports a total in meta', typeof sessions.meta?.total === 'number', sessions.meta)

  const latest = await call('GET', '/api/triage/sessions/latest')
  check('GET /api/triage/sessions/latest returns a session', Boolean(latest.data?.id), latest.data)

  const one = await call('GET', `/api/triage/sessions/${emergency.data.id}`)
  check('GET a single session by id works', one.data?.id === emergency.data.id, one.data)

  const badId = await call('GET', '/api/triage/sessions/not-an-id')
  check('malformed id returns 422', badId.status === 422, badId.error)

  // ── Chat ──────────────────────────────────────────────────────────────────
  section('Chat')
  const convo = await call('POST', '/api/chat/conversations')
  check('starting a conversation returns 201', convo.status === 201, convo.error)
  check('conversation opens with a bot greeting', convo.data?.messages?.[0]?.from === 'bot', convo.data?.messages?.[0])

  const chatEmergency = await call('POST', '/api/chat/messages', {
    body: { conversationId: convo.data.id, message: 'I suddenly cannot breathe and my throat is swelling' },
  })
  check('chat emergency returns 201', chatEmergency.status === 201, chatEmergency.error)
  check('chat escalated by the rules engine', chatEmergency.data?.escalated === true, chatEmergency.data)
  check('chat escalation bypassed the AI', chatEmergency.data?.provider === 'none', chatEmergency.data?.provider)
  const escalationReply = chatEmergency.data?.conversation?.messages?.find((m) => m.provider === 'rules-engine')
  check('escalation reply came from the rules engine', Boolean(escalationReply), chatEmergency.data?.conversation?.messages)
  check('every chat turn ends with the disclaimer', chatEmergency.data?.conversation?.messages?.at(-1)?.meta === true)

  const chatNormal = await call('POST', '/api/chat/messages', {
    body: { conversationId: convo.data.id, message: 'How long does a cough usually last after a cold?' },
  })
  check('normal chat message returns 201', chatNormal.status === 201, chatNormal.error)
  check('normal chat message is not escalated', chatNormal.data?.escalated === false, chatNormal.data)
  if (aiConfigured) {
    check('AI answered the chat turn', chatNormal.data?.degraded === false, chatNormal.data)
  } else {
    check('chat degraded safely with no AI provider', chatNormal.data?.degraded === true, chatNormal.data)
  }

  const emptyMsg = await call('POST', '/api/chat/messages', { body: { message: '' } })
  check('empty chat message returns 422', emptyMsg.status === 422, emptyMsg.error)

  const convos = await call('GET', '/api/chat/conversations')
  check('conversations list is returned', Array.isArray(convos.data) && convos.data.length > 0, convos)

  // ── Reminders ─────────────────────────────────────────────────────────────
  section('Reminders')
  const reminder = await call('POST', '/api/reminders', {
    body: { drug: 'Montelukast', dosage: '10 mg', time: '21:00', frequency: 'daily' },
  })
  check('creating a reminder returns 201', reminder.status === 201, reminder.error)
  check('doses were materialised for the coming week', reminder.data?.doses?.length > 0, reminder.data?.doses?.length)
  check('a next dose is computed', Boolean(reminder.data?.nextDoseId), reminder.data)
  check('adherence starts as null, not zero', reminder.data?.adherence === null, reminder.data?.adherence)

  const weeklyBad = await call('POST', '/api/reminders', {
    body: { drug: 'Vitamin D3', time: '09:00', frequency: 'weekly' },
  })
  check('weekly reminder without days returns 422', weeklyBad.status === 422, weeklyBad.error)

  const weekly = await call('POST', '/api/reminders', {
    body: { drug: 'Vitamin D3', dosage: '60000 IU', time: '09:00', frequency: 'weekly', daysOfWeek: [0] },
  })
  check('weekly reminder with days is created', weekly.status === 201, weekly.error)
  check('weekly frequency is described for the UI', /Weekly/.test(weekly.data?.freq ?? ''), weekly.data?.freq)

  const badTime = await call('POST', '/api/reminders', { body: { drug: 'X', time: '25:99' } })
  check('invalid time format returns 422', badTime.status === 422, badTime.error)

  const ack = await call('POST', `/api/reminders/${reminder.data.id}/doses/${reminder.data.nextDoseId}`, {
    body: { status: 'taken' },
  })
  check('acknowledging a dose returns 200', ack.status === 200, ack.error)
  check('adherence is now 1.0 after one taken dose', ack.data?.adherence === 1, ack.data?.adherence)
  check('adherence tone is teal at 100%', ack.data?.tone === 'teal', ack.data?.tone)

  const patched = await call('PATCH', `/api/reminders/${reminder.data.id}`, { body: { time: '22:00' } })
  check('updating a reminder returns 200', patched.status === 200 && patched.data?.time === '22:00', patched.error)

  const reminders = await call('GET', '/api/reminders')
  check('reminders list returns both reminders', reminders.data?.length === 2, reminders.data?.length)

  const del = await call('DELETE', `/api/reminders/${weekly.data.id}`)
  check('deleting a reminder returns 200', del.status === 200 && del.data?.deleted === true, del.error)

  // ── Reports ───────────────────────────────────────────────────────────────
  section('Reports')
  const form = new FormData()
  const reportText = [
    'APOLLO DIAGNOSTICS — COMPLETE BLOOD COUNT',
    'Patient: test  MRN: ABC12345  Phone: 9876543210',
    'Haemoglobin      13.8 g/dL   (13.0 - 17.0)',
    'WBC              11.4 x10^9/L (4.0 - 11.0)',
    'Platelets        250 x10^9/L (150 - 410)',
  ].join('\n')
  form.append('file', new Blob([reportText], { type: 'text/plain' }), 'cbc.txt')
  form.append('name', 'Complete Blood Count')
  form.append('lab', 'Apollo Diagnostics')

  const uploadRes = await fetch(`${BASE}/api/reports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const upload = { status: uploadRes.status, ...(await uploadRes.json()) }
  check('uploading a report returns 201', upload.status === 201, upload.error)
  check('report is queued, not processed synchronously', upload.data?.status === 'Queued', upload.data?.status)

  // The queue is asynchronous by design — wait for it to settle.
  await new Promise((r) => setTimeout(r, aiConfigured ? 12000 : 3000))
  const processed = await call('GET', `/api/reports/${upload.data.id}`)
  check('report left the Queued state', processed.data?.status !== 'Queued', processed.data?.status)
  if (aiConfigured) {
    check('report was summarised', processed.data?.status === 'Summarised', processed.data)
    check('out-of-range WBC was flagged', processed.data?.flags > 0, processed.data?.findings)
  } else {
    check('report failed with a clear reason when AI is absent', Boolean(processed.data?.failureReason), processed.data)
  }

  const badUpload = new FormData()
  badUpload.append('file', new Blob(['x'], { type: 'application/x-msdownload' }), 'bad.exe')
  const badUploadRes = await fetch(`${BASE}/api/reports`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: badUpload,
  })
  check('unsupported file type is rejected', badUploadRes.status === 422, badUploadRes.status)

  const reportList = await call('GET', '/api/reports')
  check('reports list is returned', Array.isArray(reportList.data), reportList)

  // ── History ───────────────────────────────────────────────────────────────
  section('Unified history')
  const history = await call('GET', '/api/history?limit=50')
  check('history returns events', history.data?.length > 0, history.data?.length)
  check('history contains the account-created event', history.data?.some((e) => e.kind === 'Account'), history.data)
  check('history contains triage events', history.data?.some((e) => e.kind === 'Triage'), history.data)
  check('history contains a medication event', history.data?.some((e) => e.kind === 'Medication'), history.data)
  check('history contains a report event', history.data?.some((e) => e.kind === 'Report'), history.data)
  check('history dates are pre-formatted for the UI', /^\d{2} \w{3,4} \d{4}$/.test(history.data?.[0]?.date ?? ''), history.data?.[0])

  const filtered = await call('GET', '/api/history?kind=Triage')
  check('history filters by kind', filtered.data?.every((e) => e.kind === 'Triage'), filtered.data)

  // ── Profile ───────────────────────────────────────────────────────────────
  section('Profile')
  const profile = await call('GET', '/api/profile')
  check('profile returns stored conditions', profile.data?.conditions?.includes('Mild asthma'), profile.data)

  const updated = await call('PATCH', '/api/profile', { body: { allergies: ['Penicillin', 'Pollen'] } })
  check('profile update returns 200', updated.status === 200, updated.error)
  check('allergies were replaced', updated.data?.allergies?.includes('Pollen'), updated.data?.allergies)

  const badPatch = await call('PATCH', '/api/profile', { body: { unknownField: 'x' } })
  check('unknown profile field is rejected', badPatch.status === 422, badPatch.error)

  // ── Hospitals & Appointments ─────────────────────────────────────────────
  section('Hospitals, Doctors & Appointment Booking')
  const hospitals = await call('GET', '/api/hospitals?city=Bangalore')
  check('hospitals search returns nearby facilities', hospitals.data?.hospitals?.length > 0, hospitals.data?.hospitals?.length)
  check('cities and departments list is returned', hospitals.data?.cities?.includes('Bangalore'), hospitals.data?.cities)

  const hospitalId = hospitals.data?.hospitals?.[0]?.id
  const hospDetails = await call('GET', `/api/hospitals/${hospitalId}`)
  check('hospital details includes doctor roster and events', hospDetails.data?.doctors?.length > 0, hospDetails.data)
  check('doctor has qualification and department', Boolean(hospDetails.data?.doctors?.[0]?.qualification), hospDetails.data?.doctors?.[0])

  const doctorToBook = hospDetails.data?.doctors?.[0]
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  let apptDateObj = new Date(Date.now() + 86400000 * 3)
  while (doctorToBook.availableDays?.length && !doctorToBook.availableDays.includes(DAY_NAMES[apptDateObj.getUTCDay()])) {
    apptDateObj = new Date(apptDateObj.getTime() + 86400000)
  }
  const apptDate = apptDateObj.toISOString().split('T')[0]
  const testSlot = `04:${String(Math.floor(Math.random() * 40) + 10).padStart(2, '0')} PM`
  const booking = await call('POST', '/api/hospitals/appointments', {
    body: { doctorId: doctorToBook.id, appointmentDate: apptDate, timeSlot: testSlot, reason: 'Routine checkup' },
  })
  check('booking an appointment returns 201', booking.status === 201, booking.error)
  check('appointment status is initially Booked', booking.data?.status === 'Booked', booking.data?.status)

  const doubleBook = await call('POST', '/api/hospitals/appointments', {
    body: { doctorId: doctorToBook.id, appointmentDate: apptDate, timeSlot: testSlot, reason: 'Conflicting request' },
  })
  check('double booking same doctor and slot is rejected', doubleBook.status === 400 || doubleBook.status === 422, doubleBook.status)

  const myAppts = await call('GET', '/api/hospitals/appointments/my')
  check('patient lists their booked appointments', myAppts.data?.length > 0, myAppts.data?.length)

  // Hospital Actor tests
  const hospLogin = await call('POST', '/api/auth/login', {
    body: { email: 'hospital@example.com', password: 'MedIntel2025!' },
  })
  const hospToken = hospLogin.data?.tokens?.accessToken
  check('hospital actor login returns token', Boolean(hospToken), hospLogin.error)

  const newDoc = await call('POST', '/api/hospitals/doctors', {
    token: hospToken,
    body: { name: 'Dr. Sameer Joshi', qualification: 'MD Neurology', department: 'Neurology', fee: 850 },
  })
  check('hospital adds doctor to roster', newDoc.status === 201, newDoc.error)

  const newEvt = await call('POST', '/api/hospitals/events', {
    token: hospToken,
    body: { title: 'Blood Donation Camp 2026', type: 'Blood Donation', date: apptDate, location: 'Apollo Main' },
  })
  check('hospital posts blood donation drive', newEvt.status === 201, newEvt.error)

  const hospAppts = await call('GET', '/api/hospitals/manage/appointments', { token: hospToken })
  check('hospital views incoming patient appointments', hospAppts.data?.length > 0, hospAppts.data?.length)

  const apptToConfirm = hospAppts.data?.find(a => a.status === 'Booked')?.id || hospAppts.data?.[0]?.id
  if (apptToConfirm) {
    const confirmAppt = await call('PATCH', `/api/hospitals/manage/appointments/${apptToConfirm}`, {
      token: hospToken,
      body: { status: 'Confirmed' },
    })
    check('hospital confirms patient appointment', confirmAppt.data?.status === 'Confirmed', confirmAppt.error || confirmAppt.data?.status)
  }

  const profileUpdate = await call('POST', '/api/hospitals/my-profile', {
    token: hospToken,
    body: {
      address: '154/11 Bannerghatta Road, Phase 2',
      emergencyPhone: '1066',
      departments: ['Cardiology', 'Neurology', 'Pediatrics', 'Oncology', 'Emergency Medicine'],
    },
  })
  check('hospital updates facility profile', profileUpdate.status === 200 && profileUpdate.data?.departments?.includes('Emergency Medicine'), profileUpdate.error)

  const myHospProfile = await call('GET', '/api/hospitals/my-profile', { token: hospToken })
  check('hospital gets updated facility profile', myHospProfile.data?.hospital?.address === '154/11 Bannerghatta Road, Phase 2', myHospProfile.error)
  // ── Ownership isolation ───────────────────────────────────────────────────
  section('Per-resource ownership (RBAC)')
  const other = await call('POST', '/api/auth/register', {
    body: { name: 'Other Person', email: `other.${Date.now()}@medintel.test`, password },
  })
  const otherToken = other.data.tokens.accessToken

  const steal = await call('GET', `/api/triage/sessions/${emergency.data.id}`, { token: otherToken })
  check('another user cannot read your triage session', steal.status === 404, steal.status)

  const stealReport = await call('GET', `/api/reports/${upload.data.id}`, { token: otherToken })
  check('another user cannot read your report', stealReport.status === 404, stealReport.status)

  const stealDelete = await call('DELETE', `/api/reminders/${reminder.data.id}`, { token: otherToken })
  check('another user cannot delete your reminder', stealDelete.status === 404, stealDelete.status)

  const otherHistory = await call('GET', '/api/history', { token: otherToken })
  check('history is scoped to the owner', otherHistory.data?.every((e) => e.kind === 'Account'), otherHistory.data)

  // ── Envelope & error handling ─────────────────────────────────────────────
  section('Response envelope')
  const missing = await call('GET', '/api/does-not-exist')
  check('unknown route returns 404 in the error envelope', missing.status === 404 && missing.ok === false, missing)
  check('errors carry a machine-readable code', Boolean(missing.error?.code), missing.error)
  check('every response carries a request id', Boolean(missing.meta?.requestId), missing.meta)

  // ── Logout revocation ─────────────────────────────────────────────────────
  section('Logout revokes refresh tokens')
  await call('POST', '/api/auth/logout')
  const staleRefresh = await call('POST', '/api/auth/refresh', { body: { refreshToken } })
  check('refresh token is rejected after logout', staleRefresh.status === 401, staleRefresh.error)
  check('revocation is reported distinctly', staleRefresh.error?.code === 'REVOKED_REFRESH_TOKEN', staleRefresh.error)

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`\x1b[1mResult:\x1b[0m ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.log('\n\x1b[31mFailures:\x1b[0m')
    for (const f of failures) console.log(`  · ${f.name}`)
  }
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('\n\x1b[31mSmoke test crashed:\x1b[0m', err.message)
  console.error(`Is the server running at ${BASE}?`)
  process.exit(1)
})

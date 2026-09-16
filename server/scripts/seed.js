/**
 * Seeds demo accounts and sample hospital data so the UI can be demonstrated immediately.
 *
 *   npm run seed
 *
 * Safe to re-run: existing demo accounts and sample hospital data are refreshed.
 */
import bcrypt from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from '../src/data/db.js'
import { initCache } from '../src/data/cache/index.js'
import {
  User,
  TriageSession,
  Conversation,
  Report,
  Reminder,
  TimelineEvent,
  Hospital,
  Doctor,
  HospitalEvent,
  Appointment,
} from '../src/data/models/index.js'
import { logger } from '../src/shared/logger.js'

const DEMO_EMAIL = 'aarav.menon@example.com'
const DEMO_PASSWORD = 'MedIntel2025!'

const HOSP_EMAIL = 'hospital@example.com'
const HOSP_PASSWORD = 'MedIntel2025!'

const daysAgo = (n) => new Date(Date.now() - n * 86400000)
const daysAhead = (n) => new Date(Date.now() + n * 86400000)

async function seed() {
  await connectDatabase()
  await initCache()

  // 1. Clear existing demo data
  await Promise.all([
    User.deleteMany({ email: { $in: [DEMO_EMAIL, HOSP_EMAIL, 'apex@example.com', 'manipal@example.com'] } }),
    Hospital.deleteMany({}),
    Doctor.deleteMany({}),
    HospitalEvent.deleteMany({}),
    Appointment.deleteMany({}),
    TriageSession.deleteMany({}),
    Conversation.deleteMany({}),
    Report.deleteMany({}),
    Reminder.deleteMany({}),
    TimelineEvent.deleteMany({}),
  ])

  logger.info('cleared existing demo accounts and sample hospitals')

  // 2. Create Patient User
  const user = await User.create({
    name: 'Aarav Menon',
    email: DEMO_EMAIL,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    role: 'patient',
    profile: { age: 27, sex: 'Male', allergies: ['Penicillin', 'Dust mites'], conditions: ['Mild asthma'] },
  })

  // 3. Create Hospital User & Hospital Record
  const hospUser = await User.create({
    name: 'Apollo City Hospital Admin',
    email: HOSP_EMAIL,
    passwordHash: await bcrypt.hash(HOSP_PASSWORD, 10),
    role: 'hospital',
  })

  const apollo = await Hospital.create({
    userId: hospUser._id,
    name: 'Apollo City Hospital',
    type: 'Hospital',
    address: '154/11 Bannerghatta Main Road, Opp IIMB',
    city: 'Bangalore',
    phone: '+91 80 2630 4050',
    emergencyPhone: '1066',
    rating: 4.9,
    departments: ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'General Medicine'],
    location: { type: 'Point', coordinates: [77.597, 12.893] },
  })

  // Additional sample hospitals
  const apexUser = await User.create({
    name: 'Apex Clinic Manager',
    email: 'apex@example.com',
    passwordHash: await bcrypt.hash(HOSP_PASSWORD, 10),
    role: 'hospital',
  })

  const apex = await Hospital.create({
    userId: apexUser._id,
    name: 'Apex Heart & Kidney Clinic',
    type: 'Clinic',
    address: '42 100 Feet Road, Indiranagar',
    city: 'Bangalore',
    phone: '+91 80 4115 8899',
    emergencyPhone: '+91 80 4115 8800',
    rating: 4.7,
    departments: ['Cardiology', 'Nephrology', 'General Medicine'],
    location: { type: 'Point', coordinates: [77.641, 12.978] },
  })

  const manipalUser = await User.create({
    name: 'Manipal Admin',
    email: 'manipal@example.com',
    passwordHash: await bcrypt.hash(HOSP_PASSWORD, 10),
    role: 'hospital',
  })

  const manipal = await Hospital.create({
    userId: manipalUser._id,
    name: 'Manipal Wellness Center',
    type: 'Specialty Center',
    address: '98 HAL Airport Road, Kodihalli',
    city: 'Bangalore',
    phone: '+91 80 2502 4444',
    emergencyPhone: '105577',
    rating: 4.8,
    departments: ['Oncology', 'Dermatology', 'General Medicine'],
    location: { type: 'Point', coordinates: [77.652, 12.958] },
  })

  // 4. Create Doctors
  const doctors = await Doctor.insertMany([
    {
      hospitalId: apollo._id,
      name: 'Dr. Ananya Rao',
      qualification: 'MD, DM Cardiology (AIIMS)',
      department: 'Cardiology',
      experienceYears: 14,
      availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      availableTime: { start: '09:00', end: '13:00' },
      fee: 800,
    },
    {
      hospitalId: apollo._id,
      name: 'Dr. Vikram Seth',
      qualification: 'MS Orthopedics, FRCS (London)',
      department: 'Orthopedics',
      experienceYears: 18,
      availableDays: ['Mon', 'Wed', 'Fri'],
      availableTime: { start: '10:00', end: '16:00' },
      fee: 900,
    },
    {
      hospitalId: apollo._id,
      name: 'Dr. Preeti Sharma',
      qualification: 'MD Pediatrics, DCH',
      department: 'Pediatrics',
      experienceYears: 9,
      availableDays: ['Tue', 'Thu', 'Sat'],
      availableTime: { start: '11:00', end: '15:00' },
      fee: 650,
    },
    {
      hospitalId: apex._id,
      name: 'Dr. Rajesh Nair',
      qualification: 'MD, DM Nephrology',
      department: 'Nephrology',
      experienceYears: 12,
      availableDays: ['Mon', 'Tue', 'Thu', 'Fri'],
      availableTime: { start: '09:30', end: '14:00' },
      fee: 750,
    },
    {
      hospitalId: manipal._id,
      name: 'Dr. Shalini Mehta',
      qualification: 'MD Dermatology, DNB',
      department: 'Dermatology',
      experienceYears: 11,
      availableDays: ['Mon', 'Wed', 'Sat'],
      availableTime: { start: '10:00', end: '17:00' },
      fee: 700,
    },
  ])

  // 5. Create Hospital Events (Blood Donation, Stem Cell Drive, Marathon)
  await HospitalEvent.insertMany([
    {
      hospitalId: apollo._id,
      title: 'Annual Blood Donation Marathon 2026',
      type: 'Blood Donation',
      date: daysAhead(10),
      time: '08:30 AM - 04:00 PM',
      location: 'Apollo Auditorium, Ground Floor',
      description: 'Join our annual community blood drive in partnership with Red Cross. Complimentary health screening provided for all donors.',
    },
    {
      hospitalId: apollo._id,
      title: 'Stem Cell Donor Registry & Awareness Drive',
      type: 'Stem Cell Drive',
      date: daysAhead(18),
      time: '10:00 AM - 02:00 PM',
      location: 'Main OPD Block',
      description: 'Swab to save a life! Register as a potential stem cell donor for leukemia patients.',
    },
    {
      hospitalId: apex._id,
      title: 'Heart Health & Cardio Walkathon',
      type: 'Marathon',
      date: daysAhead(14),
      time: '06:00 AM',
      location: 'Indiranagar Club Ground',
      description: '5 km walkathon promoting cardiovascular health and awareness. Free BP and ECG checks at the finish line.',
    },
  ])

  // 6. Create Sample Appointment
  await Appointment.create({
    patientId: user._id,
    hospitalId: apollo._id,
    doctorId: doctors[0]._id,
    appointmentDate: daysAhead(2),
    timeSlot: '10:30 AM',
    reason: 'Follow-up on recent respiratory symptoms and cardiac check',
    status: 'Booked',
  })

  // 7. Standard patient history data (triage, conversation, reports, reminders)
  const triage = await TriageSession.create({
    userId: user._id,
    input: { text: 'Sore throat and mild fever, day three.', durationDays: 3, symptoms: ['sore_throat', 'fever'] },
    urgency: 'Routine',
    tone: 'teal',
    confidence: 0.72,
    redFlags: [],
    conditions: [
      { name: 'Viral upper respiratory infection', likelihood: 0.68, note: 'Consistent with onset, fever pattern.' },
    ],
    advice: ['Rest and maintain fluid intake.', 'Monitor temperature twice daily.'],
    disclaimer: 'This is clinical decision support, not a diagnosis.',
    decidedBy: 'ai-assisted',
    aiProvider: 'seed',
    createdAt: daysAgo(5),
  })

  const convo = await Conversation.create({
    userId: user._id,
    title: 'Follow-up conversation',
    lastMessageAt: daysAgo(1),
    messages: [
      { from: 'bot', text: 'Good morning, Aarav. How are you feeling today?' },
      { from: 'user', text: 'Fever is gone but the cough is still there.' },
      { from: 'bot', text: 'Residual cough can persist for 1 to 3 weeks.', provider: 'seed' },
      { from: 'bot', text: 'This is clinical decision support.', meta: true },
    ],
  })

  const reports = await Report.insertMany([
    {
      userId: user._id,
      name: 'Complete Blood Count',
      lab: 'Apollo Diagnostics',
      reportDate: daysAgo(7),
      status: 'Summarised',
      tone: 'amber',
      summary: 'WBC slightly above upper limit.',
      findings: [{ label: 'WBC', value: '11.4', unit: 'x10^9/L', referenceRange: '4.0 - 11.0', flagged: true }],
      flags: 1,
    },
  ])

  const reminder = await Reminder.create({
    userId: user._id,
    drug: 'Montelukast',
    dosage: '10 mg',
    time: '21:00',
    frequency: 'daily',
    startDate: daysAgo(52),
    doses: Array.from({ length: 10 }, (_, i) => ({ scheduledFor: daysAgo(10 - i), status: 'taken' })),
  })

  await TimelineEvent.insertMany([
    { userId: user._id, kind: 'Account', tone: 'brand', title: 'Account created', body: 'MedIntel health record starts here.', occurredAt: daysAgo(52) },
    { userId: user._id, kind: 'Medication', tone: 'brand', title: 'Montelukast schedule created', body: 'Daily 21:00.', occurredAt: daysAgo(52), sourceId: reminder._id },
    { userId: user._id, kind: 'Report', tone: 'amber', title: 'Complete Blood Count uploaded', body: 'One value outside reference range: WBC 11.4.', occurredAt: daysAgo(7), sourceId: reports[0]._id },
    { userId: user._id, kind: 'Triage', tone: 'teal', title: 'Symptom session — sore throat, fever', body: 'Routine urgency.', occurredAt: daysAgo(5), sourceId: triage._id },
    { userId: user._id, kind: 'Appointment', tone: 'brand', title: 'Appointment booked with Dr. Ananya Rao', body: 'Apollo City Hospital · 10:30 AM', occurredAt: daysAgo(2) },
    { userId: user._id, kind: 'Chat', tone: 'brand', title: 'Follow-up conversation', body: 'Residual cough reviewed.', occurredAt: daysAgo(1), sourceId: convo._id },
  ])

  console.log('\n  Demo accounts & Hospitals seeded successfully:')
  console.log(`     Patient:   ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`     Hospital:  ${HOSP_EMAIL} / ${HOSP_PASSWORD}\n`)

  await disconnectDatabase()
  process.exit(0)
}

seed().catch((err) => {
  logger.error('seed failed', { err: err.message, stack: err.stack })
  process.exit(1)
})

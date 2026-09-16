import bcrypt from 'bcryptjs'
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
} from './models/index.js'
import { logger } from '../shared/logger.js'

const DEMO_EMAIL = 'aarav.menon@example.com'
const DEMO_PASSWORD = 'MedIntel2025!'
const HOSP_EMAIL = 'hospital@example.com'
const HOSP_PASSWORD = 'MedIntel2025!'

const daysAgo = (n) => new Date(Date.now() - n * 86400000)

export async function autoSeedIfNeeded() {
  const count = await User.countDocuments()
  if (count > 0) return

  logger.info('seeding initial demo data for in-memory / fresh database...')

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  // 1. Create Patient User
  const user = await User.create({
    name: 'Aarav Menon',
    email: DEMO_EMAIL,
    passwordHash,
    role: 'patient',
    profile: { age: 27, sex: 'Male', allergies: ['Penicillin', 'Dust mites'], conditions: ['Mild asthma'] },
  })

  // 2. Create Hospital User & Hospital Record
  const hospUser = await User.create({
    name: 'Apollo City Hospital Admin',
    email: HOSP_EMAIL,
    passwordHash,
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
    passwordHash,
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

  // Create Sample Doctors
  const doc1 = await Doctor.create({
    hospitalId: apollo._id,
    name: 'Dr. Ananya Rao',
    qualification: 'MBBS, MD (General Medicine), DM (Cardiology)',
    department: 'Cardiology',
    experienceYears: 14,
    fee: 800,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  })

  const doc2 = await Doctor.create({
    hospitalId: apollo._id,
    name: 'Dr. Rajesh Sharma',
    qualification: 'MBBS, MS (Orthopedics)',
    department: 'Orthopedics',
    experienceYears: 18,
    fee: 750,
    availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
  })

  await Doctor.create({
    hospitalId: apex._id,
    name: 'Dr. Vikram Seth',
    qualification: 'MBBS, MD (Nephrology)',
    department: 'Nephrology',
    experienceYears: 12,
    fee: 900,
    availableDays: ['Tue', 'Thu', 'Sat'],
  })

  // Create Health Events
  await HospitalEvent.create({
    hospitalId: apollo._id,
    title: 'Free Cardiac Screening & ECG Drive',
    category: 'Camp',
    date: new Date(Date.now() + 5 * 86400000),
    time: '09:00 AM - 04:00 PM',
    location: 'Auditorium, Apollo Hospital',
    description: 'Complimentary ECG, BP, and Random Blood Sugar checkup.',
    registrationRequired: true,
  })

  // Seed sample reminders, report, triage for demo user
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
  ])

  logger.info('auto-seeded demo database successfully (Patient: aarav.menon@example.com / MedIntel2025!)')
}

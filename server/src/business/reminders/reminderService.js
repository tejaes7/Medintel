import { reminderRepository } from '../../data/repositories/index.js'
import { historyService } from '../history/historyService.js'
import { audit, AUDIT } from '../../shared/audit.js'
import { NotFoundError, ValidationError } from '../../shared/errors.js'

/** Medication adherence. No drug advice is generated here — the user names their own regimen. */
export const reminderService = {
  async create({ userId, data, ip }) {
    if (data.frequency === 'weekly' && !(data.daysOfWeek ?? []).length) {
      throw new ValidationError('A weekly reminder needs at least one day of the week')
    }

    const reminder = await reminderRepository.create({ userId, ...data })
    materialiseDoses(reminder)
    await reminder.save()

    await historyService.record({
      userId,
      kind: 'Medication',
      tone: 'brand',
      title: `${reminder.drug} schedule created`,
      body: `${describeSchedule(reminder)}. Adherence tracked from this date.`,
      sourceId: reminder._id,
    })
    await audit({
      actorId: userId,
      action: AUDIT.REMINDER_CREATE,
      resource: 'reminder',
      resourceId: String(reminder._id),
      ip,
    })

    return present(reminder)
  },

  async list({ userId, activeOnly = false }) {
    const items = await reminderRepository.listForUser(userId, { activeOnly })
    return items.map(present)
  },

  async update({ userId, reminderId, patch, ip }) {
    const reminder = await reminderRepository.update(reminderId, userId, patch)
    if (!reminder) throw new NotFoundError('Reminder')
    await audit({ actorId: userId, action: AUDIT.REMINDER_UPDATE, resource: 'reminder', resourceId: reminderId, ip })
    return present(reminder)
  },

  async remove({ userId, reminderId, ip }) {
    const reminder = await reminderRepository.deleteForUser(reminderId, userId)
    if (!reminder) throw new NotFoundError('Reminder')
    await audit({ actorId: userId, action: AUDIT.REMINDER_DELETE, resource: 'reminder', resourceId: reminderId, ip })
    return { deleted: true }
  },

  /** Patient acknowledges a dose. Adherence is derived, never stored as a number. */
  async acknowledgeDose({ userId, reminderId, doseId, status, ip }) {
    const reminder = await reminderRepository.findByIdForUser(reminderId, userId)
    if (!reminder) throw new NotFoundError('Reminder')

    const dose = reminder.doses.id(doseId)
    if (!dose) throw new NotFoundError('Dose')

    dose.status = status
    dose.actedAt = new Date()
    await reminder.save()

    await audit({
      actorId: userId,
      action: AUDIT.DOSE_ACK,
      resource: 'reminder',
      resourceId: reminderId,
      ip,
      metadata: { doseId, status },
    })

    return present(reminder)
  },

  /** Scheduler job: create the next window of dose slots and mark overdue ones missed. */
  async materialiseAll() {
    const reminders = await reminderRepository.listAllActive()
    let created = 0
    let missed = 0

    for (const reminder of reminders) {
      const before = reminder.doses.length
      materialiseDoses(reminder)
      created += reminder.doses.length - before

      const cutoff = Date.now() - 2 * 60 * 60 * 1000 // 2h grace period
      for (const dose of reminder.doses) {
        if (dose.status === 'pending' && dose.scheduledFor.getTime() < cutoff) {
          dose.status = 'missed'
          missed += 1
        }
      }
      if (reminder.isModified()) await reminder.save()
    }
    return { reminders: reminders.length, created, missed }
  },
}

/** Fills dose slots for the next 7 days. Idempotent — an existing slot is never duplicated. */
function materialiseDoses(reminder, horizonDays = 7) {
  const [hh, mm] = reminder.time.split(':').map(Number)
  const existing = new Set(reminder.doses.map((d) => d.scheduledFor.getTime()))
  const start = new Date()
  start.setHours(0, 0, 0, 0)

  for (let i = 0; i < horizonDays; i += 1) {
    const day = new Date(start)
    day.setDate(day.getDate() + i)

    if (reminder.startDate && day < startOfDay(reminder.startDate)) continue
    if (reminder.endDate && day > reminder.endDate) break
    if (reminder.frequency === 'weekly' && !reminder.daysOfWeek.includes(day.getDay())) continue

    const slot = new Date(day)
    slot.setHours(hh, mm, 0, 0)
    if (slot.getTime() < Date.now() - 24 * 60 * 60 * 1000) continue // don't backfill history
    if (existing.has(slot.getTime())) continue

    reminder.doses.push({ scheduledFor: slot, status: 'pending' })
    existing.add(slot.getTime())
  }

  reminder.doses.sort((a, b) => a.scheduledFor - b.scheduledFor)
}

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function describeSchedule(r) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  if (r.frequency === 'daily') return `Daily ${r.time}`
  if (r.frequency === 'weekly') return `Weekly · ${r.daysOfWeek.map((d) => days[d]).join(', ')} at ${r.time}`
  return `Custom · ${r.time}`
}

function present(r) {
  const next = r.doses.find((d) => d.status === 'pending' && d.scheduledFor.getTime() >= Date.now())
  return {
    id: String(r._id),
    drug: r.drug,
    dosage: r.dosage ?? '',
    time: r.time,
    freq: describeSchedule(r),
    frequency: r.frequency,
    daysOfWeek: r.daysOfWeek,
    active: r.active,
    next: next ? relativeDay(next.scheduledFor) : 'No upcoming dose',
    nextDoseId: next ? String(next._id) : null,
    nextDoseAt: next?.scheduledFor ?? null,
    adherence: r.adherence(),
    tone: toneFor(r.adherence()),
    doses: r.doses.slice(0, 14).map((d) => ({
      id: String(d._id),
      scheduledFor: d.scheduledFor,
      status: d.status,
    })),
  }
}

function toneFor(adherence) {
  if (adherence === null) return 'brand'
  if (adherence >= 0.85) return 'teal'
  if (adherence >= 0.6) return 'amber'
  return 'rose'
}

function relativeDay(date) {
  const now = new Date()
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86400000)
  if (days === 0) return date.getHours() >= 17 ? 'Tonight' : 'Today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

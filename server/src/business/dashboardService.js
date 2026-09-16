import {
  triageRepository,
  reportRepository,
  reminderRepository,
  conversationRepository,
} from '../data/repositories/index.js'
import { historyService } from './history/historyService.js'
import { triageService } from './triage/triageService.js'

/**
 * Read-model composition for the overview screen. Lives in the business layer so the API
 * layer stays a thin adapter and never fans out to repositories itself.
 */
export const dashboardService = {
  async overview({ userId }) {
    const [sessions, reports, flaggedReports, activeReminders, conversations, latest, timeline] = await Promise.all([
      triageRepository.countForUser(userId),
      reportRepository.countForUser(userId),
      reportRepository.countFlaggedForUser(userId),
      reminderRepository.countActiveForUser(userId),
      conversationRepository.countForUser(userId),
      triageService.latest({ userId }),
      historyService.list({ userId, limit: 5 }),
    ])

    const reminders = await reminderRepository.listForUser(userId, { activeOnly: true })
    const adherences = reminders.map((r) => r.adherence()).filter((a) => a !== null)
    const overallAdherence = adherences.length
      ? Number((adherences.reduce((t, a) => t + a, 0) / adherences.length).toFixed(2))
      : null

    return {
      stats: {
        triageSessions: sessions,
        reports,
        flaggedReports,
        activeReminders,
        conversations,
        overallAdherence,
      },
      latestTriage: latest,
      recentActivity: timeline.items,
    }
  },
}

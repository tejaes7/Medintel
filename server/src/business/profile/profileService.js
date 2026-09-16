import { userRepository } from '../../data/repositories/index.js'
import { getCache } from '../../data/cache/index.js'
import { audit, AUDIT } from '../../shared/audit.js'
import { authService } from '../auth/authService.js'
import { NotFoundError } from '../../shared/errors.js'

export const profileService = {
  async get({ userId }) {
    const user = await userRepository.findById(userId)
    if (!user) throw new NotFoundError('User')
    return authService.publicUser(user)
  },

  async update({ userId, patch, ip }) {
    const set = {}
    if (patch.name !== undefined) set.name = patch.name
    if (patch.age !== undefined) set['profile.age'] = patch.age
    if (patch.sex !== undefined) set['profile.sex'] = patch.sex
    if (patch.allergies !== undefined) set['profile.allergies'] = patch.allergies
    if (patch.conditions !== undefined) set['profile.conditions'] = patch.conditions

    const user = await userRepository.updateProfile(userId, set)
    if (!user) throw new NotFoundError('User')

    // Profile feeds AI context and the rules engine, so its cached derivatives are stale now.
    await getCache().clearPrefix(`ai:`)

    await audit({
      actorId: userId,
      action: AUDIT.PROFILE_UPDATE,
      resource: 'user',
      resourceId: String(userId),
      ip,
      metadata: { fields: Object.keys(set) },
    })

    return authService.publicUser(user)
  },
}

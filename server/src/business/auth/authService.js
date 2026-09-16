import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { userRepository, hospitalRepository } from '../../data/repositories/index.js'
import { historyService } from '../history/historyService.js'
import { audit, AUDIT } from '../../shared/audit.js'
import { AuthError, ConflictError, NotFoundError } from '../../shared/errors.js'

/**
 * Stateless JWT auth (ADR-05). The accepted price is revocation: we pay it with a short
 * access TTL plus a refresh token carrying a version claim, so bumping the user's
 * refreshTokenVersion invalidates every outstanding refresh token immediately.
 */

const ROUNDS = 10

function signAccess(user) {
  return jwt.sign({ sub: String(user._id), role: user.role, typ: 'access' }, env.jwt.secret, {
    expiresIn: env.jwt.accessTtl,
  })
}

function signRefresh(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, typ: 'refresh', ver: user.refreshTokenVersion },
    env.jwt.secret,
    { expiresIn: env.jwt.refreshTtl }
  )
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    initials: user.initials,
    role: user.role,
    age: user.profile?.age ?? null,
    sex: user.profile?.sex ?? null,
    allergies: user.profile?.allergies ?? [],
    conditions: user.profile?.conditions ?? [],
  }
}

export const authService = {
  publicUser,

  async register({ name, email, password, role = 'patient', profile = {} }, ip) {
    const existing = await userRepository.findByEmail(email)
    if (existing) throw new ConflictError('An account with that email already exists')

    const user = await userRepository.create({
      name,
      email: String(email).toLowerCase(),
      passwordHash: await bcrypt.hash(password, ROUNDS),
      role,
      profile,
    })

    if (role === 'hospital') {
      await hospitalRepository.create({
        userId: user._id,
        name: name,
        type: 'Hospital',
        address: 'Set address in portal',
        city: 'Bangalore',
        departments: ['General Medicine'],
      })
    }

    await historyService.record({
      userId: user._id,
      kind: 'Account',
      tone: 'brand',
      title: 'Account created',
      body: 'Your MedIntel health record starts here.',
    })
    await audit({ actorId: user._id, action: AUDIT.AUTH_REGISTER, resource: 'user', resourceId: String(user._id), ip })

    return { user: publicUser(user), tokens: { accessToken: signAccess(user), refreshToken: signRefresh(user) } }
  },

  async login({ email, password }, ip) {
    const user = await userRepository.findByEmailWithSecret(email)
    // Same error and roughly the same work either way — no user enumeration.
    if (!user) {
      await bcrypt.compare(password, '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin')
      await audit({ action: AUDIT.AUTH_LOGIN, resource: 'user', outcome: 'failure', ip, metadata: { reason: 'no-user' } })
      throw new AuthError('Email or password is incorrect', 'INVALID_CREDENTIALS')
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      await audit({
        actorId: user._id,
        action: AUDIT.AUTH_LOGIN,
        resource: 'user',
        outcome: 'failure',
        ip,
        metadata: { reason: 'bad-password' },
      })
      throw new AuthError('Email or password is incorrect', 'INVALID_CREDENTIALS')
    }

    await audit({ actorId: user._id, action: AUDIT.AUTH_LOGIN, resource: 'user', resourceId: String(user._id), ip })
    return { user: publicUser(user), tokens: { accessToken: signAccess(user), refreshToken: signRefresh(user) } }
  },

  /** Refresh rotation: a used refresh token is replaced, and a stale version is rejected. */
  async refresh({ refreshToken }, ip) {
    let payload
    try {
      payload = jwt.verify(refreshToken, env.jwt.secret)
    } catch {
      throw new AuthError('Refresh token is invalid or expired', 'INVALID_REFRESH_TOKEN')
    }
    if (payload.typ !== 'refresh') throw new AuthError('Wrong token type', 'INVALID_REFRESH_TOKEN')

    const user = await userRepository.findById(payload.sub)
    if (!user) throw new NotFoundError('User')
    if (payload.ver !== user.refreshTokenVersion) {
      throw new AuthError('Refresh token has been revoked', 'REVOKED_REFRESH_TOKEN')
    }

    await audit({ actorId: user._id, action: AUDIT.AUTH_REFRESH, resource: 'user', ip })
    return { user: publicUser(user), tokens: { accessToken: signAccess(user), refreshToken: signRefresh(user) } }
  },

  /** Logout revokes every refresh token for the user by bumping the version claim. */
  async logout({ userId }, ip) {
    await userRepository.bumpRefreshVersion(userId)
    await audit({ actorId: userId, action: AUDIT.AUTH_LOGOUT, resource: 'user', ip })
    return { revoked: true }
  },

  async me({ userId }) {
    const user = await userRepository.findById(userId)
    if (!user) throw new NotFoundError('User')
    return publicUser(user)
  },
}

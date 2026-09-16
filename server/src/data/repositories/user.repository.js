import { User } from '../models/index.js'

export const userRepository = {
  findById: (id) => User.findById(id),
  findByIdWithSecret: (id) => User.findById(id).select('+passwordHash'),
  findByEmail: (email) => User.findOne({ email: String(email).toLowerCase() }),
  findByEmailWithSecret: (email) => User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash'),
  create: (doc) => User.create(doc),
  updateProfile: (id, profile) =>
    User.findByIdAndUpdate(id, { $set: profile }, { new: true, runValidators: true }),
  bumpRefreshVersion: (id) => User.findByIdAndUpdate(id, { $inc: { refreshTokenVersion: 1 } }, { new: true }),
}

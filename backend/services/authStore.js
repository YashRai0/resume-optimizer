import AuthUser from '../models/AuthUser.js'
import AuthSession from '../models/AuthSession.js'
import AuthToken from '../models/AuthToken.js'

export function createAuthStore({ users = AuthUser, sessions = AuthSession, tokens = AuthToken } = {}) {
  return {
    findUserByEmail(email) {
      return users.findOne({ email }).select('+passwordHash').lean()
    },
    findUserById(id) {
      return users.findById(id).lean()
    },
    createUser(data) {
      return users.create(data)
    },
    verifyEmail(userId, now) {
      return users.findOneAndUpdate({ _id: userId, disabledAt: null, emailVerifiedAt: null }, { $set: { emailVerifiedAt: now } }, { new: true }).lean()
    },
    updatePassword(userId, passwordHash) {
      return users.updateOne({ _id: userId, disabledAt: null }, { $set: { passwordHash } })
    },
    createSession(data) {
      return sessions.create(data)
    },
    findSessionByRefreshHash(hash, now) {
      return sessions.findOne({ refreshTokenHash: hash, revokedAt: null, expiresAt: { $gt: now } }).lean()
    },
    findSessionByUsedRefreshHash(hash) {
      return sessions.findOne({ usedRefreshTokenHashes: hash, revokedAt: null }).lean()
    },
    rotateSession({ sessionId, oldHash, newHash, csrfTokenHash, now, expiresAt }) {
      return sessions.findOneAndUpdate({
        _id: sessionId,
        refreshTokenHash: oldHash,
        revokedAt: null,
        expiresAt: { $gt: now }
      }, {
        $set: { refreshTokenHash: newHash, csrfTokenHash, expiresAt, lastUsedAt: now },
        $push: { usedRefreshTokenHashes: { $each: [oldHash], $slice: -100 } }
      }, { new: true }).lean()
    },
    revokeSession(sessionId, now) {
      return sessions.updateOne({ _id: sessionId, revokedAt: null }, { $set: { revokedAt: now } })
    },
    revokeSessionByRefreshHash(hash, now) {
      return sessions.updateOne({ refreshTokenHash: hash, revokedAt: null }, { $set: { revokedAt: now } })
    },
    revokeUserSessions(userId, now) {
      return sessions.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: now } })
    },
    createAuthToken(data) {
      return tokens.create(data)
    },
    consumeAuthToken(tokenHash, purpose, now) {
      return tokens.findOneAndUpdate({ tokenHash, purpose, consumedAt: null, expiresAt: { $gt: now } }, { $set: { consumedAt: now } }, { new: false }).lean()
    },
    consumePendingTokens(userId, purpose, now) {
      return tokens.updateMany({ userId, purpose, consumedAt: null }, { $set: { consumedAt: now } })
    }
  }
}

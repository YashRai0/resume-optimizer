import AuthSession from '../models/AuthSession.js'
import AuthUser from '../models/AuthUser.js'
import { getDbMode } from '../config/db.js'
import { verifyAccessToken } from '../services/authTokens.js'

function unauthorized(res, code = 'AUTH_REQUIRED') {
  return res.status(401).json({ error: { code, message: 'Authentication is required. Please sign in again.' } })
}

export function createRequireAuth({ sessions = AuthSession, users = AuthUser, databaseMode = getDbMode } = {}) {
  return async function requireAuthenticatedUser(req, res, next) {
    if (databaseMode() !== 'mongodb') {
      return res.status(503).json({ error: { code: 'AUTH_STORE_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' } })
    }
    const authorization = req.get('authorization') || ''
    const match = /^Bearer ([A-Za-z0-9._~-]{20,4096})$/.exec(authorization)
    if (!match) return unauthorized(res)

    let identity
    try {
      identity = verifyAccessToken(match[1])
    } catch (error) {
      if (error.code === 'AUTH_NOT_CONFIGURED') {
        return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' } })
      }
      return unauthorized(res, error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN')
    }

    try {
      const now = new Date()
      const session = await sessions.findOne({
        _id: identity.sessionId,
        userId: identity.userId,
        revokedAt: null,
        expiresAt: { $gt: now }
      }).lean()
      if (!session) return unauthorized(res, 'SESSION_REVOKED')

      const user = await users.findOne({ _id: identity.userId, disabledAt: null }).select('_id').lean()
      if (!user) return unauthorized(res, 'ACCOUNT_UNAVAILABLE')

      req.user = { id: String(user._id) }
      req.authSessionId = String(session._id)
      return next()
    } catch (error) {
      console.error('Authentication session lookup failed:', error.code || error.name || 'Error')
      return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' } })
    }
  }
}

export const requireAuth = createRequireAuth()

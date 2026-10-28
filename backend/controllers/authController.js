import argon2 from 'argon2'
import { createAuthStore } from '../services/authStore.js'
import {
  emailDeliveryConfigured,
  logEmailConfigDiagnostics,
  sendPasswordResetEmail,
  sendVerificationEmail
} from '../services/emailService.js'
import {
  ACCESS_TOKEN_TTL,
  createAccessToken,
  createCsrfToken,
  createOpaqueToken,
  hashToken,
  safeEqualHex,
  validateAuthTokenConfig
} from '../services/authTokens.js'
import {
  clearAuthCookies,
  CSRF_COOKIE,
  getCookie,
  REFRESH_COOKIE,
  setAuthCookies,
  setCsrfCookie
} from '../utils/authCookies.js'
import {
  isValidEmail,
  normalizeEmail,
  validateLogin,
  validatePasswordReset,
  validateRegistration
} from '../utils/authValidation.js'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const EMAIL_VERIFICATION_TTL_MS = 60 * 60 * 1000
const PASSWORD_RESET_TTL_MS = 20 * 60 * 1000
const ARGON2_OPTIONS = Object.freeze({ type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 })
let dummyHashPromise

function userView(user) {
  return {
    id: String(user._id),
    email: user.email,
    displayName: user.displayName || '',
    emailVerifiedAt: user.emailVerifiedAt || null
  }
}

function unauthorized(res, message = 'Session is invalid or expired. Please sign in again.') {
  clearAuthCookies(res)
  return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message } })
}

function csrfIsValid(req, session) {
  const cookieToken = getCookie(req, CSRF_COOKIE)
  const headerToken = req.get('x-csrf-token')
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') return false
  if (!/^[a-f0-9]{64}$/.test(cookieToken) || !/^[a-f0-9]{64}$/.test(headerToken)) return false
  return safeEqualHex(hashToken(cookieToken), hashToken(headerToken)) &&
    safeEqualHex(hashToken(cookieToken), session.csrfTokenHash)
}

function accessResponse(res, user, session, refreshToken, csrfToken) {
  const accessToken = createAccessToken(user._id, session._id)
  setAuthCookies(res, refreshToken, csrfToken, SESSION_TTL_MS)
  return res.json({
    accessToken,
    expiresIn: ACCESS_TOKEN_TTL,
    csrfToken,
    user: userView(user)
  })
}

async function getDummyHash() {
  if (!dummyHashPromise) dummyHashPromise = argon2.hash('not-a-valid-user-password', ARGON2_OPTIONS)
  return dummyHashPromise
}

export function createAuthController({
  store = createAuthStore(),
  emailConfigured = emailDeliveryConfigured,
  verificationSender = sendVerificationEmail,
  passwordResetSender = sendPasswordResetEmail,
  clock = () => new Date()
} = {}) {
  return {
    getCsrf(req, res) {
      const refreshToken = getCookie(req, REFRESH_COOKIE)
      try {
        const csrfToken = refreshToken && /^[a-f0-9]{64}$/.test(refreshToken)
          ? createCsrfToken(refreshToken)
          : createOpaqueToken()
        setCsrfCookie(res, csrfToken)
        res.set('Cache-Control', 'no-store')
        return res.json({ csrfToken })
      } catch (error) {
        console.error('CSRF token issuance failed:', error.code || error.name || 'Error')
        return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' } })
      }
    },

    async register(req, res) {
      const validation = validateRegistration(req.body)
      if (!validation.ok) {
        return res.status(400).json({ error: { code: validation.code, message: 'Enter a valid email and a password of at least 12 characters.' } })
      }
      if (!emailConfigured()) {
        logEmailConfigDiagnostics()
        return res.status(503).json({ error: { code: 'EMAIL_NOT_CONFIGURED', message: 'Email verification is temporarily unavailable. Contact the site administrator.' } })
      }

      const { email, password, displayName } = validation.value
      try {
        validateAuthTokenConfig()
        const passwordHash = await argon2.hash(password, ARGON2_OPTIONS)
        let user = await store.findUserByEmail(email)
        if (!user) {
          try {
            user = await store.createUser({ email, passwordHash, displayName })
          } catch (error) {
            if (error.code !== 11000) throw error
            user = await store.findUserByEmail(email)
          }
        }

        // The same response is returned for existing and new addresses to avoid account enumeration.
        if (!user || user.emailVerifiedAt || user.disabledAt) {
          return res.status(202).json({ message: 'If the address can be registered, a verification email will be sent.' })
        }

        const token = createOpaqueToken()
        await store.createAuthToken({
          userId: user._id,
          purpose: 'verify-email',
          tokenHash: hashToken(token),
          expiresAt: new Date(clock().getTime() + EMAIL_VERIFICATION_TTL_MS)
        })
        await verificationSender(user.email, token)
        return res.status(202).json({ message: 'If the address can be registered, a verification email will be sent.' })
      } catch (error) {
        console.error('Registration failed:', error.code || error.name || 'Error')
        return res.status(503).json({
          error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Registration is temporarily unavailable. Please try again later.' }
        })
      }
    },

    async verifyEmail(req, res) {
      const token = req.body?.token
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
        return res.status(400).json({ error: { code: 'INVALID_VERIFICATION', message: 'Verification link is invalid or expired.' } })
      }
      try {
        const now = clock()
        const tokenRecord = await store.consumeAuthToken(hashToken(token), 'verify-email', now)
        if (!tokenRecord) return res.status(400).json({ error: { code: 'INVALID_VERIFICATION', message: 'Verification link is invalid or expired.' } })
        const user = await store.verifyEmail(tokenRecord.userId, now)
        if (!user) return res.status(400).json({ error: { code: 'INVALID_VERIFICATION', message: 'Verification link is invalid or expired.' } })
        await store.consumePendingTokens(tokenRecord.userId, 'verify-email', now)
        return res.json({ message: 'Email verified. You can now sign in.' })
      } catch (error) {
        console.error('Email verification failed:', error.code || error.name || 'Error')
        return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Email verification is temporarily unavailable.' } })
      }
    },

    async login(req, res) {
      const validation = validateLogin(req.body)
      if (!validation.ok) return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } })
      try {
        validateAuthTokenConfig()
        const { email, password } = validation.value
        const user = await store.findUserByEmail(email)
        const hashToCheck = user?.passwordHash || await getDummyHash()
        const passwordMatches = await argon2.verify(hashToCheck, password).catch(() => false)
        if (!user || !passwordMatches || !user.emailVerifiedAt || user.disabledAt) {
          return res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } })
        }

        const now = clock()
        const refreshToken = createOpaqueToken()
        const csrfToken = createCsrfToken(refreshToken)
        const session = await store.createSession({
          userId: user._id,
          refreshTokenHash: hashToken(refreshToken),
          usedRefreshTokenHashes: [],
          csrfTokenHash: hashToken(csrfToken),
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
          lastUsedAt: now,
          userAgent: (req.get('user-agent') || '').slice(0, 500)
        })
        res.set('Cache-Control', 'no-store')
        return accessResponse(res, user, session, refreshToken, csrfToken)
      } catch (error) {
        console.error('Login failed:', error.code || error.name || 'Error')
        return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Sign-in is temporarily unavailable.' } })
      }
    },

    async refresh(req, res) {
      const refreshToken = getCookie(req, REFRESH_COOKIE)
      if (typeof refreshToken !== 'string' || !/^[a-f0-9]{64}$/.test(refreshToken)) return unauthorized(res)
      const oldHash = hashToken(refreshToken)
      try {
        validateAuthTokenConfig()
        const now = clock()
        const session = await store.findSessionByRefreshHash(oldHash, now)
        if (!session) {
          const replayedSession = await store.findSessionByUsedRefreshHash(oldHash)
          if (replayedSession) await store.revokeSession(replayedSession._id, now)
          return unauthorized(res)
        }
        if (!csrfIsValid(req, session)) {
          return res.status(403).json({ error: { code: 'CSRF_VALIDATION_FAILED', message: 'Request could not be verified.' } })
        }

        const user = await store.findUserById(session.userId)
        if (!user || !user.emailVerifiedAt || user.disabledAt) {
          await store.revokeSession(session._id, now)
          return unauthorized(res)
        }

        const newRefreshToken = createOpaqueToken()
        const newCsrfToken = createCsrfToken(newRefreshToken)
        const rotatedSession = await store.rotateSession({
          sessionId: session._id,
          oldHash,
          newHash: hashToken(newRefreshToken),
          csrfTokenHash: hashToken(newCsrfToken),
          now,
          expiresAt: new Date(now.getTime() + SESSION_TTL_MS)
        })
        if (!rotatedSession) {
          const replayedSession = await store.findSessionByUsedRefreshHash(oldHash)
          if (replayedSession) await store.revokeSession(replayedSession._id, now)
          return unauthorized(res)
        }
        res.set('Cache-Control', 'no-store')
        return accessResponse(res, user, rotatedSession, newRefreshToken, newCsrfToken)
      } catch (error) {
        console.error('Session refresh failed:', error.code || error.name || 'Error')
        return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Session refresh is temporarily unavailable.' } })
      }
    },

    async logout(req, res) {
      const refreshToken = getCookie(req, REFRESH_COOKIE)
      if (typeof refreshToken === 'string' && /^[a-f0-9]{64}$/.test(refreshToken)) {
        const tokenHash = hashToken(refreshToken)
        try {
          const now = clock()
          const session = await store.findSessionByRefreshHash(tokenHash, now)
          if (session) {
            if (!csrfIsValid(req, session)) {
              return res.status(403).json({ error: { code: 'CSRF_VALIDATION_FAILED', message: 'Request could not be verified.' } })
            }
            await store.revokeSession(session._id, now)
          } else {
            const replayedSession = await store.findSessionByUsedRefreshHash(tokenHash)
            if (replayedSession) await store.revokeSession(replayedSession._id, now)
          }
        } catch (error) {
          console.error('Logout failed:', error.code || error.name || 'Error')
          return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Sign-out is temporarily unavailable.' } })
        }
      }
      clearAuthCookies(res)
      return res.status(204).end()
    },

    async forgotPassword(req, res) {
      const email = normalizeEmail(req.body?.email)
      if (!isValidEmail(email)) {
        return res.status(202).json({ message: 'If an account exists for that address, password-reset instructions will be sent.' })
      }
      if (!emailConfigured()) {
        logEmailConfigDiagnostics()
        return res.status(503).json({ error: { code: 'EMAIL_NOT_CONFIGURED', message: 'Password recovery is temporarily unavailable. Contact the site administrator.' } })
      }
      try {
        const user = await store.findUserByEmail(email)
        if (user && user.emailVerifiedAt && !user.disabledAt) {
          const token = createOpaqueToken()
          await store.createAuthToken({
            userId: user._id,
            purpose: 'reset-password',
            tokenHash: hashToken(token),
            expiresAt: new Date(clock().getTime() + PASSWORD_RESET_TTL_MS)
          })
          await passwordResetSender(user.email, token)
        }
        return res.status(202).json({ message: 'If an account exists for that address, password-reset instructions will be sent.' })
      } catch (error) {
        console.error('Password reset request failed:', error.code || error.name || 'Error')
        return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Password recovery is temporarily unavailable.' } })
      }
    },

    async resetPassword(req, res) {
      const validation = validatePasswordReset(req.body)
      if (!validation.ok) return res.status(400).json({ error: { code: 'INVALID_RESET', message: 'Password-reset link is invalid or expired.' } })
      try {
        const now = clock()
        const tokenRecord = await store.consumeAuthToken(hashToken(validation.value.token), 'reset-password', now)
        if (!tokenRecord) return res.status(400).json({ error: { code: 'INVALID_RESET', message: 'Password-reset link is invalid or expired.' } })
        const passwordHash = await argon2.hash(validation.value.password, ARGON2_OPTIONS)
        const update = await store.updatePassword(tokenRecord.userId, passwordHash)
        if (!update?.matchedCount) return res.status(400).json({ error: { code: 'INVALID_RESET', message: 'Password-reset link is invalid or expired.' } })
        await store.revokeUserSessions(tokenRecord.userId, now)
        await store.consumePendingTokens(tokenRecord.userId, 'reset-password', now)
        return res.json({ message: 'Password updated. Please sign in again.' })
      } catch (error) {
        console.error('Password reset failed:', error.code || error.name || 'Error')
        return res.status(503).json({ error: { code: 'AUTH_SERVICE_UNAVAILABLE', message: 'Password reset is temporarily unavailable.' } })
      }
    }
  }
}

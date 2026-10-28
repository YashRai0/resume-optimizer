import { Router } from 'express'
import { createHash } from 'node:crypto'
import { RATE_LIMIT_POLICY } from '../../shared/planPolicy.js'
import { isAllowedOrigin } from '../config/origins.js'
import { getDbMode } from '../config/db.js'
import { rateLimit } from '../middleware/abuseLimits.js'
import { createAuthStore } from '../services/authStore.js'
import { emailDeliveryConfigured, sendPasswordResetEmail, sendVerificationEmail } from '../services/emailService.js'
import { validateAuthCookieConfig } from '../utils/authCookies.js'
import { normalizeEmail } from '../utils/authValidation.js'
import { createAuthController } from '../controllers/authController.js'

function ipSubject(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

function accountSubject(req) {
  const email = normalizeEmail(req.body?.email)
  const digest = createHash('sha256').update(email || 'invalid-account').digest('hex')
  return `${ipSubject(req)}:${digest}`
}

function makeAuthLimit(scope, config, subject) {
  return rateLimit({ scope, ...config, subject })
}

function trustedOrigin(req, res, next) {
  if (!isAllowedOrigin(req.get('origin'))) {
    return res.status(403).json({ error: { code: 'INVALID_ORIGIN', message: 'Request origin is not allowed.' } })
  }
  next()
}

export function createAuthRouter({
  store = createAuthStore(),
  emailConfigured = emailDeliveryConfigured,
  verificationSender = sendVerificationEmail,
  passwordResetSender = sendPasswordResetEmail,
  databaseMode = getDbMode,
  clock = () => new Date(),
  loginLimiter = makeAuthLimit('auth-login', RATE_LIMIT_POLICY.authLogin, accountSubject),
  registrationLimiter = makeAuthLimit('auth-register', RATE_LIMIT_POLICY.authRegister, ipSubject),
  recoveryLimiter = makeAuthLimit('auth-recovery', RATE_LIMIT_POLICY.authRecovery, accountSubject),
  refreshLimiter = makeAuthLimit('auth-refresh', RATE_LIMIT_POLICY.authRefresh, ipSubject)
} = {}) {
  validateAuthCookieConfig()
  const router = Router()

  const requireAuthDatabase = (req, res, next) => {
    if (databaseMode() !== 'mongodb') {
      return res.status(503).json({ error: { code: 'AUTH_STORE_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' } })
    }
    next()
  }

  const controller = createAuthController({
    store,
    emailConfigured,
    verificationSender,
    passwordResetSender,
    clock
  })

  router.get('/csrf', trustedOrigin, controller.getCsrf)
  router.post('/register', registrationLimiter, trustedOrigin, requireAuthDatabase, controller.register)
  router.post('/verify-email', recoveryLimiter, trustedOrigin, requireAuthDatabase, controller.verifyEmail)
  router.post('/login', loginLimiter, trustedOrigin, requireAuthDatabase, controller.login)
  router.post('/refresh', refreshLimiter, trustedOrigin, requireAuthDatabase, controller.refresh)
  router.post('/logout', refreshLimiter, trustedOrigin, requireAuthDatabase, controller.logout)
  router.post('/forgot-password', recoveryLimiter, trustedOrigin, requireAuthDatabase, controller.forgotPassword)
  router.post('/reset-password', recoveryLimiter, trustedOrigin, requireAuthDatabase, controller.resetPassword)

  return router
}

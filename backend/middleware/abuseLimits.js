import { reserveCounter } from '../services/counters.js'
import { PLAN_POLICY, getMonthPeriod } from '../../shared/planPolicy.js'
import { getDbMode } from '../config/db.js'

function rateLimitError(res, retryAfterSeconds) {
  res.set('Retry-After', String(retryAfterSeconds))
  return res.status(429).json({
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retryAfterSeconds
    }
  })
}

function quotaError(res, action, limit, used, retryAfterSeconds) {
  res.set('Retry-After', String(retryAfterSeconds))
  return res.status(429).json({
    error: {
      code: 'QUOTA_EXCEEDED',
      message: `Your free ${action} allowance is used for this month.`,
      action,
      limit,
      used,
      retryAfterSeconds
    }
  })
}

async function withCounter(res, operation) {
  try {
    return await operation()
  } catch (error) {
    console.error('Abuse counter unavailable:', error.code || error.name)
    res.status(503).json({
      error: { code: 'LIMITER_UNAVAILABLE', message: 'This service is temporarily unavailable.' }
    })
    return null
  }
}

export function rateLimit({ scope, limit, windowMs, subject }) {
  return async (req, res, next) => {
    const identifier = subject(req)
    if (!identifier) return res.status(400).json({ error: { code: 'INVALID_LIMIT_KEY', message: 'Request could not be limited.' } })

    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    const expiresAt = new Date(windowStart + (2 * windowMs))
    const result = await withCounter(res, () => reserveCounter({
      key: `rate:${scope}:${identifier}:${windowStart}`,
      limit,
      expiresAt,
      now
    }))
    if (!result) return
    if (!result.allowed) {
      return rateLimitError(res, Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)))
    }
    next()
  }
}

export async function loadEntitlement(req, res, next) {
  if (getDbMode() !== 'mongodb') {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: { code: 'ENTITLEMENT_STORE_UNAVAILABLE', message: 'This service is temporarily unavailable.' } })
    }
    req.entitlement = null
    return next()
  }

  try {
    const PaymentLedger = (await import('../models/PaymentLedger.js')).default
    const now = new Date()
    req.entitlement = await PaymentLedger.findOne({
      userId: req.user.id,
      status: 'captured',
      entitlementStartsAt: { $lte: now },
      entitlementEndsAt: { $gt: now }
    }).sort({ entitlementEndsAt: -1 }).lean()
    next()
  } catch (error) {
    console.error('Entitlement lookup failed:', error.name || 'Error')
    res.status(503).json({ error: { code: 'ENTITLEMENT_STORE_UNAVAILABLE', message: 'This service is temporarily unavailable.' } })
  }
}

export function requirePaidPlan(req, res, next) {
  if (req.entitlement?.status === 'captured') return next()
  return res.status(403).json({
    error: { code: 'PLAN_REQUIRED', message: 'This feature requires an active Pro plan.' }
  })
}

export function enforceQuota(action) {
  return async (req, res, next) => {
    const planId = req.entitlement?.plan || 'free'
    const plan = PLAN_POLICY[planId] || PLAN_POLICY.free
    const limit = plan.quotas[action]

    if (limit === null) return next()
    if (limit === 0) {
      return res.status(403).json({ error: { code: 'PLAN_REQUIRED', message: 'This feature requires an active Pro plan.' } })
    }

    const now = new Date()
    const period = getMonthPeriod(now)
    const result = await withCounter(res, () => reserveCounter({
      key: `quota:${req.user.id}:${action}:${period.key}`,
      limit,
      expiresAt: new Date(period.end.getTime() + 24 * 60 * 60 * 1000),
      now: now.getTime()
    }))
    if (!result) return
    if (!result.allowed) {
      return quotaError(
        res,
        action,
        limit,
        result.used,
        Math.max(1, Math.ceil((period.end.getTime() - now.getTime()) / 1000))
      )
    }

    // Quotas count successful work only. Failed validation/provider/database responses release the slot.
    let finalized = false
    res.once('finish', () => {
      if (res.statusCode < 400 || finalized) return
      finalized = true
      result.release().catch(error => console.error('Quota rollback failed:', error.code || error.name))
    })
    next()
  }
}

export const PLAN_POLICY = Object.freeze({
  free: Object.freeze({
    id: 'free',
    label: 'Free',
    tier: 'free',
    amount: 0,
    currency: 'INR',
    durationDays: 0,
    quotas: Object.freeze({ optimizations: 3, bulletRewrites: 1, coverLetters: 0, history: 3 })
  }),
  monthly: Object.freeze({
    id: 'monthly',
    label: 'Pro Monthly',
    tier: 'pro',
    amount: 29900,
    currency: 'INR',
    durationDays: 30,
    quotas: Object.freeze({ optimizations: null, bulletRewrites: null, coverLetters: null, history: null })
  }),
  annual: Object.freeze({
    id: 'annual',
    label: 'Pro Annual',
    tier: 'pro',
    amount: 238800,
    currency: 'INR',
    durationDays: 365,
    quotas: Object.freeze({ optimizations: null, bulletRewrites: null, coverLetters: null, history: null })
  })
})

export const RATE_LIMIT_POLICY = Object.freeze({
  upload: Object.freeze({ limit: 5, windowMs: 15 * 60 * 1000 }),
  ai: Object.freeze({ limit: 10, windowMs: 60 * 1000 }),
  paymentOrder: Object.freeze({ limit: 5, windowMs: 10 * 60 * 1000 }),
  paymentVerify: Object.freeze({ limit: 10, windowMs: 10 * 60 * 1000 }),
  authLogin: Object.freeze({ limit: 10, windowMs: 15 * 60 * 1000 }),
  authRegister: Object.freeze({ limit: 5, windowMs: 60 * 60 * 1000 }),
  authRecovery: Object.freeze({ limit: 5, windowMs: 60 * 60 * 1000 }),
  authRefresh: Object.freeze({ limit: 30, windowMs: 15 * 60 * 1000 })
})

export function getMonthPeriod(now = new Date()) {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const start = new Date(Date.UTC(year, month, 1))
  const end = new Date(Date.UTC(year, month + 1, 1))
  return { key: `${year}-${String(month + 1).padStart(2, '0')}`, start, end }
}

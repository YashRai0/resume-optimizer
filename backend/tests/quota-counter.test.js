import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { reserveWithAdapter } from '../services/counterReservations.js'
import { getMonthPeriod, PLAN_POLICY, RATE_LIMIT_POLICY } from '../../shared/planPolicy.js'

function createAtomicFake() {
  const counts = new Map()
  return {
    counts,
    async increment(key) {
      const value = (counts.get(key) || 0) + 1
      counts.set(key, value)
      return value
    },
    async decrement(key) {
      counts.set(key, Math.max(0, (counts.get(key) || 0) - 1))
    }
  }
}

describe('Central plan and quota policy', () => {
  it('matches the free and paid limits advertised by pricing', () => {
    assert.equal(PLAN_POLICY.free.quotas.optimizations, 3)
    assert.equal(PLAN_POLICY.free.quotas.bulletRewrites, 1)
    assert.equal(PLAN_POLICY.free.quotas.coverLetters, 0)
    assert.equal(PLAN_POLICY.free.quotas.history, 3)
    for (const action of Object.keys(PLAN_POLICY.free.quotas)) {
      assert.equal(PLAN_POLICY.monthly.quotas[action], null)
      assert.equal(PLAN_POLICY.annual.quotas[action], null)
    }
  })

  it('uses calendar month boundaries in UTC', () => {
    const period = getMonthPeriod(new Date('2026-01-31T23:59:00Z'))
    assert.equal(period.key, '2026-01')
    assert.equal(period.end.toISOString(), '2026-02-01T00:00:00.000Z')
  })

  it('centralizes rate limits for upload, AI, and payment operations', () => {
    assert.ok(RATE_LIMIT_POLICY.upload.limit > 0)
    assert.ok(RATE_LIMIT_POLICY.ai.limit > 0)
    assert.ok(RATE_LIMIT_POLICY.paymentOrder.limit > 0)
    assert.ok(RATE_LIMIT_POLICY.paymentVerify.limit > 0)
    assert.ok(RATE_LIMIT_POLICY.authLogin.limit > 0)
    assert.ok(RATE_LIMIT_POLICY.authRegister.limit > 0)
    assert.ok(RATE_LIMIT_POLICY.authRecovery.limit > 0)
    assert.ok(RATE_LIMIT_POLICY.authRefresh.limit > 0)
  })
})

describe('Concurrent quota reservations', () => {
  it('never grants more concurrent reservations than the configured allowance', async () => {
    const adapter = createAtomicFake()
    const reservations = await Promise.all(Array.from({ length: 12 }, () => reserveWithAdapter({
      key: 'user_a:optimizations:2026-10',
      limit: 3,
      expiresAt: new Date('2026-11-02T00:00:00Z')
    }, adapter)))

    assert.equal(reservations.filter(item => item.allowed).length, 3)
    assert.equal(adapter.counts.get('user_a:optimizations:2026-10'), 3)
  })

  it('releases failed work once, allowing a retry without double charging', async () => {
    const adapter = createAtomicFake()
    const first = await reserveWithAdapter({ key: 'user_a:bullet:2026-10', limit: 1, expiresAt: new Date() }, adapter)
    await first.release()
    await first.release()
    const retry = await reserveWithAdapter({ key: 'user_a:bullet:2026-10', limit: 1, expiresAt: new Date() }, adapter)

    assert.equal(retry.allowed, true)
    assert.equal(adapter.counts.get('user_a:bullet:2026-10'), 1)
  })
})

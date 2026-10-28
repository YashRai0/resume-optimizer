import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { PLAN_POLICY } from '../../shared/planPolicy.js'
import { verifyPaymentSignature } from '../utils/paymentSecurity.js'

const TEST_SECRET = 'test_razorpay_secret_key_12345'

function sign(orderId, paymentId, secret = TEST_SECRET) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

describe('Razorpay signature validation', () => {
  it('accepts a valid HMAC and rejects a tampered signature', () => {
    const orderId = 'order_test123'
    const paymentId = 'pay_test456'
    assert.equal(verifyPaymentSignature(orderId, paymentId, sign(orderId, paymentId), TEST_SECRET), true)
    assert.equal(verifyPaymentSignature(orderId, paymentId, sign(orderId, paymentId, 'wrong-secret'), TEST_SECRET), false)
  })

  it('rejects malformed IDs and truncated signatures', () => {
    assert.equal(verifyPaymentSignature('order_test123', 'pay_test456', 'abc', TEST_SECRET), false)
    assert.equal(verifyPaymentSignature('external-order', 'pay_test456', sign('external-order', 'pay_test456'), TEST_SECRET), false)
  })
})

describe('Central plan policy', () => {
  it('uses the prices expected by Razorpay order creation', () => {
    assert.equal(PLAN_POLICY.monthly.amount, 29900)
    assert.equal(PLAN_POLICY.annual.amount, 238800)
    assert.equal(PLAN_POLICY.monthly.currency, 'INR')
    assert.equal(PLAN_POLICY.annual.currency, 'INR')
  })

  it('models one-time fixed terms and free quotas without recurring renewal', () => {
    assert.equal(PLAN_POLICY.monthly.durationDays, 30)
    assert.equal(PLAN_POLICY.annual.durationDays, 365)
    assert.equal(PLAN_POLICY.free.quotas.optimizations, 3)
    assert.equal(PLAN_POLICY.free.quotas.bulletRewrites, 1)
    assert.equal(PLAN_POLICY.free.quotas.coverLetters, 0)
    assert.equal(PLAN_POLICY.free.quotas.history, 3)
  })
})

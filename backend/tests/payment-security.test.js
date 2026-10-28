import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { getProviderPaymentError, verifyPaymentSignature } from '../utils/paymentSecurity.js'

const secret = 'security-test-secret'
const orderId = 'order_abc123'
const paymentId = 'pay_def456'
const plan = 'monthly'
const expectedConfig = { amount: 29900, currency: 'INR' }

function makeSignature(order = orderId, payment = paymentId) {
  return crypto.createHmac('sha256', secret).update(`${order}|${payment}`).digest('hex')
}

function providerRecords(overrides = {}) {
  return {
    order: {
      amount: 29900,
      currency: 'INR',
      status: 'paid',
      notes: { userId: 'user_1', plan: 'monthly' },
      ...overrides.order
    },
    payment: {
      order_id: orderId,
      amount: 29900,
      currency: 'INR',
      status: 'captured',
      ...overrides.payment
    }
  }
}

describe('Payment security checks used by verification route', () => {
  it('accepts a correct HMAC and rejects altered or malformed signatures', () => {
    const signature = makeSignature()
    assert.equal(verifyPaymentSignature(orderId, paymentId, signature, secret), true)
    assert.equal(verifyPaymentSignature(orderId, paymentId, makeSignature('order_other'), secret), false)
    assert.equal(verifyPaymentSignature(orderId, paymentId, 'g'.repeat(64), secret), false)
    assert.equal(verifyPaymentSignature(orderId, paymentId, signature.slice(0, 62), secret), false)
  })

  it('binds a verified order to its original user and purchased plan', () => {
    const records = providerRecords()
    const input = { ...records, userId: 'user_1', plan, expectedConfig, orderId }
    assert.equal(getProviderPaymentError(input), null)
    assert.equal(getProviderPaymentError({ ...input, userId: 'user_2' }), 'ownership')
    assert.equal(getProviderPaymentError({ ...input, plan: 'annual' }), 'ownership')
  })

  it('rejects amount and currency mismatches on either provider record', () => {
    const records = providerRecords()
    const input = { ...records, userId: 'user_1', plan, expectedConfig, orderId }
    assert.equal(getProviderPaymentError({ ...input, order: { ...records.order, amount: 100 } }), 'amount')
    assert.equal(getProviderPaymentError({ ...input, payment: { ...records.payment, amount: 100 } }), 'amount')
    assert.equal(getProviderPaymentError({ ...input, order: { ...records.order, currency: 'USD' } }), 'currency')
    assert.equal(getProviderPaymentError({ ...input, payment: { ...records.payment, currency: 'USD' } }), 'currency')
  })

  it('requires a paid order and captured payment linked to that order', () => {
    const records = providerRecords()
    const input = { ...records, userId: 'user_1', plan, expectedConfig, orderId }
    assert.equal(getProviderPaymentError({ ...input, order: { ...records.order, status: 'created' } }), 'status')
    assert.equal(getProviderPaymentError({ ...input, payment: { ...records.payment, status: 'authorized' } }), 'status')
    assert.equal(getProviderPaymentError({ ...input, payment: { ...records.payment, order_id: 'order_other' } }), 'status')
  })
})

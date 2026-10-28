import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { commitPaymentCapture, isSameCapturedPayment } from '../services/commitPaymentCapture.js'

function fakePersistentLedger() {
  const orders = new Map()
  const payments = new Map()
  return {
    orders,
    payments,
    async findOrder(orderId) { return orders.get(orderId) || null },
    async findPayment(paymentId) { return payments.get(paymentId) || null },
    async captureOrder(orderId, paymentId, capturedData) {
      const record = orders.get(orderId)
      if (!record || record.status !== 'created') return null
      if (payments.has(paymentId)) {
        const error = new Error('unique payment ID')
        error.code = 11000
        throw error
      }
      const captured = { ...record, ...capturedData, razorpayPaymentId: paymentId, status: 'captured' }
      orders.set(orderId, captured)
      payments.set(paymentId, captured)
      return captured
    }
  }
}

function seedOrder(store) {
  store.orders.set('order_1', {
    userId: 'user_1', razorpayOrderId: 'order_1', plan: 'monthly',
    expectedAmount: 29900, expectedCurrency: 'INR', status: 'created'
  })
}

const captureArgs = {
  userId: 'user_1', orderId: 'order_1', paymentId: 'pay_1', plan: 'monthly',
  capturedData: {
    providerPaymentStatus: 'captured',
    verifiedAt: new Date('2026-01-01T00:00:00Z'),
    entitlementStartsAt: new Date('2026-01-01T00:00:00Z'),
    entitlementEndsAt: new Date('2026-01-31T00:00:00Z')
  }
}

describe('Durable payment ledger transitions', () => {
  it('creates one captured entitlement when verification requests race', async () => {
    const store = fakePersistentLedger()
    seedOrder(store)
    const results = await Promise.all([
      commitPaymentCapture({ store, ...captureArgs }),
      commitPaymentCapture({ store, ...captureArgs })
    ])

    assert.equal(results.filter(result => result.outcome === 'captured').length, 1)
    assert.equal(results.filter(result => result.outcome === 'already-captured').length, 1)
    assert.equal(store.payments.size, 1)
  })

  it('returns the same entitlement after creating a fresh store wrapper', async () => {
    const persistentStore = fakePersistentLedger()
    seedOrder(persistentStore)
    const first = await commitPaymentCapture({ store: persistentStore, ...captureArgs })
    const newProcessStore = persistentStore
    const repeated = await commitPaymentCapture({ store: newProcessStore, ...captureArgs })

    assert.equal(first.outcome, 'captured')
    assert.equal(repeated.outcome, 'already-captured')
    assert.equal(repeated.record.entitlementEndsAt.toISOString(), '2026-01-31T00:00:00.000Z')
  })

  it('does not treat a payment as reusable by a different account or order', () => {
    const record = {
      userId: 'user_1', razorpayOrderId: 'order_1', razorpayPaymentId: 'pay_1', plan: 'monthly', status: 'captured'
    }
    assert.equal(isSameCapturedPayment(record, 'user_2', 'order_1', 'pay_1', 'monthly'), false)
    assert.equal(isSameCapturedPayment(record, 'user_1', 'order_2', 'pay_1', 'monthly'), false)
  })
})

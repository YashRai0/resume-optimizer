import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import crypto from 'node:crypto'
import { createPaymentRouter } from '../routes/payment.js'
import { PLAN_POLICY } from '../../shared/planPolicy.js'

const TEST_SECRET = 'test_razorpay_secret_key_12345'
const TEST_KEY_ID = 'rzp_test_key_12345'

function sign(orderId, paymentId, secret = TEST_SECRET) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

function fakePaymentStore() {
  const orders = new Map()
  const payments = new Map()
  let activeEntitlement = null

  return {
    orders,
    payments,
    setActiveEntitlement(e) { activeEntitlement = e },
    async findActiveEntitlement(userId, now) { return activeEntitlement },
    async createOrder(data) {
      orders.set(data.razorpayOrderId, { ...data, status: 'created' })
      return orders.get(data.razorpayOrderId)
    },
    async findOrder(orderId) {
      return orders.get(orderId) || null
    },
    async findPayment(paymentId) {
      return payments.get(paymentId) || null
    },
    async captureOrder(orderId, paymentId, capturedData) {
      const existing = orders.get(orderId)
      if (!existing || existing.status !== 'created') return null
      const captured = {
        ...existing,
        ...capturedData,
        razorpayPaymentId: paymentId,
        status: 'captured'
      }
      orders.set(orderId, captured)
      payments.set(paymentId, captured)
      return captured
    }
  }
}

function fakeRazorpayClient(overrides = {}) {
  return {
    orders: {
      create: async (params) => {
        if (overrides.failCreate) throw new Error('Razorpay API error')
        return {
          id: 'order_fake123',
          amount: params.amount,
          currency: params.currency,
          ...overrides.order
        }
      },
      fetch: async (id) => ({
        id,
        amount: 29900,
        currency: 'INR',
        status: 'paid',
        notes: { userId: 'user_1', plan: 'monthly' },
        ...overrides.fetchOrder
      })
    },
    payments: {
      fetch: async (id) => ({
        id,
        order_id: 'order_fake123',
        amount: 29900,
        currency: 'INR',
        status: 'captured',
        ...overrides.fetchPayment
      })
    }
  }
}

function setupApp(routerOptions = {}) {
  const app = express()
  app.use(express.json())
  const authMiddleware = (req, res, next) => {
    req.user = { id: routerOptions.userId || 'user_1' }
    next()
  }
  const router = createPaymentRouter({
    authMiddleware,
    databaseMode: () => 'mongodb',
    getKeyId: () => TEST_KEY_ID,
    getKeySecret: () => TEST_SECRET,
    paymentOrderLimiter: (req, res, next) => next(),
    paymentVerificationLimiter: (req, res, next) => next(),
    ...routerOptions
  })
  app.use('/api', router)
  return app
}

describe('Payment route - createOrder', () => {
  it('returns 503 PAYMENT_STORE_UNAVAILABLE when database is not mongodb', async () => {
    const store = fakePaymentStore()
    const app = setupApp({
      paymentStore: store,
      databaseMode: () => 'memory',
      razorpayFactory: () => fakeRazorpayClient()
    })

    const server = app.listen(0)
    const port = server.address().port
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' })
      })
      assert.equal(res.status, 503)
      const data = await res.json()
      assert.equal(data.error.code, 'PAYMENT_STORE_UNAVAILABLE')
    } finally {
      server.close()
    }
  })

  it('returns 503 PAYMENT_NOT_CONFIGURED when razorpayFactory returns null', async () => {
    const store = fakePaymentStore()
    const app = setupApp({
      paymentStore: store,
      razorpayFactory: () => null
    })

    const server = app.listen(0)
    const port = server.address().port
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' })
      })
      assert.equal(res.status, 503)
      const data = await res.json()
      assert.equal(data.error.code, 'PAYMENT_NOT_CONFIGURED')
    } finally {
      server.close()
    }
  })

  it('rejects invalid plan with 400 INVALID_PLAN', async () => {
    const store = fakePaymentStore()
    const app = setupApp({
      paymentStore: store,
      razorpayFactory: () => fakeRazorpayClient()
    })

    const server = app.listen(0)
    const port = server.address().port
    try {
      for (const invalidPlan of ['free', 'lifetime', '', null, 123]) {
        const res = await fetch(`http://127.0.0.1:${port}/api/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: invalidPlan })
        })
        assert.equal(res.status, 400)
        const data = await res.json()
        assert.equal(data.error.code, 'INVALID_PLAN')
      }
    } finally {
      server.close()
    }
  })

  it('rejects with 409 PLAN_ALREADY_ACTIVE when user already has an active entitlement', async () => {
    const store = fakePaymentStore()
    const futureDate = new Date(Date.now() + 86400000 * 20)
    store.setActiveEntitlement({ plan: 'monthly', entitlementEndsAt: futureDate })
    const app = setupApp({
      paymentStore: store,
      razorpayFactory: () => fakeRazorpayClient()
    })

    const server = app.listen(0)
    const port = server.address().port
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' })
      })
      assert.equal(res.status, 409)
      const data = await res.json()
      assert.equal(data.error.code, 'PLAN_ALREADY_ACTIVE')
    } finally {
      server.close()
    }
  })

  it('creates order with server-controlled amount and returns order id, amount, and public keyId', async () => {
    const store = fakePaymentStore()
    const app = setupApp({
      paymentStore: store,
      razorpayFactory: () => fakeRazorpayClient(),
      getKeyId: () => TEST_KEY_ID
    })

    const server = app.listen(0)
    const port = server.address().port
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' })
      })
      assert.equal(res.status, 200)
      const data = await res.json()
      assert.equal(data.id, 'order_fake123')
      assert.equal(data.amount, PLAN_POLICY.monthly.amount)
      assert.equal(data.currency, 'INR')
      assert.equal(data.plan, 'monthly')
      assert.equal(data.keyId, TEST_KEY_ID)

      const storedOrder = await store.findOrder('order_fake123')
      assert.ok(storedOrder)
      assert.equal(storedOrder.expectedAmount, PLAN_POLICY.monthly.amount)
      assert.equal(storedOrder.status, 'created')
    } finally {
      server.close()
    }
  })
})

describe('Payment route - verifyPayment', () => {
  it('rejects invalid signature with 400 INVALID_SIGNATURE', async () => {
    const store = fakePaymentStore()
    await store.createOrder({
      userId: 'user_1',
      razorpayOrderId: 'order_test1',
      plan: 'monthly',
      expectedAmount: 29900,
      expectedCurrency: 'INR'
    })
    const app = setupApp({
      paymentStore: store,
      razorpayFactory: () => fakeRazorpayClient()
    })

    const server = app.listen(0)
    const port = server.address().port
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: 'order_test1',
          razorpay_payment_id: 'pay_test1',
          razorpay_signature: '0'.repeat(64),
          plan: 'monthly'
        })
      })
      assert.equal(res.status, 400)
      const data = await res.json()
      assert.equal(data.error.code, 'INVALID_SIGNATURE')
    } finally {
      server.close()
    }
  })

  it('successfully verifies payment, activates 30-day Pro plan, and handles duplicate call idempotently', async () => {
    const store = fakePaymentStore()
    await store.createOrder({
      userId: 'user_1',
      razorpayOrderId: 'order_test1',
      plan: 'monthly',
      expectedAmount: 29900,
      expectedCurrency: 'INR'
    })
    const app = setupApp({
      paymentStore: store,
      razorpayFactory: () => fakeRazorpayClient({
        fetchOrder: { id: 'order_test1', notes: { userId: 'user_1', plan: 'monthly' } },
        fetchPayment: { id: 'pay_test1', order_id: 'order_test1' }
      })
    })

    const signature = sign('order_test1', 'pay_test1', TEST_SECRET)
    const server = app.listen(0)
    const port = server.address().port
    try {
      // First verification call
      const res = await fetch(`http://127.0.0.1:${port}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: 'order_test1',
          razorpay_payment_id: 'pay_test1',
          razorpay_signature: signature,
          plan: 'monthly'
        })
      })
      assert.equal(res.status, 200)
      const data = await res.json()
      assert.equal(data.success, true)
      assert.equal(data.plan, 'monthly')
      assert.equal(data.tier, 'pro')
      assert.ok(data.entitlementEndsAt)

      const captured = await store.findPayment('pay_test1')
      assert.equal(captured.status, 'captured')
      assert.equal(captured.razorpayOrderId, 'order_test1')

      // Second verification call (duplicate / retry)
      const res2 = await fetch(`http://127.0.0.1:${port}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: 'order_test1',
          razorpay_payment_id: 'pay_test1',
          razorpay_signature: signature,
          plan: 'monthly'
        })
      })
      assert.equal(res2.status, 200)
      const data2 = await res2.json()
      assert.equal(data2.success, true)
      assert.equal(data2.message, 'Payment already verified.')
    } finally {
      server.close()
    }
  })

  it('rejects payment order ownership mismatch with 403', async () => {
    const store = fakePaymentStore()
    await store.createOrder({
      userId: 'user_different',
      razorpayOrderId: 'order_test2',
      plan: 'monthly',
      expectedAmount: 29900,
      expectedCurrency: 'INR'
    })
    const app = setupApp({
      userId: 'user_1',
      paymentStore: store,
      razorpayFactory: () => fakeRazorpayClient()
    })

    const signature = sign('order_test2', 'pay_test2', TEST_SECRET)
    const server = app.listen(0)
    const port = server.address().port
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: 'order_test2',
          razorpay_payment_id: 'pay_test2',
          razorpay_signature: signature,
          plan: 'monthly'
        })
      })
      assert.equal(res.status, 403)
      const data = await res.json()
      assert.equal(data.error.code, 'ORDER_OWNER_MISMATCH')
    } finally {
      server.close()
    }
  })
})

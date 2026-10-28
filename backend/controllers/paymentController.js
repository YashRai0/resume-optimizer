import { randomUUID } from 'crypto'
import { PLAN_POLICY } from '../../shared/planPolicy.js'
import { getProviderPaymentError, verifyPaymentSignature } from '../utils/paymentSecurity.js'
import { commitPaymentCapture, isSameCapturedPayment } from '../services/commitPaymentCapture.js'
import { getDbMode } from '../config/db.js'
import { createPaymentStore } from '../services/paymentStore.js'
import Razorpay from 'razorpay'

export function getRazorpayConfig() {
  const rawKeyId = process.env.RAZORPAY_KEY_ID?.trim()
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET?.trim()
  const missing = []
  if (!rawKeyId) missing.push('RAZORPAY_KEY_ID')
  if (!rawKeySecret) missing.push('RAZORPAY_KEY_SECRET')

  if (rawKeyId && rawKeyId.startsWith('<') && rawKeyId.endsWith('>')) {
    console.warn('[paymentService] RAZORPAY_KEY_ID appears to contain placeholder angle brackets "<...>"; check your environment settings.')
  }
  if (rawKeySecret && rawKeySecret.startsWith('<') && rawKeySecret.endsWith('>')) {
    console.warn('[paymentService] RAZORPAY_KEY_SECRET appears to contain placeholder angle brackets "<...>"; check your environment settings.')
  }

  return {
    isConfigured: missing.length === 0,
    missing,
    keyId: rawKeyId || null,
    keySecret: rawKeySecret || null
  }
}

export function createRazorpayClient() {
  const { isConfigured, missing, keyId, keySecret } = getRazorpayConfig()
  if (!isConfigured) {
    console.warn(`[paymentService] Razorpay payment gateway is unconfigured (missing: [${missing.join(', ')}])`)
    return null
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret })
}

function paymentNotConfigured(res) {
  return res.status(503).json({
    success: false,
    error: {
      code: 'PAYMENT_NOT_CONFIGURED',
      message: 'Payment gateway is temporarily unconfigured. Contact the site administrator.'
    }
  })
}

function serviceUnavailable(res) {
  return res.status(503).json({
    success: false,
    error: { code: 'PAYMENT_STORE_UNAVAILABLE', message: 'Payment service is temporarily unavailable.' }
  })
}

function paymentConflict(res) {
  return res.status(409).json({
    success: false,
    error: { code: 'PAYMENT_ALREADY_USED', message: 'Payment has already been verified.' }
  })
}

function paymentSuccess(res, record, alreadyVerified = false) {
  return res.json({
    success: true,
    message: alreadyVerified ? 'Payment already verified.' : 'Payment verified successfully.',
    plan: record.plan,
    tier: PLAN_POLICY[record.plan].tier,
    entitlementEndsAt: record.entitlementEndsAt
  })
}

function addDays(date, days) {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

export function createPaymentController({
  paymentStore = createPaymentStore(),
  razorpayFactory = createRazorpayClient,
  databaseMode = getDbMode,
  getKeyId = () => process.env.RAZORPAY_KEY_ID?.trim(),
  getKeySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim()
} = {}) {
  return {
    async createOrder(req, res) {
      if (databaseMode() !== 'mongodb') return serviceUnavailable(res)

      try {
        const { plan } = req.body || {}
        if (typeof plan !== 'string' || !Object.hasOwn(PLAN_POLICY, plan) || plan === 'free') {
          return res.status(400).json({ error: { code: 'INVALID_PLAN', message: 'Choose a supported paid plan.' } })
        }

        const config = PLAN_POLICY[plan]
        const activeEntitlement = await paymentStore.findActiveEntitlement(req.user.id, new Date())
        if (activeEntitlement) {
          return res.status(409).json({
            error: {
              code: 'PLAN_ALREADY_ACTIVE',
              message: 'Your Pro access is already active.',
              entitlementEndsAt: activeEntitlement.entitlementEndsAt
            }
          })
        }

        const razorpay = razorpayFactory()
        if (!razorpay) return paymentNotConfigured(res)

        const order = await razorpay.orders.create({
          amount: config.amount,
          currency: config.currency,
          receipt: `resume_${randomUUID().replaceAll('-', '').slice(0, 30)}`,
          notes: { userId: req.user.id, plan, tier: config.tier }
        })
        if (!order?.id || order.amount !== config.amount || order.currency !== config.currency) {
          return res.status(502).json({ error: { code: 'INVALID_PROVIDER_ORDER', message: 'Payment provider returned an invalid order.' } })
        }

        try {
          await paymentStore.createOrder({
            userId: req.user.id,
            razorpayOrderId: order.id,
            plan,
            expectedAmount: config.amount,
            expectedCurrency: config.currency,
            status: 'created'
          })
        } catch (error) {
          console.error('Payment order ledger write failed:', error.code || error.name)
          return serviceUnavailable(res)
        }

        return res.json({
          id: order.id,
          amount: config.amount,
          currency: config.currency,
          plan,
          keyId: getKeyId() || null
        })
      } catch (error) {
        console.error('Payment order creation failed:', error.statusCode || error.name || 'Error')
        return res.status(502).json({ error: { code: 'ORDER_CREATION_FAILED', message: 'Failed to create payment order.' } })
      }
    },

    async verifyPayment(req, res) {
      if (databaseMode() !== 'mongodb') return serviceUnavailable(res)

      try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body || {}
        if (typeof razorpay_order_id !== 'string' || typeof razorpay_payment_id !== 'string' || typeof razorpay_signature !== 'string') {
          return res.status(400).json({ success: false, error: { code: 'INVALID_PAYMENT_FIELDS', message: 'Payment verification fields are invalid.' } })
        }
        if (typeof plan !== 'string' || !Object.hasOwn(PLAN_POLICY, plan) || plan === 'free') {
          return res.status(400).json({ success: false, error: { code: 'INVALID_PLAN', message: 'Payment plan is invalid.' } })
        }

        const secret = getKeySecret()
        if (!secret) return paymentNotConfigured(res)
        if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
          return res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Payment signature verification failed.' } })
        }

        const orderRecord = await paymentStore.findOrder(razorpay_order_id)
        if (!orderRecord) {
          return res.status(404).json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Payment order was not found.' } })
        }
        if (orderRecord.userId !== req.user.id) {
          return res.status(403).json({ success: false, error: { code: 'ORDER_OWNER_MISMATCH', message: 'Payment order does not belong to this account.' } })
        }
        if (orderRecord.plan !== plan) {
          return res.status(400).json({ success: false, error: { code: 'PLAN_MISMATCH', message: 'Payment plan does not match the order.' } })
        }

        if (orderRecord.status === 'captured') {
          if (!isSameCapturedPayment(orderRecord, req.user.id, razorpay_order_id, razorpay_payment_id, plan)) return paymentConflict(res)
          return paymentSuccess(res, orderRecord, true)
        }

        const reusedPayment = await paymentStore.findPayment(razorpay_payment_id)
        if (reusedPayment) {
          if (isSameCapturedPayment(reusedPayment, req.user.id, razorpay_order_id, razorpay_payment_id, plan)) {
            return paymentSuccess(res, reusedPayment, true)
          }
          return paymentConflict(res)
        }

        const razorpay = razorpayFactory()
        if (!razorpay) return paymentNotConfigured(res)

        let providerOrder
        let providerPayment
        try {
          [providerOrder, providerPayment] = await Promise.all([
            razorpay.orders.fetch(razorpay_order_id),
            razorpay.payments.fetch(razorpay_payment_id)
          ])
        } catch (error) {
          console.error('Payment provider verification failed:', error.statusCode || error.name)
          return res.status(503).json({ success: false, error: { code: 'PAYMENT_PROVIDER_UNAVAILABLE', message: 'Could not verify payment with the provider.' } })
        }

        const config = PLAN_POLICY[orderRecord.plan]
        if (orderRecord.expectedAmount !== config.amount || orderRecord.expectedCurrency !== config.currency) {
          return res.status(409).json({ success: false, error: { code: 'LEDGER_PLAN_MISMATCH', message: 'Stored payment order does not match plan configuration.' } })
        }

        const providerError = getProviderPaymentError({
          order: providerOrder,
          payment: providerPayment,
          userId: req.user.id,
          plan: orderRecord.plan,
          expectedConfig: config,
          orderId: razorpay_order_id
        })
        if (providerError === 'ownership') {
          return res.status(403).json({ success: false, error: { code: 'ORDER_OWNER_MISMATCH', message: 'Payment order does not belong to this account and plan.' } })
        }
        if (providerError === 'amount') {
          return res.status(400).json({ success: false, error: { code: 'AMOUNT_MISMATCH', message: 'Payment amount does not match the selected plan.' } })
        }
        if (providerError === 'currency') {
          return res.status(400).json({ success: false, error: { code: 'CURRENCY_MISMATCH', message: 'Payment currency does not match the selected plan.' } })
        }
        if (providerError === 'status') {
          return res.status(400).json({ success: false, error: { code: 'PAYMENT_NOT_CAPTURED', message: 'Payment has not been captured for this order.' } })
        }

        const verifiedAt = new Date()
        const entitlementStartsAt = verifiedAt
        const entitlementEndsAt = addDays(verifiedAt, config.durationDays)
        let capture
        try {
          capture = await commitPaymentCapture({
            store: paymentStore,
            userId: req.user.id,
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            plan,
            capturedData: {
              providerPaymentStatus: providerPayment.status,
              verifiedAt,
              entitlementStartsAt,
              entitlementEndsAt
            }
          })
        } catch (error) {
          console.error('Payment capture ledger write failed:', error.code || error.name)
          return serviceUnavailable(res)
        }

        if (capture.outcome === 'conflict') return paymentConflict(res)
        return paymentSuccess(res, capture.record, capture.outcome === 'already-captured')
      } catch (error) {
        console.error('Payment verification failed:', error.code || error.name)
        return res.status(500).json({ success: false, error: { code: 'PAYMENT_VERIFICATION_FAILED', message: 'Payment verification failed.' } })
      }
    }
  }
}

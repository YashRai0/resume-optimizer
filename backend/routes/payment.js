import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { rateLimit } from '../middleware/abuseLimits.js'
import { RATE_LIMIT_POLICY } from '../../shared/planPolicy.js'
import { createPaymentStore } from '../services/paymentStore.js'
import { getDbMode } from '../config/db.js'
import { createPaymentController } from '../controllers/paymentController.js'

export function createPaymentRouter({
  authMiddleware = requireAuth,
  razorpayFactory,
  paymentStore = createPaymentStore(),
  databaseMode = getDbMode,
  getKeyId,
  getKeySecret,
  paymentOrderLimiter = rateLimit({
    scope: 'payment-order',
    ...RATE_LIMIT_POLICY.paymentOrder,
    subject: req => req.user?.id
  }),
  paymentVerificationLimiter = rateLimit({
    scope: 'payment-verify',
    ...RATE_LIMIT_POLICY.paymentVerify,
    subject: req => req.user?.id
  })
} = {}) {
  const router = Router()
  const controller = createPaymentController({
    paymentStore,
    razorpayFactory,
    databaseMode,
    getKeyId,
    getKeySecret
  })

  router.post('/create-order', authMiddleware, paymentOrderLimiter, controller.createOrder)
  router.post('/verify-payment', authMiddleware, paymentVerificationLimiter, controller.verifyPayment)

  return router
}

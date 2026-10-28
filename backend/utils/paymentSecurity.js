import crypto from 'crypto'

const ORDER_ID = /^order_[A-Za-z0-9]+$/
const PAYMENT_ID = /^pay_[A-Za-z0-9]+$/
const SIGNATURE = /^[a-fA-F0-9]{64}$/

export function verifyPaymentSignature(orderId, paymentId, signature, secret) {
  if (!secret || !ORDER_ID.test(orderId || '') || !PAYMENT_ID.test(paymentId || '') || !SIGNATURE.test(signature || '')) {
    return false
  }

  const expected = crypto.createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest()
  const provided = Buffer.from(signature, 'hex')
  return provided.length === expected.length && crypto.timingSafeEqual(expected, provided)
}

export function getProviderPaymentError({ order, payment, userId, plan, expectedConfig, orderId }) {
  if (order?.notes?.userId !== userId || order?.notes?.plan !== plan) return 'ownership'
  if (order.amount !== expectedConfig.amount || payment.amount !== expectedConfig.amount) return 'amount'
  if (order.currency !== expectedConfig.currency || payment.currency !== expectedConfig.currency) return 'currency'
  if (order.status !== 'paid' || payment.order_id !== orderId || payment.status !== 'captured') return 'status'
  return null
}

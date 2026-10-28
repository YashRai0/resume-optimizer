import PaymentLedger from '../models/PaymentLedger.js'

export function createPaymentStore(model = PaymentLedger) {
  return {
    createOrder(record) {
      return model.create(record)
    },
    findOrder(orderId) {
      return model.findOne({ razorpayOrderId: orderId }).lean()
    },
    findPayment(paymentId) {
      return model.findOne({ razorpayPaymentId: paymentId }).lean()
    },
    findActiveEntitlement(userId, now) {
      return model.findOne({
        userId,
        status: 'captured',
        entitlementStartsAt: { $lte: now },
        entitlementEndsAt: { $gt: now }
      }).sort({ entitlementEndsAt: -1 }).lean()
    },
    captureOrder(orderId, paymentId, capturedData) {
      return model.findOneAndUpdate(
        {
          razorpayOrderId: orderId,
          status: 'created',
          razorpayPaymentId: { $exists: false }
        },
        {
          $set: {
            razorpayPaymentId: paymentId,
            status: 'captured',
            ...capturedData
          }
        },
        { new: true, runValidators: true }
      ).lean()
    }
  }
}

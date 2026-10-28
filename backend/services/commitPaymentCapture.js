export function isSameCapturedPayment(record, userId, orderId, paymentId, plan) {
  return record?.userId === userId &&
    record?.razorpayOrderId === orderId &&
    record?.razorpayPaymentId === paymentId &&
    record?.plan === plan &&
    record?.status === 'captured'
}

export async function commitPaymentCapture({ store, userId, orderId, paymentId, plan, capturedData }) {
  try {
    const captured = await store.captureOrder(orderId, paymentId, capturedData)
    if (captured) return { outcome: 'captured', record: captured }
  } catch (error) {
    if (error.code !== 11000) throw error
    const paymentRecord = await store.findPayment(paymentId)
    if (isSameCapturedPayment(paymentRecord, userId, orderId, paymentId, plan)) {
      return { outcome: 'already-captured', record: paymentRecord }
    }
    return { outcome: 'conflict' }
  }

  const currentOrder = await store.findOrder(orderId)
  if (isSameCapturedPayment(currentOrder, userId, orderId, paymentId, plan)) {
    return { outcome: 'already-captured', record: currentOrder }
  }
  return { outcome: 'conflict' }
}

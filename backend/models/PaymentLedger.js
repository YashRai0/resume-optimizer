import mongoose from 'mongoose'

const paymentLedgerSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, unique: true, sparse: true },
  plan: { type: String, enum: ['monthly', 'annual'], required: true },
  expectedAmount: { type: Number, required: true },
  expectedCurrency: { type: String, required: true },
  status: { type: String, enum: ['created', 'captured'], required: true, default: 'created' },
  providerPaymentStatus: { type: String },
  verifiedAt: { type: Date },
  entitlementStartsAt: { type: Date },
  entitlementEndsAt: { type: Date }
}, {
  collection: 'payment_ledger_v1',
  timestamps: true,
  versionKey: false
})

paymentLedgerSchema.index({ userId: 1, status: 1, entitlementEndsAt: -1 })

const PaymentLedger = mongoose.models.PaymentLedger || mongoose.model('PaymentLedger', paymentLedgerSchema)
export default PaymentLedger

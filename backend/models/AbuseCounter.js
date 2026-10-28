import mongoose from 'mongoose'

const abuseCounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true }
}, {
  collection: 'abuse_counters_v1',
  versionKey: false
})

abuseCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const AbuseCounter = mongoose.models.AbuseCounter || mongoose.model('AbuseCounter', abuseCounterSchema)
export default AbuseCounter

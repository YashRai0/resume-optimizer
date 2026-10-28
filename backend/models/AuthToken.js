import mongoose from 'mongoose'

const authTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthUser', required: true, index: true },
  purpose: { type: String, enum: ['verify-email', 'reset-password'], required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  consumedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'auth_tokens_v1', versionKey: false })

authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const AuthToken = mongoose.models.AuthToken || mongoose.model('AuthToken', authTokenSchema)
export default AuthToken

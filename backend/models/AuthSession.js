import mongoose from 'mongoose'

const authSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'AuthUser', required: true, index: true },
  refreshTokenHash: { type: String, required: true, unique: true },
  usedRefreshTokenHashes: { type: [String], default: [] },
  csrfTokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  userAgent: { type: String, maxlength: 500, default: '' }
}, { collection: 'auth_sessions_v1', versionKey: false })

authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
authSessionSchema.index({ usedRefreshTokenHashes: 1 })

const AuthSession = mongoose.models.AuthSession || mongoose.model('AuthSession', authSessionSchema)
export default AuthSession

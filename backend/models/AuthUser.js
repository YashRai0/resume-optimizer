import mongoose from 'mongoose'

const authUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  displayName: { type: String, trim: true, maxlength: 100, default: '' },
  passwordHash: { type: String, required: true, select: false },
  emailVerifiedAt: { type: Date, default: null },
  disabledAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'auth_users_v1', versionKey: false })

const AuthUser = mongoose.models.AuthUser || mongoose.model('AuthUser', authUserSchema)
export default AuthUser

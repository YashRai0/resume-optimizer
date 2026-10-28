import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_TTL_SECONDS = 10 * 60

export function createOpaqueToken() {
  return randomBytes(32).toString('hex')
}

export function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function safeEqualHex(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || !/^[a-f0-9]{64}$/.test(left) || !/^[a-f0-9]{64}$/.test(right)) return false
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'))
}

function getJwtConfig() {
  const secret = process.env.AUTH_ACCESS_TOKEN_SECRET
  if (!secret || Buffer.byteLength(secret) < 32) {
    const error = new Error('Authentication is not configured.')
    error.code = 'AUTH_NOT_CONFIGURED'
    throw error
  }
  return {
    secret,
    issuer: process.env.AUTH_TOKEN_ISSUER || 'resumeai4u-api',
    audience: process.env.AUTH_TOKEN_AUDIENCE || 'resumeai4u-web'
  }
}

export function validateAuthTokenConfig() {
  return getJwtConfig()
}

export function createCsrfToken(refreshToken) {
  const { secret } = getJwtConfig()
  return createHmac('sha256', secret).update(`resumeai4u-csrf:${refreshToken}`).digest('hex')
}

export function createAccessToken(userId, sessionId, now = Math.floor(Date.now() / 1000)) {
  const config = getJwtConfig()
  return jwt.sign({ sub: String(userId), sid: String(sessionId), typ: 'access', iat: now }, config.secret, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: config.issuer,
    audience: config.audience
  })
}

export function verifyAccessToken(token, nowSeconds = Math.floor(Date.now() / 1000)) {
  const config = getJwtConfig()
  const payload = jwt.verify(token, config.secret, {
    algorithms: ['HS256'],
    issuer: config.issuer,
    audience: config.audience,
    clockTimestamp: nowSeconds,
    maxAge: ACCESS_TOKEN_TTL_SECONDS
  })
  if (!payload || typeof payload !== 'object' || payload.typ !== 'access' || typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    const error = new Error('Invalid access token.')
    error.code = 'INVALID_ACCESS_TOKEN'
    throw error
  }
  return { userId: payload.sub, sessionId: payload.sid }
}

export const ACCESS_TOKEN_TTL = ACCESS_TOKEN_TTL_SECONDS

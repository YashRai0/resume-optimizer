import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import {
  createAccessToken,
  createCsrfToken,
  createOpaqueToken,
  hashToken,
  safeEqualHex,
  verifyAccessToken
} from '../services/authTokens.js'
import { normalizeEmail, validateLogin, validatePasswordReset, validateRegistration } from '../utils/authValidation.js'

process.env.AUTH_ACCESS_TOKEN_SECRET = 'test-secret-with-at-least-thirty-two-bytes'
process.env.AUTH_TOKEN_ISSUER = 'test-issuer'
process.env.AUTH_TOKEN_AUDIENCE = 'test-audience'

describe('First-party auth token and input helpers', () => {
  it('issues short-lived access JWTs with the expected identity claims', () => {
    const token = createAccessToken('user-1', 'session-1', 1000)
    assert.deepEqual(verifyAccessToken(token, 1001), { userId: 'user-1', sessionId: 'session-1' })
    assert.throws(() => verifyAccessToken(token, 1000 + 601), error => error.name === 'TokenExpiredError')
  })

  it('rejects malformed, wrong-algorithm, wrong-issuer and wrong-audience JWTs', () => {
    assert.throws(() => verifyAccessToken('not-a-jwt'))
    const wrongAlgorithm = jwt.sign({ sub: 'u', sid: 's', typ: 'access' }, process.env.AUTH_ACCESS_TOKEN_SECRET, {
      algorithm: 'HS384', issuer: 'test-issuer', audience: 'test-audience', expiresIn: '5m'
    })
    const wrongIssuer = jwt.sign({ sub: 'u', sid: 's', typ: 'access' }, process.env.AUTH_ACCESS_TOKEN_SECRET, {
      algorithm: 'HS256', issuer: 'other-issuer', audience: 'test-audience', expiresIn: '5m'
    })
    const wrongAudience = jwt.sign({ sub: 'u', sid: 's', typ: 'access' }, process.env.AUTH_ACCESS_TOKEN_SECRET, {
      algorithm: 'HS256', issuer: 'test-issuer', audience: 'other-audience', expiresIn: '5m'
    })
    assert.throws(() => verifyAccessToken(wrongAlgorithm))
    assert.throws(() => verifyAccessToken(wrongIssuer))
    assert.throws(() => verifyAccessToken(wrongAudience))
  })

  it('creates unpredictable opaque tokens and checks hashes with fixed-size comparison', () => {
    const token = createOpaqueToken()
    assert.match(token, /^[a-f0-9]{64}$/)
    assert.equal(safeEqualHex(hashToken(token), hashToken(token)), true)
    assert.equal(safeEqualHex(hashToken(token), hashToken(createOpaqueToken())), false)
    assert.equal(safeEqualHex('short', 'short'), false)
  })

  it('binds CSRF values to the refresh token', () => {
    const refresh = createOpaqueToken()
    assert.equal(createCsrfToken(refresh), createCsrfToken(refresh))
    assert.notEqual(createCsrfToken(refresh), createCsrfToken(createOpaqueToken()))
  })

  it('normalizes email and validates password/reset input limits', () => {
    assert.equal(normalizeEmail('  Person@Example.COM '), 'person@example.com')
    assert.equal(validateRegistration({ email: 'a@b.com', password: 'short' }).ok, false)
    assert.equal(validateRegistration({ email: 'valid@example.com', password: 'correct horse battery staple' }).ok, true)
    assert.equal(validateLogin({ email: 'valid@example.com', password: 'x' }).ok, true)
    assert.equal(validatePasswordReset({ token: 'a'.repeat(64), password: 'a'.repeat(129) }).ok, false)
  })
})

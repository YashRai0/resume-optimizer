import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { createAuthRouter } from '../routes/auth.js'

const origin = 'http://localhost:3000'
process.env.ALLOWED_ORIGINS = origin
process.env.AUTH_ACCESS_TOKEN_SECRET = 'test-secret-with-at-least-thirty-two-bytes'
process.env.AUTH_TOKEN_ISSUER = 'test-issuer'
process.env.AUTH_TOKEN_AUDIENCE = 'test-audience'
process.env.NODE_ENV = 'test'

function fakeStore() {
  const users = new Map()
  const sessions = new Map()
  const authTokens = new Map()
  let userCounter = 0

  return {
    users,
    sessions,
    authTokens,
    async findUserByEmail(email) { return users.get(email) || null },
    async findUserById(id) { return [...users.values()].find(user => user._id === String(id)) || null },
    async createUser(data) {
      if (users.has(data.email)) {
        const error = new Error('duplicate')
        error.code = 11000
        throw error
      }
      const user = { ...data, _id: `local-${++userCounter}`, emailVerifiedAt: null, disabledAt: null }
      users.set(user.email, user)
      return user
    },
    async verifyEmail(userId, now) {
      const user = await this.findUserById(userId)
      if (!user || user.disabledAt || user.emailVerifiedAt) return null
      user.emailVerifiedAt = now
      return user
    },
    async updatePassword(userId, passwordHash) {
      const user = await this.findUserById(userId)
      if (!user || user.disabledAt) return { matchedCount: 0 }
      user.passwordHash = passwordHash
      return { matchedCount: 1 }
    },
    async createSession(data) {
      const session = { ...data, _id: `session-${sessions.size + 1}`, revokedAt: null }
      sessions.set(session._id, session)
      return session
    },
    async findSessionByRefreshHash(hash, now) {
      return [...sessions.values()].find(session => session.refreshTokenHash === hash && !session.revokedAt && session.expiresAt > now) || null
    },
    async findSessionByUsedRefreshHash(hash) {
      return [...sessions.values()].find(session => session.usedRefreshTokenHashes.includes(hash) && !session.revokedAt) || null
    },
    async rotateSession({ sessionId, oldHash, newHash, csrfTokenHash, now, expiresAt }) {
      const session = sessions.get(String(sessionId))
      if (!session || session.revokedAt || session.expiresAt <= now || session.refreshTokenHash !== oldHash) return null
      session.usedRefreshTokenHashes.push(oldHash)
      session.usedRefreshTokenHashes = session.usedRefreshTokenHashes.slice(-100)
      session.refreshTokenHash = newHash
      session.csrfTokenHash = csrfTokenHash
      session.expiresAt = expiresAt
      session.lastUsedAt = now
      return session
    },
    async revokeSession(sessionId, now) {
      const session = sessions.get(String(sessionId))
      if (session && !session.revokedAt) session.revokedAt = now
    },
    async revokeUserSessions(userId, now) {
      for (const session of sessions.values()) if (session.userId === userId && !session.revokedAt) session.revokedAt = now
    },
    async createAuthToken(data) {
      const record = { ...data, consumedAt: null }
      authTokens.set(data.tokenHash, record)
      return record
    },
    async consumeAuthToken(tokenHash, purpose, now) {
      const record = authTokens.get(tokenHash)
      if (!record || record.purpose !== purpose || record.consumedAt || record.expiresAt <= now) return null
      record.consumedAt = now
      return record
    },
    async consumePendingTokens(userId, purpose, now) {
      for (const record of authTokens.values()) {
        if (record.userId === userId && record.purpose === purpose && !record.consumedAt) record.consumedAt = now
      }
    }
  }
}

async function startServer({ store = fakeStore(), emailConfigured = () => true, useDefaultLimiters = false } = {}) {
  const sent = { verification: [], reset: [] }
  const noLimit = (_req, _res, next) => next()
  const routerOptions = {
    store,
    emailConfigured,
    databaseMode: () => 'mongodb',
    verificationSender: async (email, token) => { sent.verification.push({ email, token }) },
    passwordResetSender: async (email, token) => { sent.reset.push({ email, token }) }
  }
  if (!useDefaultLimiters) {
    Object.assign(routerOptions, { loginLimiter: noLimit, registrationLimiter: noLimit, recoveryLimiter: noLimit, refreshLimiter: noLimit })
  }
  const router = createAuthRouter(routerOptions)
  const app = express()
  app.use(express.json())
  app.use('/api/auth', router)
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  const address = server.address()
  return {
    store,
    sent,
    server,
    async close() { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())) },
    async request(path, { method = 'GET', body, cookies = '', csrf = '', requestOrigin = origin } = {}) {
      return fetch(`http://127.0.0.1:${address.port}/api/auth${path}`, {
        method,
        headers: {
          ...(method !== 'GET' ? { 'Content-Type': 'application/json', Origin: requestOrigin } : { Origin: requestOrigin }),
          ...(cookies ? { Cookie: cookies } : {}),
          ...(csrf ? { 'X-CSRF-Token': csrf } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      })
    }
  }
}

function cookiePair(response) {
  const cookies = response.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ')
  const refresh = cookies.match(/resumeai_refresh=([^;]+)/)?.[1]
  const csrfCookie = cookies.match(/resumeai_csrf=([^;]+)/)?.[1]
  return { cookies, refresh, csrfCookie }
}

const validRegistration = { displayName: 'Sample Person', email: 'sample@example.com', password: 'correct horse battery staple' }

describe('First-party authentication routes', () => {
  const servers = []
  after(async () => {
    await Promise.all(servers.map(server => server.close()))
  })

  async function createServer(options) {
    const server = await startServer(options)
    servers.push(server)
    return server
  }

  it('requires an allowed Origin and does not create accounts for rejected requests', async () => {
    const server = await createServer()
    const response = await server.request('/register', { method: 'POST', requestOrigin: 'https://attacker.invalid', body: validRegistration })
    assert.equal(response.status, 403)
    assert.equal(server.store.users.size, 0)
  })

  it('registers, verifies email, and logs in without exposing hashes or refresh tokens', async () => {
    const server = await createServer()
    const registration = await server.request('/register', { method: 'POST', body: validRegistration })
    assert.equal(registration.status, 202)
    const registrationBody = await registration.json()
    assert.equal('accessToken' in registrationBody, false)
    assert.equal('passwordHash' in registrationBody, false)
    assert.equal(server.store.users.get(validRegistration.email).passwordHash.includes(validRegistration.password), false)
    assert.match(server.store.users.get(validRegistration.email).passwordHash, /^\$argon2id\$/)
    assert.equal(server.store.authTokens.has(server.sent.verification[0].token), false)

    const verification = await server.request('/verify-email', {
      method: 'POST', body: { token: server.sent.verification[0].token }
    })
    assert.equal(verification.status, 200)

    const duplicateRegistration = await server.request('/register', { method: 'POST', body: validRegistration })
    assert.equal(duplicateRegistration.status, 202)
    assert.equal(server.store.users.size, 1)

    const login = await server.request('/login', { method: 'POST', body: { email: validRegistration.email, password: validRegistration.password } })
    assert.equal(login.status, 200)
    const loginBody = await login.json()
    assert.equal(typeof loginBody.accessToken, 'string')
    assert.equal('refreshToken' in loginBody, false)
    assert.equal('passwordHash' in loginBody.user, false)
    const cookies = cookiePair(login)
    assert.ok(cookies.refresh)
    assert.ok(cookies.csrfCookie)
    assert.match(login.headers.getSetCookie().find(value => value.startsWith('resumeai_refresh=')), /HttpOnly/i)
    assert.match(login.headers.getSetCookie().find(value => value.startsWith('resumeai_csrf=')), /SameSite=Lax/i)
  })

  it('rotates refresh tokens, rejects replay, and revokes the session after reuse', async () => {
    const server = await createServer()
    await server.request('/register', { method: 'POST', body: validRegistration })
    await server.request('/verify-email', { method: 'POST', body: { token: server.sent.verification[0].token } })
    const login = await server.request('/login', { method: 'POST', body: { email: validRegistration.email, password: validRegistration.password } })
    const loginCookies = cookiePair(login)
    const loginBody = await login.json()

    const csrf = await server.request('/csrf', { method: 'GET', cookies: loginCookies.cookies })
    const csrfBody = await csrf.json()
    assert.equal(csrfBody.csrfToken, loginBody.csrfToken)

    const rotated = await server.request('/refresh', { method: 'POST', cookies: loginCookies.cookies, csrf: csrfBody.csrfToken, body: {} })
    assert.equal(rotated.status, 200)
    const rotatedCookies = cookiePair(rotated)
    assert.notEqual(rotatedCookies.refresh, loginCookies.refresh)

    const replay = await server.request('/refresh', { method: 'POST', cookies: loginCookies.cookies, csrf: loginBody.csrfToken, body: {} })
    assert.equal(replay.status, 401)
    const session = [...server.store.sessions.values()][0]
    assert.ok(session.revokedAt)
  })

  it('allows only one concurrent refresh rotation and invalidates the reused refresh family', async () => {
    const server = await createServer()
    await server.request('/register', { method: 'POST', body: validRegistration })
    await server.request('/verify-email', { method: 'POST', body: { token: server.sent.verification[0].token } })
    const login = await server.request('/login', { method: 'POST', body: { email: validRegistration.email, password: validRegistration.password } })
    const loginCookies = cookiePair(login)
    const loginBody = await login.json()

    const responses = await Promise.all([
      server.request('/refresh', { method: 'POST', cookies: loginCookies.cookies, csrf: loginBody.csrfToken, body: {} }),
      server.request('/refresh', { method: 'POST', cookies: loginCookies.cookies, csrf: loginBody.csrfToken, body: {} })
    ])
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 401])
    assert.ok([...server.store.sessions.values()][0].revokedAt)
  })

  it('rejects missing CSRF proof and supports logout revocation', async () => {
    const server = await createServer()
    await server.request('/register', { method: 'POST', body: validRegistration })
    await server.request('/verify-email', { method: 'POST', body: { token: server.sent.verification[0].token } })
    const login = await server.request('/login', { method: 'POST', body: { email: validRegistration.email, password: validRegistration.password } })
    const cookies = cookiePair(login)
    const rejected = await server.request('/refresh', { method: 'POST', cookies: cookies.cookies, body: {} })
    assert.equal(rejected.status, 403)

    const logout = await server.request('/logout', { method: 'POST', cookies: cookies.cookies, csrf: cookies.csrfCookie, body: {} })
    assert.equal(logout.status, 204)
    assert.ok([...server.store.sessions.values()][0].revokedAt)
  })

  it('keeps reset requests generic and revokes all sessions after password reset', async () => {
    const server = await createServer()
    await server.request('/register', { method: 'POST', body: validRegistration })
    await server.request('/verify-email', { method: 'POST', body: { token: server.sent.verification[0].token } })
    const login = await server.request('/login', { method: 'POST', body: { email: validRegistration.email, password: validRegistration.password } })
    assert.equal(login.status, 200)

    const forgot = await server.request('/forgot-password', { method: 'POST', body: { email: validRegistration.email } })
    assert.equal(forgot.status, 202)
    const resetToken = server.sent.reset[0].token
    const reset = await server.request('/reset-password', { method: 'POST', body: { token: resetToken, password: 'a different valid password' } })
    assert.equal(reset.status, 200)
    assert.ok([...server.store.sessions.values()][0].revokedAt)
    const replay = await server.request('/reset-password', { method: 'POST', body: { token: resetToken, password: 'another valid password' } })
    assert.equal(replay.status, 400)
    const oldLogin = await server.request('/login', { method: 'POST', body: validRegistration })
    assert.equal(oldLogin.status, 401)
    const newLogin = await server.request('/login', { method: 'POST', body: { email: validRegistration.email, password: 'a different valid password' } })
    assert.equal(newLogin.status, 200)
  })

  it('reports unavailable email delivery without issuing a fake verification flow', async () => {
    const server = await createServer({ emailConfigured: () => false })
    const response = await server.request('/register', { method: 'POST', body: validRegistration })
    assert.equal(response.status, 503)
    assert.equal(server.store.users.size, 0)
  })

  it('enforces the shared auth registration rate limit with a structured 429', async () => {
    const server = await createServer({ useDefaultLimiters: true, emailConfigured: () => false })
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await server.request('/register', { method: 'POST', body: validRegistration })
      assert.equal(response.status, 503)
    }
    const limited = await server.request('/register', { method: 'POST', body: validRegistration })
    assert.equal(limited.status, 429)
    const body = await limited.json()
    assert.equal(body.error.code, 'RATE_LIMITED')
    assert.ok(Number(limited.headers.get('retry-after')) > 0)
  })
})

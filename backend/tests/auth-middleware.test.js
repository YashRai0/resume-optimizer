import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import { createRequireAuth } from '../middleware/auth.js'
import { createAccessToken } from '../services/authTokens.js'

process.env.AUTH_ACCESS_TOKEN_SECRET = 'test-secret-with-at-least-thirty-two-bytes'
process.env.AUTH_TOKEN_ISSUER = 'test-issuer'
process.env.AUTH_TOKEN_AUDIENCE = 'test-audience'

function modelMocks({ sessionId = 'session-1', userId = 'user-1', revokedAt = null, userFound = true } = {}) {
  const session = { _id: sessionId, userId, revokedAt, expiresAt: new Date(Date.now() + 60_000) }
  const user = userFound ? { _id: userId } : null
  return {
    sessions: {
      findOne(query) {
        const match = query._id === session._id && query.userId === session.userId &&
          query.revokedAt === session.revokedAt && session.expiresAt > query.expiresAt.$gt
        return { lean: async () => match ? session : null }
      }
    },
    users: {
      findOne(query) {
        const matches = user && query._id === user._id && query.disabledAt === null
        return { select() { return this }, lean: async () => matches ? user : null }
      }
    },
    databaseMode: () => 'mongodb'
  }
}

async function requestWithAuth({ token, suppliedUserId = 'attacker-id', mocks = modelMocks() } = {}) {
  const app = express()
  app.use(express.json())
  app.get('/protected', createRequireAuth(mocks), (req, res) => res.json({ userId: req.user.id }))
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance))
  })
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/protected`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'X-User-Id': suppliedUserId
      }
    })
    return { response, body: await response.json() }
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}

describe('Access-token authentication middleware', () => {
  it('uses only the verified token subject and ignores a client-supplied user id', async () => {
    const token = createAccessToken('user-1', 'session-1')
    const { response, body } = await requestWithAuth({ token })
    assert.equal(response.status, 200)
    assert.equal(body.userId, 'user-1')
  })

  it('rejects missing, expired, revoked, and cross-user session tokens', async () => {
    const missing = await requestWithAuth()
    assert.equal(missing.response.status, 401)

    const expiredToken = jwt.sign({ sub: 'user-1', sid: 'session-1', typ: 'access', iat: 1, exp: 601 }, process.env.AUTH_ACCESS_TOKEN_SECRET, {
      algorithm: 'HS256', issuer: 'test-issuer', audience: 'test-audience'
    })
    const expired = await requestWithAuth({ token: expiredToken })
    assert.equal(expired.response.status, 401)

    const revoked = await requestWithAuth({
      token: createAccessToken('user-1', 'session-1'),
      mocks: modelMocks({ revokedAt: new Date() })
    })
    assert.equal(revoked.response.status, 401)

    const mismatch = await requestWithAuth({
      token: createAccessToken('user-2', 'session-1'),
      mocks: modelMocks()
    })
    assert.equal(mismatch.response.status, 401)
  })
})

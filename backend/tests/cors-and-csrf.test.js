import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../app.js'
import { isAllowedOrigin, normalizeOrigin, getAllowedOrigins } from '../config/origins.js'

describe('CORS and CSRF token security and regression suite', () => {
  let appInstance
  let serverInstance
  let baseUrl

  before(async () => {
    appInstance = createApp()
    serverInstance = await new Promise(resolve => {
      const s = appInstance.listen(0, '127.0.0.1', () => resolve(s))
    })
    const addr = serverInstance.address()
    baseUrl = `http://127.0.0.1:${addr.port}`
  })

  after(async () => {
    if (serverInstance) {
      await new Promise(resolve => serverInstance.close(resolve))
    }
  })

  describe('Origin normalization and matching', () => {
    it('normalizes trailing slashes, quotes, and whitespace', () => {
      assert.equal(normalizeOrigin(' https://resumeai4u.vercel.app/ '), 'https://resumeai4u.vercel.app')
      assert.equal(normalizeOrigin('"https://resumeai4u.vercel.app"'), 'https://resumeai4u.vercel.app')
      assert.equal(normalizeOrigin("'https://resumeai4u.vercel.app//'"), 'https://resumeai4u.vercel.app')
    })

    it('matches allowed origin regardless of trailing slash in lookup', () => {
      assert.equal(isAllowedOrigin('https://resumeai4u.vercel.app/'), true)
      assert.equal(isAllowedOrigin('https://resumeai4u.vercel.app'), true)
      assert.equal(isAllowedOrigin('https://evil-attacker.com'), false)
    })
  })

  describe('GET /api/auth/csrf for unauthenticated visitors', () => {
    it('issues a fresh opaque CSRF token and sets the resumeai_csrf cookie', async () => {
      const res = await fetch(`${baseUrl}/api/auth/csrf`, {
        method: 'GET',
        headers: { Origin: 'https://resumeai4u.vercel.app' }
      })

      assert.equal(res.status, 200)
      assert.equal(res.headers.get('access-control-allow-origin'), 'https://resumeai4u.vercel.app')
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true')

      const data = await res.json()
      assert.ok(data.csrfToken)
      assert.match(data.csrfToken, /^[a-f0-9]{64}$/)

      const setCookieHeader = res.headers.get('set-cookie') || ''
      assert.ok(setCookieHeader.includes('resumeai_csrf='))
      assert.ok(setCookieHeader.includes('Path=/api/auth'))
    })

    it('rejects unauthorized origin on /csrf with 403 and structured error instead of crashing with 500', async () => {
      const res = await fetch(`${baseUrl}/api/auth/csrf`, {
        method: 'GET',
        headers: { Origin: 'https://unauthorized-site.com' }
      })

      assert.equal(res.status, 403)
      assert.equal(res.headers.get('access-control-allow-origin'), null)
      const data = await res.json()
      assert.equal(data.error.code, 'INVALID_ORIGIN')
    })
  })

  describe('Preflight OPTIONS requests', () => {
    it('handles OPTIONS for allowed origin with 204 and CORS headers', async () => {
      const res = await fetch(`${baseUrl}/api/auth/csrf`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://resumeai4u.vercel.app',
          'Access-Control-Request-Method': 'GET'
        }
      })

      assert.equal(res.status, 204)
      assert.equal(res.headers.get('access-control-allow-origin'), 'https://resumeai4u.vercel.app')
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
    })

    it('handles OPTIONS for unauthorized origin gracefully without throwing 500', async () => {
      const res = await fetch(`${baseUrl}/api/auth/csrf`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://unauthorized-attacker.com',
          'Access-Control-Request-Method': 'GET'
        }
      })

      // Must NOT be 500 Server Error
      assert.notEqual(res.status, 500)
      assert.equal(res.headers.get('access-control-allow-origin'), null)
    })
  })

  describe('Error responses preserve CORS headers for allowed origins', () => {
    it('preserves access-control-allow-origin on malformed JSON request error', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          Origin: 'https://resumeai4u.vercel.app',
          'Content-Type': 'application/json'
        },
        body: 'malformed-json{'
      })

      assert.equal(res.status, 400)
      assert.equal(res.headers.get('access-control-allow-origin'), 'https://resumeai4u.vercel.app')
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
    })

    it('preserves access-control-allow-origin on 503 database unavailable response', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          Origin: 'https://resumeai4u.vercel.app',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'valid-password-1234', displayName: 'Test' })
      })

      assert.equal(res.status, 503)
      assert.equal(res.headers.get('access-control-allow-origin'), 'https://resumeai4u.vercel.app')
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true')
    })
  })
})

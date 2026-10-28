import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  emailDeliveryConfigured,
  inspectEmailConfig,
  logEmailConfigDiagnostics,
  sendAuthEmail,
  sendPasswordResetEmail,
  sendVerificationEmail
} from '../services/emailService.js'

const requiredVariables = [
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'APP_ORIGIN'
]

describe('Resend HTTPS email service configuration', () => {
  it('requires RESEND_API_KEY, EMAIL_FROM, and a valid APP_ORIGIN', () => {
    const namesToRestore = [...requiredVariables, 'NODE_ENV']
    const original = new Map(namesToRestore.map(name => [name, process.env[name]]))
    const validConfig = {
      RESEND_API_KEY: 're_test_123456789',
      EMAIL_FROM: 'ResumeAI4u <noreply@yashrai.cv>',
      APP_ORIGIN: 'http://localhost:3000',
      NODE_ENV: 'development'
    }

    try {
      for (const name of namesToRestore) delete process.env[name]
      assert.equal(emailDeliveryConfigured(), false)

      const inspectionEmpty = inspectEmailConfig()
      assert.equal(inspectionEmpty.ok, false)
      assert.deepEqual(inspectionEmpty.missing, ['RESEND_API_KEY', 'EMAIL_FROM', 'APP_ORIGIN'])

      Object.assign(process.env, validConfig)
      assert.equal(emailDeliveryConfigured(), true)

      // Accepts sender with display name and custom domain
      const inspectionValid = inspectEmailConfig()
      assert.equal(inspectionValid.ok, true)
      assert.equal(inspectionValid.config.from, 'ResumeAI4u <noreply@yashrai.cv>')

      // Strips quotes if present in EMAIL_FROM
      process.env.EMAIL_FROM = '"ResumeAI4u <noreply@yashrai.cv>"'
      assert.equal(inspectEmailConfig().config.from, 'ResumeAI4u <noreply@yashrai.cv>')
      process.env.EMAIL_FROM = validConfig.EMAIL_FROM

      for (const name of requiredVariables) {
        const value = process.env[name]
        delete process.env[name]
        assert.equal(emailDeliveryConfigured(), false, `${name} is required`)
        assert.ok(inspectEmailConfig().missing.includes(name))
        process.env[name] = value
      }

      // Normalizes trailing slashes and whitespace in APP_ORIGIN
      process.env.APP_ORIGIN = 'https://resumeai4u.vercel.app/  '
      assert.equal(emailDeliveryConfigured(), true)
      assert.equal(inspectEmailConfig().config.appOrigin, 'https://resumeai4u.vercel.app')

      // Reject path in APP_ORIGIN
      process.env.APP_ORIGIN = 'https://resumeai4u.vercel.app/path'
      assert.equal(emailDeliveryConfigured(), false)
      assert.ok(inspectEmailConfig().invalid.some(msg => msg.includes('base origin')))

      // Reject non-http(s) protocol
      process.env.APP_ORIGIN = 'ftp://localhost:3000'
      assert.equal(emailDeliveryConfigured(), false)

      // In production, require HTTPS
      process.env.APP_ORIGIN = 'http://resumeai4u.vercel.app'
      process.env.NODE_ENV = 'production'
      assert.equal(emailDeliveryConfigured(), false)
      assert.ok(inspectEmailConfig().invalid.some(msg => msg.includes('must use https in production')))

      process.env.APP_ORIGIN = 'https://resumeai4u.vercel.app'
      assert.equal(emailDeliveryConfigured(), true)
      assert.equal(inspectEmailConfig().config.appOrigin, 'https://resumeai4u.vercel.app')
    } finally {
      for (const [name, value] of original) {
        if (value === undefined) delete process.env[name]
        else process.env[name] = value
      }
    }
  })

  it('safely outputs diagnostic warnings without logging secret keys', () => {
    const original = { ...process.env }
    const warnings = []
    const originalWarn = console.warn
    console.warn = msg => warnings.push(msg)

    try {
      delete process.env.RESEND_API_KEY
      delete process.env.EMAIL_FROM
      delete process.env.APP_ORIGIN

      logEmailConfigDiagnostics()
      assert.equal(warnings.length, 1)
      assert.match(warnings[0], /missing: \[RESEND_API_KEY, EMAIL_FROM, APP_ORIGIN\]/)
      assert.doesNotMatch(warnings[0], /re_/)
    } finally {
      console.warn = originalWarn
      process.env = original
    }
  })
})

describe('Resend HTTPS email delivery', () => {
  const envBackup = { ...process.env }

  function setupValidEnv() {
    process.env.RESEND_API_KEY = 're_test_secret_key'
    process.env.EMAIL_FROM = 'ResumeAI4u <noreply@resumeai4u.com>'
    process.env.APP_ORIGIN = 'https://resumeai4u.vercel.app'
    process.env.NODE_ENV = 'development'
  }

  it('delivers verification email via Resend HTTPS API with correct headers and payload', async () => {
    setupValidEnv()
    let capturedUrl = null
    let capturedOptions = null

    const mockFetch = async (url, options) => {
      capturedUrl = url
      capturedOptions = options
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'res_test_msg_abc123' })
      }
    }

    try {
      const result = await sendVerificationEmail('candidate@example.com', 'a'.repeat(64), { fetchImpl: mockFetch })
      assert.equal(result.id, 'res_test_msg_abc123')
      assert.equal(capturedUrl, 'https://api.resend.com/emails')
      assert.equal(capturedOptions.method, 'POST')
      assert.equal(capturedOptions.headers['Authorization'], 'Bearer re_test_secret_key')
      assert.equal(capturedOptions.headers['Content-Type'], 'application/json')

      const body = JSON.parse(capturedOptions.body)
      assert.equal(body.from, 'ResumeAI4u <noreply@resumeai4u.com>')
      assert.deepEqual(body.to, ['candidate@example.com'])
      assert.equal(body.subject, 'Verify your ResumeAI4u email')
      assert.match(body.text, /https:\/\/resumeai4u\.vercel\.app\/verify-email#token=a{64}/)
      assert.match(body.html, /https:\/\/resumeai4u\.vercel\.app\/verify-email#token=a{64}/)
    } finally {
      process.env = { ...envBackup }
    }
  })

  it('delivers password reset email with correct route and hash', async () => {
    setupValidEnv()
    let capturedBody = null

    const mockFetch = async (url, options) => {
      capturedBody = JSON.parse(options.body)
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'res_test_reset_456' })
      }
    }

    try {
      const result = await sendPasswordResetEmail('user@example.com', 'b'.repeat(64), { fetchImpl: mockFetch })
      assert.equal(result.id, 'res_test_reset_456')
      assert.equal(capturedBody.subject, 'Reset your ResumeAI4u password')
      assert.match(capturedBody.text, /https:\/\/resumeai4u\.vercel\.app\/reset-password#token=b{64}/)
    } finally {
      process.env = { ...envBackup }
    }
  })

  it('fails safely and throws EMAIL_DELIVERY_FAILED when provider returns error response', async () => {
    setupValidEnv()
    const mockFetch = async () => ({
      ok: false,
      status: 422,
      json: async () => ({ statusCode: 422, message: 'Domain not verified' })
    })

    try {
      await assert.rejects(
        async () => sendVerificationEmail('candidate@example.com', 'a'.repeat(64), { fetchImpl: mockFetch }),
        err => {
          assert.equal(err.code, 'EMAIL_DELIVERY_FAILED')
          assert.equal(err.statusCode, 422)
          assert.match(err.message, /Domain not verified/)
          return true
        }
      )
    } finally {
      process.env = { ...envBackup }
    }
  })

  it('fails safely and throws EMAIL_TIMEOUT when provider request times out', async () => {
    setupValidEnv()
    const mockFetch = async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'
      throw abortError
    }

    try {
      await assert.rejects(
        async () => sendVerificationEmail('candidate@example.com', 'a'.repeat(64), { fetchImpl: mockFetch }),
        err => {
          assert.equal(err.code, 'EMAIL_TIMEOUT')
          return true
        }
      )
    } finally {
      process.env = { ...envBackup }
    }
  })

  it('throws EMAIL_NOT_CONFIGURED when configuration is absent', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    delete process.env.APP_ORIGIN

    try {
      await assert.rejects(
        async () => sendAuthEmail({ to: 'user@example.com', subject: 'Test', token: '123', purpose: 'verify-email' }),
        err => {
          assert.equal(err.code, 'EMAIL_NOT_CONFIGURED')
          return true
        }
      )
    } finally {
      process.env = { ...envBackup }
    }
  })
})

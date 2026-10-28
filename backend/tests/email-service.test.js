import { test } from 'node:test'
import assert from 'node:assert/strict'
import { emailDeliveryConfigured } from '../services/emailService.js'

const requiredVariables = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'EMAIL_FROM',
  'APP_ORIGIN'
]

test('email delivery requires the documented SMTP values and a valid app origin', () => {
  const namesToRestore = [...requiredVariables, 'SMTP_SECURE', 'NODE_ENV']
  const original = new Map(namesToRestore.map(name => [name, process.env[name]]))
  const validConfig = {
    SMTP_HOST: 'smtp.example.test',
    SMTP_PORT: '587',
    SMTP_USER: 'sender@example.test',
    SMTP_PASSWORD: 'test-only-password',
    EMAIL_FROM: 'ResumeAI4u <no-reply@example.test>',
    APP_ORIGIN: 'http://localhost:3000',
    NODE_ENV: 'development'
  }

  try {
    for (const name of namesToRestore) delete process.env[name]
    assert.equal(emailDeliveryConfigured(), false)

    Object.assign(process.env, validConfig)
    assert.equal(emailDeliveryConfigured(), true)

    for (const name of requiredVariables) {
      const value = process.env[name]
      delete process.env[name]
      assert.equal(emailDeliveryConfigured(), false, `${name} is required`)
      process.env[name] = value
    }

    process.env.APP_ORIGIN = 'http://localhost:3000/path'
    assert.equal(emailDeliveryConfigured(), false)
  } finally {
    for (const [name, value] of original) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})

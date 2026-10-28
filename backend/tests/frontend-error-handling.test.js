import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractErrorMessage } from '../../src/utils/errorMessage.js'

describe('Frontend error message extractor', () => {
  it('extracts message from structured backend error object ({ error: { code, message } })', () => {
    const err = {
      response: {
        status: 403,
        data: {
          error: {
            code: 'PLAN_REQUIRED',
            message: 'This feature requires an active Pro plan.'
          }
        }
      }
    }
    const message = extractErrorMessage(err)
    assert.equal(message, 'This feature requires an active Pro plan.')
    assert.equal(typeof message, 'string')
  })

  it('extracts message from rate-limiting structured error ({ error: { code, message } })', () => {
    const err = {
      response: {
        status: 429,
        data: {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please wait a minute.'
          }
        }
      }
    }
    const message = extractErrorMessage(err)
    assert.equal(message, 'Too many requests. Please wait a minute.')
  })

  it('extracts message when data.error is a string', () => {
    const err = {
      response: {
        status: 500,
        data: {
          error: 'Internal service error.'
        }
      }
    }
    assert.equal(extractErrorMessage(err), 'Internal service error.')
  })

  it('extracts message when data.message is a string', () => {
    const err = {
      response: {
        status: 401,
        data: {
          message: 'Session expired. Please log in again.'
        }
      }
    }
    assert.equal(extractErrorMessage(err), 'Session expired. Please log in again.')
  })

  it('handles standard Error instances and network errors', () => {
    const err = new Error('Network timeout connecting to server')
    assert.equal(extractErrorMessage(err), 'Network timeout connecting to server')
  })

  it('returns fallback when error is null, undefined, or empty', () => {
    const fallback = 'Custom fallback message'
    assert.equal(extractErrorMessage(null, fallback), fallback)
    assert.equal(extractErrorMessage(undefined, fallback), fallback)
    assert.equal(extractErrorMessage({}, fallback), fallback)
  })

  it('never returns an object or string containing [object Object]', () => {
    const err = {
      response: {
        data: {
          error: {}
        }
      },
      message: '[object Object]'
    }
    const result = extractErrorMessage(err, 'Safe fallback')
    assert.equal(typeof result, 'string')
    assert.equal(result, 'Safe fallback')
  })
})

describe('Razorpay script loader', () => {
  it('resolves cleanly without throwing in non-browser environments', async () => {
    const { loadRazorpayScript } = await import('../../src/utils/loadRazorpay.js')
    const loaded = await loadRazorpayScript()
    assert.equal(loaded, false)
  })
})

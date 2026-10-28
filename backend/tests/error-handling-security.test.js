import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { publicErrorMessage, safeErrorLog } from '../utils/safeErrorLog.js'

describe('Error handling does not expose request data', () => {
  it('logs only request metadata and omits the raw error body and message', () => {
    const privateResume = 'PERSONAL RESUME CONTENT'
    const error = new SyntaxError(`invalid JSON near ${privateResume}`)
    error.body = privateResume
    error.stack = `stack with ${privateResume}`

    const serialized = JSON.stringify(safeErrorLog({ method: 'POST', path: '/api/optimize' }, error, 400))
    assert.equal(serialized.includes(privateResume), false)
    assert.deepEqual(JSON.parse(serialized), {
      method: 'POST', path: '/api/optimize', statusCode: 400, errorName: 'SyntaxError'
    })
  })

  it('uses generic client errors for parser and internal failures', () => {
    assert.equal(publicErrorMessage(413), 'Request body is too large.')
    assert.equal(publicErrorMessage(400), 'Invalid request.')
    assert.equal(publicErrorMessage(500), 'An internal error occurred. Please try again later.')
  })
})

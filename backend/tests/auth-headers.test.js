import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getBearerHeaders } from '../../src/utils/authHeaders.js'

describe('In-memory access token headers', () => {
  it('formats the current access token as a bearer header', () => {
    assert.deepEqual(getBearerHeaders('short-lived-access-token'), {
      Authorization: 'Bearer short-lived-access-token'
    })
  })

  it('returns no authorization header when signed out', () => {
    assert.deepEqual(getBearerHeaders(null), {})
  })
})

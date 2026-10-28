import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { shouldRefreshAfterUnauthorized } from '../../src/utils/authRetry.js'

describe('Frontend access-token refresh policy', () => {
  it('refreshes once for a protected API 401', () => {
    assert.equal(shouldRefreshAfterUnauthorized({ response: { status: 401 }, config: { url: '/api/history' } }), true)
    assert.equal(shouldRefreshAfterUnauthorized({ response: { status: 401 }, config: { url: '/api/history', _authRetry: true } }), false)
  })

  it('does not refresh login/refresh failures or non-401 responses', () => {
    assert.equal(shouldRefreshAfterUnauthorized({ response: { status: 401 }, config: { url: '/api/auth/login' } }), false)
    assert.equal(shouldRefreshAfterUnauthorized({ response: { status: 401 }, config: { url: '/api/auth/refresh' } }), false)
    assert.equal(shouldRefreshAfterUnauthorized({ response: { status: 403 }, config: { url: '/api/history' } }), false)
    assert.equal(shouldRefreshAfterUnauthorized({ response: { status: 401 } }), false)
  })
})

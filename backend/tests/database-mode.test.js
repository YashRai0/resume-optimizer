import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isMemoryFallbackAllowed, shouldUsePublicDnsForLocalMongoSrv } from '../config/db.js'

test('volatile database fallback requires an explicit development or test environment', () => {
  assert.equal(isMemoryFallbackAllowed('development'), true)
  assert.equal(isMemoryFallbackAllowed('test'), true)
  assert.equal(isMemoryFallbackAllowed(undefined), false)
  assert.equal(isMemoryFallbackAllowed(''), false)
  assert.equal(isMemoryFallbackAllowed('staging'), false)
  assert.equal(isMemoryFallbackAllowed('production'), false)
})

test('public DNS retry is limited to loopback SRV refusal in explicit development mode', () => {
  const refusedSrvLookup = Object.assign(new Error('querySrv ECONNREFUSED'), { code: 'ECONNREFUSED' })
  assert.equal(shouldUsePublicDnsForLocalMongoSrv(refusedSrvLookup, ['127.0.0.1'], 'development'), true)
  assert.equal(shouldUsePublicDnsForLocalMongoSrv(refusedSrvLookup, ['::1', 'localhost'], 'development'), true)
  assert.equal(shouldUsePublicDnsForLocalMongoSrv(refusedSrvLookup, ['127.0.0.1'], 'production'), false)
  assert.equal(shouldUsePublicDnsForLocalMongoSrv(refusedSrvLookup, ['10.0.0.2'], 'development'), false)
  assert.equal(shouldUsePublicDnsForLocalMongoSrv(new Error('querySrv ETIMEOUT'), ['127.0.0.1'], 'development'), false)
  assert.equal(shouldUsePublicDnsForLocalMongoSrv(refusedSrvLookup, [], 'development'), false)
})

import { test } from 'node:test'
import assert from 'node:assert/strict'
import resumeRouter from '../routes/resume.js'
import { requireAuth } from '../middleware/auth.js'

test('resume upload and parsing routes authenticate before rate limiting or Multer', () => {
  const protectedUploadPaths = ['/resume/upload', '/parse-pdf']
  const routes = new Map(resumeRouter.stack
    .filter(layer => layer.route && protectedUploadPaths.includes(layer.route.path))
    .map(layer => [layer.route.path, layer.route.stack.map(item => item.handle)]))

  for (const path of protectedUploadPaths) {
    assert.ok(routes.has(path), `${path} remains registered`)
    assert.equal(routes.get(path)[0], requireAuth, `${path} authenticates before processing the request body`)
  }
})

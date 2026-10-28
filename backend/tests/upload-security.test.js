import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isAllowedResumeFile } from '../utils/uploadValidation.js'

describe('Resume upload file validation', () => {
  it('accepts PDF and DOCX only when extension, MIME type, and signature agree', () => {
    assert.equal(isAllowedResumeFile({
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.concat([Buffer.from('%PDF'), Buffer.alloc(100)])
    }), true)
    assert.equal(isAllowedResumeFile({
      originalname: 'resume.docx',
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(100)])
    }), true)
  })

  it('rejects extension, MIME, or signature mismatches', () => {
    const pdfBytes = Buffer.concat([Buffer.from('%PDF'), Buffer.alloc(100)])
    assert.equal(isAllowedResumeFile({ originalname: 'resume.docx', mimetype: 'application/pdf', buffer: pdfBytes }), false)
    assert.equal(isAllowedResumeFile({ originalname: 'resume.pdf', mimetype: 'text/plain', buffer: pdfBytes }), false)
    assert.equal(isAllowedResumeFile({ originalname: 'resume.pdf', mimetype: 'application/pdf', buffer: Buffer.alloc(104) }), false)
    assert.equal(isAllowedResumeFile({ originalname: 'resume.txt', mimetype: 'application/pdf', buffer: pdfBytes }), false)
  })

  it('rejects missing or undersized content', () => {
    assert.equal(isAllowedResumeFile(), false)
    assert.equal(isAllowedResumeFile({ originalname: 'resume.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%P') }), false)
  })
})

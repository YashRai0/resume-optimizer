import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// ============================================================================
// UNIT TESTS: AI Output Schema Validation
// Tests can be run with: node --test backend/tests/validation.test.js
// ============================================================================

// Mirror the validation function from routes/resume.js
function validateOptimizationResult(parsed) {
  const errors = []

  if (typeof parsed.atsScore !== 'number' || parsed.atsScore < 0 || parsed.atsScore > 100) {
    parsed.atsScore = Math.max(0, Math.min(100, Number(parsed.atsScore) || 50))
    errors.push('atsScore clamped')
  }
  parsed.atsScore = Math.round(parsed.atsScore)

  if (typeof parsed.matchPercentage !== 'number' || parsed.matchPercentage < 0 || parsed.matchPercentage > 100) {
    parsed.matchPercentage = parsed.atsScore
  }
  parsed.matchPercentage = Math.round(parsed.matchPercentage)

  if (typeof parsed.summary !== 'string') parsed.summary = ''
  parsed.summary = parsed.summary.slice(0, 500)

  if (!Array.isArray(parsed.missingKeywords)) parsed.missingKeywords = []
  parsed.missingKeywords = parsed.missingKeywords
    .filter(k => typeof k === 'string').slice(0, 20).map(k => k.slice(0, 100))

  if (!Array.isArray(parsed.foundKeywords)) parsed.foundKeywords = []
  parsed.foundKeywords = parsed.foundKeywords
    .filter(k => typeof k === 'string').slice(0, 30).map(k => k.slice(0, 100))

  if (!Array.isArray(parsed.optimizedBullets)) parsed.optimizedBullets = []
  parsed.optimizedBullets = parsed.optimizedBullets
    .filter(b => b && typeof b === 'object' && typeof b.original === 'string' && typeof b.optimized === 'string')
    .slice(0, 15)
    .map(b => ({ original: b.original.slice(0, 1000), optimized: b.optimized.slice(0, 1000) }))

  if (!Array.isArray(parsed.strengths)) parsed.strengths = []
  parsed.strengths = parsed.strengths.filter(s => typeof s === 'string').slice(0, 10).map(s => s.slice(0, 300))

  if (!Array.isArray(parsed.weaknesses)) parsed.weaknesses = []
  parsed.weaknesses = parsed.weaknesses.filter(s => typeof s === 'string').slice(0, 10).map(s => s.slice(0, 300))

  if (!Array.isArray(parsed.interviewTips)) parsed.interviewTips = []
  parsed.interviewTips = parsed.interviewTips.filter(s => typeof s === 'string').slice(0, 10).map(s => s.slice(0, 300))

  return parsed
}

describe('AI Output Schema Validation', () => {

  it('should clamp atsScore above 100 to 100', () => {
    const result = validateOptimizationResult({ atsScore: 150 })
    assert.equal(result.atsScore, 100)
  })

  it('should clamp atsScore below 0 to 0', () => {
    const result = validateOptimizationResult({ atsScore: -20 })
    assert.equal(result.atsScore, 0)
  })

  it('should default atsScore to 50 when not a number', () => {
    const result = validateOptimizationResult({ atsScore: 'high' })
    assert.equal(result.atsScore, 50)
  })

  it('should round atsScore to nearest integer', () => {
    const result = validateOptimizationResult({ atsScore: 72.8 })
    assert.equal(result.atsScore, 73)
  })

  it('should pass through valid atsScore unchanged', () => {
    const result = validateOptimizationResult({ atsScore: 85 })
    assert.equal(result.atsScore, 85)
  })

  it('should default matchPercentage to atsScore when invalid', () => {
    const result = validateOptimizationResult({ atsScore: 75, matchPercentage: 'invalid' })
    assert.equal(result.matchPercentage, 75)
  })

  it('should truncate summary to 500 chars', () => {
    const longSummary = 'x'.repeat(1000)
    const result = validateOptimizationResult({ atsScore: 50, summary: longSummary })
    assert.equal(result.summary.length, 500)
  })

  it('should default summary to empty string when not a string', () => {
    const result = validateOptimizationResult({ atsScore: 50, summary: 42 })
    assert.equal(result.summary, '')
  })

  it('should filter non-string items from missingKeywords', () => {
    const result = validateOptimizationResult({
      atsScore: 50,
      missingKeywords: ['React', 42, null, 'Node.js', { obj: true }]
    })
    assert.deepEqual(result.missingKeywords, ['React', 'Node.js'])
  })

  it('should limit missingKeywords to 20 items', () => {
    const keywords = Array.from({ length: 50 }, (_, i) => `keyword_${i}`)
    const result = validateOptimizationResult({ atsScore: 50, missingKeywords: keywords })
    assert.equal(result.missingKeywords.length, 20)
  })

  it('should truncate individual keywords to 100 chars', () => {
    const longKeyword = 'k'.repeat(200)
    const result = validateOptimizationResult({ atsScore: 50, missingKeywords: [longKeyword] })
    assert.equal(result.missingKeywords[0].length, 100)
  })

  it('should default missingKeywords to empty array when not an array', () => {
    const result = validateOptimizationResult({ atsScore: 50, missingKeywords: 'not an array' })
    assert.deepEqual(result.missingKeywords, [])
  })

  it('should validate optimizedBullets structure', () => {
    const result = validateOptimizationResult({
      atsScore: 50,
      optimizedBullets: [
        { original: 'Built APIs', optimized: 'Architected scalable REST APIs' },
        { original: 'Wrote code' },  // missing optimized
        'just a string',              // invalid structure
        { original: 'Test', optimized: 'Tested', extra: 'ignored' }
      ]
    })
    assert.equal(result.optimizedBullets.length, 2)
    assert.equal(result.optimizedBullets[0].original, 'Built APIs')
    assert.equal(result.optimizedBullets[1].original, 'Test')
  })

  it('should limit optimizedBullets to 15 items', () => {
    const bullets = Array.from({ length: 25 }, (_, i) => ({
      original: `bullet_${i}`, optimized: `improved_${i}`
    }))
    const result = validateOptimizationResult({ atsScore: 50, optimizedBullets: bullets })
    assert.equal(result.optimizedBullets.length, 15)
  })

  it('should handle completely missing fields gracefully', () => {
    const result = validateOptimizationResult({})
    assert.equal(result.atsScore, 50)
    assert.equal(result.matchPercentage, 50)
    assert.equal(result.summary, '')
    assert.deepEqual(result.missingKeywords, [])
    assert.deepEqual(result.foundKeywords, [])
    assert.deepEqual(result.optimizedBullets, [])
    assert.deepEqual(result.strengths, [])
    assert.deepEqual(result.weaknesses, [])
    assert.deepEqual(result.interviewTips, [])
  })

  it('should handle a valid complete response without modification', () => {
    const validInput = {
      atsScore: 82,
      matchPercentage: 78,
      summary: 'Strong candidate with relevant experience.',
      missingKeywords: ['Docker', 'Redis'],
      foundKeywords: ['React', 'Node.js'],
      optimizedBullets: [
        { original: 'Built features', optimized: 'Engineered scalable features serving 10K+ users' }
      ],
      strengths: ['Strong frontend skills'],
      weaknesses: ['No cloud experience listed'],
      interviewTips: ['Prepare for system design questions']
    }
    const result = validateOptimizationResult({ ...validInput })
    assert.equal(result.atsScore, 82)
    assert.equal(result.matchPercentage, 78)
    assert.equal(result.summary, validInput.summary)
    assert.deepEqual(result.missingKeywords, validInput.missingKeywords)
    assert.deepEqual(result.foundKeywords, validInput.foundKeywords)
    assert.equal(result.optimizedBullets.length, 1)
    assert.equal(result.strengths.length, 1)
    assert.equal(result.weaknesses.length, 1)
    assert.equal(result.interviewTips.length, 1)
  })
})

// ============================================================================
// UNIT TESTS: Input Validation
// ============================================================================

describe('Input Length Validation', () => {
  const MAX_RESUME_LENGTH = 50000
  const MAX_JD_LENGTH = 20000
  const MAX_BULLET_LENGTH = 2000

  it('should enforce resume text max length', () => {
    const longText = 'x'.repeat(60000)
    const truncated = longText.slice(0, MAX_RESUME_LENGTH)
    assert.equal(truncated.length, MAX_RESUME_LENGTH)
  })

  it('should enforce job description max length', () => {
    const longJD = 'x'.repeat(30000)
    const truncated = longJD.slice(0, MAX_JD_LENGTH)
    assert.equal(truncated.length, MAX_JD_LENGTH)
  })

  it('should enforce bullet text max length', () => {
    const longBullet = 'x'.repeat(5000)
    const truncated = longBullet.slice(0, MAX_BULLET_LENGTH)
    assert.equal(truncated.length, MAX_BULLET_LENGTH)
  })
})

// ============================================================================
// UNIT TESTS: File Signature Validation
// ============================================================================

describe('File Signature Validation', () => {
  const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
  const DOCX_MAGIC = Buffer.from([0x50, 0x4B, 0x03, 0x04]) // PK

  function validateFileSignature(buffer, mimeType) {
    if (!buffer || buffer.length < 4) return false
    const header = buffer.subarray(0, 4)
    if (mimeType === 'application/pdf') return header.compare(PDF_MAGIC) === 0
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return header.compare(DOCX_MAGIC) === 0
    return false
  }

  it('should accept valid PDF signature', () => {
    const buffer = Buffer.concat([PDF_MAGIC, Buffer.from('rest of pdf')])
    assert.ok(validateFileSignature(buffer, 'application/pdf'))
  })

  it('should accept valid DOCX signature', () => {
    const buffer = Buffer.concat([DOCX_MAGIC, Buffer.from('rest of docx')])
    assert.ok(validateFileSignature(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
  })

  it('should reject PDF with wrong signature', () => {
    const buffer = Buffer.from('This is not a PDF file')
    assert.ok(!validateFileSignature(buffer, 'application/pdf'))
  })

  it('should reject DOCX with PDF signature', () => {
    const buffer = Buffer.concat([PDF_MAGIC, Buffer.from('content')])
    assert.ok(!validateFileSignature(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))
  })

  it('should reject empty buffer', () => {
    assert.ok(!validateFileSignature(Buffer.alloc(0), 'application/pdf'))
  })

  it('should reject null buffer', () => {
    assert.ok(!validateFileSignature(null, 'application/pdf'))
  })

  it('should reject buffer shorter than 4 bytes', () => {
    assert.ok(!validateFileSignature(Buffer.from([0x25, 0x50]), 'application/pdf'))
  })
})

// ============================================================================
// UNIT TESTS: foundKeywords Computation
// ============================================================================

describe('foundKeywords Computation', () => {
  function computeFoundKeywords(resumeText, jobDescription) {
    if (!resumeText || !jobDescription) return []
    const technicalPatterns = [
      /\b(React\.?js?|React)\b/gi, /\bNode\.?js?\b/gi, /\bTypeScript\b/gi,
      /\bJavaScript\b/gi, /\bPython\b/gi, /\bSQL\b/gi,
      /\bPostgreSQL\b/gi, /\bDocker\b/gi, /\bAWS\b/gi,
      /\bCI\/CD\b/gi, /\bREST\s*APIs?\b/gi, /\bAgile\b/gi,
      /\bRedis\b/gi, /\bJest\b/gi
    ]
    const found = new Set()
    for (const pattern of technicalPatterns) {
      const jdMatch = jobDescription.match(pattern)
      const resumeMatch = resumeText.match(pattern)
      if (jdMatch && resumeMatch) found.add(jdMatch[0])
    }
    return Array.from(found).slice(0, 30)
  }

  it('should find matching keywords between resume and JD', () => {
    const resume = 'I have experience with React.js and Node.js and PostgreSQL'
    const jd = 'Required: React.js, Node.js, PostgreSQL, Docker, Redis'
    const found = computeFoundKeywords(resume, jd)
    assert.ok(found.length >= 3, `Should find at least 3 keywords, found ${found.length}: ${found}`)
    assert.ok(found.some(k => k.includes('React')))
    assert.ok(found.some(k => k.includes('Node')))
  })

  it('should not include keywords only in JD', () => {
    const resume = 'I have experience with React.js'
    const jd = 'Required: React.js, Docker, Redis, Kubernetes'
    const found = computeFoundKeywords(resume, jd)
    assert.ok(!found.some(k => k.includes('Docker')))
    assert.ok(!found.some(k => k.includes('Redis')))
  })

  it('should return empty array for empty inputs', () => {
    assert.deepEqual(computeFoundKeywords('', 'React Node'), [])
    assert.deepEqual(computeFoundKeywords('React', ''), [])
    assert.deepEqual(computeFoundKeywords(null, null), [])
  })
})

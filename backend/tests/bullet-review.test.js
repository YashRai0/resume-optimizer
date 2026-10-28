import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { reviewBulletSuggestion } from '../utils/bulletReview.js'

describe('Resume suggestion review flags', () => {
  it('flags generated numbers that do not appear in the source resume', () => {
    const flags = reviewBulletSuggestion({
      sourceText: 'Built internal reporting tools for the operations team.',
      original: 'Built internal reporting tools for the operations team.',
      optimized: 'Built reporting tools, improving team productivity by 40%.'
    })
    assert.deepEqual(flags, ['new_quantitative_detail'])
  })

  it('flags an AI original that cannot be found in the submitted resume', () => {
    const flags = reviewBulletSuggestion({
      sourceText: 'Built internal reporting tools.',
      original: 'Led a team of 12 engineers.',
      optimized: 'Led a high-performing team of 12 engineers.'
    })
    assert.deepEqual(flags, ['original_not_found_in_source', 'new_quantitative_detail'])
  })

  it('does not claim to detect unsupported names or semantic changes', () => {
    const flags = reviewBulletSuggestion({
      sourceText: 'Built internal reporting tools.',
      original: 'Built internal reporting tools.',
      optimized: 'Built reporting systems for Acme Corp.'
    })
    assert.deepEqual(flags, [])
  })
})

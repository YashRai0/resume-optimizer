import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getGroqModels, callGroqAPI } from '../controllers/resumeController.js'

describe('Groq AI model configuration and fallback resolution', () => {
  it('defaults to active Groq models in prioritized order when GROQ_MODEL is unset', () => {
    const original = process.env.GROQ_MODEL
    delete process.env.GROQ_MODEL
    try {
      const models = getGroqModels()
      assert.ok(Array.isArray(models))
      assert.equal(models[0], 'openai/gpt-oss-120b')
      assert.ok(models.includes('qwen/qwen3.8-27b'))
      assert.ok(models.includes('openai/gpt-oss-20b'))
    } finally {
      if (original) process.env.GROQ_MODEL = original
    }
  })

  it('prioritizes custom GROQ_MODEL when configured in environment', () => {
    const original = process.env.GROQ_MODEL
    process.env.GROQ_MODEL = 'custom-llama-model'
    try {
      const models = getGroqModels()
      assert.equal(models[0], 'custom-llama-model')
      assert.ok(models.length > 1)
    } finally {
      if (original) process.env.GROQ_MODEL = original
      else delete process.env.GROQ_MODEL
    }
  })

  it('throws a clear configuration error when GROQ_API_KEY is missing', async () => {
    const original = process.env.GROQ_API_KEY
    delete process.env.GROQ_API_KEY
    try {
      await assert.rejects(
        async () => callGroqAPI('system', 'user'),
        /GROQ_API_KEY missing/
      )
    } finally {
      if (original) process.env.GROQ_API_KEY = original
    }
  })
})

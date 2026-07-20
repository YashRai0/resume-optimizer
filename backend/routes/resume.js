import { Router } from 'express'
import multer from 'multer'
import mammoth from 'mammoth'
import { createRequire } from 'module'

import Optimization from '../models/Optimization.js'
import { requireAuth } from '../middleware/auth.js'
import { getDbMode, memoryDb } from '../config/db.js'

const require = createRequire(import.meta.url)
const pdf = require('pdf-parse/lib/pdf-parse.js')

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })
// Helper function to generate content using Groq API with failover models
async function callGroqAPI(prompt, isJson = false) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing from backend/.env")
  }

  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"]
  let lastError = null

  for (const model of models) {
    try {
      const payload = {
        model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      }

      if (isJson) {
        payload.response_format = { type: "json_object" }
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`${model} failed: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (err) {
      console.warn(`Groq model ${model} failed, trying next... Error:`, err.message)
      lastError = err
    }
  }

  throw new Error(`All Groq models failed. Last error: ${lastError.message}`)
}

// Handler functions for modular binding
const handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    let text = ''
    const mimeType = req.file.mimetype
    const fileName = req.file.originalname.toLowerCase()

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      const parsedData = await pdf(req.file.buffer)
      text = parsedData.text
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      fileName.endsWith('.docx')
    ) {
      const mammothResult = await mammoth.extractRawText({ buffer: req.file.buffer })
      text = mammothResult.value
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload a PDF or DOCX file.' })
    }

    res.json({ text: text.trim() })
  } catch (error) {
    console.error("File parsing error:", error)
    res.status(500).json({ error: 'Failed to extract text from file: ' + error.message })
  }
}

const handleOptimize = async (req, res) => {
  try {
    const { jobDescription, resumeText } = req.body
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Missing resumeText or jobDescription' })
    }

    const prompt = `You are an ATS Resume Expert.
Compare the resume against the job description.

Job Description:
${jobDescription}

Resume:
${resumeText}

Provide an ATS Score report. You must return ONLY a valid JSON object. Do not include markdown code block formatting (like \`\`\`json) or extra text.

The JSON structure must match this EXACT format:
{
  "atsScore": 86,
  "matchPercentage": 81,
  "summary": "Short, professional 1-2 sentence recommendation for the resume.",
  "missingKeywords": ["Docker", "Redis", "CI/CD"],
  "optimizedBullets": [
    {
      "original": "The original bullet point text from the resume",
      "optimized": "The rewritten bullet point containing action verbs, keywords, and metrics"
    }
  ],
  "strengths": ["Strong Javascript skills", "Clear project achievements"],
  "weaknesses": ["No Docker experience listed"],
  "interviewTips": ["Practice React state management questions", "Prepare MongoDB optimization examples"]
}`

    const text = await callGroqAPI(prompt, true)
    
    // Clean up potential markdown formatting wrapping the JSON
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    
    const saveData = {
      userId: req.user.id,
      jobDescription,
      resumeText,
      atsScore: parsed.atsScore || 0,
      matchPercentage: parsed.matchPercentage || parsed.atsScore || 0,
      summary: parsed.summary || '',
      missingKeywords: parsed.missingKeywords || [],
      foundKeywords: parsed.foundKeywords || [],
      optimizedBullets: parsed.optimizedBullets || [],
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      interviewTips: parsed.interviewTips || []
    }

    const dbMode = getDbMode()
    let savedRecord

    if (dbMode === 'mongodb') {
      const optimizationDoc = new Optimization(saveData)
      savedRecord = await optimizationDoc.save()
    } else {
      savedRecord = await memoryDb.saveOptimization(saveData)
    }

    res.json(savedRecord)
  } catch (error) {
    console.error("Optimization endpoint crash:", error)
    res.status(500).json({ error: error.message })
  }
}

const handleCoverLetter = async (req, res) => {
  try {
    const { resumeText, jobDescription, tone } = req.body
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: 'Missing resumeText or jobDescription' })
    }
    const selectedTone = tone || 'Professional'

    const prompt = `You are a professional cover letter writer.
Write a tailored cover letter based on the following details.

Resume Details:
${resumeText}

Job Description:
${jobDescription}

Tone of Cover Letter: ${selectedTone}

Return ONLY the cover letter body text, formatted with double line breaks between paragraphs, ready to be copied. Do not wrap in markdown quotes, html, or code blocks. Start with a proper professional salutation (e.g. 'Dear Hiring Manager,') and end with a sign-off (e.g. 'Sincerely, \n[Your Name]').`

    const text = await callGroqAPI(prompt, false)
    res.json({ coverLetter: text.trim() })
  } catch (error) {
    console.error("Cover letter route error:", error)
    res.status(500).json({ error: error.message })
  }
}

const handleSingleBullet = async (req, res) => {
  try {
    const { bulletText, jobDescription, focus, injectKeywords } = req.body
    if (!bulletText || !jobDescription) {
      return res.status(400).json({ error: 'Missing bulletText or jobDescription' })
    }

    const focusPrompt = focus ? `Focus heavily on highlighting: ${focus}.` : 'Focus on adding quantifiable metrics and strong action verbs.'
    const keywordPrompt = injectKeywords && injectKeywords.length > 0 
      ? `You MUST naturally integrate these keywords into the bullet point: ${injectKeywords.join(', ')}.` 
      : ''

    const prompt = `You are an expert resume writer.
Optimize this single resume bullet point to match the job description.

Original Bullet:
"${bulletText}"

Target Job Description:
${jobDescription}

Instructions:
1. ${focusPrompt}
2. ${keywordPrompt}
3. Keep the optimized output as a single, punchy resume bullet point (do not wrap in quotes, do not add list numbers, no bullet characters like '•' or '-', just the raw text).
4. Return ONLY the final rewritten bullet point text.`

    const text = await callGroqAPI(prompt, false)
    res.json({ optimizedBullet: text.trim() })
  } catch (error) {
    console.error("Single bullet route error:", error)
    res.status(500).json({ error: error.message })
  }
}

// Bind handlers to support both new product specification and legacy dashboard URLs
router.post('/resume/upload', upload.single('file'), handleUpload)
router.post('/parse-pdf', upload.single('file'), handleUpload)

router.post('/resume/optimize', requireAuth, handleOptimize)
router.post('/optimize', requireAuth, handleOptimize)

router.post('/resume/generate-cover-letter', handleCoverLetter)
router.post('/generate-cover-letter', handleCoverLetter)

router.post('/resume/optimize-single-bullet', handleSingleBullet)
router.post('/optimize-single-bullet', handleSingleBullet)

// History Tracking Endpoints
router.get('/history', requireAuth, async (req, res) => {
  try {
    const dbMode = getDbMode()
    let historyData = []

    if (dbMode === 'mongodb') {
      historyData = await Optimization.find({ userId: req.user.id }).sort({ createdAt: -1 })
    } else {
      historyData = await memoryDb.getHistory(req.user.id)
    }

    res.json(historyData)
  } catch (error) {
    console.error("History fetch error:", error)
    res.status(500).json({ error: error.message })
  }
})

router.get('/history/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const dbMode = getDbMode()
    let record = null

    if (dbMode === 'mongodb') {
      record = await Optimization.findById(id)
    } else {
      record = await memoryDb.getOptimizationById(id)
    }

    if (!record) {
      return res.status(404).json({ error: 'Record not found' })
    }

    res.json(record)
  } catch (error) {
    console.error("Record detail fetch error:", error)
    res.status(500).json({ error: error.message })
  }
})

router.delete('/history/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const dbMode = getDbMode()
    let success = false

    if (dbMode === 'mongodb') {
      const delResult = await Optimization.deleteOne({ _id: id, userId: req.user.id })
      success = delResult.deletedCount > 0
    } else {
      success = await memoryDb.deleteOptimization(id)
    }

    res.json({ success })
  } catch (error) {
    console.error("Record delete error:", error)
    res.status(500).json({ error: error.message })
  }
})

export default router

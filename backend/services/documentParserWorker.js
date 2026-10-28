import { parentPort, workerData } from 'node:worker_threads'
import { createRequire } from 'node:module'
import mammoth from 'mammoth'

const require = createRequire(import.meta.url)
const pdf = require('pdf-parse/lib/pdf-parse.js')
const MAX_EXTRACTED_TEXT_LENGTH = 50000

try {
  const buffer = Buffer.from(workerData.bytes)
  const text = workerData.mimeType === 'application/pdf'
    ? (await pdf(buffer)).text
    : (await mammoth.extractRawText({ buffer })).value
  parentPort.postMessage({ text: String(text || '').slice(0, MAX_EXTRACTED_TEXT_LENGTH) })
} catch (error) {
  parentPort.postMessage({ error: error.name || 'ParseError' })
}

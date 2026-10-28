import { Worker } from 'node:worker_threads'

const MAX_CONCURRENT_PARSERS = 2
const PARSER_TIMEOUT_MS = 15000
let activeParsers = 0

export class ParserBusyError extends Error {
  constructor() {
    super('All document parsers are busy.')
    this.code = 'PARSER_BUSY'
  }
}

export class ParserTimeoutError extends Error {
  constructor() {
    super('Document parsing exceeded its time limit.')
    this.code = 'PARSER_TIMEOUT'
  }
}

export async function parseResumeBuffer(buffer, mimeType) {
  if (activeParsers >= MAX_CONCURRENT_PARSERS) throw new ParserBusyError()
  activeParsers += 1

  const transferableBytes = new Uint8Array(buffer.length)
  transferableBytes.set(buffer)

  let worker
  let timeout
  try {
    const result = await new Promise((resolve, reject) => {
      worker = new Worker(new URL('./documentParserWorker.js', import.meta.url), {
        workerData: { bytes: transferableBytes, mimeType },
        transferList: [transferableBytes.buffer],
        resourceLimits: {
          maxOldGenerationSizeMb: 128,
          maxYoungGenerationSizeMb: 32,
          codeRangeSizeMb: 16,
          stackSizeMb: 4
        }
      })

      timeout = setTimeout(() => {
        worker.terminate().finally(() => reject(new ParserTimeoutError()))
      }, PARSER_TIMEOUT_MS)

      worker.once('message', message => {
        if (message?.error) reject(new Error('Document parser failed.'))
        else resolve(message?.text || '')
      })
      worker.once('error', () => reject(new Error('Document parser failed.')))
      worker.once('exit', code => {
        if (code !== 0) reject(new Error('Document parser stopped unexpectedly.'))
      })
    })
    return result
  } finally {
    clearTimeout(timeout)
    if (worker) await worker.terminate().catch(() => {})
    activeParsers -= 1
  }
}

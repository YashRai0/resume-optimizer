import express from 'express'
import cors from 'cors'
import { isAllowedOrigin } from './config/origins.js'
import resumeRouter from './routes/resume.js'
import { createPaymentRouter } from './routes/payment.js'
import { createAuthRouter } from './routes/auth.js'
import { publicErrorMessage, safeErrorLog } from './utils/safeErrorLog.js'

export function createApp() {
  const app = express()

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0)
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.')
  }
  app.set('trust proxy', trustProxyHops)

  // --- Security Headers ---
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }
    next()
  })

  // --- CORS Configuration ---
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, health checks)
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true)
      } else {
        // Omits Access-Control-Allow-Origin gracefully without throwing a 500 error
        callback(null, false)
      }
    },
    credentials: true,
    optionsSuccessStatus: 204
  }))

  // --- Body Size Limit ---
  app.use(express.json({ limit: '500kb' }))

  // --- Root Status Endpoint ---
  app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'ResumeAI Backend Service Active' })
  })

  // --- API Routes ---
  app.use('/api/auth', createAuthRouter())
  app.use('/api', resumeRouter)
  app.use('/api', createPaymentRouter())

  // --- Global Error Handler (sanitized) ---
  app.use((err, req, res, next) => {
    const uploadStatus = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.code?.startsWith('LIMIT_') ? 400 : 500
    const statusCode = err.status || err.statusCode || uploadStatus

    // Ensure CORS headers are preserved on error responses for allowed origins
    const requestOrigin = req.get('origin')
    if (requestOrigin && isAllowedOrigin(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }

    // Parser errors can carry the raw request body (including resume text).
    // Log metadata only so malformed requests do not put user content in logs.
    console.error('Unhandled Server Error:', safeErrorLog(req, err, statusCode))

    res.status(statusCode).json({
      error: publicErrorMessage(statusCode)
    })
  })

  return app
}

export const app = createApp()
export default app

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })

// Import app and db connection after environment variables are loaded
const { app } = await import('./app.js')
const { connectDB, isMemoryFallbackAllowed } = await import('./config/db.js')

const PORT = process.env.PORT || 5000

async function startServer() {
  const dbReady = await connectDB()

  if (!dbReady && !isMemoryFallbackAllowed()) {
    console.error('❌ FATAL: Database connection required outside explicit development/test mode. Exiting.')
    process.exit(1)
    return
  }

  const { emailDeliveryConfigured, logEmailConfigDiagnostics } = await import('./services/emailService.js')
  if (emailDeliveryConfigured()) {
    console.log('✉️ Email delivery configured via Resend HTTPS API')
  } else {
    logEmailConfigDiagnostics()
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📡 Endpoints active under http://localhost:${PORT}/api`)
  })
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err.code || err.name || 'Error')
  process.exit(1)
})

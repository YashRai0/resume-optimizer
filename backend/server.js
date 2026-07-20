import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import resumeRouter from './routes/resume.js'
import Razorpay from 'razorpay'
import crypto from 'crypto'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Enable CORS for frontend clients
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://resumeai4u.vercel.app'
    : ['http://localhost:5173', 'http://localhost:5174']
}))
app.use(express.json())

// Connect to Database (with in-memory fallback)
connectDB()

// Root Status Endpoint
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'ResumeAI Backend Service Active' })
})

// Mount Modular Routes
app.use('/api', resumeRouter)

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err)
  res.status(500).json({ error: 'Internal server error: ' + err.message })
})

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
})

app.post('/api/create-order', async (req, res) => {
  try {
    const { plan } = req.body
    const amount = plan === 'annual' ? 199 * 12 * 100 : 299 * 100
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`
    })
    res.json(order)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
    const sign = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .toString('hex')

    if (expectedSign === razorpay_signature) {
      res.json({ success: true, message: 'Payment verified' })
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 Endpoints active under http://localhost:${PORT}/api`)
})
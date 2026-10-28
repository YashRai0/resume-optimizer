import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { enforceQuota, loadEntitlement, rateLimit, requirePaidPlan } from '../middleware/abuseLimits.js'
import { RATE_LIMIT_POLICY } from '../../shared/planPolicy.js'
import {
  handleUpload,
  handleOptimize,
  handleCoverLetter,
  handleSingleBullet,
  getHistory,
  getHistoryById,
  deleteHistory
} from '../controllers/resumeController.js'

const router = Router()

// File upload size limit (10MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1,
    fields: 0,
    parts: 1
  }
})

const uploadRateLimit = rateLimit({
  scope: 'upload',
  ...RATE_LIMIT_POLICY.upload,
  subject: req => req.ip || req.socket?.remoteAddress
})

const aiRateLimit = rateLimit({
  scope: 'ai',
  ...RATE_LIMIT_POLICY.ai,
  subject: req => req.user?.id
})

// Resume files contain personal data; authenticate before accepting them into memory.
router.post('/resume/upload', requireAuth, uploadRateLimit, upload.single('file'), handleUpload)
router.post('/parse-pdf', requireAuth, uploadRateLimit, upload.single('file'), handleUpload)

// Optimization routes — require authentication
router.post('/resume/optimize', requireAuth, loadEntitlement, aiRateLimit, enforceQuota('optimizations'), handleOptimize)
router.post('/optimize', requireAuth, loadEntitlement, aiRateLimit, enforceQuota('optimizations'), handleOptimize)

// Cover letter routes — require authentication
router.post('/resume/generate-cover-letter', requireAuth, loadEntitlement, aiRateLimit, requirePaidPlan, handleCoverLetter)
router.post('/generate-cover-letter', requireAuth, loadEntitlement, aiRateLimit, requirePaidPlan, handleCoverLetter)

// Single bullet routes — require authentication
router.post('/resume/optimize-single-bullet', requireAuth, loadEntitlement, aiRateLimit, enforceQuota('bulletRewrites'), handleSingleBullet)
router.post('/optimize-single-bullet', requireAuth, loadEntitlement, aiRateLimit, enforceQuota('bulletRewrites'), handleSingleBullet)

// History routes — require authentication, scoped to user
router.get('/history', requireAuth, loadEntitlement, getHistory)
router.get('/history/:id', requireAuth, loadEntitlement, getHistoryById)
router.delete('/history/:id', requireAuth, loadEntitlement, deleteHistory)

export default router

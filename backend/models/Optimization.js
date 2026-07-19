import mongoose from 'mongoose'

const bulletSchema = new mongoose.Schema({
  original: { type: String, required: true },
  optimized: { type: String, required: true }
}, { _id: false })

const optimizationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  jobDescription: {
    type: String,
    default: ''
  },
  resumeText: {
    type: String,
    default: ''
  },
  atsScore: {
    type: Number,
    required: true
  },
  matchPercentage: {
    type: Number,
    default: 0
  },
  summary: {
    type: String,
    default: ''
  },
  missingKeywords: {
    type: [String],
    default: []
  },
  foundKeywords: {
    type: [String],
    default: []
  },
  optimizedBullets: {
    type: [bulletSchema],
    default: []
  },
  strengths: {
    type: [String],
    default: []
  },
  weaknesses: {
    type: [String],
    default: []
  },
  interviewTips: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Optimization = mongoose.models.Optimization || mongoose.model('Optimization', optimizationSchema)

export default Optimization

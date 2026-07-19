import mongoose from 'mongoose'

let isConnected = false
const inMemoryStore = {
  optimizations: []
}

export async function connectDB() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.warn('\n⚠️  WARNING: MONGODB_URI is not set in backend/.env.')
    console.warn('🚀 Running in RESILIENT IN-MEMORY GUEST MODE. Optimization history will be saved in-memory and reset when the server restarts.\n')
    return false
  }

  try {
    await mongoose.connect(uri)
    isConnected = true
    console.log('\n✅ Connected to MongoDB Atlas successfully!')
    return true
  } catch (error) {
    console.error('\n❌ MongoDB Connection Failed:', error.message)
    console.warn('🚀 Falling back to RESILIENT IN-MEMORY GUEST MODE. Optimization history will be saved in-memory.\n')
    return false
  }
}

export function getDbMode() {
  return isConnected ? 'mongodb' : 'memory'
}

// In-Memory database operations mock to keep API working if MongoDB is missing
export const memoryDb = {
  async saveOptimization(data) {
    const record = {
      _id: 'mem_' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date(),
      ...data
    }
    inMemoryStore.optimizations.push(record)
    return record
  },
  
  async getHistory(userId) {
    return inMemoryStore.optimizations
      .filter(opt => opt.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  async getOptimizationById(id) {
    return inMemoryStore.optimizations.find(opt => opt._id === id) || null
  },

  async deleteOptimization(id) {
    const initialLength = inMemoryStore.optimizations.length
    inMemoryStore.optimizations = inMemoryStore.optimizations.filter(opt => opt._id !== id)
    return inMemoryStore.optimizations.length < initialLength
  }
}

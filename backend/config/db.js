import dns from 'node:dns'
import mongoose from 'mongoose'
import PaymentLedger from '../models/PaymentLedger.js'
import AbuseCounter from '../models/AbuseCounter.js'
import AuthUser from '../models/AuthUser.js'
import AuthSession from '../models/AuthSession.js'
import AuthToken from '../models/AuthToken.js'

let isConnected = false
const inMemoryStore = {
  optimizations: []
}

export function isMemoryFallbackAllowed(env = process.env.NODE_ENV) {
  return env === 'development' || env === 'test'
}

export function shouldUsePublicDnsForLocalMongoSrv(error, servers = dns.getServers(), env = process.env.NODE_ENV) {
  if (env !== 'development' || !error || servers.length === 0) return false
  const isLoopbackOnly = servers.every(server => ['127.0.0.1', '::1', 'localhost'].includes(server.toLowerCase()))
  const isSrvRefusal = error.code === 'ECONNREFUSED' && String(error.message || '').includes('querySrv')
  return isLoopbackOnly && isSrvRefusal
}

/**
 * Connect to MongoDB. Returns true if connected, false if falling back to memory mode.
 * In production, a failed connection is a fatal error (handled by caller).
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI

  // A1: Only allow memory mode in explicit development/test
  if (!uri) {
    if (!isMemoryFallbackAllowed()) {
      console.error('\n❌ FATAL: MONGODB_URI is required unless NODE_ENV is explicitly development or test.')
      return false
    }
    console.warn('\n⚠️  MONGODB_URI is not set.')
    console.warn('🧪 Running in IN-MEMORY MODE (development only). Data will not persist across restarts.\n')
    return false
  }

  try {
    try {
      await mongoose.connect(uri)
    } catch (error) {
      if (!shouldUsePublicDnsForLocalMongoSrv(error)) throw error

      const originalServers = dns.getServers()
      console.warn('MongoDB SRV discovery was refused by the loopback resolver; retrying with public DNS in development.')
      dns.setServers(['8.8.8.8', '1.1.1.1'])
      try {
        await mongoose.connect(uri)
      } catch (retryError) {
        dns.setServers(originalServers)
        throw retryError
      }
    }
    // These collections are new and isolated from existing application data.
    // Do not mark the database ready until uniqueness and TTL guarantees exist.
    await Promise.all([
      PaymentLedger.createIndexes(),
      AbuseCounter.createIndexes(),
      AuthUser.createIndexes(),
      AuthSession.createIndexes(),
      AuthToken.createIndexes()
    ])
    isConnected = true
    console.log('\n✅ Connected to MongoDB Atlas successfully!')
    return true
  } catch (error) {
    await mongoose.disconnect().catch(() => {})
    // Driver messages can contain the full URI, including credentials or query secrets.
    console.error('\n❌ MongoDB Connection Failed:', error.code || error.name || 'Error')
    if (!isMemoryFallbackAllowed()) {
      console.error('❌ Cannot fall back to memory mode unless NODE_ENV is explicitly development or test.')
      return false
    }
    console.warn('🧪 Falling back to IN-MEMORY MODE (development only).\n')
    return false
  }
}

export function getDbMode() {
  return isConnected ? 'mongodb' : 'memory'
}

// In-Memory database operations (development fallback only)
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

  // M1: Fixed — now requires userId to prevent cross-user deletion
  async deleteOptimization(id, userId) {
    const initialLength = inMemoryStore.optimizations.length
    inMemoryStore.optimizations = inMemoryStore.optimizations.filter(
      opt => !(opt._id === id && opt.userId === userId)
    )
    return inMemoryStore.optimizations.length < initialLength
  }
}

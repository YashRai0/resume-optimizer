import AbuseCounter from '../models/AbuseCounter.js'
import { getDbMode } from '../config/db.js'
import { reserveWithAdapter } from './counterReservations.js'

const developmentCounters = new Map()

async function increment(key, expiresAt, now = Date.now()) {
  if (getDbMode() === 'mongodb') {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const counter = await AbuseCounter.findOneAndUpdate(
          { key },
          { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
          { new: true, upsert: true }
        ).lean()
        return counter.count
      } catch (error) {
        // Concurrent first writes can race on the unique key. Retry as an update.
        if (error.code !== 11000 || attempt === 1) throw error
      }
    }
  }

  if (process.env.NODE_ENV === 'production') {
    const error = new Error('Shared counter store is unavailable.')
    error.code = 'COUNTER_STORE_UNAVAILABLE'
    throw error
  }

  const current = developmentCounters.get(key)
  const value = current && current.expiresAt > now
    ? { count: current.count + 1, expiresAt: current.expiresAt }
    : { count: 1, expiresAt }
  developmentCounters.set(key, value)
  return value.count
}

async function decrement(key, now = Date.now()) {
  if (getDbMode() === 'mongodb') {
    await AbuseCounter.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } })
    return
  }
  const current = developmentCounters.get(key)
  if (current && current.expiresAt > now) {
    developmentCounters.set(key, { ...current, count: Math.max(0, current.count - 1) })
  }
}

export async function reserveCounter({ key, limit, expiresAt, now = Date.now() }) {
  return reserveWithAdapter({ key, limit, expiresAt, now }, {
    increment,
    decrement
  })
}

export function resetDevelopmentCounters() {
  if (process.env.NODE_ENV === 'production') return
  developmentCounters.clear()
}

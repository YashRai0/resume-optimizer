export async function reserveWithAdapter({ key, limit, expiresAt, now }, adapter) {
  const count = await adapter.increment(key, expiresAt, now)
  if (count <= limit) {
    let released = false
    return {
      allowed: true,
      used: count,
      release: async () => {
        if (released) return
        released = true
        await adapter.decrement(key, now)
      }
    }
  }

  await adapter.decrement(key, now)
  return { allowed: false, used: Math.min(count - 1, limit) }
}

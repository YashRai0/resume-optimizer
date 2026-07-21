import { getAuth } from '@clerk/express'

export function requireAuth(req, res, next) {
  const { userId } = getAuth(req)

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in to continue.' })
  }

  req.user = { id: userId }
  next()
}
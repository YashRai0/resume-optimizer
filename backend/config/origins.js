const DEFAULT_PRODUCTION_ORIGINS = ['https://resumeai4u.vercel.app']
const DEFAULT_DEVELOPMENT_ORIGINS = [
  'https://resumeai4u.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
]

export function normalizeOrigin(origin) {
  if (typeof origin !== 'string') return ''
  return origin.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '')
}

export function getAllowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS
        .split(',')
        .map(normalizeOrigin)
        .filter(Boolean)
    : []

  if (configured.length > 0) {
    if (process.env.NODE_ENV === 'production' && !configured.includes('https://resumeai4u.vercel.app')) {
      return [...configured, 'https://resumeai4u.vercel.app']
    }
    return configured
  }

  return process.env.NODE_ENV === 'production'
    ? DEFAULT_PRODUCTION_ORIGINS
    : DEFAULT_DEVELOPMENT_ORIGINS
}

export function isAllowedOrigin(origin) {
  if (typeof origin !== 'string') return false
  const normalized = normalizeOrigin(origin)
  return getAllowedOrigins().includes(normalized)
}

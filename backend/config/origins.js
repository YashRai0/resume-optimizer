export function getAllowedOrigins() {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : (process.env.NODE_ENV === 'production'
      ? ['https://resumeai4u.vercel.app']
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'])
}

export function isAllowedOrigin(origin) {
  return typeof origin === 'string' && getAllowedOrigins().includes(origin)
}

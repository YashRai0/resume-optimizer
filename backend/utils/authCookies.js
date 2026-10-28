export const REFRESH_COOKIE = 'resumeai_refresh'
export const CSRF_COOKIE = 'resumeai_csrf'

export function getCookie(req, name) {
  const header = req.headers.cookie
  if (typeof header !== 'string') return null
  for (const part of header.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue
    try {
      return decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      return null
    }
  }
  return null
}

function cookieOptions(maxAge, httpOnly) {
  const sameSite = (process.env.AUTH_COOKIE_SAME_SITE || 'lax').toLowerCase()
  const secure = process.env.NODE_ENV === 'production'
  if (!['lax', 'strict', 'none'].includes(sameSite) || (sameSite === 'none' && !secure)) {
    const error = new Error('Authentication cookie settings are invalid.')
    error.code = 'AUTH_COOKIE_CONFIG_INVALID'
    throw error
  }
  return {
    httpOnly,
    secure,
    sameSite,
    path: '/api/auth',
    maxAge,
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {})
  }
}

export function validateAuthCookieConfig() {
  cookieOptions(1, true)
}

export function setAuthCookies(res, refreshToken, csrfToken, maxAge) {
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(maxAge, true))
  res.cookie(CSRF_COOKIE, csrfToken, cookieOptions(maxAge, false))
}

export function setCsrfCookie(res, csrfToken) {
  res.cookie(CSRF_COOKIE, csrfToken, cookieOptions(15 * 60 * 1000, false))
}

export function clearAuthCookies(res) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions(0, true))
  res.clearCookie(CSRF_COOKIE, cookieOptions(0, false))
}

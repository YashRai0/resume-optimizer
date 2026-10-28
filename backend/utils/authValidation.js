export function normalizeEmail(value) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

export function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateRegistration(input) {
  const email = normalizeEmail(input?.email)
  const password = input?.password
  const displayName = typeof input?.displayName === 'string' ? input.displayName.trim() : ''
  if (!isValidEmail(email)) return { ok: false, code: 'INVALID_EMAIL' }
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
    return { ok: false, code: 'INVALID_PASSWORD' }
  }
  if (displayName.length > 100) return { ok: false, code: 'INVALID_DISPLAY_NAME' }
  return { ok: true, value: { email, password, displayName } }
}

export function validateLogin(input) {
  const email = normalizeEmail(input?.email)
  if (!isValidEmail(email) || typeof input?.password !== 'string' || input.password.length > 128) {
    return { ok: false }
  }
  return { ok: true, value: { email, password: input.password } }
}

export function validatePasswordReset(input) {
  if (typeof input?.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)) return { ok: false }
  if (typeof input?.password !== 'string' || input.password.length < 12 || input.password.length > 128) return { ok: false }
  return { ok: true, value: { token: input.token, password: input.password } }
}

const RESEND_API_URL = 'https://api.resend.com/emails'
const EMAIL_TIMEOUT_MS = 10000

export function inspectEmailConfig() {
  const missing = []
  const invalid = []

  const rawApiKey = process.env.RESEND_API_KEY
  const rawFrom = process.env.EMAIL_FROM
  const rawOrigin = process.env.APP_ORIGIN

  const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : ''
  const from = typeof rawFrom === 'string' ? rawFrom.trim().replace(/^["']|["']$/g, '') : ''
  const originStr = typeof rawOrigin === 'string' ? rawOrigin.trim() : ''

  if (!apiKey) missing.push('RESEND_API_KEY')
  if (!from) missing.push('EMAIL_FROM')
  if (!originStr) missing.push('APP_ORIGIN')

  let appOrigin = null
  if (originStr) {
    try {
      const parsed = new URL(originStr)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        invalid.push('APP_ORIGIN must use http: or https: protocol')
      } else if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
        invalid.push('APP_ORIGIN must use https in production')
      } else {
        const normalizedInput = originStr.replace(/\/+$/, '')
        if (parsed.origin !== normalizedInput) {
          invalid.push('APP_ORIGIN must be a base origin without subpaths, queries, or fragments')
        } else {
          appOrigin = parsed.origin
        }
      }
    } catch {
      invalid.push('APP_ORIGIN is not a valid URL')
    }
  }

  const ok = missing.length === 0 && invalid.length === 0
  return {
    ok,
    missing,
    invalid,
    config: ok ? { apiKey, from, appOrigin } : null
  }
}

export function logEmailConfigDiagnostics() {
  const inspection = inspectEmailConfig()
  if (!inspection.ok) {
    const details = []
    if (inspection.missing.length > 0) {
      details.push(`missing: [${inspection.missing.join(', ')}]`)
    }
    if (inspection.invalid.length > 0) {
      details.push(`invalid: [${inspection.invalid.join('; ')}]`)
    }
    console.warn(`[emailService] Email delivery is unconfigured (${details.join(', ')})`)
  }
}

export function getEmailConfig() {
  return inspectEmailConfig().config
}

export function emailDeliveryConfigured() {
  return inspectEmailConfig().ok
}

export async function sendAuthEmail({ to, subject, token, purpose, fetchImpl = fetch }) {
  const config = getEmailConfig()
  if (!config) {
    logEmailConfigDiagnostics()
    const error = new Error('Email delivery is not configured.')
    error.code = 'EMAIL_NOT_CONFIGURED'
    throw error
  }

  const route = purpose === 'verify-email' ? '/verify-email' : '/reset-password'
  const link = new URL(route, config.appOrigin)
  link.hash = `token=${token}`

  const text = `Open this link to ${purpose === 'verify-email' ? 'verify your email' : 'reset your password'}: ${link.toString()}\nIf you did not request this, you can ignore this message.`
  const html = `<p>Open this link to ${purpose === 'verify-email' ? 'verify your email' : 'reset your password'}:</p><p><a href="${link.toString()}">Continue</a></p><p>If you did not request this, you can ignore this message.</p>`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS)

  try {
    const response = await fetchImpl(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from,
        to: [to],
        subject,
        text,
        html
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      let errorData = null
      try {
        errorData = await response.json()
      } catch {
        // Body may not be JSON
      }
      const providerMessage = errorData?.message || `Resend responded with status ${response.status}`
      const error = new Error(`Email provider error: ${providerMessage}`)
      error.code = 'EMAIL_DELIVERY_FAILED'
      error.statusCode = response.status
      throw error
    }

    const data = await response.json().catch(() => ({}))
    return { id: data?.id }
  } catch (err) {
    if (err.name === 'AbortError') {
      const error = new Error('Email delivery timed out.')
      error.code = 'EMAIL_TIMEOUT'
      throw error
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export function sendVerificationEmail(to, token, options = {}) {
  return sendAuthEmail({ to, token, purpose: 'verify-email', subject: 'Verify your ResumeAI4u email', ...options })
}

export function sendPasswordResetEmail(to, token, options = {}) {
  return sendAuthEmail({ to, token, purpose: 'reset-password', subject: 'Reset your ResumeAI4u password', ...options })
}

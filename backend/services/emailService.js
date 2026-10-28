import nodemailer from 'nodemailer'

function getEmailConfig() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD
  const from = process.env.EMAIL_FROM
  const appOrigin = process.env.APP_ORIGIN
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !from || !appOrigin) return null
  let parsedOrigin
  try {
    parsedOrigin = new URL(appOrigin)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(parsedOrigin.protocol) || parsedOrigin.origin !== appOrigin.replace(/\/$/, '')) return null
  if (process.env.NODE_ENV === 'production' && parsedOrigin.protocol !== 'https:') return null
  return { host, port, user, pass, from, appOrigin: parsedOrigin.origin }
}

export function emailDeliveryConfigured() {
  return Boolean(getEmailConfig())
}

async function sendAuthEmail({ to, subject, token, purpose }) {
  const config = getEmailConfig()
  if (!config) {
    const error = new Error('Email delivery is not configured.')
    error.code = 'EMAIL_NOT_CONFIGURED'
    throw error
  }
  const secure = process.env.SMTP_SECURE === 'true' || config.port === 465
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    auth: { user: config.user, pass: config.pass },
    requireTLS: !secure,
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  })
  const route = purpose === 'verify-email' ? '/verify-email' : '/reset-password'
  const link = new URL(route, config.appOrigin)
  link.hash = `token=${token}`
  await transport.sendMail({
    from: config.from,
    to,
    subject,
    text: `Open this link to ${purpose === 'verify-email' ? 'verify your email' : 'reset your password'}: ${link.toString()}\nIf you did not request this, you can ignore this message.`,
    html: `<p>Open this link to ${purpose === 'verify-email' ? 'verify your email' : 'reset your password'}:</p><p><a href="${link.toString()}">Continue</a></p><p>If you did not request this, you can ignore this message.</p>`
  })
}

export function sendVerificationEmail(to, token) {
  return sendAuthEmail({ to, token, purpose: 'verify-email', subject: 'Verify your ResumeAI4u email' })
}

export function sendPasswordResetEmail(to, token) {
  return sendAuthEmail({ to, token, purpose: 'reset-password', subject: 'Reset your ResumeAI4u password' })
}

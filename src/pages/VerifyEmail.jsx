import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const { verifyEmail } = useAuth()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || searchParams.get('token') || ''
  const submit = async event => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await verifyEmail(token)
      setMessage(result.message)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Email verification" subtitle="This confirms the email address for your account.">
      {!token ? <p role="alert" className="text-sm text-red-700">This verification link is invalid or expired.</p> : (
        <form onSubmit={submit} className="space-y-4">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
          {!message && <button disabled={submitting} className="rounded-lg bg-stone-950 text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting ? 'Verifying…' : 'Verify email'}</button>}
        </form>
      )}
      <Link to="/login" className="mt-5 inline-block text-sm text-blue-800">Continue to sign in</Link>
    </AuthShell>
  )
}

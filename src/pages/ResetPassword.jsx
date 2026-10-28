import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const { resetPassword } = useAuth()
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') || searchParams.get('token') || ''
  const submit = async event => {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const result = await resetPassword(token, password)
      setMessage(result.message)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 12 characters.">
      {!token ? <p role="alert" className="text-sm text-red-700">This password-reset link is invalid or expired.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm text-stone-700">New password
            <input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg bg-stone-50 border border-stone-300 px-3 py-2 text-stone-950" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-700">{message} <Link to="/login" className="text-blue-800">Sign in</Link></p>}
          <button disabled={submitting} className="w-full rounded-lg bg-stone-950 text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting ? 'Updating…' : 'Update password'}</button>
        </form>
      )}
    </AuthShell>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async event => {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      const result = await requestPasswordReset(email)
      setMessage(result.message)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <AuthShell title="Reset your password" subtitle="We’ll send instructions if an account exists for this address.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-stone-700">Email
          <input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg bg-stone-50 border border-stone-300 px-3 py-2 text-stone-950" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-stone-950 text-white px-4 py-2 font-semibold disabled:opacity-60">{submitting ? 'Sending…' : 'Send reset instructions'}</button>
      </form>
      <p className="mt-5 text-sm text-stone-600"><Link to="/login" className="text-blue-800">Return to sign in</Link></p>
    </AuthShell>
  )
}

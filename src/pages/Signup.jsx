import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const result = await register({ displayName, email, password })
      navigate('/login', { replace: true, state: { notice: result.message } })
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Your resume history stays private to your account.">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-stone-700">Name
          <input type="text" autoComplete="name" maxLength={100} value={displayName} onChange={event => setDisplayName(event.target.value)} className="mt-1 w-full rounded-lg bg-stone-50 border border-stone-300 px-3 py-2 text-stone-950" />
        </label>
        <label className="block text-sm text-stone-700">Email
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg bg-stone-50 border border-stone-300 px-3 py-2 text-stone-950" />
        </label>
        <label className="block text-sm text-stone-700">Password
          <input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg bg-stone-50 border border-stone-300 px-3 py-2 text-stone-950" />
          <span className="mt-1 block text-xs text-stone-500">Use at least 12 characters.</span>
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-stone-950 hover:bg-stone-800 disabled:opacity-60 text-white px-4 py-2 font-semibold">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-5 text-sm text-stone-600">Already registered? <Link to="/login" className="text-blue-800 hover:text-blue-700">Sign in</Link></p>
    </AuthShell>
  )
}

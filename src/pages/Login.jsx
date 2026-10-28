import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthShell } from '../components/AuthShell'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async event => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/dashboard', { replace: true })
    } catch (failure) {
      setError(failure.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your workspace.">
      <form onSubmit={submit} className="space-y-4">
        {location.state?.notice && <p role="status" className="text-sm text-emerald-700">{location.state.notice}</p>}
        <label className="block text-sm text-stone-700">Email
          <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="mt-1 w-full rounded-lg bg-stone-50 border border-stone-300 px-3 py-2 text-stone-950" />
        </label>
        <label className="block text-sm text-stone-700">Password
          <input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-lg bg-stone-50 border border-stone-300 px-3 py-2 text-stone-950" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="w-full rounded-lg bg-stone-950 hover:bg-stone-800 disabled:opacity-60 text-white px-4 py-2 font-semibold">
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="mt-5 flex justify-between gap-4 text-sm">
        <Link to="/forgot-password" className="text-blue-800 hover:text-blue-700">Forgot password?</Link>
        <Link to="/signup" className="text-blue-800 hover:text-blue-700">Create account</Link>
      </div>
    </AuthShell>
  )
}

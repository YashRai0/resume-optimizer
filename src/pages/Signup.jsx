import { SignUp } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'

export default function Signup() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-6 p-4">
      <SignUp fallbackRedirectUrl="/dashboard" />
      <Link 
        to="/dashboard" 
        className="text-gray-500 hover:text-blue-400 text-xs transition font-semibold border border-gray-900 hover:border-blue-500/20 bg-gray-900/10 px-5 py-2.5 rounded-lg shadow-sm"
      >
        ⚡ Dev Bypass: Continue as Guest
      </Link>
    </div>
  )
}
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useUser, UserButton } from '@clerk/clerk-react'
import { Sparkles, Menu, X, ArrowRight } from 'lucide-react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { isSignedIn, isLoaded } = useUser()
  const location = useLocation()

  return (
    <nav className="fixed top-0 w-full z-50 bg-gray-950/70 backdrop-blur-lg border-b border-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-white tracking-tight hover:opacity-90 transition">
          <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <span>Resume<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">AI</span></span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-400 hover:text-white text-sm font-medium transition">Features</a>
          <a href="#pricing" className="text-gray-400 hover:text-white text-sm font-medium transition">Pricing</a>
          
          {isLoaded && (
            <>
              {isSignedIn ? (
                <div className="flex items-center gap-4 pl-4 border-l border-gray-800">
                  <Link 
                    to="/dashboard" 
                    className="text-gray-200 hover:text-white text-sm font-medium transition"
                  >
                    Dashboard
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <div className="flex items-center gap-6 pl-4 border-l border-gray-800">
                  <Link to="/login" className="text-gray-400 hover:text-white text-sm font-medium transition">Login</Link>
                  <Link to="/signup" className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-blue-500/10 transition">
                    Get Started <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button 
          className="md:hidden text-gray-400 hover:text-white transition"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-gray-950/95 backdrop-blur-xl border-t border-gray-900 px-4 py-6 flex flex-col gap-4">
          <a 
            href="#features" 
            onClick={() => setMenuOpen(false)}
            className="text-gray-400 hover:text-white text-base font-medium py-2 border-b border-gray-900"
          >
            Features
          </a>
          <a 
            href="#pricing" 
            onClick={() => setMenuOpen(false)}
            className="text-gray-400 hover:text-white text-base font-medium py-2 border-b border-gray-900"
          >
            Pricing
          </a>
          
          {isLoaded && (
            <>
              {isSignedIn ? (
                <div className="flex items-center justify-between py-2 mt-2">
                  <Link 
                    to="/dashboard" 
                    onClick={() => setMenuOpen(false)}
                    className="text-white text-base font-medium"
                  >
                    Go to Dashboard
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <div className="flex flex-col gap-4 mt-2">
                  <Link 
                    to="/login" 
                    onClick={() => setMenuOpen(false)}
                    className="text-gray-400 hover:text-white text-base font-medium py-2 text-center border border-gray-800 rounded-lg"
                  >
                    Login
                  </Link>
                  <Link 
                    to="/signup" 
                    onClick={() => setMenuOpen(false)}
                    className="bg-blue-600 text-white px-4 py-3 rounded-lg text-center font-semibold"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  )
}
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
          <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-xl shadow-2xl">
            <h1 className="text-xl font-bold text-red-400 mb-4">💥 Application Crash Detected</h1>
            <p className="text-sm text-gray-400 leading-relaxed mb-6 text-left">
              A runtime error occurred in the React application. Here is the technical error stack trace:
            </p>
            <pre className="bg-gray-950 p-4 rounded text-left text-xs font-mono text-red-300 overflow-x-auto whitespace-pre-wrap max-h-60 border border-gray-850 mb-6">
              {this.state.error?.stack || this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if (!PUBLISHABLE_KEY) {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white text-center font-sans">
      <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md shadow-2xl">
        <h1 className="text-xl font-bold text-red-400 mb-4">🔑 Clerk Publishable Key Missing</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-6">
          Vite could not find your Clerk publishable key. Please ensure that <code className="bg-gray-950 px-2 py-1 rounded text-red-300">VITE_CLERK_PUBLISHABLE_KEY</code> is correctly set in your <code className="bg-gray-950 px-2 py-1 rounded text-gray-300">.env</code> file, then <strong>restart your Vite development server</strong>.
        </p>
        <div className="text-xs text-gray-500 font-mono">
          Path: c:/resume-optimizer/resume-optimizer/.env
        </div>
      </div>
    </div>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
          <App />
        </ClerkProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  )
}
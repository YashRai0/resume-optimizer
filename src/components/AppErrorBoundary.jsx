import { Component } from 'react'

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application rendering failed:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-[#f7f7f5] text-stone-950 flex items-center justify-center p-6">
          <section className="max-w-lg text-center">
            <h1 className="text-2xl font-bold mb-3">ResumeAI4u could not load</h1>
            <p className="text-stone-600 mb-6">Refresh the page. If the problem continues, contact support.</p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg px-5 py-2 font-semibold transition"
                onClick={this.handleReset}
              >
                Try again
              </button>
              <button
                type="button"
                className="bg-stone-950 hover:bg-stone-800 text-white rounded-lg px-5 py-2 font-semibold transition"
                onClick={() => window.location.reload()}
              >
                Refresh page
              </button>
            </div>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}

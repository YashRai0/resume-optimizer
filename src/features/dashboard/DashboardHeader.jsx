import { Link } from 'react-router-dom'
import { Sparkles, History } from 'lucide-react'

export function DashboardHeader({
  activeTab,
  setActiveTab,
  historyCount = 0,
  onOpenHistory,
  isSignedIn,
  user,
  onLogout
}) {
  return (
    <>
      <header className="border-b border-stone-200 bg-[#f7f7f5]/95 backdrop-blur-md sticky top-0 z-40 px-5 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-stone-950">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <span>ResumeAI<span className="text-blue-800">4u</span></span>
          </Link>

          <div className="hidden sm:flex items-center gap-1 bg-white border border-stone-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('optimize')}
              aria-pressed={activeTab === 'optimize'}
              className={`min-h-10 px-4 rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                activeTab === 'optimize' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              Resume Optimizer
            </button>
            <button
              onClick={() => setActiveTab('coverletter')}
              aria-pressed={activeTab === 'coverletter'}
              className={`min-h-10 px-4 rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                activeTab === 'coverletter' ? 'bg-stone-950 text-white shadow-sm' : 'text-stone-600 hover:text-stone-950'
              }`}
            >
              Cover Letter Generator
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onOpenHistory}
            className="flex min-h-10 items-center gap-2 px-3 rounded-lg border border-stone-300 hover:border-stone-500 bg-white text-stone-700 hover:text-stone-950 transition text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
          >
            <History className="w-4 h-4 text-blue-800" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="bg-stone-950 text-white text-[10px] min-w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {historyCount}
              </span>
            )}
          </button>

          {isSignedIn && (
            <>
              <span className="text-stone-600 text-sm hidden md:inline">
                {user?.displayName || user?.email || 'Your account'}
              </span>
              <button
                onClick={onLogout}
                className="min-h-10 rounded-lg border border-stone-300 px-3 text-sm text-stone-700 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex sm:hidden border-b border-stone-200 bg-[#f7f7f5] p-2 gap-2 z-10">
        <button
          onClick={() => setActiveTab('optimize')}
          aria-pressed={activeTab === 'optimize'}
          className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition ${
            activeTab === 'optimize' ? 'bg-white text-blue-800 border border-blue-500/25' : 'text-stone-500'
          }`}
        >
          Resume Optimizer
        </button>
        <button
          onClick={() => setActiveTab('coverletter')}
          aria-pressed={activeTab === 'coverletter'}
          className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition ${
            activeTab === 'coverletter' ? 'bg-white text-blue-800 border border-blue-500/25' : 'text-stone-500'
          }`}
        >
          Cover Letter
        </button>
      </div>
    </>
  )
}

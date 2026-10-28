import { useEffect, useRef } from 'react'
import { History, X } from 'lucide-react'

export function HistoryDrawer({
  isOpen,
  onClose,
  historyList = [],
  historyLoading,
  historyError,
  onFetchHistory,
  onLoadItem,
  onDeleteItem
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const previouslyFocused = document.activeElement
    const dialog = dialogRef.current
    const getFocusable = () =>
      dialog?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    getFocusable()[0]?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'Tab') {
        const items = getFocusable()
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-heading"
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-md bg-white border-l border-stone-200 h-full shadow-2xl flex flex-col z-10 animate-slide-in font-sans"
      >
        <div className="p-6 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-blue-800" />
            <span id="history-heading">Optimization History</span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Close optimization history"
            className="min-h-10 min-w-10 text-stone-600 hover:text-stone-950 transition p-2 hover:bg-stone-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs text-stone-500">Loading history records...</p>
            </div>
          ) : historyError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
              <p role="alert" className="text-sm text-red-800">{historyError}</p>
              <button
                type="button"
                onClick={onFetchHistory}
                className="mt-3 min-h-10 rounded-lg border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 hover:border-stone-500 focus-visible:ring-2 focus-visible:ring-blue-700"
              >
                Try again
              </button>
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-stone-500 mx-auto mb-3" />
              <p className="text-sm text-stone-600 font-semibold">No history found</p>
              <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                Upload and optimize your resume to build up your history list.
              </p>
            </div>
          ) : (
            historyList.map((item) => (
              <article
                key={item._id}
                className="group bg-stone-50 hover:bg-[#f7f7f5]/80 border border-stone-200 hover:border-blue-500/30 rounded-xl p-4 cursor-pointer transition flex flex-col gap-2 relative shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-stone-500 font-mono">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <span className="text-xs bg-blue-500/10 text-blue-800 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                    ATS: {item.atsScore}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onLoadItem(item)}
                  className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                >
                  <h3 className="text-sm font-semibold text-stone-800 group-hover:text-stone-950 transition line-clamp-1">
                    {item.jobDescription || 'Optimization result'}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2 mt-0.5 leading-relaxed">
                    {item.summary || 'Open this optimization result.'}
                  </p>
                </button>

                <div className="flex items-center justify-between border-t border-stone-200/60 pt-2 mt-1.5 text-[10px] text-stone-500">
                  <span>{item.optimizedBullets?.length || 0} bullets optimized</span>
                  <button
                    onClick={(e) => onDeleteItem(item._id, e)}
                    className="text-stone-500 hover:text-red-700 p-1 hover:bg-red-500/10 rounded transition"
                    title="Delete Record"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="p-6 border-t border-stone-200 bg-[#f7f7f5]/20 text-center">
          <p className="text-[10px] text-stone-500">
            Optimization history synced to your account
          </p>
        </div>
      </section>
    </div>
  )
}

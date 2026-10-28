import { X, Sparkles, RefreshCw, GitCompare } from 'lucide-react'

export function KeywordInjectorModal({
  activeKeyword,
  onClose,
  bullets = [],
  targetBulletIdx,
  setTargetBulletIdx,
  injecting,
  onInject
}) {
  if (!activeKeyword) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-md w-full relative animate-fadeIn shadow-2xl shadow-blue-900/10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 hover:text-stone-950"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-800" />
          <span>Keyword Injector Workbench</span>
        </h3>
        <p className="text-xs text-stone-600 mb-6">
          Select a resume bullet point. Our AI will automatically rewrite it to naturally integrate the keyword{' '}
          <span className="text-blue-800 font-bold">"{activeKeyword}"</span>.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Select Target Bullet
            </label>
            <select
              value={targetBulletIdx}
              onChange={(e) => setTargetBulletIdx(parseInt(e.target.value))}
              className="w-full bg-[#f7f7f5] text-stone-950 rounded-xl p-3 border border-stone-200 focus:border-blue-500 focus:outline-none text-xs leading-relaxed"
            >
              {bullets.map((b, idx) => (
                <option key={idx} value={idx}>
                  Bullet {idx + 1}: {b.original.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onInject}
            disabled={injecting}
            className="w-full bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
          >
            {injecting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Injecting keyword...
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                Inject "{activeKeyword}" into Bullet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

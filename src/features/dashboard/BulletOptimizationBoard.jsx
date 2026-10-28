import { useState } from 'react'
import { Sparkles, Copy, Check, Download, RefreshCw, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export function BulletOptimizationBoard({
  bullets = [],
  onTuneBullet,
  onManualEdit,
  setBullets
}) {
  const [copiedBulletIdx, setCopiedBulletIdx] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const renderBulletDiff = (original, optimized) => {
    if (!original) return <span className="text-stone-700">{optimized}</span>

    const origWords = original
      .split(/\s+/)
      .map(w => w.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase())
      .filter(w => w.length > 0)

    const optWords = optimized.split(/\s+/)

    return optWords.map((word, idx) => {
      const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase()
      const isAdded = cleanWord && !origWords.includes(cleanWord)
      return (
        <span key={idx} className={isAdded ? "diff-added mx-0.5" : "mx-0.5 text-stone-700"}>
          {word}
        </span>
      )
    })
  }

  const copyBullet = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedBulletIdx(idx)
    toast.success('Copied bullet!')
    setTimeout(() => setCopiedBulletIdx(null), 2000)
  }

  const copyAllBullets = () => {
    const textToCopy = bullets.map(b => b.optimized).join('\n')
    navigator.clipboard.writeText(textToCopy)
    setCopySuccess(true)
    toast.success('All bullets copied!')
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const downloadBullets = () => {
    const element = document.createElement("a")
    const file = new Blob([bullets.map(b => b.optimized).join('\r\n\r\n')], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = "Optimized_Resume_Bullets.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Downloaded bullets!')
  }

  if (!bullets.length) return null

  return (
    <div className="bg-white/35 border border-stone-200 rounded-2xl p-6 backdrop-blur">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-200 pb-4 mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-800" />
            <span>AI Bullet Optimization Board</span>
          </h3>
          <p className="text-stone-600 text-xs mt-0.5">
            Use the tuning switches underneath each bullet to focus on specific metrics or leadership values.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={copyAllBullets}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-100 text-stone-950 border border-stone-200 px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            {copySuccess ? <Check className="w-4 h-4 text-emerald-700" /> : <Copy className="w-4 h-4" />}
            <span>Copy All</span>
          </button>
          <button
            onClick={downloadBullets}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-stone-950 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            <Download className="w-4 h-4" />
            <span>Download TXT</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {bullets.map((b, idx) => (
          <div
            key={idx}
            className={`bg-stone-50 border rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition duration-300 ${
              b.loading ? 'border-blue-500 shadow-md shadow-blue-500/5' : 'border-stone-200 hover:border-stone-200'
            }`}
          >
            {b.loading && (
              <div className="absolute inset-0 bg-[#f7f7f5]/80 backdrop-blur-sm z-10 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-800 animate-spin" />
                <span className="text-xs font-semibold text-blue-800">Regenerating bullet line...</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-widest mb-1.5 inline-block">
                    Original Sentence
                  </span>
                  <p className="text-xs text-stone-500 line-through leading-relaxed">{b.original}</p>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-1 border-l border-stone-200 justify-self-center my-2" />

              <div className="lg:col-span-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest inline-block">
                      AI Suggested Upgrade (Diff Highlighted)
                    </span>

                    <span className="text-[10px] bg-white border border-stone-200 px-2 py-0.5 rounded text-stone-500 font-semibold uppercase tracking-wider">
                      {b.focus} mode
                    </span>
                  </div>

                  <div className="bg-white border border-stone-200 rounded-xl p-3.5 mb-3 leading-relaxed text-sm">
                    {renderBulletDiff(b.original, b.optimized)}
                  </div>
                  {b.reviewFlags?.map(flag => (
                    <p key={flag} className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {flag === 'new_quantitative_detail'
                        ? 'This suggestion adds a number not found in the source resume. Verify it before use.'
                        : 'The original bullet could not be matched to the source resume. Review this suggestion.'}
                    </p>
                  ))}

                  <textarea
                    className="w-full bg-transparent text-stone-600 text-xs font-medium focus:outline-none resize-none leading-relaxed min-h-[45px] border-b border-dashed border-stone-200 pb-2 mb-2 focus:border-blue-500"
                    value={b.optimized}
                    onChange={(e) => onManualEdit(idx, e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                  <div className="flex items-center gap-1.5 bg-white border border-stone-200 p-1 rounded-lg">
                    <button
                      onClick={() => onTuneBullet(idx, 'Metrics')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition ${
                        b.focus === 'Metrics' ? 'bg-stone-950 text-white' : 'text-stone-600 hover:text-stone-800'
                      }`}
                      title="Add quantifiable metrics & figures"
                    >
                      Metrics
                    </button>
                    <button
                      onClick={() => onTuneBullet(idx, 'Technical')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition ${
                        b.focus === 'Technical' ? 'bg-stone-950 text-white' : 'text-stone-600 hover:text-stone-800'
                      }`}
                      title="Add depth of libraries/frameworks"
                    >
                      Tech
                    </button>
                    <button
                      onClick={() => onTuneBullet(idx, 'Leadership')}
                      className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition ${
                        b.focus === 'Leadership' ? 'bg-stone-950 text-white' : 'text-stone-600 hover:text-stone-800'
                      }`}
                      title="Emphasize project ownership & coordination"
                    >
                      Lead
                    </button>
                  </div>

                  <button
                    onClick={() => copyBullet(b.optimized, idx)}
                    className="flex items-center gap-1.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 hover:text-stone-950 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    {copiedBulletIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy bullet</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

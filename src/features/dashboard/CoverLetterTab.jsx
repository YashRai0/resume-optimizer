import { useState } from 'react'
import { FileText, Sparkles, RefreshCw, Info, Check, Copy, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export function CoverLetterTab({
  coverLetter,
  coverLetterTone,
  setCoverLetterTone,
  coverLetterLoading,
  coverLetterError,
  onClearError,
  onGenerateCoverLetter,
  hasResumeAndJD,
  onSwitchToOptimizer
}) {
  const [coverLetterCopied, setCoverLetterCopied] = useState(false)

  const copyCoverLetter = () => {
    if (typeof coverLetter !== 'string' || !coverLetter.trim()) return
    navigator.clipboard.writeText(coverLetter)
    setCoverLetterCopied(true)
    toast.success('Cover letter copied!')
    setTimeout(() => setCoverLetterCopied(false), 2000)
  }

  const downloadCoverLetter = () => {
    if (typeof coverLetter !== 'string' || !coverLetter.trim()) return
    const element = document.createElement("a")
    const file = new Blob([coverLetter], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = "Cover_Letter.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Cover letter downloaded!')
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 space-y-8 animate-fadeIn max-w-4xl mx-auto backdrop-blur">
      <div className="border-b border-stone-200 pb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-800" />
          <span>Tailored Cover Letter Generator</span>
        </h3>
        <p className="text-stone-600 text-xs mt-1">
          Draft a custom cover letter mapped directly to the job description and your experience details.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div>
          <label className="block text-xs font-extrabold text-stone-600 uppercase tracking-widest mb-2.5">
            Select Letter Tone
          </label>
          <select
            value={coverLetterTone}
            onChange={(e) => setCoverLetterTone(e.target.value)}
            className="w-full bg-[#f7f7f5] text-stone-950 rounded-xl p-3 border border-stone-200 focus:border-blue-500 focus:outline-none text-sm transition"
          >
            <option value="Professional">Professional &amp; balanced</option>
            <option value="Enthusiastic">Enthusiastic &amp; passionate</option>
            <option value="Confident">Bold &amp; confident</option>
            <option value="Short & Crisp">Short &amp; crisp</option>
          </select>
        </div>

        <button
          onClick={onGenerateCoverLetter}
          disabled={coverLetterLoading || !hasResumeAndJD}
          className="bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2"
        >
          {coverLetterLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Writing cover letter...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Cover Letter</span>
            </>
          )}
        </button>
      </div>

      {coverLetterError && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-3 text-sm text-red-800">
          <div>
            <p className="font-semibold">{coverLetterError}</p>
            {/plan|pro|upgrade/i.test(coverLetterError) && (
              <a href="/pricing" className="mt-2 inline-block font-bold underline hover:text-red-950">
                View Plans &amp; Upgrade &rarr;
              </a>
            )}
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1 rounded hover:bg-red-100 transition"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {!hasResumeAndJD && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-800 shrink-0 mt-0.5" />
          <p className="text-xs text-stone-600 leading-relaxed">
            Make sure you have filled in or uploaded both your <strong>Resume</strong> and the <strong>Job Description</strong> inside the{' '}
            <span className="text-blue-800 cursor-pointer font-bold" onClick={onSwitchToOptimizer}>
              Resume Optimizer
            </span>{' '}
            tab first before writing a cover letter.
          </p>
        </div>
      )}

      {typeof coverLetter === 'string' && coverLetter.trim() ? (
        <div className="space-y-4 border-t border-stone-200/80 pt-8 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-stone-600 uppercase tracking-wider">AI Drafted Cover Letter</h4>

            <div className="flex gap-2">
              <button
                onClick={copyCoverLetter}
                className="bg-stone-100 hover:bg-stone-100 text-stone-700 border border-stone-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                {coverLetterCopied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{coverLetterCopied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={downloadCoverLetter}
                className="bg-stone-950 hover:bg-stone-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <div className="bg-white text-stone-950 border border-stone-200 rounded-xl p-6 md:p-8 font-mono text-sm leading-relaxed shadow-lg whitespace-pre-wrap">
            {coverLetter}
          </div>
        </div>
      ) : null}
    </div>
  )
}

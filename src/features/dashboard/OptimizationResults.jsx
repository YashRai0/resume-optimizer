import { Award, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react'

function getScoreRatingDetails(score) {
  if (score >= 85) return { label: 'Optimal match', style: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20' }
  if (score >= 70) return { label: 'Strong candidate', style: 'text-blue-800 bg-blue-500/10 border-blue-500/20' }
  if (score >= 50) return { label: 'Average matching', style: 'text-amber-700 bg-amber-500/10 border-amber-500/20' }
  return { label: 'Critical mismatch', style: 'text-rose-700 bg-rose-500/10 border-rose-500/20' }
}

export function OptimizationResults({ result, onSelectKeyword }) {
  if (!result) return null

  const rating = getScoreRatingDetails(result.atsScore)

  return (
    <div className="space-y-8 animate-fadeIn" aria-live="polite">
      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>AI rewrites are suggestions. Review names, dates, responsibilities, and numbers before copying them into your resume.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-2xl p-6 backdrop-blur flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-800" />
              <span>ATS Alignment Score</span>
            </h3>

            <div className="flex flex-col items-center justify-center py-6">
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="absolute w-full h-full transform -rotate-90">
                  <circle
                    cx="88"
                    cy="88"
                    r="76"
                    stroke="#e7e5e4"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="88"
                    cy="88"
                    r="76"
                    stroke="url(#score-gradient)"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray="477.5"
                    strokeDashoffset={477.5 - (477.5 * result.atsScore) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                  <defs>
                    <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1d4ed8" />
                      <stop offset="50%" stopColor="#2563eb" />
                      <stop offset="100%" stopColor="#171717" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-center z-10">
                  <span className="text-5xl font-black text-stone-950">{result.atsScore}%</span>
                  <div className="mt-2 text-center">
                    <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-stone-200/20 ${rating.style}`}>
                      {rating.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#f7f7f5]/80 border border-stone-200 rounded-xl p-4 mt-4">
              <h4 className="text-xs font-bold text-stone-600 mb-2 uppercase tracking-wider flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-blue-800" />
                <span>AI Executive Review</span>
              </h4>
              <p className="text-stone-700 text-xs md:text-sm leading-relaxed italic">"{result.summary}"</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-6 space-y-6 backdrop-blur">
          <div>
            <h4 className="text-sm font-bold text-stone-600 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-700 animate-pulse" />
              <span>Missing Keywords ({result.missingKeywords?.length || 0})</span>
              <span className="text-[10px] text-stone-500 font-normal lowercase tracking-normal italic">(click to inject into bullet)</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.missingKeywords?.length > 0 ? (
                result.missingKeywords.map((kw, i) => (
                  <span
                    key={i}
                    onClick={() => onSelectKeyword(kw)}
                    className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-700 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold transition hover:scale-105"
                  >
                    + {kw}
                  </span>
                ))
              ) : (
                <span className="text-xs text-stone-500 italic">No missing keywords! Resume is fully aligned.</span>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-stone-600 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Matched Keywords ({result.foundKeywords?.length || 0})</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {result.foundKeywords?.length > 0 ? (
                result.foundKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold"
                  >
                    ✓ {kw}
                  </span>
                ))
              ) : (
                <span className="text-xs text-stone-500 italic">No keywords matched yet. Try integrating the recommended keywords.</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-stone-200/80 pt-6">
            <div>
              <h4 className="text-xs font-extrabold text-stone-600 uppercase tracking-widest mb-3">Strengths</h4>
              <ul className="space-y-2">
                {result.strengths?.length > 0 ? result.strengths.map((item, i) => (
                  <li key={i} className="text-xs text-stone-700 flex items-start gap-1.5 leading-relaxed">
                    <span className="text-emerald-700 shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                )) : (
                  <li className="text-xs text-stone-500 italic">Run analysis to see strengths.</li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-extrabold text-stone-600 uppercase tracking-widest mb-3">Areas for Improvement</h4>
              <ul className="space-y-2">
                {result.weaknesses?.length > 0 ? result.weaknesses.map((item, i) => (
                  <li key={i} className="text-xs text-stone-700 flex items-start gap-1.5 leading-relaxed">
                    <span className="text-amber-700 shrink-0 mt-0.5">△</span>
                    <span>{item}</span>
                  </li>
                )) : (
                  <li className="text-xs text-stone-500 italic">Run analysis to see improvement areas.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

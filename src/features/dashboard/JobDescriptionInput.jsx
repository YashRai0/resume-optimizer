import { FileText } from 'lucide-react'

export function JobDescriptionInput({ value, onChange }) {
  return (
    <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-6 backdrop-blur-sm card-glow flex flex-col justify-between">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-blue-800">01 · Target role</p>
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-800" />
          <span>Job description</span>
        </h3>
        <p className="text-stone-600 text-xs mb-4">Paste the target job description to match keywords and skills.</p>
        <textarea
          id="job-description"
          aria-label="Target job description"
          className="w-full h-64 bg-stone-50 text-stone-950 text-sm rounded-xl p-4 border border-stone-300 focus:border-blue-700 focus:outline-none resize-y placeholder-stone-500 transition"
          placeholder="Paste full job description from LinkedIn, Naukri, etc. here..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  )
}

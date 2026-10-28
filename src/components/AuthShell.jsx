import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function AuthShell({ title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-[#f7f7f5] text-stone-950 flex flex-col items-center justify-center gap-7 p-5">
      <Link to="/" className="flex items-center gap-2.5 rounded-md text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-stone-950"><Sparkles className="h-4 w-4 text-white" /></span>
        <span className="text-xl font-semibold tracking-tight">ResumeAI<span className="text-blue-800">4u</span></span>
      </Link>
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-[0_20px_60px_-45px_rgba(0,0,0,.4)] sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 mb-6 text-sm leading-6 text-stone-600">{subtitle}</p>
        {children}
      </section>
      <Link to="/" className="min-h-10 inline-flex items-center text-sm text-stone-600 hover:text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">Back to home</Link>
    </main>
  )
}

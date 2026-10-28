import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, FileText, History, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const examples = {
  Engineer: {
    before: 'Responsible for writing backend code and fixing bugs.',
    after: 'Built and maintained backend services, resolving production issues and improving reliability.',
    skills: ['Backend services', 'Reliability', 'Problem solving']
  },
  Product: {
    before: 'Managed the product roadmap and talked to users.',
    after: 'Coordinated roadmap priorities with customer research and cross-functional delivery.',
    skills: ['Product strategy', 'Customer research', 'Collaboration']
  },
  Analyst: {
    before: 'Created dashboards and ran SQL queries.',
    after: 'Built reporting dashboards and SQL analyses to help teams make informed decisions.',
    skills: ['SQL', 'Reporting', 'Decision support']
  }
}

const features = [
  { icon: Target, title: 'See the match clearly', text: 'Review an ATS alignment estimate and the skills your target role emphasizes.' },
  { icon: FileText, title: 'Improve with context', text: 'Get focused suggestions beside the experience they are meant to improve.' },
  { icon: History, title: 'Keep each application organized', text: 'Save, revisit, and refine your optimization work from one workspace.' }
]

export default function Landing() {
  const { isAuthenticated, loading } = useAuth()
  const [role, setRole] = useState('Engineer')
  const [showExample, setShowExample] = useState(false)
  const sample = examples[role]

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-[#171717] selection:bg-blue-200 selection:text-blue-950">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#f7f7f5]/95 backdrop-blur">
        <nav aria-label="Main navigation" className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight text-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-stone-950 text-white"><Sparkles size={17} aria-hidden="true" /></span>
            <span>ResumeAI<span className="text-blue-700">4u</span></span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-7">
            <a href="#how-it-works" className="hidden text-sm text-stone-600 hover:text-stone-950 sm:inline">How it works</a>
            <Link to="/pricing" className="hidden text-sm text-stone-600 hover:text-stone-950 sm:inline">Pricing</Link>
            {!loading && (isAuthenticated
              ? <Link to="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-medium text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Open workspace <ArrowRight size={15} /></Link>
              : <Link to="/login" className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-900 hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Sign in</Link>)}
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:pb-24">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700"><Sparkles size={14} className="text-blue-700" /> A clearer next step for your job search</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-stone-950 sm:text-5xl lg:text-[3.7rem]">Make your experience easier to see.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-stone-600 sm:text-lg">Compare your resume with a role, find the gaps, and shape stronger bullets while keeping every claim grounded in your experience.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={isAuthenticated ? '/dashboard' : '/signup'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Start with your resume <ArrowRight size={16} /></Link>
              <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">See how it works</a>
            </div>
            <p className="mt-4 text-xs leading-5 text-stone-500">Free to start · PDF and DOCX supported · Review every suggestion before using it</p>
          </div>

          <div aria-label="Example resume analysis preview" className="relative rounded-2xl border border-stone-300 bg-white p-4 shadow-[0_24px_70px_-45px_rgba(0,0,0,.35)] sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-stone-200 pb-4">
              <div><p className="text-xs font-medium uppercase tracking-[.12em] text-stone-500">Example analysis</p><h2 className="mt-1 text-base font-semibold">Product designer · Northstar</h2></div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">Preview</span>
            </div>
            <div className="grid gap-4 py-5 sm:grid-cols-[150px_1fr] sm:items-center">
              <div className="rounded-xl bg-stone-50 p-4 text-center">
                <p className="text-xs text-stone-500">ATS alignment</p><p className="mt-1 text-4xl font-semibold tracking-tight">78<span className="text-xl text-stone-500">%</span></p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full w-[78%] rounded-full bg-blue-700" /></div>
                <p className="mt-2 text-[11px] text-stone-500">An estimate, not a hiring prediction</p>
              </div>
              <div className="space-y-3">
                <div><p className="mb-2 text-xs font-medium text-stone-600">Relevant skills in this role</p><div className="flex flex-wrap gap-2">{['Product thinking', 'Prototyping', 'Research'].map(item => <span key={item} className="rounded-md border border-stone-200 px-2.5 py-1 text-xs text-stone-700">{item}</span>)}</div></div>
                <div className="rounded-lg border border-stone-200 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Suggestion to review</p><p className="mt-1.5 text-sm leading-6 text-stone-700">Make the outcome of a project more specific, using details you can verify.</p></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-200 pt-4 text-xs text-stone-600"><span className="inline-flex items-center gap-1.5"><Check size={14} className="text-blue-700" /> Your experience stays yours</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-blue-700" /> Suggestions need your review</span></div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-stone-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="max-w-xl"><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-800">A focused workflow</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From job description to a better draft.</h2><p className="mt-3 leading-7 text-stone-600">A few clear steps help you spend your time on the parts that matter.</p></div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ['01', 'Add the target role', 'Paste the job description so the analysis has a specific destination.'],
                ['02', 'Bring your resume', 'Upload a PDF or DOCX, or paste your resume text directly.'],
                ['03', 'Review and refine', 'Use the match summary and editable suggestions as a starting point.']
              ].map(([number, title, text]) => <article key={number} className="rounded-xl border border-stone-200 bg-[#f7f7f5] p-5 sm:p-6"><span className="text-xs font-semibold text-blue-800">{number}</span><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{text}</p></article>)}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.75fr_1.25fr]">
          <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-800">Built for thoughtful applications</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">Useful guidance, without taking over.</h2><p className="mt-4 leading-7 text-stone-600">ResumeAI4u helps you spot opportunities and work through improvements. You decide what accurately represents your work.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border border-stone-200 bg-white p-5"><Icon size={20} className="text-blue-800" aria-hidden="true" /><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{text}</p></article>)}</div>
        </section>

        <section id="sample" className="border-t border-stone-200 bg-stone-100/70">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[.7fr_1.3fr] lg:py-20">
            <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-800">Try a sample</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">See how a bullet can become clearer.</h2><p className="mt-3 text-sm leading-6 text-stone-600">This example is a local preview, not a live AI request. Your actual suggestions are generated in the workspace.</p>
              <label htmlFor="sample-role" className="mt-6 block text-sm font-medium">Choose an example role</label><select id="sample-role" value={role} onChange={event => { setRole(event.target.value); setShowExample(false) }} className="mt-2 min-h-11 w-full max-w-xs rounded-lg border border-stone-300 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"><option>Engineer</option><option>Product</option><option>Analyst</option></select>
              <button type="button" onClick={() => setShowExample(value => !value)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">{showExample ? 'Hide example' : 'Show example'} <ArrowRight size={15} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-stone-200 bg-white p-5"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Original bullet</p><p className="mt-3 text-sm leading-6 text-stone-700">{sample.before}</p></div>
              <div className={`rounded-xl border p-5 transition ${showExample ? 'border-blue-300 bg-blue-50/50' : 'border-stone-200 bg-white'}`} aria-live="polite"><p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Example rewrite</p><p className="mt-3 text-sm leading-6 text-stone-800">{showExample ? sample.after : 'Select “Show example” to preview a possible rewrite.'}</p>{showExample && <div className="mt-4 flex flex-wrap gap-1.5">{sample.skills.map(skill => <span key={skill} className="rounded-md bg-white px-2 py-1 text-[11px] text-stone-600">{skill}</span>)}</div>}</div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8 sm:py-20"><h2 className="text-3xl font-semibold tracking-tight">Make your next application more deliberate.</h2><p className="mx-auto mt-3 max-w-xl text-stone-600">Start with one role and your current resume. You can refine every suggestion before you use it.</p><Link to={isAuthenticated ? '/dashboard' : '/signup'} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">Open your workspace <ArrowRight size={16} /></Link></section>
      </main>

      <footer className="border-t border-stone-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© 2026 ResumeAI4u</span><div className="flex gap-5"><Link to="/pricing" className="hover:text-stone-900">Pricing</Link><Link to="/login" className="hover:text-stone-900">Sign in</Link></div></div></footer>
    </div>
  )
}

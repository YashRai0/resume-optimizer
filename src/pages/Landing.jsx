import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { Sparkles, FileText, ShieldCheck, Zap, ArrowRight, Star, Cpu, Award } from 'lucide-react'
import Navbar from '../components/Navbar'

const features = [
  {
    icon: <Sparkles className="w-6 h-6 text-blue-400" />,
    title: 'ATS Score Checker',
    desc: 'See exactly how well your resume matches the job description before applying.'
  },
  {
    icon: <Cpu className="w-6 h-6 text-indigo-400" />,
    title: 'AI Bullet Optimizer',
    desc: 'AI rewrites your bullets to incorporate metrics and keywords automatically.'
  },
  {
    icon: <FileText className="w-6 h-6 text-purple-400" />,
    title: 'Cover Letter Generator',
    desc: 'Generate a highly tailored cover letter for any job description in seconds.'
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
    title: 'Formatting Audit',
    desc: 'Identifies critical layout and content issues that cause ATS parsers to fail.'
  },
  {
    icon: <Award className="w-6 h-6 text-amber-400" />,
    title: 'Built for Modern Markets',
    desc: 'Optimized for global ATS systems, LinkedIn, and major job search networks.'
  },
  {
    icon: <Zap className="w-6 h-6 text-rose-400" />,
    title: 'Instant PDF Parsing',
    desc: 'Drag and drop your PDF resume. We extract text and optimize it in under 15 seconds.'
  }
]

const SAMPLE_BUlLETS = {
  "Software Engineer": {
    before: "Responsible for writing backend code and fixing bugs.",
    after: "Architected scalable Express REST APIs and debugged database bottlenecks, reducing server response times by 35% using Redis caching.",
    keywords: ["Express", "REST APIs", "Redis", "Caching", "Quantified Metrics"]
  },
  "Product Manager": {
    before: "Managed the product roadmap and talked to users.",
    after: "Led cross-functional design sprints and user research cycles for a core B2B module, increasing feature adoption by 40% in Q3.",
    keywords: ["Product Roadmap", "User Research", "Feature Adoption", "B2B", "Cross-functional"]
  },
  "Data Analyst": {
    before: "Created dashboards and ran SQL queries.",
    after: "Engineered automated Tableau dashboards and optimized complex SQL queries, saving the operations team 12 hours of manual reporting weekly.",
    keywords: ["Tableau Dashboards", "SQL Optimization", "Automated Reporting", "Operations efficiency"]
  }
}

export default function Landing() {
  const { isSignedIn, isLoaded } = useUser()
  const [selectedRole, setSelectedRole] = useState("Software Engineer")
  const [userBullet, setUserBullet] = useState(SAMPLE_BUlLETS["Software Engineer"].before)
  const [widgetResult, setWidgetResult] = useState(null)
  const [widgetLoading, setWidgetLoading] = useState(false)

  const handleRoleChange = (role) => {
    setSelectedRole(role)
    setUserBullet(SAMPLE_BUlLETS[role].before)
    setWidgetResult(null)
  }

  const handleWidgetCheck = () => {
    setWidgetLoading(true)
    setTimeout(() => {
      setWidgetResult(SAMPLE_BUlLETS[selectedRole])
      setWidgetLoading(false)
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden relative selection:bg-blue-600/35 selection:text-white grid-mesh">
      {/* 2026 Floating Glow Orbs */}
      <div className="glow-orb w-[400px] h-[400px] bg-blue-600/10 top-20 left-10" />
      <div className="glow-orb w-[500px] h-[500px] bg-indigo-600/10 top-[600px] right-20" />
      <div className="glow-orb w-[300px] h-[300px] bg-purple-600/10 top-[1200px] left-1/4" />

      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-indigo-900/5 to-transparent pointer-events-none -z-10" />

      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-20 px-4 text-center max-w-6xl mx-auto">
        <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs md:text-sm px-4 py-1.5 rounded-full mb-8 font-medium animate-pulse">
          <Sparkles className="w-4 h-4" /> Next-Generation AI Resume Optimization
        </span>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-8 leading-tight tracking-tight max-w-5xl mx-auto">
          Get Your Resume Past <br />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            ATS Filtering Systems
          </span>
        </h1>
        
        <p className="text-gray-400 text-base md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
          Upload your resume, paste the target job description, and watch our AI instantly detect missing keywords and rewrite your bullet points for maximum impact.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          {isLoaded && (
            <Link 
              to={isSignedIn ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] transition"
            >
              {isSignedIn ? "Go to Dashboard" : "Optimize My Resume Free"} <ArrowRight className="w-5 h-5" />
            </Link>
          )}
          <a 
            href="#demo"
            className="w-full sm:w-auto border border-gray-800 hover:border-gray-700 bg-gray-900/40 hover:bg-gray-900/80 text-gray-300 hover:text-white px-8 py-4 rounded-xl text-lg font-semibold transition"
          >
            Try Quick Estimator
          </a>
        </div>

        {/* Dashboard Preview / Mockup */}
        <div className="relative mx-auto max-w-5xl rounded-2xl border border-gray-800/80 bg-gray-900/30 p-2 backdrop-blur-sm shadow-2xl shadow-blue-900/10">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10 rounded-2xl" />
          <div className="border border-gray-800 bg-gray-950/80 rounded-xl overflow-hidden aspect-[16/9] flex flex-col">
            {/* Mock Header */}
            <div className="border-b border-gray-900 px-4 py-3 flex items-center justify-between bg-gray-950">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/70" />
                <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                <span className="text-xs text-gray-500 ml-2 font-mono">resume-optimizer-workspace</span>
              </div>
              <div className="flex gap-2">
                <div className="h-5 w-24 bg-gray-900 rounded" />
                <div className="h-5 w-16 bg-gray-900 rounded" />
              </div>
            </div>
            
            {/* Mock Dashboard Body */}
            <div className="flex-1 p-4 grid grid-cols-12 gap-4 text-left overflow-hidden">
              <div className="col-span-4 bg-gray-900/40 border border-gray-900 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">ATS Alignment Score</div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-4xl font-extrabold text-blue-500 animate-pulse">89%</span>
                    <span className="text-xs text-emerald-400 font-medium">↑ +32% improvement</span>
                  </div>
                  <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden mb-6">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: '89%' }} />
                  </div>

                  <div className="space-y-3">
                    <div className="h-4 w-28 bg-gray-850 rounded" />
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">React</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">TypeScript</span>
                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">Redis</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">CI/CD</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-900 pt-4 mt-4 space-y-2">
                  <div className="h-3 w-3/4 bg-gray-850 rounded" />
                  <div className="h-3 w-1/2 bg-gray-850 rounded" />
                </div>
              </div>

              <div className="col-span-8 bg-gray-900/20 border border-gray-900 rounded-xl p-4 flex flex-col gap-4 overflow-hidden">
                <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                  <div className="h-4 w-40 bg-gray-850 rounded" />
                  <div className="h-6 w-20 bg-blue-600/20 border border-blue-500/30 rounded text-[10px] text-blue-400 font-semibold flex items-center justify-center">AI OPTIMIZED</div>
                </div>
                
                <div className="space-y-4 flex-1">
                  <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500 font-bold mb-1">ORIGINAL</div>
                    <div className="text-xs text-gray-400">Responsible for managing frontend UI and fixing production bugs.</div>
                    <div className="border-t border-gray-800/80 my-2" />
                    <div className="text-[10px] text-blue-400 font-bold mb-1">AI SUGGESTION</div>
                    <div className="text-xs text-gray-200">Engineered responsive UI components using React and TypeScript, resolving 25+ critical production bugs and speeding up user interaction times by 18%.</div>
                  </div>

                  <div className="bg-gray-900/20 border border-gray-900/60 rounded-lg p-3 opacity-60">
                    <div className="text-[10px] text-gray-500 font-bold mb-1">ORIGINAL</div>
                    <div className="text-xs text-gray-400">Wrote Express APIs for the main mobile app backend database.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

     {/* Interactive Tool / Estimator Widget */}
      <section id="demo" className="py-24 px-4 bg-gray-900/30 border-y border-gray-900/80 relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Try the Live Quick Estimator</h2>
            <p className="text-gray-400 max-w-lg mx-auto">Select a role, write or check a sample bullet point, and see how our AI rewrites it instantly.</p>
            <p className="text-xs text-amber-400/80 mt-2 font-medium">✨ Sample preview — try the real analysis with your own resume above</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-xl">
            {/* Roles tabs */}
            <div className="flex flex-wrap gap-2 mb-6 justify-center">
              {Object.keys(SAMPLE_BUlLETS).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${selectedRole === role ? 'bg-blue-600 text-white' : 'bg-gray-850 hover:bg-gray-800 text-gray-400'}`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Current Resume Bullet</label>
                <textarea
                  className="w-full bg-gray-950 text-white rounded-xl p-4 border border-gray-850 focus:border-blue-500 focus:outline-none resize-none text-sm md:text-base h-24"
                  value={userBullet}
                  onChange={(e) => {
                    setUserBullet(e.target.value)
                    setWidgetResult(null)
                  }}
                />
              </div>

              <button
                onClick={handleWidgetCheck}
                disabled={widgetLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition flex items-center justify-center gap-2"
              >
                {widgetLoading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Optimizing bullet point...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" /> Analyze & Rewrite Bullet
                  </>
                )}
              </button>
            </div>

            {/* Results mockup */}
            {widgetResult && (
              <div className="mt-8 border-t border-gray-800/80 pt-8 space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-3 text-center md:text-left">
                    <div className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wider">Estimated Score</div>
                    <div className="text-5xl font-black text-rose-500">42%</div>
                    <div className="text-[10px] text-gray-500 mt-1">Needs action metrics</div>
                  </div>
                  <div className="md:col-span-9">
                    <div className="text-xs text-gray-400 font-bold mb-2 uppercase tracking-wider">Identified Keywords to Inject</div>
                    <div className="flex flex-wrap gap-2">
                      {widgetResult.keywords.map((kw, i) => (
                        <span key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-medium">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-500/30 rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-600 text-[9px] font-bold tracking-widest text-white px-3 py-1 rounded-bl-lg uppercase">AI Rewrite Recommendation</div>
                  <h4 className="text-xs text-blue-400 font-bold mb-2 uppercase tracking-wider">Quantified & Keyword Optimized</h4>
                  <p className="text-gray-200 text-sm md:text-base leading-relaxed italic">"{widgetResult.after}"</p>
                </div>

                <div className="text-center pt-2">
                  <Link 
                    to={isLoaded && isSignedIn ? "/dashboard" : "/signup"}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm md:text-base px-6 py-3 rounded-lg font-bold shadow-lg shadow-emerald-600/10 hover:scale-[1.02] transition"
                  >
                    Optimize Your Whole Resume Now <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Everything You Need to Land the Interview</h2>
          <p className="text-gray-400 max-w-xl mx-auto text-base md:text-lg">Stop throwing your resume into black holes. Standardize and score with AI.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-gray-900/40 border border-gray-900 rounded-2xl p-8 hover:border-gray-800 hover:bg-gray-900/60 transition group">
              <div className="mb-5 bg-gray-950 border border-gray-850 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition duration-300">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="py-24 px-4 bg-gray-900/10 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
        <p className="text-gray-400 max-w-md mx-auto mb-8">No contracts or hidden fees. Choose what fits your career stage.</p>
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg shadow-blue-500/10 transition hover:scale-[1.02]"
        >
          View Full Pricing <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
      {/* Footer */}
      <footer className="border-t border-gray-900 bg-gray-950 py-12 px-4 text-center">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-white">ResumeAI</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 ResumeAI · Built for job seekers everywhere 🌍</p>
          <div className="flex gap-4">
            <a href="#features" className="text-gray-500 hover:text-gray-400 text-sm transition">Features</a>
            <Link to="/pricing" className="text-gray-500 hover:text-gray-400 text-sm transition">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
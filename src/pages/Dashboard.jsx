import { useUser, UserButton, useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { 
  Upload, Sparkles, FileText, CheckCircle2, AlertTriangle, 
  Copy, Check, Download, Info, FileCheck, RefreshCw, 
  Cpu, Award, GitCompare, Compass, UserCheck, HelpCircle, X, History
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

export default function Dashboard() {
  const { user, isLoaded: clerkLoaded, isSignedIn } = useUser()
  const navigate = useNavigate()
  const [clerkTimeout, setClerkTimeout] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!clerkLoaded) {
        setClerkTimeout(true)
        console.warn("Clerk loading timeout - enabling Guest Mode bypass.")
      }
    }, 3000)
    return () => clearTimeout(timer)
  }, [clerkLoaded])

  const isLoaded = clerkLoaded || clerkTimeout
  
  const [activeTab, setActiveTab] = useState('optimize')
  
  const [jobDescription, setJobDescription] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileParsing, setFileParsing] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState(null)
  
  const [bullets, setBullets] = useState([])
  
  const [activeKeyword, setActiveKeyword] = useState(null)
  const [targetBulletIdx, setTargetBulletIdx] = useState(0)
  const [injecting, setInjecting] = useState(false)
  
  const [coverLetterTone, setCoverLetterTone] = useState('Professional')
  const [coverLetter, setCoverLetter] = useState('')
  const [coverLetterLoading, setCoverLetterLoading] = useState(false)
  const [coverLetterCopied, setCoverLetterCopied] = useState(false)

  const [copiedBulletIdx, setCopiedBulletIdx] = useState(null)
  const [copySuccess, setCopySuccess] = useState(false)

  const { getToken } = useAuth()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.get(`${BACKEND_URL}/api/history`, { headers })
      setHistoryList(res.data || [])
    } catch (err) {
      console.error("Failed to load history list:", err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const loadHistoryItem = (item) => {
    setResult(item)
    setJobDescription(item.jobDescription || '')
    setResumeText(item.resumeText || '')
    
    const formattedBullets = (item.optimizedBullets || []).map(b => ({
      original: typeof b === 'object' ? b.original : b,
      optimized: typeof b === 'object' ? b.optimized : b,
      focus: 'Default',
      loading: false
    }))
    setBullets(formattedBullets)
    setHistoryOpen(false)
    toast.success('Past optimization loaded!')
  }

  const deleteHistoryItem = async (itemId, e) => {
    e.stopPropagation()
    const deleteToast = toast.loading('Deleting record...')
    try {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      await axios.delete(`${BACKEND_URL}/api/history/${itemId}`, { headers })
      toast.success('Record deleted from history', { id: deleteToast })
      setHistoryList(prev => prev.filter(item => item._id !== itemId))
      
      if (result && result._id === itemId) {
        setResult(null)
        setBullets([])
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to delete history item', { id: deleteToast })
    }
  }

  useEffect(() => {
    if (isLoaded) {
      fetchHistory()
    }
  }, [isLoaded])

  const [isDragActive, setIsDragActive] = useState(false)

  const handleFileUpload = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF resumes are supported!')
      return
    }

    setFileName(file.name)
    setFileParsing(true)
    const formData = new FormData()
    formData.append('file', file)

    const parseToast = toast.loading('Extracting resume text...')
    try {
      const res = await axios.post(`${BACKEND_URL}/api/parse-pdf`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (res.data && res.data.text) {
        setResumeText(res.data.text)
        toast.success('Resume parsed successfully!', { id: parseToast })
      } else {
        toast.error('Failed to extract text. Please paste manually.', { id: parseToast })
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to parse PDF file. Please paste manually.', { id: parseToast })
    } finally {
      setFileParsing(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleOptimize = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast.error('Please enter both your Resume and the Job Description')
      return
    }
    
    setLoading(true)
    setResult(null)
    setBullets([])
    setLoadingStep(0)
    
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev))
    }, 1500)

    try {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await axios.post(`${BACKEND_URL}/api/optimize`, {
        jobDescription,
        resumeText
      }, { headers })
      setResult(res.data)
      
      const formattedBullets = (res.data.optimizedBullets || []).map(b => ({
        original: typeof b === 'object' ? b.original : b,
        optimized: typeof b === 'object' ? b.optimized : b,
        focus: 'Default',
        loading: false
      }))
      setBullets(formattedBullets)
      toast.success('Resume analyzed & optimized!')
      fetchHistory()
    } catch (err) {
      toast.error('Optimization failed. Please try again.')
      console.error(err)
    } finally {
      clearInterval(stepInterval)
      setLoading(false)
    }
  }

  const tuneSingleBullet = async (idx, selectedFocus, injectKeyword = null) => {
    const targetBullet = bullets[idx]
    if (!targetBullet) return

    const updatedBullets = [...bullets]
    updatedBullets[idx] = { ...targetBullet, loading: true }
    setBullets(updatedBullets)

    try {
      const keywordsToInject = injectKeyword ? [injectKeyword] : []
      const res = await axios.post(`${BACKEND_URL}/api/optimize-single-bullet`, {
        bulletText: targetBullet.original,
        jobDescription,
        focus: selectedFocus,
        injectKeywords: keywordsToInject
      })

      const finalBullets = [...bullets]
      finalBullets[idx] = {
        ...targetBullet,
        optimized: res.data.optimizedBullet,
        focus: selectedFocus,
        loading: false
      }
      setBullets(finalBullets)
      toast.success(injectKeyword ? `Keyword "${injectKeyword}" injected!` : `Bullet updated with ${selectedFocus} focus!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to tune bullet point.')
      const rollbackBullets = [...bullets]
      rollbackBullets[idx] = { ...targetBullet, loading: false }
      setBullets(rollbackBullets)
    }
  }

  const handleInjectKeyword = async () => {
    if (!activeKeyword) return
    setInjecting(true)
    await tuneSingleBullet(targetBulletIdx, bullets[targetBulletIdx].focus, activeKeyword)
    setInjecting(false)
    setActiveKeyword(null)
  }

  const handleGenerateCoverLetter = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast.error('Please upload your resume text and target job description first')
      return
    }

    setCoverLetterLoading(true)
    setCoverLetter('')
    const letterToast = toast.loading('Drafting cover letter...')

    try {
      const res = await axios.post(`${BACKEND_URL}/api/generate-cover-letter`, {
        resumeText,
        jobDescription,
        tone: coverLetterTone
      })
      if (res.data && res.data.coverLetter) {
        setCoverLetter(res.data.coverLetter)
        toast.success('Cover letter generated!', { id: letterToast })
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate cover letter. Try again.', { id: letterToast })
    } finally {
      setCoverLetterLoading(false)
    }
  }

  const renderBulletDiff = (original, optimized) => {
    if (!original) return <span className="text-gray-300">{optimized}</span>
    
    const origWords = original
      .split(/\s+/)
      .map(w => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase())
      .filter(w => w.length > 0)
      
    const optWords = optimized.split(/\s+/)
    
    return optWords.map((word, idx) => {
      const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase()
      const isAdded = cleanWord && !origWords.includes(cleanWord)
      return (
        <span key={idx} className={isAdded ? "diff-added mx-0.5" : "mx-0.5 text-gray-300"}>
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

  const handleManualEdit = (idx, value) => {
    const updated = [...bullets]
    updated[idx] = { ...updated[idx], optimized: value }
    setBullets(updated)
  }

  const downloadBullets = () => {
    const element = document.createElement("a")
    const file = new Blob([bullets.map(b => b.optimized).join('\r\n\r\n')], {type: 'text/plain'})
    element.href = URL.createObjectURL(file)
    element.download = "Optimized_Resume_Bullets.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Downloaded bullets!')
  }

  const copyCoverLetter = () => {
    navigator.clipboard.writeText(coverLetter)
    setCoverLetterCopied(true)
    toast.success('Cover letter copied!')
    setTimeout(() => setCoverLetterCopied(false), 2000)
  }

  const downloadCoverLetter = () => {
    const element = document.createElement("a")
    const file = new Blob([coverLetter], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = "Cover_Letter.txt"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('Cover letter downloaded!')
  }

  const getScoreRatingDetails = (score) => {
    if (score >= 85) return { label: 'Optimal match', style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
    if (score >= 70) return { label: 'Strong candidate', style: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }
    if (score >= 50) return { label: 'Average matching', style: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
    return { label: 'Critical mismatch', style: 'text-rose-400 bg-rose-500/10 border-rose-500/20' }
  }

  const loadingSteps = [
    'Parsing file contents and layout structures...',
    'Scanning job description for critical keywords...',
    'Measuring semantic overlap with ATS filters...',
    'Generating optimized impact bullets with metrics...'
  ]

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans relative overflow-hidden grid-mesh">
      
      <div className="glow-orb w-[500px] h-[500px] bg-blue-600/10 top-[-100px] right-[-100px]" />
      <div className="glow-orb w-[400px] h-[400px] bg-purple-600/10 bottom-[-100px] left-[-100px]" />

      <header className="border-b border-gray-900 bg-gray-950/70 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <span>Resume<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">AI</span></span>
          </Link>
          
          <div className="hidden sm:flex items-center gap-1 bg-gray-900 border border-gray-850 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('optimize')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'optimize' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Resume Optimizer
            </button>
            <button 
              onClick={() => setActiveTab('coverletter')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeTab === 'coverletter' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Cover Letter Generator
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 bg-gray-900/50 text-gray-300 hover:text-white transition text-sm font-semibold"
          >
            <History className="w-4 h-4 text-blue-400 animate-pulse" />
            <span>History</span>
            {historyList.length > 0 && (
              <span className="bg-blue-600 text-white text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold">
                {historyList.length}
              </span>
            )}
          </button>

          <span className="text-gray-400 text-sm hidden md:inline">
            Welcome, <span className="font-semibold text-gray-200">{isSignedIn && user?.firstName ? user.firstName : 'Guest'}</span>! 👋
          </span>
          {isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full font-bold">
              Guest Mode
            </span>
          )}
        </div>
      </header>

      <div className="flex sm:hidden border-b border-gray-900 bg-gray-950 p-2 gap-2 z-10">
        <button 
          onClick={() => setActiveTab('optimize')}
          className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition ${activeTab === 'optimize' ? 'bg-gray-900 text-blue-400 border border-blue-500/25' : 'text-gray-500'}`}
        >
          Resume Optimizer
        </button>
        <button 
          onClick={() => setActiveTab('coverletter')}
          className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold transition ${activeTab === 'coverletter' ? 'bg-gray-900 text-blue-400 border border-blue-500/25' : 'text-gray-500'}`}
        >
          Cover Letter
        </button>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8 z-10 relative">
        
        {activeTab === 'optimize' ? (
          <div className="space-y-8">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <div className="lg:col-span-6 bg-gray-900/30 border border-gray-900 rounded-2xl p-6 backdrop-blur-sm card-glow flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    <span>📋 Job Description</span>
                  </h3>
                  <p className="text-gray-400 text-xs mb-4">Paste the target job description to match keywords and skills.</p>
                  <textarea
                    className="w-full h-64 bg-gray-950/60 text-white text-sm rounded-xl p-4 border border-gray-855 focus:border-blue-500 focus:outline-none resize-none placeholder-gray-600 transition"
                    placeholder="Paste full job description from LinkedIn, Naukri, etc. here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="lg:col-span-6 bg-gray-900/30 border border-gray-900 rounded-2xl p-6 backdrop-blur-sm card-glow flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    <span>📄 Resume Upload or Paste</span>
                  </h3>
                  <p className="text-gray-400 text-xs mb-4">Upload your PDF resume directly or paste the text content below.</p>
                  
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload-input').click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition mb-4 ${
                      isDragActive ? 'border-blue-500 bg-blue-500/5' : 'border-gray-850 hover:border-gray-700 bg-gray-950/40'
                    }`}
                  >
                    <input 
                      id="file-upload-input"
                      type="file" 
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden" 
                    />
                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    {fileName ? (
                      <div>
                        <p className="text-sm font-semibold text-blue-400">{fileName}</p>
                        <p className="text-[10px] text-gray-500">Drag a new file to replace</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-gray-300">Drag & drop your PDF resume</p>
                        <p className="text-xs text-gray-500 mt-1">or click to browse files</p>
                      </div>
                    )}
                  </div>

                  <textarea
                    className="w-full h-32 bg-gray-950/60 text-white text-sm rounded-xl p-4 border border-gray-855 focus:border-blue-500 focus:outline-none resize-none placeholder-gray-600 transition"
                    placeholder="Alternatively, paste your plain resume text here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                </div>
              </div>

            </div>

            <div className="text-center">
              <button
                onClick={handleOptimize}
                disabled={loading || fileParsing}
                className="w-full md:w-auto min-w-[280px] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/30 transition hover:scale-[1.01] hover:shadow-xl duration-350"
              >
                {loading ? '⏳ Optimizing...' : '✨ Analyze & Optimize Resume'}
              </button>
            </div>

            {loading && (
              <div className="bg-gray-900/60 border border-gray-850 rounded-2xl p-8 max-w-2xl mx-auto flex flex-col items-center justify-center space-y-6 backdrop-blur shadow-2xl">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-white">Analyzing Resume & Job Alignment</h4>
                  <p className="text-blue-400 font-medium text-sm animate-pulse">{loadingSteps[loadingStep]}</p>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(loadingStep + 1) * 25}%` }} />
                </div>
              </div>
            )}

            {activeKeyword && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/70 backdrop-blur-sm px-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full relative animate-fadeIn shadow-2xl shadow-blue-900/10">
                  <button 
                    onClick={() => setActiveKeyword(null)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    <span>Keyword Injector Workbench</span>
                  </h3>
                  <p className="text-xs text-gray-400 mb-6">Select a resume bullet point. Our AI will automatically rewrite it to naturally integrate the keyword <span className="text-blue-400 font-bold">"{activeKeyword}"</span>.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Select Target Bullet</label>
                      <select
                        value={targetBulletIdx}
                        onChange={(e) => setTargetBulletIdx(parseInt(e.target.value))}
                        className="w-full bg-gray-950 text-white rounded-xl p-3 border border-gray-800 focus:border-blue-500 focus:outline-none text-xs leading-relaxed"
                      >
                        {bullets.map((b, idx) => (
                          <option key={idx} value={idx}>
                            Bullet {idx + 1}: {b.original.substring(0, 50)}...
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleInjectKeyword}
                      disabled={injecting}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
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
            )}

            {result && (
              <div className="space-y-8 animate-fadeIn">
                
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  <div className="lg:col-span-5 bg-gray-900/40 border border-gray-900 rounded-2xl p-6 backdrop-blur flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Award className="w-5 h-5 text-blue-400" />
                        <span>ATS Alignment Score</span>
                      </h3>
                      
                      <div className="flex flex-col items-center justify-center py-6">
                        <div className="relative w-44 h-44 flex items-center justify-center">
                          <svg className="absolute w-full h-full transform -rotate-90">
                            <circle 
                              cx="88" 
                              cy="88" 
                              r="76" 
                              stroke="#1f2937" 
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
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="50%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#8b5cf6" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="text-center z-10">
                            <span className="text-5xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">{result.atsScore}%</span>
                            <div className="mt-2 text-center">
                              <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-gray-800/20 ${getScoreRatingDetails(result.atsScore).style}`}>
                                {getScoreRatingDetails(result.atsScore).label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-950/80 border border-gray-850 rounded-xl p-4 mt-4">
                        <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 text-blue-400" />
                          <span>AI Executive Review</span>
                        </h4>
                        <p className="text-gray-300 text-xs md:text-sm leading-relaxed italic">"{result.summary}"</p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-gray-900/40 border border-gray-900 rounded-2xl p-6 space-y-6 backdrop-blur">
                    
                    <div>
                      <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                        <span>Missing Keywords ({result.missingKeywords?.length || 0})</span>
                        <span className="text-[10px] text-gray-500 font-normal lowercase tracking-normal italic">(click to inject into bullet)</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.missingKeywords?.length > 0 ? (
                          result.missingKeywords.map((kw, i) => (
                            <span 
                              key={i} 
                              onClick={() => {
                                setActiveKeyword(kw)
                                setTargetBulletIdx(0)
                              }}
                              className="cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-semibold transition hover:scale-105"
                            >
                              + {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">No missing keywords! Resume is fully aligned.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Matched Keywords ({result.foundKeywords?.length || 0})</span>
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {result.foundKeywords?.length > 0 ? (
                          result.foundKeywords.map((kw, i) => (
                            <span 
                              key={i} 
                              className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold"
                            >
                              ✓ {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">No keywords matched yet. Try integrating the recommended keywords.</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-800/80 pt-6">
                      
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3">Critical Content Issues</h4>
                        <ul className="space-y-2">
                          {result.criticalIssues?.map((issue, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5 leading-relaxed">
                              <span className="text-rose-500 shrink-0 mt-0.5">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3">Formatting Rules</h4>
                        <ul className="space-y-2">
                          {result.formattingTips?.map((tip, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5 leading-relaxed">
                              <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>

                  </div>
                </div>

                <div className="bg-gray-900/35 border border-gray-900 rounded-2xl p-6 backdrop-blur">
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-855 pb-4 mb-6 gap-4">
                    <div>
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-400" />
                        <span>AI Bullet Optimization Board</span>
                      </h3>
                      <p className="text-gray-400 text-xs mt-0.5">Use the tuning switches underneath each bullet to focus on specific metrics or leadership values.</p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={copyAllBullets}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-gray-850 hover:bg-gray-800 text-white border border-gray-800 px-4 py-2 rounded-xl text-xs font-bold transition"
                      >
                        {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>Copy All</span>
                      </button>
                      <button
                        onClick={downloadBullets}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition"
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
                        className={`bg-gray-955 border rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition duration-300 ${
                          b.loading ? 'border-blue-500 shadow-md shadow-blue-500/5' : 'border-gray-855 hover:border-gray-800'
                        }`}
                      >
                        {b.loading && (
                          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-10 flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                            <span className="text-xs font-semibold text-blue-400">Regenerating bullet line...</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          
                          <div className="lg:col-span-5 flex flex-col justify-between">
                            <div>
                              <span className="text-[10px] font-extrabold text-rose-400/70 uppercase tracking-widest mb-1.5 inline-block">Original Sentence</span>
                              <p className="text-xs text-gray-500 line-through leading-relaxed">{b.original}</p>
                            </div>
                          </div>

                          <div className="hidden lg:block lg:col-span-1 border-l border-gray-900 justify-self-center my-2" />

                          <div className="lg:col-span-6 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest inline-block">AI Suggested Upgrade (Diff Highlighted)</span>
                                
                                <span className="text-[10px] bg-gray-900 border border-gray-850 px-2 py-0.5 rounded text-gray-500 font-semibold uppercase tracking-wider">
                                  {b.focus} mode
                                </span>
                              </div>
                              
                              <div className="bg-gray-900/50 border border-gray-900 rounded-xl p-3.5 mb-3 leading-relaxed text-sm">
                                {renderBulletDiff(b.original, b.optimized)}
                              </div>
                              
                              <textarea
                                className="w-full bg-transparent text-gray-400 text-xs font-medium focus:outline-none resize-none leading-relaxed min-h-[45px] border-b border-dashed border-gray-900 pb-2 mb-2 focus:border-blue-500"
                                value={b.optimized}
                                onChange={(e) => handleManualEdit(idx, e.target.value)}
                              />
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                              
                              <div className="flex items-center gap-1.5 bg-gray-900/80 border border-gray-855 p-1 rounded-lg">
                                <button
                                  onClick={() => tuneSingleBullet(idx, 'Metrics')}
                                  className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition ${b.focus === 'Metrics' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  title="Add quantifiable metrics & figures"
                                >
                                  📊 Metrics
                                </button>
                                <button
                                  onClick={() => tuneSingleBullet(idx, 'Technical')}
                                  className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition ${b.focus === 'Technical' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  title="Add depth of libraries/frameworks"
                                >
                                  💻 Tech
                                </button>
                                <button
                                  onClick={() => tuneSingleBullet(idx, 'Leadership')}
                                  className={`px-2.5 py-1 rounded text-[10px] font-extrabold transition ${b.focus === 'Leadership' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                                  title="Emphasize project ownership & coordination"
                                >
                                  👥 Lead
                                </button>
                              </div>

                              <button
                                onClick={() => copyBullet(b.optimized, idx)}
                                className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-850 border border-gray-850 text-gray-400 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
                              >
                                {copiedBulletIdx === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>Copy bullet</span>
                              </button>
                            </div>

                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                </div>

              </div>
            )}

          </div>
        ) : (
          <div className="bg-gray-900/30 border border-gray-900 rounded-2xl p-6 md:p-8 space-y-8 animate-fadeIn max-w-4xl mx-auto backdrop-blur">
            
            <div className="border-b border-gray-800 pb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                <span>Tailored Cover Letter Generator</span>
              </h3>
              <p className="text-gray-400 text-xs mt-1">Draft a custom cover letter mapped directly to the job description and your experience details.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                <label className="block text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-2.5">Select Letter Tone</label>
                <select
                  value={coverLetterTone}
                  onChange={(e) => setCoverLetterTone(e.target.value)}
                  className="w-full bg-gray-950 text-white rounded-xl p-3 border border-gray-850 focus:border-blue-500 focus:outline-none text-sm transition"
                >
                  <option value="Professional">💼 Professional & Balanced</option>
                  <option value="Enthusiastic">🔥 Enthusiastic & Passionate</option>
                  <option value="Confident">🎯 Bold & Confident</option>
                  <option value="Short & Crisp">⚡ Short & Crisp</option>
                </select>
              </div>

              <button
                onClick={handleGenerateCoverLetter}
                disabled={coverLetterLoading || !resumeText || !jobDescription}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition flex items-center justify-center gap-2"
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

            {(!resumeText || !jobDescription) && (
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  Make sure you have filled in or uploaded both your <strong>Resume</strong> and the <strong>Job Description</strong> inside the <span className="text-blue-400 cursor-pointer font-bold" onClick={() => setActiveTab('optimize')}>Resume Optimizer</span> tab first before writing a cover letter.
                </p>
              </div>
            )}

            {coverLetter && (
              <div className="space-y-4 border-t border-gray-800/80 pt-8 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">AI Drafted Cover Letter</h4>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={copyCoverLetter}
                      className="bg-gray-850 hover:bg-gray-800 text-gray-300 border border-gray-800 px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      {coverLetterCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{coverLetterCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={downloadCoverLetter}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                <div className="bg-white text-gray-900 border border-gray-200 rounded-xl p-6 md:p-8 font-mono text-sm leading-relaxed shadow-lg whitespace-pre-wrap">
                  {coverLetter}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setHistoryOpen(false)}
          />
          
          <div className="relative w-full max-w-md bg-gray-900 border-l border-gray-805 h-full shadow-2xl flex flex-col z-10 animate-slide-in font-sans">
            <div className="p-6 border-b border-gray-850 flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                <span>Optimization History</span>
              </h2>
              <button 
                onClick={() => setHistoryOpen(false)}
                className="text-gray-400 hover:text-white transition p-1.5 hover:bg-gray-850 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-xs text-gray-500">Loading history records...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-semibold">No history found</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">Upload and optimize your resume to build up your history list.</p>
                </div>
              ) : (
                historyList.map((item) => (
                  <div 
                    key={item._id}
                    onClick={() => loadHistoryItem(item)}
                    className="group bg-gray-950/40 hover:bg-gray-950/80 border border-gray-850 hover:border-blue-500/30 rounded-xl p-4 cursor-pointer transition flex flex-col gap-2 relative shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(item.createdAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                        ATS: {item.atsScore}%
                      </span>
                    </div>
                    
                    <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition line-clamp-1">
                      🎯 {item.jobDescription || 'Full Stack Developer'}
                    </h3>
                    
                    <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.summary || 'Click to review results and interview tips.'}
                    </p>
                    
                    <div className="flex items-center justify-between border-t border-gray-850/60 pt-2 mt-1.5 text-[10px] text-gray-500">
                      <span>{item.optimizedBullets?.length || 0} bullets optimized</span>
                      <button 
                        onClick={(e) => deleteHistoryItem(item._id, e)}
                        className="text-gray-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded transition"
                        title="Delete Record"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-6 border-t border-gray-850 bg-gray-950/20 text-center">
              <p className="text-[10px] text-gray-500">
                Resilient Sync Storage Active
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
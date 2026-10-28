import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiClient } from '../utils/apiClient'
import toast from 'react-hot-toast'
import { DashboardHeader } from '../features/dashboard/DashboardHeader'
import { JobDescriptionInput } from '../features/dashboard/JobDescriptionInput'
import { ResumeUploadArea } from '../features/dashboard/ResumeUploadArea'
import { KeywordInjectorModal } from '../features/dashboard/KeywordInjectorModal'
import { OptimizationResults } from '../features/dashboard/OptimizationResults'
import { BulletOptimizationBoard } from '../features/dashboard/BulletOptimizationBoard'
import { CoverLetterTab } from '../features/dashboard/CoverLetterTab'
import { HistoryDrawer } from '../features/dashboard/HistoryDrawer'

export default function Dashboard() {
  const { user, loading: isLoading, isAuthenticated: isSignedIn, logout } = useAuth()
  const isLoaded = !isLoading

  const [activeTab, setActiveTab] = useState('optimize')

  const [jobDescription, setJobDescription] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileParsing, setFileParsing] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [loading, setLoading] = useState(false)
  const [optimizationError, setOptimizationError] = useState('')
  const [loadingStep, setLoadingStep] = useState(0)
  const [result, setResult] = useState(null)

  const [bullets, setBullets] = useState([])

  const [activeKeyword, setActiveKeyword] = useState(null)
  const [targetBulletIdx, setTargetBulletIdx] = useState(0)
  const [injecting, setInjecting] = useState(false)

  const [coverLetterTone, setCoverLetterTone] = useState('Professional')
  const [coverLetter, setCoverLetter] = useState('')
  const [coverLetterLoading, setCoverLetterLoading] = useState(false)

  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyList, setHistoryList] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const fetchHistory = async () => {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const res = await apiClient.get('/api/history')
      setHistoryList(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error('Failed to load history list. HTTP status:', err.response?.status || 'network error')
      setHistoryList([])
      setHistoryError('History could not be loaded. Check your connection and try again.')
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
      reviewFlags: typeof b === 'object' ? (b.reviewFlags || []) : [],
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
      await apiClient.delete(`/api/history/${itemId}`)
      toast.success('Record deleted from history', { id: deleteToast })
      setHistoryList(prev => prev.filter(item => item._id !== itemId))

      if (result && result._id === itemId) {
        setResult(null)
        setBullets([])
      }
    } catch (err) {
      console.error('History delete failed. HTTP status:', err.response?.status || 'network error')
      toast.error('Failed to delete history item', { id: deleteToast })
    }
  }

  useEffect(() => {
    if (isLoaded) {
      fetchHistory()
    }
  }, [isLoaded])

  const handleFileUpload = async (file) => {
    if (!file) return
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    const allowedExtensions = ['.pdf', '.docx']
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setUploadError('Choose a PDF or DOCX resume.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('This file is larger than 10 MB. Choose a smaller PDF or DOCX.')
      return
    }

    setUploadError('')
    setFileName(file.name)
    setFileParsing(true)
    const formData = new FormData()
    formData.append('file', file)

    const parseToast = toast.loading('Extracting resume text...')
    try {
      const res = await apiClient.post('/api/parse-pdf', formData)
      if (res.data && res.data.text) {
        setResumeText(res.data.text)
        toast.success('Resume parsed successfully!', { id: parseToast })
      } else {
        setUploadError('We could not extract text from this file. Paste your resume text instead.')
        toast.error('Failed to extract text. Please paste manually.', { id: parseToast })
      }
    } catch (err) {
      console.error('Resume parsing failed. HTTP status:', err.response?.status || 'network error')
      setUploadError('We could not parse this file. Try another PDF or DOCX, or paste your resume text.')
      toast.error('Failed to parse PDF file. Please paste manually.', { id: parseToast })
    } finally {
      setFileParsing(false)
    }
  }

  const handleOptimize = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) {
      setOptimizationError('Add both your resume and the target job description to continue.')
      return
    }
    setOptimizationError('')

    setLoading(true)
    setResult(null)
    setBullets([])
    setLoadingStep(0)

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev))
    }, 1500)

    try {
      const res = await apiClient.post('/api/optimize', {
        jobDescription,
        resumeText
      })
      setResult(res.data)

      const formattedBullets = (res.data.optimizedBullets || []).map(b => ({
        original: typeof b === 'object' ? b.original : b,
        optimized: typeof b === 'object' ? b.optimized : b,
        reviewFlags: typeof b === 'object' ? (b.reviewFlags || []) : [],
        focus: 'Default',
        loading: false
      }))
      setBullets(formattedBullets)
      toast.success('Resume analyzed & optimized!')
      fetchHistory()
    } catch (err) {
      const message = err.response?.data?.error || 'We could not analyze this resume. Check your connection and try again.'
      setOptimizationError(message)
      toast.error(message)
      console.error('Optimization failed. HTTP status:', err.response?.status || 'network error')
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
      const res = await apiClient.post('/api/optimize-single-bullet', {
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
      console.error('Bullet rewriting failed. HTTP status:', err.response?.status || 'network error')
      toast.error(err.response?.data?.error || 'Failed to tune bullet point.')
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
      const res = await apiClient.post('/api/generate-cover-letter', {
        resumeText,
        jobDescription,
        tone: coverLetterTone
      })
      if (res.data && res.data.coverLetter) {
        setCoverLetter(res.data.coverLetter)
        toast.success('Cover letter generated!', { id: letterToast })
      }
    } catch (err) {
      console.error('Cover-letter generation failed. HTTP status:', err.response?.status || 'network error')
      toast.error(err.response?.data?.error || 'Failed to generate cover letter. Try again.', { id: letterToast })
    } finally {
      setCoverLetterLoading(false)
    }
  }

  const handleManualEdit = (idx, value) => {
    const updated = [...bullets]
    updated[idx] = { ...updated[idx], optimized: value }
    setBullets(updated)
  }

  const loadingSteps = [
    'Parsing file contents and layout structures...',
    'Scanning job description for critical keywords...',
    'Measuring semantic overlap with ATS filters...',
    'Generating optimized impact bullets with metrics...'
  ]

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-stone-950 flex flex-col font-sans">
      <DashboardHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={historyList.length}
        onOpenHistory={() => setHistoryOpen(true)}
        isSignedIn={isSignedIn}
        user={user}
        onLogout={() => logout().catch(() => toast.error('Could not fully sign out. Please retry.'))}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-blue-800">Your workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Make this application stronger.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Add a target role and your resume. We’ll show where they align and give you suggestions to review.
            </p>
          </div>
          <p className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600">
            Your resume · Your final say
          </p>
        </div>

        {activeTab === 'optimize' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <JobDescriptionInput
                value={jobDescription}
                onChange={setJobDescription}
              />
              <ResumeUploadArea
                resumeText={resumeText}
                onResumeTextChange={setResumeText}
                fileName={fileName}
                fileParsing={fileParsing}
                uploadError={uploadError}
                onFileUpload={handleFileUpload}
              />
            </div>

            <div className="text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-blue-800">03 · Review your match</p>
              <button
                onClick={handleOptimize}
                disabled={loading || fileParsing}
                className="w-full md:w-auto min-h-12 min-w-[280px] bg-stone-950 hover:bg-stone-800 disabled:bg-stone-400 text-white px-8 py-3 rounded-xl text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
              >
                {loading ? 'Analyzing…' : 'Analyze resume'}
              </button>
              {optimizationError && (
                <p role="alert" className="mt-3 text-sm font-medium text-red-700">{optimizationError}</p>
              )}
            </div>

            {loading && (
              <div className="bg-white border border-stone-200 rounded-2xl p-8 max-w-2xl mx-auto flex flex-col items-center justify-center space-y-6 backdrop-blur shadow-2xl">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                </div>
                <div className="text-center space-y-2">
                  <h4 className="text-lg font-bold text-stone-950">Analyzing Resume & Job Alignment</h4>
                  <p role="status" aria-live="polite" className="text-blue-800 font-medium text-sm">
                    {loadingSteps[loadingStep]}
                  </p>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-500"
                    style={{ width: `${(loadingStep + 1) * 25}%` }}
                  />
                </div>
              </div>
            )}

            <KeywordInjectorModal
              activeKeyword={activeKeyword}
              onClose={() => setActiveKeyword(null)}
              bullets={bullets}
              targetBulletIdx={targetBulletIdx}
              setTargetBulletIdx={setTargetBulletIdx}
              injecting={injecting}
              onInject={handleInjectKeyword}
            />

            <OptimizationResults
              result={result}
              onSelectKeyword={(kw) => {
                setActiveKeyword(kw)
                setTargetBulletIdx(0)
              }}
            />

            <BulletOptimizationBoard
              bullets={bullets}
              onTuneBullet={tuneSingleBullet}
              onManualEdit={handleManualEdit}
              setBullets={setBullets}
            />
          </div>
        ) : (
          <CoverLetterTab
            coverLetter={coverLetter}
            coverLetterTone={coverLetterTone}
            setCoverLetterTone={setCoverLetterTone}
            coverLetterLoading={coverLetterLoading}
            onGenerateCoverLetter={handleGenerateCoverLetter}
            hasResumeAndJD={Boolean(resumeText && jobDescription)}
            onSwitchToOptimizer={() => setActiveTab('optimize')}
          />
        )}
      </main>

      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        historyList={historyList}
        historyLoading={historyLoading}
        historyError={historyError}
        onFetchHistory={fetchHistory}
        onLoadItem={loadHistoryItem}
        onDeleteItem={deleteHistoryItem}
      />
    </div>
  )
}

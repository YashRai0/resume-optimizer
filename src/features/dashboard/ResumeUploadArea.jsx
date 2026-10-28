import { useState } from 'react'
import { Upload } from 'lucide-react'

export function ResumeUploadArea({
  resumeText,
  onResumeTextChange,
  fileName,
  fileParsing,
  uploadError,
  onFileUpload
}) {
  const [isDragActive, setIsDragActive] = useState(false)

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
      onFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0])
    }
  }

  return (
    <div className="lg:col-span-6 bg-white border border-stone-200 rounded-2xl p-6 backdrop-blur-sm card-glow flex flex-col justify-between">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-blue-800">02 · Your experience</p>
        <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-800" />
          <span>Upload or paste your resume</span>
        </h3>
        <p className="text-stone-600 text-xs mb-4">Upload your PDF resume directly or paste the text content below.</p>

        <div
          role="button"
          tabIndex={0}
          aria-label={fileName ? `Resume selected: ${fileName}. Choose another PDF or DOCX` : 'Choose or drop a PDF or DOCX resume'}
          aria-busy={fileParsing}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input').click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              document.getElementById('file-upload-input').click()
            }
          }}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition mb-4 focus-visible:ring-2 focus-visible:ring-blue-700 ${
            isDragActive ? 'border-blue-700 bg-blue-50' : 'border-stone-300 hover:border-stone-500 bg-stone-50'
          }`}
        >
          <input
            id="file-upload-input"
            type="file"
            accept=".pdf,.docx"
            aria-label="Choose resume file"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-stone-500 mx-auto mb-2" />
          {fileName ? (
            <div>
              <p className="text-sm font-semibold text-blue-800">{fileName}</p>
              <p role={fileParsing ? 'status' : undefined} className="text-[10px] text-stone-600">
                {fileParsing ? 'Reading your file…' : 'Choose another file to replace'}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-stone-700">Drag & drop your PDF resume</p>
              <p className="text-xs text-stone-600 mt-1">or choose a file · PDF/DOCX, up to 10 MB</p>
            </div>
          )}
        </div>

        {uploadError && <p role="alert" className="mb-3 text-sm font-medium text-red-700">{uploadError}</p>}
        <label htmlFor="resume-text" className="mb-2 mt-4 block text-xs font-medium text-stone-600">
          Or paste your resume text
        </label>
        <textarea
          id="resume-text"
          className="w-full h-32 bg-stone-50 text-stone-950 text-sm rounded-xl p-4 border border-stone-300 focus:border-blue-700 focus:outline-none resize-y placeholder-stone-500 transition"
          placeholder="Alternatively, paste your plain resume text here..."
          value={resumeText}
          onChange={(e) => onResumeTextChange(e.target.value)}
        />
      </div>
    </div>
  )
}

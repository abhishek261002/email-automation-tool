'use client'

import { useState, useEffect, useRef } from 'react'

interface Resume {
  id: string
  label: string
  fileName: string
  cdnUrl: string
  uploadedAt: string
}

/**
 * Resume Library page — upload, label, and manage PDF resumes.
 * Requirements: 4.4
 */
export default function ResumeLibraryPage() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Fetch resumes ───────────────────────────────────────────────────────────
  const fetchResumes = async () => {
    try {
      const res = await fetch('/api/resumes')
      if (!res.ok) {
        setFetchError('Failed to load resumes')
        return
      }
      const json = await res.json()
      setResumes(json.resumes ?? [])
      setFetchError(null)
    } catch {
      setFetchError('Network error — failed to load resumes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResumes()
  }, [])

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setUploadError(null)
    setSuccessMsg(null)

    if (selected && selected.type !== 'application/pdf') {
      setUploadError('Only PDF files are accepted. Please select a .pdf file.')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setFile(selected)
  }

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const dropped = e.dataTransfer.files?.[0] ?? null
    if (!dropped) return

    if (dropped.type !== 'application/pdf') {
      setUploadError('Only PDF files are accepted.')
      return
    }
    setUploadError(null)
    setSuccessMsg(null)
    setFile(dropped)
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    setSuccessMsg(null)

    if (!file) {
      setUploadError('Please select a PDF file')
      return
    }
    if (!label.trim()) {
      setUploadError('Please provide a label for this resume')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('label', label.trim())

      const res = await fetch('/api/resumes', { method: 'POST', body: formData })
      const json = await res.json()

      if (!res.ok) {
        setUploadError(json.error ?? 'Upload failed')
        return
      }

      setSuccessMsg(`"${json.resume.label}" uploaded successfully!`)
      setLabel('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchResumes()
    } catch {
      setUploadError('Network error — please try again')
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Resume Library</h1>
        <p className="text-zinc-500 text-sm mt-1">Upload and manage PDF resumes for your campaigns.</p>
      </div>

      {/* Upload form */}
      <form
        onSubmit={handleUpload}
        className="glass rounded-2xl p-6 border border-white/[0.06] space-y-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Upload a Resume</h2>
          <span className="text-xs text-zinc-600 bg-zinc-800/60 border border-white/[0.06] px-2 py-0.5 rounded-full">PDF only</span>
        </div>

        {/* Label */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. MERN_AI_SaaS_Resume"
            className="w-full px-3 py-2.5 rounded-lg text-sm text-zinc-100 placeholder-zinc-600 bg-zinc-900/80 border border-white/[0.08] focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20 outline-none transition-all duration-150"
          />
        </div>

        {/* Drop zone */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">PDF File</label>
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'relative flex flex-col items-center justify-center gap-3 py-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200',
              dragActive
                ? 'border-violet-500/60 bg-violet-500/[0.06]'
                : file
                  ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]',
            ].join(' ')}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                    <path d="M9 12l2 2 4-4M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-200">{file.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-zinc-500">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm text-zinc-400">
                    <span className="text-violet-400 font-medium">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-zinc-600 mt-0.5">PDF files only</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Feedback messages */}
        {uploadError && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/25 bg-red-500/10">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-red-400 flex-shrink-0">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-red-400 text-sm">{uploadError}</p>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-emerald-400 flex-shrink-0">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-emerald-400 text-sm">{successMsg}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={uploading}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-violet transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Uploading...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Upload Resume
            </>
          )}
        </button>
      </form>

      {/* Resume list */}
      <div className="glass rounded-2xl overflow-hidden border border-white/[0.06]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">
            Uploaded Resumes
            <span className="ml-2 font-mono text-zinc-500">({resumes.length})</span>
          </h2>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <ul className="divide-y divide-white/[0.04]">
            {[1,2,3].map((i) => (
              <li key={i} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-40 rounded bg-zinc-800/80 shimmer-bg" />
                  <div className="h-3 w-56 rounded bg-zinc-800/60 shimmer-bg" />
                </div>
                <div className="h-3.5 w-16 rounded bg-zinc-800/60 shimmer-bg" />
              </li>
            ))}
          </ul>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <div className="px-6 py-6">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {fetchError}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !fetchError && resumes.length === 0 && (
          <div className="px-6 py-14 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-zinc-600">
                <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-zinc-500 text-sm">No resumes uploaded yet.</p>
          </div>
        )}

        {/* Resume cards */}
        {!loading && !fetchError && resumes.length > 0 && (
          <ul className="divide-y divide-white/[0.04]">
            {resumes.map((resume) => (
              <li
                key={resume.id}
                className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors duration-150 group"
              >
                {/* Icon + info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex-shrink-0 bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-red-400">
                      <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{resume.label}</p>
                    <p className="text-xs text-zinc-500 truncate font-mono">{resume.fileName}</p>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-zinc-600 font-mono hidden sm:block">{formatDate(resume.uploadedAt)}</span>
                  <a
                    href={resume.cdnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-zinc-400 text-xs font-medium hover:bg-white/[0.06] hover:text-zinc-200 hover:border-white/[0.15] transition-all duration-150 active:scale-[0.97]"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    View PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

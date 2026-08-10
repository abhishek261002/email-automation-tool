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

  // ── Upload ─────────────────────────────────────────────────────────────────
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
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resume Library</h1>
        <p className="text-gray-500 text-sm mt-1">Upload and manage PDF resumes for your campaigns.</p>
      </div>

      {/* Upload form */}
      <form
        onSubmit={handleUpload}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4"
      >
        <h2 className="text-base font-semibold text-gray-800">Upload a Resume</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. MERN_AI_SaaS_Resume"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="text-xs text-gray-400 mt-1">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {uploadError && (
          <p className="text-sm text-red-600 font-medium">{uploadError}</p>
        )}
        {successMsg && (
          <p className="text-sm text-green-600 font-medium">{successMsg}</p>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading...' : 'Upload Resume'}
        </button>
      </form>

      {/* Resume list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            Uploaded Resumes ({resumes.length})
          </h2>
        </div>

        {loading && (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">Loading...</div>
        )}

        {!loading && fetchError && (
          <div className="px-6 py-4 text-sm text-red-600">{fetchError}</div>
        )}

        {!loading && !fetchError && resumes.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">
            No resumes uploaded yet.
          </div>
        )}

        {!loading && !fetchError && resumes.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {resumes.map((resume) => (
              <li key={resume.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{resume.label}</p>
                  <p className="text-xs text-gray-500 truncate">{resume.fileName}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-400">{formatDate(resume.uploadedAt)}</span>
                  <a
                    href={resume.cdnUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
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

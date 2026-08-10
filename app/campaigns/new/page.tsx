'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  name: string
}

interface Resume {
  id: string
  label: string
  fileName: string
}

/**
 * Campaign Creation Form page.
 * Validates all fields, calls /api/campaigns/parse, stores result in
 * sessionStorage, then navigates to /campaigns/review.
 *
 * Requirements: 1.1, 1.2
 */
export default function NewCampaignPage() {
  const router = useRouter()

  const [companyName, setCompanyName] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [rawApolloText, setRawApolloText] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [resumeId, setResumeId] = useState('')

  const [templates, setTemplates] = useState<Template[]>([])
  const [resumes, setResumes] = useState<Resume[]>([])

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [apiError, setApiError] = useState<string | null>(null)

  // ── Load templates and resumes ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, rRes] = await Promise.all([
          fetch('/api/templates'),
          fetch('/api/resumes'),
        ])
        if (tRes.ok) {
          const tj = await tRes.json()
          setTemplates(tj.templates ?? [])
          if (tj.templates?.length > 0) setTemplateId(tj.templates[0].id)
        }
        if (rRes.ok) {
          const rj = await rRes.json()
          setResumes(rj.resumes ?? [])
          if (rj.resumes?.length > 0) setResumeId(rj.resumes[0].id)
        }
      } catch {
        // Non-fatal — user can still select from dropdowns
      }
    }
    load()
  }, [])

  // ── Form submission ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setApiError(null)

    // Client-side validation
    const errors: Record<string, string[]> = {}
    if (!companyName.trim()) errors.companyName = ['Company name is required']
    if (!targetRole.trim()) errors.targetRole = ['Target role is required']
    if (!rawApolloText.trim()) errors.rawApolloText = ['Apollo data is required']
    if (!templateId) errors.templateId = ['Please select a template']
    if (!resumeId) errors.resumeId = ['Please select a resume']

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/campaigns/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, targetRole, rawApolloText, templateId, resumeId }),
      })

      const json = await res.json()

      if (!res.ok) {
        if (json.fieldErrors) {
          setFieldErrors(json.fieldErrors)
        } else {
          setApiError(json.error ?? 'Failed to parse Apollo data')
        }
        return
      }

      // Store draft in sessionStorage and navigate to review
      sessionStorage.setItem(
        'campaignDraft',
        JSON.stringify({
          campaignInput: { companyName, targetRole, rawApolloText, templateId, resumeId },
          companyDomain: json.companyDomain,
          leads: json.filteredLeads,
        })
      )

      router.push('/campaigns/review')
    } catch {
      setApiError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (field: string) =>
    `w-full px-3 py-2 border rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      fieldErrors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300'
    }`

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Campaign</h1>
        <p className="text-gray-500 text-sm mt-1">
          Provide company details and Apollo.io data to generate a personalized email queue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">

        {/* Company Name */}
        <div>
          <label className="block text-sm font-medium text-black mb-1">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Troopr Labs"
            className={inputClass('companyName')}
          />
          {fieldErrors.companyName && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.companyName[0]}</p>
          )}
        </div>

        {/* Target Role */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Job Role</label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Software Development Engineer - 1"
            className={inputClass('targetRole')}
          />
          {fieldErrors.targetRole && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.targetRole[0]}</p>
          )}
        </div>

        {/* Apollo Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apollo.io Employee Data</label>
          <textarea
            value={rawApolloText}
            onChange={(e) => setRawApolloText(e.target.value)}
            placeholder="Paste raw Apollo.io employee list here — names, titles, emails..."
            rows={8}
            className={inputClass('rawApolloText')}
          />
          {fieldErrors.rawApolloText && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.rawApolloText[0]}</p>
          )}
        </div>

        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Template</label>
          {templates.length === 0 ? (
            <select disabled className={`${inputClass('templateId')} text-gray-400`}>
              <option>No templates found — add one in Supabase</option>
            </select>
          ) : (
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className={inputClass('templateId')}
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {fieldErrors.templateId && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.templateId[0]}</p>
          )}
        </div>

        {/* Resume */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
          {resumes.length === 0 ? (
            <div className="border border-yellow-300 bg-yellow-50 rounded-lg px-3 py-2 text-sm text-yellow-700">
              No resumes uploaded yet.{' '}
              <a href="/resume-library" className="underline font-medium">Upload one →</a>
            </div>
          ) : (
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className={inputClass('resumeId')}
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.label} ({r.fileName})</option>
              ))}
            </select>
          )}
          {fieldErrors.resumeId && (
            <p className="text-red-500 text-xs mt-1">{fieldErrors.resumeId[0]}</p>
          )}
        </div>

        {/* API error */}
        {apiError && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || resumes.length === 0}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Parsing with AI...' : '✨ Parse with AI'}
        </button>
      </form>
    </div>
  )
}

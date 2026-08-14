'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
          const list = tj.templates ?? tj ?? []
          setTemplates(Array.isArray(list) ? list : [])
          if (Array.isArray(list) && list.length > 0) setTemplateId(list[0].id)
        } else {
          const errBody = await tRes.json().catch(() => ({}))
          console.error('[Templates Fetch Failed]', tRes.status, errBody)
        }
        if (rRes.ok) {
          const rj = await rRes.json()
          setResumes(rj.resumes ?? [])
          if (rj.resumes?.length > 0) setResumeId(rj.resumes[0].id)
        }
      } catch (err) {
        console.error('[Load Error]', err)
      }
    }
    load()
  }, [])

  // ── Form submission ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setApiError(null)

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

  const hasError = (field: string) => !!fieldErrors[field]
  const lineCount = rawApolloText.split('\n').filter((l) => l.trim().length > 0).length

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white px-4 py-12 md:py-16">
      {/* Precision Grid Background */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_65%,transparent_100%)]" 
      />

      <div className="max-w-3xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs font-mono text-zinc-500">
          <Link href="/campaigns" className="hover:text-zinc-300 transition-colors">
            Campaigns
          </Link>
          <span>/</span>
          <span className="text-zinc-200">New Configuration</span>
        </div>

        {/* Stepper Indicator */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-700 bg-zinc-900/90 shadow-sm">
            <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-950 font-mono text-xs font-bold flex items-center justify-center">
              01
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">Step 1</div>
              <div className="text-sm font-semibold text-zinc-100">Ingestion & Parameters</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 opacity-60">
            <div className="w-6 h-6 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 font-mono text-xs font-bold flex items-center justify-center">
              02
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-500">Step 2</div>
              <div className="text-sm font-medium text-zinc-400">Lead Review & Dispatch</div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 border-b border-zinc-800/80 pb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Create Campaign
          </h1>
          <p className="text-zinc-400 text-sm mt-1.5 leading-relaxed">
            Provide the target company metadata and raw employee export to synthesize personalized outreach.
          </p>
        </div>

        {/* Main Card Form */}
        <form 
          onSubmit={handleSubmit} 
          className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6"
        >
          {/* Target Parameters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <FormField 
              label="Company Name" 
              required 
              error={fieldErrors.companyName?.[0]}
            >
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className={inputClass(hasError('companyName'))}
              />
            </FormField>

            {/* Target Role */}
            <FormField 
              label="Target Job Role" 
              required 
              error={fieldErrors.targetRole?.[0]}
            >
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Staff Full Stack Engineer"
                className={inputClass(hasError('targetRole'))}
              />
            </FormField>
          </div>

          {/* Apollo Data Textarea */}
          <FormField
            label="Apollo.io Contact Data"
            required
            error={fieldErrors.rawApolloText?.[0]}
            hint={
              lineCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px] border border-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {lineCount} lines parsed
                </span>
              ) : undefined
            }
          >
            <div className="relative">
              <textarea
                value={rawApolloText}
                onChange={(e) => setRawApolloText(e.target.value)}
                placeholder="Paste raw unformatted Apollo table lines (Name, Job Title, Verified Email)..."
                rows={7}
                className={`${inputClass(hasError('rawApolloText'))} resize-y font-mono text-xs leading-relaxed`}
              />
            </div>
          </FormField>

          {/* Template & Resume Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-zinc-800/80">
            {/* Template Selector */}
            <FormField label="Email Template" required error={fieldErrors.templateId?.[0]}>
              {templates.length === 0 ? (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs font-mono">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>No templates found in database</span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    className={selectClass(hasError('templateId'))}
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id} className="bg-zinc-900 text-zinc-100">
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
            </FormField>

            {/* Resume Selector */}
            <FormField label="Attached Resume" required error={fieldErrors.resumeId?.[0]}>
              {resumes.length === 0 ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-300 text-xs font-mono">
                  <span className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    No resumes uploaded
                  </span>
                  <Link href="/resume-library" className="underline font-semibold hover:text-white transition-colors">
                    Upload &rarr;
                  </Link>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    className={selectClass(hasError('resumeId'))}
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id} className="bg-zinc-900 text-zinc-100">
                        {r.label} ({r.fileName})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              )}
            </FormField>
          </div>

          {/* API Error Notification */}
          {apiError && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-950/30 text-red-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5 text-red-400">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div className="text-xs font-mono leading-relaxed">{apiError}</div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-4">
            <Link
              href="/campaigns"
              className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs font-medium text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading || resumes.length === 0}
              className="px-6 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.98] shadow-md flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  <span>Processing Extraction...</span>
                </>
              ) : (
                <>
                  <span>Extract & Review Leads</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
          {label} {required && <span className="text-zinc-600">*</span>}
        </label>
        {hint}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-red-400 text-xs font-mono pt-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

function inputClass(hasErr: boolean) {
  return [
    'w-full px-3.5 py-2.5 rounded-xl text-sm text-zinc-100 placeholder-zinc-600',
    'bg-zinc-950/80 border transition-all duration-150 outline-none',
    hasErr
      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
      : 'border-zinc-800 hover:border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20',
  ].join(' ')
}

function selectClass(hasErr: boolean) {
  return [
    'w-full px-3.5 py-2.5 rounded-xl text-sm text-zinc-100',
    'bg-zinc-950/80 border transition-all duration-150 outline-none appearance-none cursor-pointer pr-10',
    hasErr
      ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/20'
      : 'border-zinc-800 hover:border-zinc-700 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400/20',
  ].join(' ')
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ParsedLead, CampaignFormInput } from '@/types'

interface CampaignDraft {
  campaignInput: CampaignFormInput
  companyDomain: string
  leads: ParsedLead[]
}

/**
 * Lead Review Screen — lets the user inspect and approve AI-parsed leads
 * before committing them to the campaign queue.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export default function ReviewPage() {
  const router = useRouter()

  const [draft, setDraft] = useState<CampaignDraft | null>(null)
  const [leads, setLeads] = useState<(ParsedLead & { selected: boolean })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Load draft from sessionStorage ─────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('campaignDraft')
      if (!raw) return
      const parsed: CampaignDraft = JSON.parse(raw)
      setDraft(parsed)
      setLeads(parsed.leads.map((l) => ({ ...l, selected: true })))
    } catch {
      setError('Failed to load campaign draft — please go back and try again.')
    }
  }, [])

  if (!draft && !error) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center animate-fade-in">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl glass border border-white/[0.06] flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-zinc-500">
            <path d="M9 12h6M9 16h6M7 8h10M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-zinc-400 text-sm mb-4">No campaign data found.</p>
        <a href="/campaigns/new" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          ← Start a new campaign
        </a>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center animate-fade-in">
        <div className="glass rounded-2xl p-8 border border-red-500/20">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <a href="/campaigns/new" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
            ← Go back
          </a>
        </div>
      </div>
    )
  }

  const selectedCount = leads.filter((l) => l.selected).length
  const totalCount = leads.length
  const verifiedCount = leads.filter((l) => l.isVerified).length

  const toggleLead = (idx: number) => {
    setLeads((prev) => prev.map((l, i) => (i === idx ? { ...l, selected: !l.selected } : l)))
  }

  const selectAll = () => setLeads((prev) => prev.map((l) => ({ ...l, selected: true })))
  const deselectAll = () => setLeads((prev) => prev.map((l) => ({ ...l, selected: false })))

  const handleConfirm = async () => {
    if (selectedCount === 0) return

    setLoading(true)
    setError(null)

    try {
      const selectedLeads = leads.filter((l) => l.selected)
      const res = await fetch('/api/campaigns/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignInput: draft!.campaignInput,
          confirmedLeads: selectedLeads,
          companyDomain: draft!.companyDomain,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Failed to confirm campaign')
        return
      }

      sessionStorage.removeItem('campaignDraft')
      router.push(`/campaigns/${json.campaign.id}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center gap-2 max-w-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="text-sm text-zinc-500">Setup</span>
        </div>
        <div className="flex-1 h-px bg-white/[0.06]" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">2</div>
          <span className="text-sm font-medium text-zinc-100">Review Leads</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Review Leads</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {draft?.campaignInput.companyName}
            <span className="mx-1.5 text-zinc-700">·</span>
            {draft?.campaignInput.targetRole}
          </p>
        </div>
        <a href="/campaigns/new" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </a>
      </div>

      {/* Stats + Controls bar */}
      <div className="glass rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap border border-white/[0.06]">
        <div className="flex items-center gap-5 flex-wrap">
          {/* Stat pills */}
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold text-zinc-100 font-mono">{selectedCount}</span>
            <span className="text-zinc-500">/ {totalCount} selected</span>
          </div>
          <div className="h-4 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-1.5 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-mono text-emerald-400">{verifiedCount}</span>
            <span className="text-zinc-500">verified</span>
          </div>
          <div className="h-4 w-px bg-white/[0.08]" />
          {/* Select/deselect buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={selectAll}
              className="text-xs px-2.5 py-1 rounded-md border border-white/[0.08] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-all duration-150 active:scale-[0.97]"
            >
              Select all
            </button>
            <button
              onClick={deselectAll}
              className="text-xs px-2.5 py-1 rounded-md border border-white/[0.08] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 transition-all duration-150 active:scale-[0.97]"
            >
              Deselect all
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedCount === 0 && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Select at least one lead
            </span>
          )}
          <button
            onClick={handleConfirm}
            disabled={loading || selectedCount === 0}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-glow-violet transition-all duration-200 active:scale-[0.97]"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Creating campaign...
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Confirm &amp; Start ({selectedCount})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg border border-red-500/25 bg-red-500/10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-red-400 flex-shrink-0">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Leads table */}
      <div className="glass rounded-2xl overflow-hidden border border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 w-10" />
                {['First Name','Last Name','Role','Primary Email','Verified'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, idx) => (
                <tr
                  key={idx}
                  onClick={() => toggleLead(idx)}
                  className={`border-b border-white/[0.04] cursor-pointer transition-colors duration-100 ${
                    lead.selected
                      ? 'bg-violet-500/[0.06] hover:bg-violet-500/[0.1]'
                      : 'hover:bg-white/[0.025]'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 ${
                        lead.selected
                          ? 'bg-violet-600 border-violet-500'
                          : 'bg-transparent border-zinc-600'
                      }`}
                      onClick={(e) => { e.stopPropagation(); toggleLead(idx) }}
                    >
                      {lead.selected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-zinc-100">{lead.firstName}</td>
                  <td className="px-4 py-3.5 text-zinc-400">{lead.lastName}</td>
                  <td className="px-4 py-3.5 text-zinc-400 max-w-[200px] truncate" title={lead.role}>{lead.role}</td>
                  <td className="px-4 py-3.5 text-zinc-400 font-mono text-xs">{lead.primaryEmail}</td>
                  <td className="px-4 py-3.5">
                    {lead.isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border border-white/[0.07] bg-white/[0.03] text-zinc-500">
                        Unverified
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

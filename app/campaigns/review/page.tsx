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
      // Default all leads to selected (Req 3.2)
      setLeads(parsed.leads.map((l) => ({ ...l, selected: true })))
    } catch {
      setError('Failed to load campaign draft — please go back and try again.')
    }
  }, [])

  if (!draft && !error) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-gray-500 text-sm">No campaign data found.</p>
        <a href="/campaigns/new" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
          ← Start a new campaign
        </a>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-red-600 text-sm">{error}</p>
        <a href="/campaigns/new" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
          ← Go back
        </a>
      </div>
    )
  }

  const selectedCount = leads.filter((l) => l.selected).length
  const totalCount = leads.length

  const toggleLead = (idx: number) => {
    setLeads((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, selected: !l.selected } : l))
    )
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

      // Clear draft and navigate to dashboard
      sessionStorage.removeItem('campaignDraft')
      router.push(`/campaigns/${json.campaign.id}`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            {draft?.campaignInput.companyName} — {draft?.campaignInput.targetRole}
          </p>
        </div>
        <a href="/campaigns/new" className="text-sm text-blue-600 hover:underline">
          ← Back
        </a>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Select All
          </button>
          <button
            onClick={deselectAll}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Deselect All
          </button>
          <span className="text-sm text-gray-500">
            <span className="font-medium text-gray-900">{selectedCount}</span> of {totalCount} leads selected
          </span>
        </div>

        <div className="flex items-center gap-3">
          {selectedCount === 0 && (
            <span className="text-sm text-amber-600 font-medium">
              ⚠ Select at least one lead to continue
            </span>
          )}
          <button
            onClick={handleConfirm}
            disabled={loading || selectedCount === 0}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating campaign...' : `✓ Confirm & Start Campaign (${selectedCount})`}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Leads table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-3 w-10"></th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead, idx) => (
                <tr
                  key={idx}
                  onClick={() => toggleLead(idx)}
                  className={`cursor-pointer transition-colors ${
                    lead.selected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={lead.selected}
                      onChange={() => toggleLead(idx)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-gray-900 font-medium">{lead.firstName}</td>
                  <td className="px-4 py-3 text-gray-700">{lead.lastName}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={lead.role}>
                    {lead.role}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{lead.primaryEmail}</td>
                  <td className="px-4 py-3">
                    {lead.isVerified ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        ✓ Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
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

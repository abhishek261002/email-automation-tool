'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Campaign, Lead, CampaignStatus, LeadStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignWithLeads {
  campaign: Campaign
  leads: Lead[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<CampaignStatus, { label: string; classes: string }> = {
  ACTIVE: { label: 'Active', classes: 'bg-green-100 text-green-800' },
  PAUSED: { label: 'Paused', classes: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completed', classes: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-red-100 text-red-800' },
}

const LEAD_STATUS_BADGE: Record<LeadStatus, { label: string; classes: string }> = {
  PENDING: { label: 'Pending', classes: 'bg-gray-100 text-gray-700' },
  SENT: { label: 'Sent', classes: 'bg-green-100 text-green-700' },
  FAILED_BOUNCED: { label: 'Bounced', classes: 'bg-red-100 text-red-700' },
  SKIPPED: { label: 'Skipped', classes: 'bg-orange-100 text-orange-700' },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const { label, classes } = STATUS_BADGE[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { label, classes } = LEAD_STATUS_BADGE[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Campaign Dashboard page — polls every 10 seconds for live status.
 * Allows pause / resume / cancel actions via PATCH /api/campaigns/[id]/control.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */
export default function CampaignDashboardPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [data, setData] = useState<CampaignWithLeads | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // ── Fetch campaign + leads ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/campaigns/${id}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Campaign not found.')
        } else {
          const body = await res.json().catch(() => ({}))
          setError(body.error ?? 'Failed to load campaign.')
        }
        return
      }
      const json = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError('Network error — failed to load campaign.')
    } finally {
      setLoading(false)
    }
  }, [id])

  // ── Initial load + polling (10 s) ───────────────────────────────────────────
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [fetchData])

  // ── Control action (pause / resume / cancel) ────────────────────────────────
  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!data) return
    setActionLoading(true)
    setActionError(null)

    // Optimistic UI update
    const optimisticStatus: CampaignStatus =
      action === 'pause' ? 'PAUSED' :
      action === 'resume' ? 'ACTIVE' :
      'CANCELLED'

    setData((prev) =>
      prev ? { ...prev, campaign: { ...prev.campaign, status: optimisticStatus } } : prev
    )

    try {
      const res = await fetch(`/api/campaigns/${id}/control`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setActionError(body.error ?? `Failed to ${action} campaign.`)
        // Revert optimistic update on failure
        await fetchData()
      } else {
        // Re-fetch to get server-confirmed state
        await fetchData()
      }
    } catch {
      setActionError('Network error — please try again.')
      await fetchData()
    } finally {
      setActionLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading campaign...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error ?? 'Something went wrong.'}</p>
          <button
            onClick={() => router.push('/campaigns')}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            ← Back to campaigns
          </button>
        </div>
      </div>
    )
  }

  const { campaign, leads } = data
  const totalLeads = leads.length
  const sentLeads = leads.filter((l) => l.status === 'SENT').length
  const pendingLeads = leads.filter((l) => l.status === 'PENDING').length
  const bouncedLeads = leads.filter((l) => l.status === 'FAILED_BOUNCED').length
  const progressPct = totalLeads > 0 ? Math.round((sentLeads / totalLeads) * 100) : 0

  const isActive = campaign.status === 'ACTIVE'
  const isPaused = campaign.status === 'PAUSED'
  const isArchived = campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Back link */}
        <button
          onClick={() => router.push('/campaigns')}
          className="text-sm text-blue-600 hover:underline"
        >
          ← All campaigns
        </button>

        {/* Campaign header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{campaign.companyName}</h1>
                <StatusBadge status={campaign.status} />
                {isArchived && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">{campaign.targetRole}</p>
              <p className="text-gray-400 text-xs">Created {formatDate(campaign.createdAt)}</p>
            </div>

            {/* Action buttons */}
            {!isArchived && (
              <div className="flex items-center gap-2 flex-wrap">
                {isActive && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction('pause')}
                    className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ⏸ Pause
                  </button>
                )}
                {isPaused && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleAction('resume')}
                    className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ▶ Resume
                  </button>
                )}
                <button
                  disabled={actionLoading}
                  onClick={() => {
                    if (window.confirm('Are you sure you want to cancel this campaign? This cannot be undone.')) {
                      handleAction('cancel')
                    }
                  }}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>

          {/* Action error */}
          {actionError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{actionError}</p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Progress</h2>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{sentLeads} emails sent</span>
              <span>{totalLeads} total</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1 text-right">{progressPct}% complete</p>
          </div>

          {/* Lead counts */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{pendingLeads}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{sentLeads}</p>
              <p className="text-xs text-gray-500 mt-0.5">Sent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{bouncedLeads}</p>
              <p className="text-xs text-gray-500 mt-0.5">Bounced</p>
            </div>
          </div>
        </div>

        {/* Leads table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Leads ({totalLeads})
            </h2>
          </div>

          {leads.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400 text-sm">
              No leads in this campaign.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">First Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Primary Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 font-medium">{lead.firstName}</td>
                      <td className="px-4 py-3 text-gray-700">{lead.lastName}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" title={lead.role}>
                        {lead.role}
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{lead.primaryEmail}</td>
                      <td className="px-4 py-3">
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(lead.sentAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

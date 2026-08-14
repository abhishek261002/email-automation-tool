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

const CAMPAIGN_STATUS_CONFIG: Record<CampaignStatus, { label: string; dot: string; badge: string }> = {
  ACTIVE:    { label: 'Active',    dot: 'bg-emerald-400 animate-pulse', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  PAUSED:    { label: 'Paused',    dot: 'bg-amber-400',                  badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  COMPLETED: { label: 'Completed', dot: 'bg-indigo-400',                 badge: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' },
  CANCELLED: { label: 'Cancelled', dot: 'bg-red-400',                    badge: 'border-red-500/30 bg-red-500/10 text-red-400' },
}

const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; dot: string; badge: string }> = {
  PENDING:        { label: 'Pending',  dot: 'bg-zinc-500',   badge: 'border-zinc-700 bg-zinc-800/60 text-zinc-400' },
  SENT:           { label: 'Sent',     dot: 'bg-emerald-400', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  FAILED_BOUNCED: { label: 'Bounced',  dot: 'bg-red-400',    badge: 'border-red-500/30 bg-red-500/10 text-red-400' },
  SKIPPED:        { label: 'Skipped',  dot: 'bg-amber-400',  badge: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = CAMPAIGN_STATUS_CONFIG[status] ?? { label: status, dot: 'bg-zinc-400', badge: 'border-zinc-700 bg-zinc-800 text-zinc-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const cfg = LEAD_STATUS_CONFIG[status] ?? { label: status, dot: 'bg-zinc-400', badge: 'border-zinc-700 bg-zinc-800 text-zinc-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`rounded-md bg-zinc-800/80 shimmer-bg ${className}`} />
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, valueClass, icon,
}: {
  label: string
  value: number | string
  valueClass: string
  icon: React.ReactNode
}) {
  return (
    <div className="glass rounded-xl p-5 glass-hover space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
        <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-zinc-400">
          {icon}
        </div>
      </div>
      <p className={`text-3xl font-bold font-mono tracking-tight ${valueClass}`}>{value}</p>
    </div>
  )
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

  // ── Fetch ───────────────────────────────────────────────────────────────────
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

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10_000)
    return () => clearInterval(interval)
  }, [fetchData])

  // ── Control action ──────────────────────────────────────────────────────────
  const handleAction = async (action: 'pause' | 'resume' | 'cancel') => {
    if (!data) return
    setActionLoading(true)
    setActionError(null)

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
        await fetchData()
      } else {
        await fetchData()
      }
    } catch {
      setActionError('Network error — please try again.')
      await fetchData()
    } finally {
      setActionLoading(false)
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-5 w-28" />
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map((i) => (
            <div key={i} className="glass rounded-xl p-5 space-y-3">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-14 h-14 mb-5 rounded-2xl glass border border-red-500/20 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-red-400">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-zinc-300 font-medium mb-1">{error ?? 'Something went wrong.'}</p>
        <button
          onClick={() => router.push('/campaigns')}
          className="mt-4 flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to campaigns
        </button>
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
    <div className="space-y-6 animate-fade-in">
      {/* Back link */}
      <button
        onClick={() => router.push('/campaigns')}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        All campaigns
      </button>

      {/* Campaign header card */}
      <div className="glass rounded-2xl p-6 border border-white/[0.06]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">{campaign.companyName}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-zinc-400 text-sm">{campaign.targetRole}</p>
            <p className="text-zinc-600 text-xs font-mono">Created {formatDate(campaign.createdAt)}</p>
          </div>

          {/* Action buttons */}
          {!isArchived && (
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              {isActive && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('pause')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-medium hover:bg-amber-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.97]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                  Pause
                </button>
              )}
              {isPaused && (
                <button
                  disabled={actionLoading}
                  onClick={() => handleAction('resume')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.97]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z"/></svg>
                  Resume
                </button>
              )}
              <button
                disabled={actionLoading}
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this campaign? This cannot be undone.')) {
                    handleAction('cancel')
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-medium hover:bg-red-500/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.97]"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Action error */}
        {actionError && (
          <div className="mt-4 flex items-center gap-2.5 p-3 rounded-lg border border-red-500/25 bg-red-500/10">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-red-400 flex-shrink-0">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-red-400 text-sm">{actionError}</p>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Leads"
          value={totalLeads}
          valueClass="text-zinc-100"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 20.5c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        />
        <StatCard
          label="Pending"
          value={pendingLeads}
          valueClass="text-zinc-400"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>}
        />
        <StatCard
          label="Sent"
          value={sentLeads}
          valueClass="text-emerald-400"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        />
        <StatCard
          label="Bounced"
          value={bouncedLeads}
          valueClass="text-red-400"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 15L15 9M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/></svg>}
        />
      </div>

      {/* Progress card */}
      <div className="glass rounded-2xl p-6 border border-white/[0.06] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Dispatch Progress</h2>
          <span className="font-mono text-sm text-zinc-300">{progressPct}%</span>
        </div>

        {/* Progress bar */}
        <div className="relative w-full bg-zinc-800/80 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-700 ease-out relative"
            style={{ width: `${progressPct}%` }}
          >
            {isActive && progressPct > 0 && (
              <div className="absolute inset-0 rounded-full progress-shimmer" />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
          <span>{sentLeads} sent</span>
          <span>{totalLeads} total</span>
        </div>
      </div>

      {/* Leads table */}
      <div className="glass rounded-2xl overflow-hidden border border-white/[0.06]">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">
            Leads
            <span className="ml-2 font-mono text-zinc-500">({totalLeads})</span>
          </h2>
          {isActive && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
        </div>

        {leads.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-zinc-500 text-sm">No leads in this campaign.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  {['First Name','Last Name','Role','Primary Email','Status','Sent At'].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors duration-100">
                    <td className="px-4 py-3.5 font-medium text-zinc-100">{lead.firstName}</td>
                    <td className="px-4 py-3.5 text-zinc-400">{lead.lastName}</td>
                    <td className="px-4 py-3.5 text-zinc-400 max-w-[180px] truncate" title={lead.role}>{lead.role}</td>
                    <td className="px-4 py-3.5 text-zinc-400 font-mono text-xs">{lead.primaryEmail}</td>
                    <td className="px-4 py-3.5">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3.5 text-zinc-500 text-xs whitespace-nowrap font-mono">
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
  )
}

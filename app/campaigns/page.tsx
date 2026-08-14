'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CampaignStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CampaignSummary {
  id: string
  companyName: string
  targetRole: string
  status: CampaignStatus
  createdAt: string
  totalLeads: number
  sentLeads: number
  bouncedLeads: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<CampaignStatus, { label: string; dot: string; badge: string }> = {
  ACTIVE:    { label: 'Active',    dot: 'bg-emerald-400 animate-pulse', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  PAUSED:    { label: 'Paused',    dot: 'bg-amber-400',                 badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  COMPLETED: { label: 'Completed', dot: 'bg-zinc-400',                  badge: 'border-zinc-700 bg-zinc-800 text-zinc-300' },
  CANCELLED: { label: 'Cancelled', dot: 'bg-red-400',                   badge: 'border-red-500/30 bg-red-500/10 text-red-300' },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, dot: 'bg-zinc-500', badge: 'border-zinc-800 bg-zinc-900 text-zinc-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-zinc-800/80">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 rounded bg-zinc-800/60 animate-pulse" style={{ width: `${45 + (i * 11) % 45}%` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns')
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setError(body.error ?? 'Failed to load campaigns.')
          return
        }
        const json = await res.json()
        setCampaigns(json.campaigns ?? [])
      } catch {
        setError('Network error — failed to load campaigns.')
      } finally {
        setLoading(false)
      }
    }
    fetchCampaigns()
  }, [])

  const totalLeads = campaigns.reduce((s, c) => s + c.totalLeads, 0)
  const sentLeads = campaigns.reduce((s, c) => s + c.sentLeads, 0)
  const bouncedLeads = campaigns.reduce((s, c) => s + c.bouncedLeads, 0)
  const activeCount = campaigns.filter((c) => c.status === 'ACTIVE').length

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-white px-4 py-12 md:py-16">
      {/* Precision Background Grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,#000_65%,transparent_100%)]"
      />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 mb-1">
              <span>Workspace</span>
              <span>/</span>
              <span className="text-zinc-300">Outreach Campaigns</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Campaigns</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Manage and track active lead pipelines and outbound dispatch runs.
            </p>
          </div>

          <Link
            href="/campaigns/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-white transition-all duration-150 active:scale-[0.98] shadow-md shrink-0"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            New Campaign
          </Link>
        </div>

        {/* Metric Summary Cards */}
        {!loading && !error && campaigns.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { label: 'Total Campaigns', value: campaigns.length, sub: 'Configured queues' },
              { label: 'Active Dispatches', value: activeCount, sub: 'Currently sending' },
              { label: 'Total Emails Sent', value: sentLeads, sub: `Out of ${totalLeads} leads` },
              { label: 'Bounced / Blocked', value: bouncedLeads, sub: 'Automatic bounce guard' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 md:p-5 backdrop-blur-xl transition-all duration-200 hover:border-zinc-700"
              >
                <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">{stat.label}</div>
                <div className="text-2xl md:text-3xl font-bold font-mono text-white mt-1.5 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-[11px] font-mono text-zinc-500 mt-1">{stat.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Error Alert */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-950/30 p-5 flex items-start gap-3 text-red-300">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-400 shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <div className="text-sm font-semibold text-red-200">Unable to load campaigns</div>
              <p className="text-xs font-mono mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && campaigns.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-16 text-center backdrop-blur-xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl border border-zinc-700 bg-zinc-800/80 flex items-center justify-center text-zinc-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-zinc-200">No campaigns launched</h2>
            <p className="text-zinc-400 text-xs font-mono max-w-sm mx-auto mt-1 mb-6">
              Parse raw Apollo leads and configure your email dispatch queue to start outreach.
            </p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 text-xs font-mono font-semibold uppercase tracking-wider hover:bg-white transition-all duration-150 active:scale-[0.98]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              Create First Campaign
            </Link>
          </div>
        )}

        {/* Campaign Data Table */}
        {(loading || campaigns.length > 0) && !error && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden backdrop-blur-xl shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                    <th className="px-5 py-3.5">Company</th>
                    <th className="px-5 py-3.5">Target Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Leads</th>
                    <th className="px-5 py-3.5 text-center">Sent</th>
                    <th className="px-5 py-3.5 text-center">Bounced</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading
                    ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                    : campaigns.map((campaign) => (
                        <tr
                          key={campaign.id}
                          className="hover:bg-zinc-800/40 transition-colors duration-150 group"
                        >
                          <td className="px-5 py-4 font-semibold text-zinc-100 max-w-[170px] truncate" title={campaign.companyName}>
                            {campaign.companyName}
                          </td>
                          <td className="px-5 py-4 text-zinc-400 text-xs font-mono max-w-[200px] truncate" title={campaign.targetRole}>
                            {campaign.targetRole}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <StatusBadge status={campaign.status} />
                          </td>
                          <td className="px-5 py-4 text-center text-zinc-300 font-mono text-xs">
                            {campaign.totalLeads}
                          </td>
                          <td className="px-5 py-4 text-center text-emerald-400 font-mono text-xs font-medium">
                            {campaign.sentLeads}
                          </td>
                          <td className="px-5 py-4 text-center text-red-400 font-mono text-xs font-medium">
                            {campaign.bouncedLeads}
                          </td>
                          <td className="px-5 py-4 text-zinc-500 text-xs whitespace-nowrap font-mono">
                            {formatDate(campaign.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/campaigns/${campaign.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-300 text-xs font-mono font-medium hover:bg-zinc-700 hover:text-white transition-all duration-150 active:scale-[0.97]"
                            >
                              <span>View</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
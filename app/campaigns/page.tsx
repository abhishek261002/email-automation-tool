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

const STATUS_BADGE: Record<CampaignStatus, { label: string; classes: string }> = {
  ACTIVE: { label: 'Active', classes: 'bg-green-100 text-green-800' },
  PAUSED: { label: 'Paused', classes: 'bg-yellow-100 text-yellow-800' },
  COMPLETED: { label: 'Completed', classes: 'bg-blue-100 text-blue-800' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-red-100 text-red-800' },
}

function StatusBadge({ status }: { status: CampaignStatus }) {
  const { label, classes } = STATUS_BADGE[status] ?? { label: status, classes: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Campaign List page — shows all campaigns with lead counts and status.
 * Requirements: 10.1
 */
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage your cold email outreach campaigns</p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <span>+</span> New Campaign
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">Loading campaigns...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && campaigns.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
            <div className="text-4xl mb-4">✉️</div>
            <h2 className="text-lg font-semibold text-gray-700 mb-1">No campaigns yet</h2>
            <p className="text-gray-400 text-sm mb-6">Create your first campaign to start sending cold emails.</p>
            <Link
              href="/campaigns/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              + New Campaign
            </Link>
          </div>
        )}

        {/* Campaign list */}
        {!loading && !error && campaigns.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Leads</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Sent</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Bounced</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 text-gray-900 font-medium max-w-[160px] truncate" title={campaign.companyName}>
                        {campaign.companyName}
                      </td>
                      <td className="px-5 py-4 text-gray-600 max-w-[200px] truncate" title={campaign.targetRole}>
                        {campaign.targetRole}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={campaign.status} />
                      </td>
                      <td className="px-5 py-4 text-center text-gray-700 font-medium">
                        {campaign.totalLeads}
                      </td>
                      <td className="px-5 py-4 text-center text-green-600 font-medium">
                        {campaign.sentLeads}
                      </td>
                      <td className="px-5 py-4 text-center text-red-500 font-medium">
                        {campaign.bouncedLeads}
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(campaign.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
                        >
                          View →
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

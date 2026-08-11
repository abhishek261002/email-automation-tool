import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase client (service key, server-side only) ─────────────────────────

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables (URL or SERVICE_KEY)')
  }

  return createClient(url, key)
}

// ─── GET /api/campaigns — list all campaigns with lead counts ─────────────────

/**
 * Returns all campaigns with aggregated lead counts.
 * Handles both camelCase and snake_case column names from DB.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')

    if (campaignsError) {
      console.error('[GET /api/campaigns] Supabase error:', campaignsError)
      return NextResponse.json(
        { error: 'Failed to fetch campaigns', detail: campaignsError.message },
        { status: 500 }
      )
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ campaigns: [] })
    }

    // Sort in memory by createdAt / created_at (newest first)
    campaigns.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.created_at || 0).getTime()
      const dateB = new Date(b.createdAt || b.created_at || 0).getTime()
      return dateB - dateA
    })

    // Fetch lead counts per campaign grouped by status
    const campaignIds = campaigns.map((c: { id: string }) => c.id)

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('campaignId, campaign_id, status')

    if (leadsError) {
      console.error('[GET /api/campaigns] Lead count error:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch lead counts', detail: leadsError.message },
        { status: 500 }
      )
    }

    // Aggregate counts in memory by campaign_id / campaignId
    const countMap: Record<string, { total: number; sent: number; bounced: number }> = {}
    for (const id of campaignIds) {
      countMap[id] = { total: 0, sent: 0, bounced: 0 }
    }

    for (const lead of (leads ?? [])) {
      const cId = lead.campaignId || lead.campaign_id
      const entry = countMap[cId]
      if (!entry) continue
      entry.total++
      if (lead.status === 'SENT') entry.sent++
      if (lead.status === 'FAILED_BOUNCED') entry.bounced++
    }

    // Map result ensuring fallback to camelCase
    const result = campaigns.map((row: any) => ({
      id: row.id,
      companyName: row.companyName || row.company_name || 'Untitled Company',
      targetRole: row.targetRole || row.target_role || 'No Role Specified',
      status: row.status,
      createdAt: row.createdAt || row.created_at || new Date().toISOString(),
      totalLeads: countMap[row.id]?.total ?? 0,
      sentLeads: countMap[row.id]?.sent ?? 0,
      bouncedLeads: countMap[row.id]?.bounced ?? 0,
    }))

    return NextResponse.json({ campaigns: result })
  } catch (err: any) {
    console.error('[GET /api/campaigns] Unexpected error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
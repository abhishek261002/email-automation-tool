import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase client (service key, server-side only) ─────────────────────────

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
  }

  return createClient(url, key)
}

// ─── GET /api/campaigns — list all campaigns with lead counts ─────────────────

/**
 * Returns all campaigns with aggregated lead counts.
 * Maps snake_case DB columns to camelCase for the client.
 *
 * Requirements: 10.1
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    // Fetch all campaigns ordered by creation date (newest first)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, company_name, target_role, status, created_at')
      .order('created_at', { ascending: false })

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

    // Fetch lead counts per campaign grouped by status
    const campaignIds = campaigns.map((c: { id: string }) => c.id)

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('campaign_id, status')
      .in('campaign_id', campaignIds)

    if (leadsError) {
      console.error('[GET /api/campaigns] Lead count error:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch lead counts', detail: leadsError.message },
        { status: 500 }
      )
    }

    // Aggregate counts in memory by campaign_id
    const countMap: Record<string, { total: number; sent: number; bounced: number }> = {}
    for (const id of campaignIds) {
      countMap[id] = { total: 0, sent: 0, bounced: 0 }
    }

    for (const lead of (leads ?? [])) {
      const entry = countMap[lead.campaign_id]
      if (!entry) continue
      entry.total++
      if (lead.status === 'SENT') entry.sent++
      if (lead.status === 'FAILED_BOUNCED') entry.bounced++
    }

    // Map to camelCase with counts
    const result = campaigns.map((row: {
      id: string
      company_name: string
      target_role: string
      status: string
      created_at: string
    }) => ({
      id: row.id,
      companyName: row.company_name,
      targetRole: row.target_role,
      status: row.status,
      createdAt: row.created_at,
      totalLeads: countMap[row.id]?.total ?? 0,
      sentLeads: countMap[row.id]?.sent ?? 0,
      bouncedLeads: countMap[row.id]?.bounced ?? 0,
    }))

    return NextResponse.json({ campaigns: result })
  } catch (err) {
    console.error('[GET /api/campaigns] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

// ─── GET /api/campaigns/[id] — fetch single campaign with leads ───────────────

/**
 * Returns a campaign record along with all of its leads.
 * Maps snake_case DB columns to camelCase for the client.
 *
 * Requirements: 10.2
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Fetch the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (campaignError) {
      if (campaignError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      console.error('[GET /api/campaigns/[id]] Supabase error:', campaignError)
      return NextResponse.json(
        { error: 'Failed to fetch campaign', detail: campaignError.message },
        { status: 500 }
      )
    }

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Fetch all leads for this campaign
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', id)
      .order('created_at', { ascending: true })

    if (leadsError) {
      console.error('[GET /api/campaigns/[id]] Leads error:', leadsError)
      return NextResponse.json(
        { error: 'Failed to fetch leads', detail: leadsError.message },
        { status: 500 }
      )
    }

    // Map campaign snake_case → camelCase
    const mappedCampaign = {
      id: campaign.id,
      companyName: campaign.company_name,
      targetRole: campaign.target_role,
      templateId: campaign.template_id,
      resumeId: campaign.resume_id,
      companyDomain: campaign.company_domain,
      status: campaign.status,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at,
    }

    // Map leads snake_case → camelCase
    const mappedLeads = (leads ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      campaignId: row.campaign_id,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      primaryEmail: row.primary_email,
      fallbackEmail: row.fallback_email,
      isVerified: row.is_verified,
      status: row.status,
      sentAt: row.sent_at ?? null,
      failureReason: row.failure_reason ?? null,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ campaign: mappedCampaign, leads: mappedLeads })
  } catch (err) {
    console.error('[GET /api/campaigns/[id]] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

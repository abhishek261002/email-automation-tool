import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { CampaignFormInputSchema, ParsedLeadSchema } from '@/lib/schemas'

// ─── Supabase admin client ────────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY')
  }
  return createClient(url, key)
}

// ─── Payload schema ───────────────────────────────────────────────────────────

const ConfirmPayloadSchema = z.object({
  campaignInput: CampaignFormInputSchema,
  confirmedLeads: z.array(ParsedLeadSchema).min(1, 'At least one lead must be selected'),
  companyDomain: z.string().min(1, 'Company domain is required'),
})

/**
 * POST /api/campaigns/confirm
 *
 * Persists the campaign and confirmed leads to the database atomically.
 * Campaign is created with status ACTIVE; all leads with status PENDING.
 *
 * Requirements: 1.4, 1.5, 3.5
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parseResult = ConfirmPayloadSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          fieldErrors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { campaignInput, confirmedLeads, companyDomain } = parseResult.data

    const supabase = getSupabaseAdmin()

    // ── Insert campaign ───────────────────────────────────────────────────────
    const { data: campaignRow, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        company_name: campaignInput.companyName,
        target_role: campaignInput.targetRole,
        template_id: campaignInput.templateId,
        resume_id: campaignInput.resumeId,
        company_domain: companyDomain,
        status: 'ACTIVE',
      })
      .select('*')
      .single()

    if (campaignError) {
      console.error('[POST /api/campaigns/confirm] Campaign insert error:', campaignError)
      return NextResponse.json(
        { error: 'Failed to create campaign', detail: campaignError.message },
        { status: 500 }
      )
    }

    // ── Insert leads ──────────────────────────────────────────────────────────
    const leadsToInsert = confirmedLeads.map((lead) => ({
      campaign_id: campaignRow.id,
      first_name: lead.firstName,
      last_name: lead.lastName,
      role: lead.role,
      primary_email: lead.primaryEmail,
      fallback_email: lead.fallbackEmail,
      is_verified: lead.isVerified,
      status: 'PENDING',
      sent_at: null,
      failure_reason: null,
    }))

    const { data: leadsRows, error: leadsError } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select('*')

    if (leadsError) {
      console.error('[POST /api/campaigns/confirm] Leads insert error:', leadsError)
      // Attempt to clean up the campaign record
      await supabase.from('campaigns').delete().eq('id', campaignRow.id)
      return NextResponse.json(
        { error: 'Failed to save leads', detail: leadsError.message },
        { status: 500 }
      )
    }

    // ── Return camelCase ──────────────────────────────────────────────────────
    const campaign = {
      id: campaignRow.id,
      companyName: campaignRow.company_name,
      targetRole: campaignRow.target_role,
      templateId: campaignRow.template_id,
      resumeId: campaignRow.resume_id,
      companyDomain: campaignRow.company_domain,
      status: campaignRow.status,
      createdAt: campaignRow.created_at,
      updatedAt: campaignRow.updated_at,
    }

    const leads = (leadsRows ?? []).map((row: Record<string, unknown>) => ({
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

    return NextResponse.json({ campaign, leads }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/campaigns/confirm] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { CampaignStatus } from '@/types'

// ─── Supabase client (service key, server-side only) ─────────────────────────

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
  }

  return createClient(url, key)
}

// ─── Validation schema ────────────────────────────────────────────────────────

const ControlActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'cancel']),
})

// ─── Transition rules ─────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, { from: CampaignStatus[]; to: CampaignStatus }> = {
  pause: { from: ['ACTIVE'], to: 'PAUSED' },
  resume: { from: ['PAUSED'], to: 'ACTIVE' },
  cancel: { from: ['ACTIVE', 'PAUSED'], to: 'CANCELLED' },
}

// ─── PATCH /api/campaigns/[id]/control — pause, resume, or cancel ─────────────

/**
 * Controls a campaign's lifecycle state.
 *
 * Valid transitions:
 *   pause:  ACTIVE → PAUSED
 *   resume: PAUSED → ACTIVE
 *   cancel: ACTIVE | PAUSED → CANCELLED
 *
 * Returns 400 with descriptive message if the current status makes the
 * requested transition invalid.
 * Returns 404 if the campaign is not found.
 * Returns 200 with the updated campaign record on success.
 *
 * Requirements: 10.3, 10.4, 10.5
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // ── Parse and validate body ───────────────────────────────────────────────
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body — expected JSON with an "action" field' },
        { status: 400 }
      )
    }

    const parseResult = ControlActionSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid action. Must be one of: pause, resume, cancel',
          detail: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { action } = parseResult.data
    const transition = VALID_TRANSITIONS[action]

    // ── Fetch current campaign status ─────────────────────────────────────────
    const supabase = getSupabaseAdmin()

    const { data: campaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, company_name, target_role, template_id, resume_id, company_domain, status, created_at, updated_at')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      console.error('[PATCH /api/campaigns/[id]/control] Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch campaign', detail: fetchError.message },
        { status: 500 }
      )
    }

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const currentStatus = campaign.status as CampaignStatus

    // ── Validate transition ───────────────────────────────────────────────────
    if (!transition.from.includes(currentStatus)) {
      const fromList = transition.from.join(' or ')
      return NextResponse.json(
        {
          error: `Cannot ${action} a campaign that is currently ${currentStatus}. The campaign must be ${fromList} to perform this action.`,
          currentStatus,
          requestedAction: action,
        },
        { status: 400 }
      )
    }

    // ── Apply the transition ──────────────────────────────────────────────────
    const { data: updated, error: updateError } = await supabase
      .from('campaigns')
      .update({ status: transition.to })
      .eq('id', id)
      .select('id, company_name, target_role, template_id, resume_id, company_domain, status, created_at, updated_at')
      .single()

    if (updateError) {
      console.error('[PATCH /api/campaigns/[id]/control] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update campaign status', detail: updateError.message },
        { status: 500 }
      )
    }

    // ── Return updated campaign (camelCase) ───────────────────────────────────
    const result = {
      id: updated.id,
      companyName: updated.company_name,
      targetRole: updated.target_role,
      templateId: updated.template_id,
      resumeId: updated.resume_id,
      companyDomain: updated.company_domain,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    }

    return NextResponse.json({ campaign: result })
  } catch (err) {
    console.error('[PATCH /api/campaigns/[id]/control] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

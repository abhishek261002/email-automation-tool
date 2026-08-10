import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, queryBouncedEmails } from '@/lib/gmail-client'
import { handleBounce } from '@/lib/bounce-handler'
import { interpolateTemplate } from '@/lib/template-engine'
import type { Campaign, Lead, EmailTemplate, Resume, DispatchResult } from '@/types'

// ─── Supabase client (service key, server-side only) ─────────────────────────

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
  }

  return createClient(url, key)
}

// ─── GET /api/cron/dispatch — main dispatch cycle ─────────────────────────────

/**
 * Cron dispatch endpoint — processes one email send cycle per invocation.
 *
 * Steps:
 *   1. Authenticate via CRON_SECRET bearer token
 *   2. Check for bounce notifications from the last 6 minutes and handle them
 *   3. Find the oldest ACTIVE campaign with PENDING leads
 *   4. Interpolate the email template for the oldest PENDING lead
 *   5. Fetch the resume PDF from CDN
 *   6. Send the email and update lead status to SENT
 *
 * At most one email is sent per invocation (enforced by query limit).
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2, 8.3, 8.4, 8.5, 9.5
 */
export async function GET(request: NextRequest): Promise<NextResponse<DispatchResult>> {
  // ── Step 1: Authenticate ─────────────────────────────────────────────────

  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[cron/dispatch] CRON_SECRET environment variable is not set')
    return NextResponse.json(
      { status: 'SKIPPED', error: 'Server configuration error: CRON_SECRET not set' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  const expectedHeader = `Bearer ${cronSecret}`

  if (!authHeader || authHeader !== expectedHeader) {
    return NextResponse.json(
      { status: 'SKIPPED', error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const supabase = getSupabaseAdmin()

  // ── Step 2: Bounce check ─────────────────────────────────────────────────

  try {
    // Check for bounces in the last 6 minutes
    const bounceSince = new Date(Date.now() - 6 * 60 * 1000)
    const bounces = await queryBouncedEmails(bounceSince)

    for (const bounce of bounces) {
      try {
        // Find the lead by primary email
        const { data: leadRow, error: leadErr } = await supabase
          .from('leads')
          .select('*')
          .eq('primary_email', bounce.recipientEmail)
          .eq('status', 'SENT')
          .single()

        if (leadErr || !leadRow) {
          // No matching SENT lead — nothing to handle
          continue
        }

        // Map DB row to Lead interface
        const lead: Lead = {
          id: leadRow.id,
          campaignId: leadRow.campaign_id,
          firstName: leadRow.first_name,
          lastName: leadRow.last_name,
          role: leadRow.role,
          primaryEmail: leadRow.primary_email,
          fallbackEmail: leadRow.fallback_email,
          isVerified: leadRow.is_verified,
          status: leadRow.status,
          sentAt: leadRow.sent_at ?? null,
          failureReason: leadRow.failure_reason ?? null,
          createdAt: leadRow.created_at,
        }

        // Fetch campaign, template, and resume for fallback send
        const { data: campaignRow } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', lead.campaignId)
          .single()

        if (!campaignRow) continue

        const { data: templateRow } = await supabase
          .from('email_templates')
          .select('*')
          .eq('id', campaignRow.template_id)
          .single()

        const { data: resumeRow } = await supabase
          .from('resumes')
          .select('*')
          .eq('id', campaignRow.resume_id)
          .single()

        if (!templateRow || !resumeRow) continue

        const campaign: Campaign = {
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

        const template: EmailTemplate = {
          id: templateRow.id,
          name: templateRow.name,
          subjectTemplate: templateRow.subject_template,
          bodyTemplate: templateRow.body_template,
          variables: templateRow.variables ?? [],
          createdAt: templateRow.created_at,
        }

        const resume: Resume = {
          id: resumeRow.id,
          label: resumeRow.label,
          fileName: resumeRow.file_name,
          cdnUrl: resumeRow.cdn_url,
          uploadedAt: resumeRow.uploaded_at,
        }

        await handleBounce(lead, sendEmail, supabase, template, resume, campaign)
      } catch (err) {
        console.error(`[cron/dispatch] Bounce handling error for ${bounce.recipientEmail}:`, err)
        // Continue processing other bounces
      }
    }
  } catch (err) {
    // Bounce check failure is non-fatal — log and continue to dispatch
    console.error('[cron/dispatch] Bounce query error:', err)
  }

  // ── Step 3: Find oldest ACTIVE campaign ──────────────────────────────────

  const { data: activeCampaign, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (campaignError || !activeCampaign) {
    return NextResponse.json({ status: 'NO_PENDING' })
  }

  // ── Find oldest PENDING lead for that campaign ────────────────────────────

  const { data: pendingLead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('campaign_id', activeCampaign.id)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (leadError || !pendingLead) {
    // No PENDING leads — mark campaign as COMPLETED
    const { error: completeError } = await supabase
      .from('campaigns')
      .update({ status: 'COMPLETED' })
      .eq('id', activeCampaign.id)

    if (completeError) {
      console.error('[cron/dispatch] Failed to mark campaign as COMPLETED:', completeError)
    }

    return NextResponse.json({ status: 'NO_PENDING' })
  }

  // ── Step 4: Fetch template and resume ────────────────────────────────────

  const { data: templateRow, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', activeCampaign.template_id)
    .single()

  if (templateError || !templateRow) {
    console.error('[cron/dispatch] Template not found for campaign:', activeCampaign.id)
    return NextResponse.json(
      { status: 'SKIPPED', error: 'Email template not found' },
      { status: 500 }
    )
  }

  const { data: resumeRow, error: resumeError } = await supabase
    .from('resumes')
    .select('*')
    .eq('id', activeCampaign.resume_id)
    .single()

  if (resumeError || !resumeRow) {
    console.error('[cron/dispatch] Resume not found for campaign:', activeCampaign.id)
    return NextResponse.json(
      { status: 'SKIPPED', error: 'Resume not found' },
      { status: 500 }
    )
  }

  // ── Interpolate template variables ────────────────────────────────────────

  let subject: string
  let body: string

  try {
    subject = interpolateTemplate(templateRow.subject_template, {
      role: activeCampaign.target_role,
      company_name: activeCampaign.company_name,
      firstName: pendingLead.first_name,
    })
    body = interpolateTemplate(templateRow.body_template, {
      role: activeCampaign.target_role,
      company_name: activeCampaign.company_name,
      firstName: pendingLead.first_name,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/dispatch] Template interpolation error:', message)
    return NextResponse.json({ status: 'SKIPPED', error: `Template error: ${message}` })
  }

  // ── Step 5: Fetch resume PDF from CDN ────────────────────────────────────

  let pdfBuffer: Buffer

  try {
    const pdfRes = await fetch(resumeRow.cdn_url)
    if (!pdfRes.ok) {
      console.error(`[cron/dispatch] CDN fetch failed with HTTP ${pdfRes.status} for URL: ${resumeRow.cdn_url}`)
      return NextResponse.json({ status: 'SKIPPED', error: 'CDN fetch failed' })
    }
    pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/dispatch] CDN fetch error:', message)
    return NextResponse.json({ status: 'SKIPPED', error: `CDN fetch failed: ${message}` })
  }

  // ── Step 6: Send email ───────────────────────────────────────────────────

  try {
    await sendEmail({
      to: pendingLead.primary_email,
      subject,
      body,
      attachments: [{ filename: resumeRow.file_name, content: pdfBuffer }],
    })

    // Update lead status to SENT
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })
      .eq('id', pendingLead.id)

    if (updateError) {
      console.error('[cron/dispatch] Failed to update lead status to SENT:', updateError)
    }

    const result: DispatchResult = {
      leadId: pendingLead.id,
      status: 'SENT',
      sentTo: pendingLead.primary_email,
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[cron/dispatch] Email send error:', message)
    // Leave lead as PENDING so next cron cycle retries
    return NextResponse.json({ status: 'SKIPPED', error: `Send failed: ${message}` })
  }
}

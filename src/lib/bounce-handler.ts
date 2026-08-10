/**
 * Bounce handler — manages fallback email attempts for bounced leads.
 *
 * Requirements: 9.2, 9.3, 9.4
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lead, LeadStatus, EmailTemplate, Resume, Campaign, Attachment } from '@/types'
import { interpolateTemplate } from '@/lib/template-engine'
import type { SendEmailOptions } from '@/lib/gmail-client'

// ─── handleBounce ─────────────────────────────────────────────────────────────

/**
 * Handles a detected bounce for a lead.
 *
 * Logic:
 *   - If lead.status is 'SENT' and the bounce matched lead.primaryEmail:
 *     1. Attempt to send to lead.fallbackEmail using the provided sendEmailFn
 *     2. On success: update lead to status='SENT', sentAt=now()
 *     3. On failure: update lead to status='FAILED_BOUNCED', failureReason=message
 *   - If the lead has already been retried (status is not 'SENT'): mark FAILED_BOUNCED
 *
 * Returns the final LeadStatus after the bounce handling is complete.
 *
 * Preconditions:
 *   - lead.status === 'SENT'
 *   - Bounce notification was matched to lead.primaryEmail
 *
 * Requirements: 9.2, 9.3, 9.4
 */
export async function handleBounce(
  lead: Lead,
  sendEmailFn: (options: SendEmailOptions) => Promise<void>,
  supabase: SupabaseClient,
  template: EmailTemplate,
  resume: Resume,
  campaign: Campaign
): Promise<LeadStatus> {
  // Guard: only handle bounces for SENT leads
  if (lead.status !== 'SENT') {
    console.warn(
      `[handleBounce] Lead ${lead.id} has status ${lead.status}, expected SENT — skipping`
    )
    return lead.status
  }

  // Build the interpolated subject and body for the fallback send
  let subject: string
  let body: string

  try {
    subject = interpolateTemplate(template.subjectTemplate, {
      role: campaign.targetRole,
      company_name: campaign.companyName,
      firstName: lead.firstName,
    })
    body = interpolateTemplate(template.bodyTemplate, {
      role: campaign.targetRole,
      company_name: campaign.companyName,
      firstName: lead.firstName,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[handleBounce] Template interpolation failed for lead ${lead.id}: ${message}`)
    await markLeadFailed(supabase, lead.id, `Template interpolation failed: ${message}`)
    return 'FAILED_BOUNCED'
  }

  // Fetch the resume PDF buffer for the fallback email attachment
  let pdfBuffer: Buffer
  try {
    const pdfRes = await fetch(resume.cdnUrl)
    if (!pdfRes.ok) {
      throw new Error(`CDN fetch returned HTTP ${pdfRes.status}`)
    }
    pdfBuffer = Buffer.from(await pdfRes.arrayBuffer())
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[handleBounce] Failed to fetch resume PDF for lead ${lead.id}: ${message}`)
    await markLeadFailed(supabase, lead.id, `Resume PDF unavailable during bounce retry: ${message}`)
    return 'FAILED_BOUNCED'
  }

  const attachments: Attachment[] = [
    { filename: resume.fileName, content: pdfBuffer },
  ]

  // Attempt sending to the fallback email
  try {
    await sendEmailFn({
      to: lead.fallbackEmail,
      subject,
      body,
      attachments,
    })

    // Fallback send succeeded — update lead status to SENT with new sentAt
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq('id', lead.id)

    if (updateError) {
      console.error(
        `[handleBounce] Failed to update lead ${lead.id} after fallback send:`,
        updateError
      )
    }

    return 'SENT'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[handleBounce] Fallback email send failed for lead ${lead.id} (${lead.fallbackEmail}): ${message}`
    )
    await markLeadFailed(supabase, lead.id, `Fallback send failed: ${message}`)
    return 'FAILED_BOUNCED'
  }
}

// ─── markLeadFailed ───────────────────────────────────────────────────────────

async function markLeadFailed(
  supabase: SupabaseClient,
  leadId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({
      status: 'FAILED_BOUNCED',
      failure_reason: reason,
    })
    .eq('id', leadId)

  if (error) {
    console.error(`[handleBounce] Failed to mark lead ${leadId} as FAILED_BOUNCED:`, error)
  }
}

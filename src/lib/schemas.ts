import { z } from 'zod'

// ─── Status Enums ────────────────────────────────────────────────────────────

export const CampaignStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'])

export const LeadStatusSchema = z.enum(['PENDING', 'SENT', 'FAILED_BOUNCED', 'SKIPPED'])

// ─── Campaign Form Input ──────────────────────────────────────────────────────

/**
 * Validates the campaign creation form payload.
 * All five fields must be non-empty strings.
 * Validates: Requirements 1.1, 1.2
 */
export const CampaignFormInputSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  targetRole: z.string().min(1, 'Target role is required'),
  rawApolloText: z.string().min(1, 'Apollo data is required'),
  templateId: z.string().min(1, 'Template is required'),
  resumeId: z.string().min(1, 'Resume is required'),
})

export type CampaignFormInput = z.infer<typeof CampaignFormInputSchema>

// ─── Parsed Lead (from Gemini) ────────────────────────────────────────────────

/**
 * Validates a single lead as returned by the Gemini parser.
 * The `selected` field is optional and defaults to true (all leads default-selected).
 * Validates: Requirements 2.2, 3.2, 12.4
 */
export const ParsedLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.string().min(1, 'Role is required'),
  primaryEmail: z.string().email('Primary email must be a valid email address'),
  fallbackEmail: z.string().email('Fallback email must be a valid email address'),
  isVerified: z.boolean(),
  selected: z.boolean().optional().default(true),
})

export type ParsedLead = z.infer<typeof ParsedLeadSchema>

// ─── Gemini Parse Response ────────────────────────────────────────────────────

/**
 * Validates the full JSON response from the Gemini API.
 * Validates: Requirements 2.2, 2.3, 12.4
 */
export const GeminiParseResponseSchema = z.object({
  companyDomain: z.string().min(1, 'Company domain is required'),
  filteredLeads: z.array(ParsedLeadSchema),
})

export type GeminiParseResponse = z.infer<typeof GeminiParseResponseSchema>

// ─── Lead (persisted record) ──────────────────────────────────────────────────

/**
 * Validates a full Lead record as stored in the database.
 * Validates: Requirements 2.2, 9.3, 12.4
 */
export const LeadSchema = z.object({
  id: z.string().min(1, 'Lead ID is required'),
  campaignId: z.string().min(1, 'Campaign ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.string().min(1, 'Role is required'),
  primaryEmail: z.string().email('Primary email must be a valid email address'),
  fallbackEmail: z.string().email('Fallback email must be a valid email address'),
  isVerified: z.boolean(),
  status: LeadStatusSchema,
  sentAt: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.string().min(1, 'Created-at timestamp is required'),
})

export type Lead = z.infer<typeof LeadSchema>

// ─── Resume ───────────────────────────────────────────────────────────────────

/**
 * Validates a Resume record. The CDN URL must be a valid HTTPS URL.
 * Validates: Requirements 4.3, 12.4
 */
export const ResumeSchema = z.object({
  id: z.string().min(1, 'Resume ID is required'),
  label: z.string().min(1, 'Resume label is required'),
  fileName: z.string().min(1, 'File name is required'),
  cdnUrl: z.string().url('CDN URL must be a valid URL').refine(
    (url) => url.startsWith('https://'),
    { message: 'CDN URL must use HTTPS' }
  ),
  uploadedAt: z.string().min(1, 'Uploaded-at timestamp is required'),
})

export type Resume = z.infer<typeof ResumeSchema>

// ─── Email Template ───────────────────────────────────────────────────────────

/**
 * Validates an EmailTemplate record.
 * Validates: Requirements 5.1, 5.2, 5.3, 12.4
 */
export const EmailTemplateSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
  name: z.string().min(1, 'Template name is required'),
  subjectTemplate: z.string().min(1, 'Subject template is required'),
  bodyTemplate: z.string().min(1, 'Body template is required'),
  variables: z.array(z.string()),
  createdAt: z.string().min(1, 'Created-at timestamp is required'),
})

export type EmailTemplate = z.infer<typeof EmailTemplateSchema>

// ─── Campaign ─────────────────────────────────────────────────────────────────

/**
 * Validates a full Campaign record as stored in the database.
 * Validates: Requirements 1.4, 1.5, 12.4
 */
export const CampaignSchema = z.object({
  id: z.string().min(1, 'Campaign ID is required'),
  companyName: z.string().min(1, 'Company name is required'),
  targetRole: z.string().min(1, 'Target role is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  resumeId: z.string().min(1, 'Resume ID is required'),
  companyDomain: z.string().min(1, 'Company domain is required'),
  status: CampaignStatusSchema,
  createdAt: z.string().min(1, 'Created-at timestamp is required'),
  updatedAt: z.string().min(1, 'Updated-at timestamp is required'),
})

export type Campaign = z.infer<typeof CampaignSchema>

// ─── Status Enums ────────────────────────────────────────────────────────────

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'

export type LeadStatus = 'PENDING' | 'SENT' | 'FAILED_BOUNCED' | 'SKIPPED'

// ─── Domain Models ───────────────────────────────────────────────────────────

export interface Campaign {
  id: string
  companyName: string
  targetRole: string
  templateId: string
  resumeId: string
  companyDomain: string
  status: CampaignStatus
  createdAt: string
  updatedAt: string
}

export interface Lead {
  id: string
  campaignId: string
  firstName: string
  lastName: string
  role: string
  primaryEmail: string
  fallbackEmail: string
  isVerified: boolean
  status: LeadStatus
  sentAt: string | null
  failureReason: string | null
  createdAt: string
}

export interface Resume {
  id: string
  label: string
  fileName: string
  cdnUrl: string
  uploadedAt: string
}

export interface EmailTemplate {
  id: string
  name: string
  subjectTemplate: string
  bodyTemplate: string
  variables: string[]
  createdAt: string
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

export interface ParsedLead {
  firstName: string
  lastName: string
  role: string
  primaryEmail: string
  fallbackEmail: string
  isVerified: boolean
  selected: boolean
}

export interface GeminiParseRequest {
  companyName: string
  targetRole: string
  rawApolloText: string
}

export interface GeminiParseResponse {
  companyDomain: string
  filteredLeads: ParsedLead[]
}

// ─── Campaign Form ────────────────────────────────────────────────────────────

export interface CampaignFormInput {
  companyName: string
  targetRole: string
  rawApolloText: string
  templateId: string
  resumeId: string
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

export interface DispatchResult {
  leadId?: string
  status: 'SENT' | 'FAILED_BOUNCED' | 'SKIPPED' | 'NO_PENDING'
  sentTo?: string
  error?: string
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export interface BounceNotification {
  recipientEmail: string
  receivedAt: string
}

export interface Attachment {
  filename: string
  content: ArrayBuffer | Buffer
}

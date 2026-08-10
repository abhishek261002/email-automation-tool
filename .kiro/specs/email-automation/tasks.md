# Implementation Plan: Cold Email & Referral Outreach Automation Platform

## Overview

Implement the platform incrementally in TypeScript using Next.js 14 (App Router), Supabase, Gemini 1.5 Flash, Gmail API, and Tailwind CSS. Each task builds on the previous, ending with all components wired into a functioning end-to-end system. Testing sub-tasks use fast-check for property-based tests and Jest for unit tests.

## Tasks

- [x] 1. Project Setup and Database Schema
  - Initialize Next.js 14 project with TypeScript, Tailwind CSS, and App Router
  - Install dependencies: `@supabase/supabase-js`, `@google/generative-ai`, `nodemailer`, `googleapis`, `zod`, `fast-check`
  - Create Supabase project and define database tables: `campaigns`, `leads`, `resumes`, `email_templates` with the schemas defined in the design
  - Add indexes on `leads(campaign_id, status, created_at)` for cron dispatch query performance
  - Enable Row Level Security on all tables with per-user policies
  - Store environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `CRON_SECRET`
  - Create a Supabase Storage bucket named `resumes` with public read access
  - Seed the `email_templates` table with the built-in "Standard Referral" template
  - _Requirements: 1.4, 5.5, 7.2, 11.1, 11.2_

- [x] 2. Core TypeScript Types and Zod Schemas
  - [x] 2.1 Define shared TypeScript interfaces and enums
    - Create `src/types/index.ts` with `Campaign`, `Lead`, `Resume`, `EmailTemplate`, `CampaignStatus`, `LeadStatus`, `ParsedLead`, `GeminiParseResponse`, `CampaignFormInput`, `DispatchResult` types as defined in the design
    - _Requirements: 1.1, 2.2, 7.4_
  - [x] 2.2 Implement Zod validation schemas
    - Create `src/lib/schemas.ts` with Zod schemas for `CampaignFormInput`, `GeminiParseResponse`, `Lead`, `Resume`, `EmailTemplate`
    - Ensure Zod schemas enforce non-empty strings, valid email formats, valid enum values
    - _Requirements: 1.1, 2.2, 12.4_
  - [ ]* 2.3 Write property test for Zod schema validation
    - **Property 4: Gemini Response Schema Validation** — for any generated string, valid schema strings pass, invalid strings throw
    - **Validates: Requirements 2.2, 2.3**

- [ ] 3. Template Engine
  - [-] 3.1 Implement `interpolateTemplate` function
    - Create `src/lib/template-engine.ts` with `interpolateTemplate(template: string, variables: Record<string, string>): string`
    - Extract all `{variableName}` tokens, validate all are present in the variables map, replace each token exactly once, verify no tokens remain in output, throw `InterpolationError` on missing variable
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]* 3.2 Write property tests for template engine
    - **Property 10: Template Interpolation Completeness** — for any template with variables all present in map, output has no `{...}` tokens remaining
    - **Property 11: Interpolation Error on Missing Variable** — for any template with a token absent from variables map, `InterpolationError` is thrown
    - **Property 12: Interpolation Idempotence** — calling with same args twice returns same string
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  - [-] 3.3 Implement template variable completeness validation
    - Add `validateTemplateDeclarations(template: EmailTemplate): void` that checks every key in `variables` array appears in `subjectTemplate` or `bodyTemplate`, and every `{token}` in the text is declared in `variables`
    - Throw `TemplateDeclarationError` on violation
    - _Requirements: 5.3, 5.4_
  - [ ]* 3.4 Write property test for template variable completeness
    - **Property 9: Template Variable Completeness** — for any template, declared variables appear in text and all text tokens are declared
    - **Validates: Requirements 5.3, 5.4**

- [ ] 4. Email Address Construction Utilities
  - [-] 4.1 Implement email pattern construction functions
    - Create `src/lib/email-utils.ts` with `buildPrimaryEmail(firstName: string, domain: string): string` returning `firstName.toLowerCase()@domain` and `buildFallbackEmail(firstName: string, lastName: string, domain: string): string` returning `firstName.toLowerCase().lastName.toLowerCase()@domain`
    - _Requirements: 2.5, 12.3_
  - [ ]* 4.2 Write property test for email address pattern consistency
    - **Property 5: Email Address Pattern Consistency** — for any first name, last name, and domain, primaryEmail and fallbackEmail follow exact defined patterns
    - **Validates: Requirements 2.5, 12.3**

- [~] 5. Checkpoint — Core utilities verified
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Gemini Parser Service
  - [~] 6.1 Implement `parseApolloData` function
    - Create `src/lib/gemini-parser.ts` with `parseApolloData(req: GeminiParseRequest): Promise<GeminiParseResponse>`
    - Build the structured LLM prompt with company, role, and Apollo text passed as data (not instruction) to prevent prompt injection
    - Call Gemini 1.5 Flash API, parse response as JSON, validate with Zod `GeminiParseResponse` schema
    - Throw `ParseError` if response is not valid JSON or fails schema validation
    - For each filtered lead, apply `buildPrimaryEmail` and `buildFallbackEmail` from Task 4
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 11.4_
  - [ ]* 6.2 Write property test for Gemini response round-trip
    - **Property 23: GeminiParseResponse Serialization Round-Trip** — for any valid `GeminiParseResponse` object, `JSON.parse(JSON.stringify(obj))` deep-equals the original
    - **Validates: Requirements 12.1, 12.2**
  - [ ]* 6.3 Write unit tests for Gemini parser with mocked API responses
    - Test valid JSON response → correct `GeminiParseResponse` object
    - Test malformed JSON → `ParseError` thrown, no DB writes
    - Test schema-invalid JSON → `ParseError` thrown
    - _Requirements: 2.2, 2.3_

- [ ] 7. Resume Library API and UI
  - [-] 7.1 Implement `/api/resumes` POST endpoint
    - Create `src/app/api/resumes/route.ts`
    - Validate uploaded file MIME type is `application/pdf` server-side (check `content-type` header and file magic bytes)
    - Upload file to Supabase Storage `resumes` bucket, retrieve CDN URL
    - Insert record into `resumes` table with label, fileName, cdnUrl
    - Return created resume record
    - _Requirements: 4.1, 4.2, 4.3, 11.3_
  - [ ]* 7.2 Write property test for PDF MIME type enforcement
    - **Property 8: PDF Upload MIME Type Enforcement** — for any file with MIME type `application/pdf`, upload is accepted; for any other MIME type, upload is rejected
    - **Validates: Requirements 4.1, 4.2**
  - [~] 7.3 Implement Resume Library UI page
    - Create `src/app/resume-library/page.tsx`
    - File upload input (PDF only), label text field, upload button
    - List all uploaded resumes with label, filename, and upload date
    - _Requirements: 4.4_
  - [ ]* 7.4 Write property test for Resume Library display completeness
    - **Property (derived from 4.4)**: For any array of resume records returned by the API, all records SHALL appear in the rendered list
    - **Validates: Requirements 4.4**

- [ ] 8. Campaign Creation API and Form UI
  - [~] 8.1 Implement `/api/campaigns/parse` POST endpoint
    - Create `src/app/api/campaigns/parse/route.ts`
    - Validate all required fields using Zod `CampaignFormInput` schema; return 400 with field errors if invalid
    - Call `parseApolloData` and return the filtered leads preview to the client
    - This endpoint is stateless (does not write to DB)
    - _Requirements: 1.1, 1.2, 1.3, 2.1_
  - [~] 8.2 Implement `/api/campaigns/confirm` POST endpoint
    - Create `src/app/api/campaigns/confirm/route.ts`
    - Accept `{ campaignFormInput, confirmedLeads[] }`, validate with Zod
    - Insert campaign record with `status: ACTIVE` and all confirmed leads with `status: PENDING` in a single database transaction
    - Return created campaign record
    - _Requirements: 1.4, 1.5, 3.5_
  - [ ]* 8.3 Write property test for campaign persistence invariant
    - **Property 2: Confirmed Leads Are Persisted as PENDING** — for any confirmed batch, every lead has `status: PENDING` and campaign has `status: ACTIVE` post-confirmation
    - **Property 3: Campaign Has Exactly One Resume and Template** — for any campaign, `resumeId` and `templateId` are non-null and reference existing records
    - **Validates: Requirements 1.4, 1.5**
  - [~] 8.4 Implement Campaign Creation Form page
    - Create `src/app/campaigns/new/page.tsx`
    - Inputs: company name, target role, Apollo text textarea, template selector (dropdown), resume selector (dropdown from library)
    - On submit: POST to `/api/campaigns/parse`, handle loading state and errors
    - On success: navigate to lead review screen
    - _Requirements: 1.1, 1.2_
  - [ ]* 8.5 Write property test for form validation
    - **Property 1: Campaign Creation Requires All Fields** — for any form submission with at least one empty required field, submission is rejected
    - **Validates: Requirements 1.1, 1.2**

- [ ] 9. Lead Review Screen
  - [~] 9.1 Implement Lead Review UI page
    - Create `src/app/campaigns/review/page.tsx`
    - Display all parsed leads in a table: firstName, lastName, role, primaryEmail, isVerified badge, selection checkbox
    - All leads initialized to `selected: true`
    - Select All / Deselect All controls
    - Confirm button: disabled and shows warning when zero leads selected
    - On confirm: POST to `/api/campaigns/confirm` with only selected leads
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 9.2 Write property tests for lead review selection behavior
    - **Property 6: Lead Review Defaults All Leads to Selected** — any parsed lead list initializes with all `selected: true`
    - **Property 7: Only Selected Leads Are Confirmed** — confirmation payload contains exactly the leads with `selected === true`; empty selection blocks confirmation
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [~] 10. Checkpoint — Campaign creation pipeline verified end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Campaign Dashboard and Controls API
  - [~] 11.1 Implement `/api/campaigns/[id]/control` PATCH endpoint
    - Create `src/app/api/campaigns/[id]/control/route.ts`
    - Accept `{ action: 'pause' | 'resume' | 'cancel' }`, validate with Zod
    - Transition logic: ACTIVE → PAUSED (pause), PAUSED → ACTIVE (resume), ACTIVE | PAUSED → CANCELLED (cancel)
    - Reject invalid transitions (e.g., resuming a COMPLETED campaign) with 400
    - _Requirements: 10.3, 10.4, 10.5_
  - [ ]* 11.2 Write property tests for campaign state machine
    - **Property 21: Campaign Pause/Resume Round-Trip** — for any ACTIVE campaign, pause then resume returns to ACTIVE with all PENDING leads unchanged
    - **Property 17: Paused Campaign Skips All Sends** — no leads are transitioned while campaign is PAUSED
    - **Property 22: Terminal Campaign State Is Read-Only** — COMPLETED/CANCELLED campaigns reject control actions
    - **Validates: Requirements 10.3, 10.4, 10.5, 10.6, 7.8**
  - [~] 11.3 Implement Campaign Dashboard page
    - Create `src/app/campaigns/[id]/page.tsx`
    - Display campaign header: company, role, status badge, created date, progress bar (sent/total)
    - Display leads table: firstName, lastName, role, primaryEmail, status badge, sentAt
    - Show Pause/Resume/Cancel buttons based on current campaign status (hidden for COMPLETED/CANCELLED)
    - Poll campaign data every 10 seconds for near-real-time updates
    - _Requirements: 10.1, 10.2, 10.6_
  - [~] 11.4 Implement Campaign List page
    - Create `src/app/campaigns/page.tsx`
    - List all campaigns with status, company, role, lead counts (total/sent/bounced)
    - Link to individual campaign dashboard
    - _Requirements: 10.1_

- [ ] 12. Gmail Service Integration
  - [~] 12.1 Implement Gmail API client setup
    - Create `src/lib/gmail-client.ts` with OAuth2 client initialization using `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` from environment variables
    - Export `sendEmail(options: { to: string, subject: string, body: string, attachments: Attachment[] }): Promise<void>` using Nodemailer with Gmail transport
    - _Requirements: 8.4, 11.1_
  - [~] 12.2 Implement bounce detection query
    - Add `queryBouncedEmails(since: Date): Promise<BounceNotification[]>` to `src/lib/gmail-client.ts`
    - Query Gmail inbox for messages from `mailer-daemon` received after the given timestamp
    - Extract recipient email from bounce message body
    - Return list of `{ recipientEmail: string, receivedAt: string }`
    - _Requirements: 9.1_
  - [ ]* 12.3 Write unit tests for Gmail client with mocked transport
    - Test `sendEmail` with valid args → mock transport called with correct params
    - Test `queryBouncedEmails` with mocked Gmail response → correct bounce list returned
    - _Requirements: 8.1, 9.1_

- [ ] 13. Cron Dispatch Service
  - [~] 13.1 Implement `/api/cron/dispatch` GET endpoint
    - Create `src/app/api/cron/dispatch/route.ts`
    - Validate `Authorization: Bearer {CRON_SECRET}` header; return HTTP 401 if missing or incorrect
    - Step 1 — Bounce check: call `queryBouncedEmails(since: lastRun)`, match to leads by email, call `handleBounce` for each match
    - Step 2 — Select lead: query oldest PENDING lead from oldest ACTIVE campaign; return `NO_PENDING` if none
    - Step 3 — If campaign has no PENDING leads, mark it COMPLETED
    - Step 4 — Fetch template and resume for the campaign; call `interpolateTemplate` for subject and body
    - Step 5 — Fetch resume PDF buffer from CDN URL; abort with lead left PENDING if CDN returns non-200
    - Step 6 — Call `sendEmail`; update lead to `status: SENT, sentAt: now()` on success
    - Return `DispatchResult`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.1, 8.2, 8.3, 9.5_
  - [~] 13.2 Implement `handleBounce` function
    - Create `src/lib/bounce-handler.ts` with `handleBounce(lead: Lead): Promise<LeadStatus>`
    - If lead `primaryEmail` bounced and fallback not yet tried: send to `fallbackEmail`, update status to SENT on success
    - If fallback also bounced or lead already tried fallback: update status to `FAILED_BOUNCED` with `failureReason`
    - _Requirements: 9.2, 9.3, 9.4_
  - [ ]* 13.3 Write property tests for cron dispatch invariants
    - **Property 13: Cron Authentication Enforcement** — for any request with wrong/missing CRON_SECRET, HTTP 401 returned and no DB writes occur
    - **Property 14: At Most One Email Per Cron Invocation** — for any cron execution with any number of PENDING leads, at most 1 email is sent
    - **Property 15: Oldest PENDING Lead Selected First** — for any set of PENDING leads, the one with smallest `createdAt` is selected
    - **Property 16: Campaign Completes When All Leads Processed** — for any campaign where all leads are non-PENDING, campaign transitions to COMPLETED
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.7**
  - [ ]* 13.4 Write property tests for bounce handling
    - **Property 20: Bounce Triggers Fallback Resend** — for any lead whose primaryEmail bounces, fallback is attempted; final status is SENT (on success) or FAILED_BOUNCED (on double-bounce)
    - **Property 19: CDN Failure Preserves Lead as PENDING** — for any failed CDN fetch, lead remains PENDING
    - **Property 18: Successful Send Updates Lead Status and Timestamp** — for any successfully sent lead, status === SENT and sentAt is non-null
    - **Validates: Requirements 8.2, 8.3, 9.2, 9.3**

- [~] 14. Checkpoint — Email dispatch pipeline verified end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Wire All Components Together
  - [~] 15.1 Connect campaign creation flow end-to-end
    - Ensure `CampaignCreationForm` → `/api/campaigns/parse` → `LeadReviewScreen` → `/api/campaigns/confirm` → `CampaignDashboard` navigation chain works without errors
    - Verify resume and template dropdowns populate from Supabase at page load
    - _Requirements: 1.1, 1.3, 1.4, 3.1_
  - [~] 15.2 Connect dashboard controls to campaign state machine
    - Wire Pause, Resume, Cancel buttons to `/api/campaigns/[id]/control`
    - Update UI optimistically on control action and re-fetch campaign state
    - Hide controls for COMPLETED and CANCELLED campaigns
    - _Requirements: 10.3, 10.4, 10.5, 10.6_
  - [~] 15.3 Register cron endpoint with Cron-Job.org
    - Document the Cron-Job.org configuration: URL = `/api/cron/dispatch`, method = GET, interval = every 5 minutes, custom header `Authorization: Bearer {CRON_SECRET}`
    - Add `CRON_SECRET` to Vercel environment variables
    - _Requirements: 7.1, 7.2_
  - [ ]* 15.4 Write integration tests for full campaign lifecycle
    - Test: create campaign → parse → confirm → 3 cron cycles → all leads SENT → campaign COMPLETED
    - Test: pause mid-queue → resume → remaining leads sent
    - Test: bounce on primaryEmail → fallback attempted → FAILED_BOUNCED on double-bounce
    - Use mocked Gmail and Gemini clients; use test Supabase instance
    - _Requirements: 1.4, 7.4, 7.7, 9.2, 9.3, 10.3, 10.4_

- [~] 16. Final Checkpoint — Full system verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- TypeScript is used throughout; all code is type-safe with no `any` types
- Property tests use `fast-check` with a minimum of 100 iterations per property
- Unit and integration tests use Jest (built into Next.js)
- All credentials are server-side only and stored in Vercel environment variables
- The cron endpoint enforces a hard limit of 1 email per invocation (12/hour max)

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "4", "7"] },
    { "wave": 4, "tasks": ["5", "6"] },
    { "wave": 5, "tasks": ["8", "9"] },
    { "wave": 6, "tasks": ["10", "11"] },
    { "wave": 7, "tasks": ["12", "13"] },
    { "wave": 8, "tasks": ["14", "15", "16"] }
  ]
}
```

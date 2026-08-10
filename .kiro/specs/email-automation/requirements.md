# Requirements Document

## Introduction

This document defines the functional and non-functional requirements for the Cold Email & Referral Outreach Automation Platform — a full-stack system that automates personalized cold email campaigns for job referral outreach. The platform ingests raw Apollo.io employee data, uses an AI engine to filter and extract leads, presents them for user review, and dispatches emails at a safe rate via Gmail through a persistent serverless cron queue.

## Glossary

- **Campaign**: A targeted outreach effort directed at employees of a single company for a specific job role.
- **Lead**: An individual employee record extracted from Apollo.io data and associated with a campaign.
- **CampaignStatus**: Enumeration of campaign lifecycle states: `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`.
- **LeadStatus**: Enumeration of lead lifecycle states: `PENDING`, `SENT`, `FAILED_BOUNCED`, `SKIPPED`.
- **System**: The Cold Email & Referral Outreach Automation Platform.
- **Cron_Service**: The serverless function at `/api/cron/dispatch` triggered every 5 minutes by Cron-Job.org.
- **Gemini_Service**: The server-side integration with the Google Gemini 1.5 Flash API for AI-driven parsing.
- **Gmail_Service**: The server-side integration with the Gmail API / Nodemailer for email dispatch and bounce detection.
- **Parser**: The component responsible for sending prompts to Gemini and validating the JSON response.
- **Template_Engine**: The component responsible for interpolating `{variable}` placeholders in email templates.
- **Resume_Library**: The UI section and storage backend for managing PDF resume uploads.
- **Apollo Data**: Unstructured text copied from Apollo.io containing employee names, titles, and email information.
- **PrimaryEmail**: Email address constructed as `firstname@companydomain`.
- **FallbackEmail**: Email address constructed as `firstname.lastname@companydomain`.
- **CRON_SECRET**: Shared secret used to authenticate incoming cron trigger requests.
- **Bounce**: An email delivery failure notification sent by a mail server (mailer-daemon).
- **CDN URL**: A public HTTPS URL served by Supabase Object Storage for a stored resume PDF.

---

## Requirements

### Requirement 1: Campaign Creation

**User Story:** As a job seeker, I want to create an outreach campaign by providing company details, a target role, and Apollo.io employee data, so that I can generate a personalized email queue targeting relevant employees.

#### Acceptance Criteria

1. WHEN a user submits the campaign creation form, THE System SHALL validate that `companyName`, `targetRole`, `rawApolloText`, `templateId`, and `resumeId` are all non-empty before processing.
2. IF any required campaign creation field is empty or missing, THEN THE System SHALL display a field-level validation error and prevent form submission.
3. WHEN all campaign creation fields are valid, THE System SHALL send the form data to the Gemini_Service for parsing.
4. WHEN a campaign is successfully confirmed by the user, THE System SHALL persist a campaign record with `status: ACTIVE` and all confirmed leads with `status: PENDING` to the database atomically.
5. THE System SHALL associate each campaign with exactly one resume and one email template at creation time.

### Requirement 2: AI-Powered Apollo Data Parsing

**User Story:** As a job seeker, I want the system to automatically extract and filter relevant employee contacts from raw Apollo.io text, so that I only reach out to people who can actually help with a referral.

#### Acceptance Criteria

1. WHEN the Gemini_Service receives a parse request, THE Parser SHALL send a structured prompt containing `companyName`, `targetRole`, and `rawApolloText` to the Gemini 1.5 Flash API.
2. WHEN the Gemini API returns a response, THE Parser SHALL validate that the response is strictly valid JSON matching the `GeminiParseResponse` schema (containing `companyDomain` and `filteredLeads` array).
3. IF the Gemini API returns malformed or non-JSON content, THEN THE Parser SHALL throw a `ParseError` and return an error response to the UI without writing any data to the database.
4. WHEN parsing Apollo data, THE Gemini_Service SHALL exclude employees in non-technical, non-hiring roles (such as sales, finance, and operations) and retain only software engineers, product managers, engineering managers, and HR/recruiting staff.
5. WHEN constructing lead emails, THE Parser SHALL set `primaryEmail` to `{firstName}@{companyDomain}` and `fallbackEmail` to `{firstName}.{lastName}@{companyDomain}` for each filtered lead.
6. WHEN an employee's email address is explicitly present in the Apollo source text, THE Parser SHALL set `isVerified: true` for that lead.
7. THE Gemini_Service SHALL return all parsed lead data exclusively from server-side API routes, never exposing the Gemini API key to the client bundle.

### Requirement 3: Lead Review and Confirmation

**User Story:** As a job seeker, I want to review and selectively approve AI-parsed leads before they enter the email queue, so that I have full control over who receives an outreach email.

#### Acceptance Criteria

1. WHEN the Parser returns parsed leads, THE System SHALL display all leads in an interactive review table showing `firstName`, `lastName`, `role`, `primaryEmail`, `isVerified` status, and a selection toggle.
2. THE System SHALL default all parsed leads to selected (`selected: true`) in the review UI.
3. WHEN a user deselects a lead in the review UI, THE System SHALL exclude that lead from the confirmed batch.
4. IF a user attempts to confirm a batch with zero leads selected, THEN THE System SHALL prevent confirmation and display a warning message.
5. WHEN a user confirms the selected leads, THE System SHALL submit only the selected leads to the campaign confirmation endpoint.

### Requirement 4: Resume Library Management

**User Story:** As a job seeker, I want to upload, label, and manage multiple PDF resumes, so that I can attach the right resume to each outreach campaign.

#### Acceptance Criteria

1. WHEN a user uploads a file to the Resume Library, THE System SHALL validate that the file is in PDF format (`application/pdf` MIME type) before accepting the upload.
2. IF a non-PDF file is uploaded, THEN THE System SHALL reject the upload and display a format validation error.
3. WHEN a valid PDF is uploaded, THE System SHALL store the file in Supabase Object Storage and persist the resulting CDN URL, user-assigned label, and original filename to the `resumes` table.
4. THE Resume_Library SHALL display all uploaded resumes with their labels for selection during campaign creation.
5. WHEN a resume is selected for a campaign, THE System SHALL store the resume's `id` in the campaign record so the CDN URL can be resolved at send time.

### Requirement 5: Email Template Management

**User Story:** As a job seeker, I want to define and select reusable email templates with dynamic variable placeholders, so that each outreach email is personalized and consistent.

#### Acceptance Criteria

1. THE System SHALL support email templates with `{variableName}` placeholder syntax in both subject and body fields.
2. THE System SHALL store a `variables` array on each template listing all required placeholder keys.
3. WHEN a template is created or updated, THE System SHALL validate that every key listed in `variables` appears at least once in `subjectTemplate` or `bodyTemplate`.
4. IF a template contains a `{variableName}` token that is not listed in `variables`, THEN THE System SHALL flag it as an undeclared variable during template validation.
5. THE System SHALL provide at least one built-in template named "Standard Referral" with subject `Quick Referral Inquiry - {role} at {company_name}`.

### Requirement 6: Template Interpolation

**User Story:** As a job seeker, I want every outgoing email to have all template variables replaced with real values before sending, so that recipients receive a complete, professional message.

#### Acceptance Criteria

1. WHEN the Template_Engine interpolates a template, THE Template_Engine SHALL replace every `{variableName}` token in the subject and body with the corresponding value from the campaign and lead record.
2. IF any `{variableName}` token in the template does not have a corresponding value at send time, THEN THE Template_Engine SHALL throw an `InterpolationError` and the Cron_Service SHALL leave the lead in `PENDING` status without sending the email.
3. WHEN interpolation completes successfully, THE Template_Engine SHALL produce an output string containing no remaining `{...}` tokens.
4. THE Template_Engine SHALL perform interpolation as a pure function with no side effects on the template or lead records.

### Requirement 7: Cron-Based Email Dispatch Queue

**User Story:** As a job seeker, I want emails to be sent automatically in the background at a safe rate, so that my Gmail account is not flagged as a spam sender.

#### Acceptance Criteria

1. THE Cron_Service SHALL be triggered by Cron-Job.org via HTTP request every 5 minutes.
2. WHEN triggered, THE Cron_Service SHALL authenticate the request by validating a `CRON_SECRET` bearer token in the `Authorization` header.
3. IF the `CRON_SECRET` header is missing or invalid, THEN THE Cron_Service SHALL return HTTP 401 and take no action.
4. WHEN triggered and authenticated, THE Cron_Service SHALL process at most one email send per invocation, enforcing a maximum rate of 12 emails per hour.
5. WHEN selecting the next lead to send, THE Cron_Service SHALL fetch the oldest `PENDING` lead (by `createdAt ASC`) from the oldest `ACTIVE` campaign.
6. IF no `ACTIVE` campaign exists or all leads in the `ACTIVE` campaign are non-`PENDING`, THEN THE Cron_Service SHALL mark the campaign `COMPLETED` (if all leads are processed) and return without sending.
7. WHEN all PENDING leads in an ACTIVE campaign are exhausted, THE Cron_Service SHALL update that campaign's status to `COMPLETED`.
8. WHILE a campaign status is `PAUSED`, THE Cron_Service SHALL skip all leads belonging to that campaign.

### Requirement 8: Email Sending with Resume Attachment

**User Story:** As a job seeker, I want each outreach email to include my resume as a PDF attachment, so that the recipient immediately has my background available.

#### Acceptance Criteria

1. WHEN the Cron_Service sends an email, THE Gmail_Service SHALL attach the resume PDF by fetching it from the campaign's associated CDN URL at send time.
2. WHEN an email is successfully sent, THE System SHALL update the lead's `status` to `SENT` and record `sentAt` with the current UTC timestamp.
3. IF the resume CDN URL returns a non-200 HTTP response, THEN THE Cron_Service SHALL abort the send, leave the lead as `PENDING`, and log the error without crashing the cron cycle.
4. THE Gmail_Service SHALL use Gmail API with OAuth2 or an App Password credential stored in server-side environment variables only.
5. THE System SHALL send each email to the lead's `primaryEmail` address on the first attempt.

### Requirement 9: Bounce Detection and Fallback Handling

**User Story:** As a job seeker, I want the system to detect bounced emails and automatically retry with a fallback address, so that failed deliveries are handled gracefully without manual intervention.

#### Acceptance Criteria

1. WHEN the Cron_Service runs, THE Gmail_Service SHALL query the Gmail inbox for mailer-daemon bounce notifications received since the last cron execution.
2. WHEN a bounce notification is matched to a lead's `primaryEmail`, THE System SHALL attempt to resend the email to that lead's `fallbackEmail`.
3. IF the `fallbackEmail` send also results in a bounce, THEN THE System SHALL update the lead's `status` to `FAILED_BOUNCED` and record a descriptive `failureReason`.
4. IF a bounce notification cannot be matched to any known lead email, THEN THE System SHALL log the unmatched bounce and continue the cron cycle.
5. THE System SHALL process bounce checks before selecting the next PENDING lead in each cron cycle.

### Requirement 10: Campaign Dashboard and Execution Controls

**User Story:** As a job seeker, I want a real-time dashboard showing campaign progress with controls to pause, resume, or cancel, so that I have full visibility and control over my active outreach.

#### Acceptance Criteria

1. THE System SHALL display a campaign dashboard showing each campaign's `status`, total lead count, count of leads per `LeadStatus`, and `createdAt` timestamp.
2. WHEN a user views a campaign, THE System SHALL display each lead's `firstName`, `lastName`, `role`, `primaryEmail`, `status`, and `sentAt` (if applicable).
3. WHEN a user clicks Pause on an `ACTIVE` campaign, THE System SHALL update the campaign `status` to `PAUSED` immediately.
4. WHEN a user clicks Resume on a `PAUSED` campaign, THE System SHALL update the campaign `status` to `ACTIVE` immediately.
5. WHEN a user clicks Cancel on an `ACTIVE` or `PAUSED` campaign, THE System SHALL update the campaign `status` to `CANCELLED` and the Cron_Service SHALL not process any further leads for that campaign.
6. IF a campaign status is `COMPLETED` or `CANCELLED`, THEN THE System SHALL display the campaign in a read-only archived state with no control buttons.

### Requirement 11: Security and Access Control

**User Story:** As a platform operator, I want all sensitive credentials and API keys isolated server-side, and data access restricted per user, so that the system is secure against credential leakage and unauthorized data access.

#### Acceptance Criteria

1. THE System SHALL store all credentials (Gmail OAuth2 tokens, Gemini API key, Supabase service key, CRON_SECRET) exclusively in server-side environment variables and never include them in client-side bundles.
2. THE System SHALL enforce Supabase Row Level Security (RLS) policies such that a user can only read and write campaigns and leads belonging to their own account.
3. WHEN a file is uploaded to the Resume Library, THE System SHALL validate the MIME type server-side and reject any file that is not `application/pdf`.
4. THE System SHALL structure LLM prompts so that `rawApolloText` is passed as data input, with the instruction section isolated to prevent prompt injection from user-supplied text.

### Requirement 12: Parser Round-Trip and Data Integrity

**User Story:** As a developer, I want the parser and serializer components to maintain data integrity through transformation, so that no lead information is corrupted or lost during the parsing pipeline.

#### Acceptance Criteria

1. WHEN the Parser receives a valid `GeminiParseResponse` JSON string, THE Parser SHALL deserialize it into a `GeminiParseResponse` object without data loss.
2. WHEN a `GeminiParseResponse` object is re-serialized to JSON, THE System SHALL produce a JSON string that, when parsed again, yields an equivalent `GeminiParseResponse` object (round-trip property).
3. FOR ALL valid lead records, the `primaryEmail` SHALL equal `{lead.firstName.toLowerCase()}@{companyDomain}` and the `fallbackEmail` SHALL equal `{lead.firstName.toLowerCase()}.{lead.lastName.toLowerCase()}@{companyDomain}`.
4. THE System SHALL validate all deserialized data against the defined schema using runtime validation (Zod) before persisting to the database.

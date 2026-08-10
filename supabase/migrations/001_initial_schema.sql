-- ============================================================
-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for the Cold Email &
--              Referral Outreach Automation Platform
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Table: email_templates
-- (created before campaigns because campaigns FK references it)
-- ============================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    body_template   TEXT NOT NULL,
    variables       TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: resumes
-- (created before campaigns because campaigns FK references it)
-- ============================================================
CREATE TABLE IF NOT EXISTS resumes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label       TEXT NOT NULL,
    file_name   TEXT NOT NULL,
    cdn_url     TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: campaigns
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name   TEXT NOT NULL,
    target_role    TEXT NOT NULL,
    template_id    UUID NOT NULL REFERENCES email_templates(id) ON DELETE RESTRICT,
    resume_id      UUID NOT NULL REFERENCES resumes(id) ON DELETE RESTRICT,
    company_domain TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    role            TEXT NOT NULL,
    primary_email   TEXT NOT NULL,
    fallback_email  TEXT NOT NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    status          TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'SENT', 'FAILED_BOUNCED', 'SKIPPED')),
    sent_at         TIMESTAMPTZ,
    failure_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes for cron dispatch query performance
-- Requirement: 7.5 — oldest PENDING lead from oldest ACTIVE campaign
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_campaign_status_created
    ON leads (campaign_id, status, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_leads_primary_email
    ON leads (primary_email);

CREATE INDEX IF NOT EXISTS idx_campaigns_status_created
    ON campaigns (status, created_at ASC);

-- ============================================================
-- Automatic updated_at trigger for campaigns
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS)
-- Requirement 11.2 — users can only read/write their own data
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- email_templates policies
-- Templates can be read by all authenticated users
-- (built-in templates are shared; user templates are owned)
-- For this MVP, templates are shared read-only system data.
-- -------------------------------------------------------
CREATE POLICY "Authenticated users can read templates"
    ON email_templates
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert templates"
    ON email_templates
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update their templates"
    ON email_templates
    FOR UPDATE
    TO authenticated
    USING (true);

-- -------------------------------------------------------
-- resumes policies
-- Each user only sees their own resumes (via auth.uid())
-- Supabase auth.uid() is stored on the resumes via user_id
-- NOTE: user_id column is added below for RLS to work
-- -------------------------------------------------------

-- Add user_id to resumes for RLS
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can read their own resumes"
    ON resumes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own resumes"
    ON resumes
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own resumes"
    ON resumes
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- -------------------------------------------------------
-- campaigns policies
-- Each user only sees their own campaigns
-- -------------------------------------------------------

-- Add user_id to campaigns for RLS
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE POLICY "Users can read their own campaigns"
    ON campaigns
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own campaigns"
    ON campaigns
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own campaigns"
    ON campaigns
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own campaigns"
    ON campaigns
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- -------------------------------------------------------
-- leads policies
-- Leads are accessible to the user who owns the campaign
-- -------------------------------------------------------
CREATE POLICY "Users can read leads for their campaigns"
    ON leads
    FOR SELECT
    TO authenticated
    USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert leads for their campaigns"
    ON leads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        campaign_id IN (
            SELECT id FROM campaigns WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update leads for their campaigns"
    ON leads
    FOR UPDATE
    TO authenticated
    USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE user_id = auth.uid()
        )
    );

-- -------------------------------------------------------
-- Service role bypass for cron dispatch
-- The /api/cron/dispatch route uses SUPABASE_SERVICE_KEY
-- which bypasses RLS automatically (Supabase default).
-- No additional policy needed for service role.
-- -------------------------------------------------------

-- ============================================================
-- Storage bucket configuration (run via Supabase Dashboard or CLI)
-- ============================================================
-- The following is documentation — Storage API calls must be
-- made programmatically or through the Supabase Dashboard.
--
-- Bucket: resumes
--   - public: true  (public read access for CDN URLs)
--   - allowed MIME types: application/pdf
--   - max file size: 10MB
--
-- To create via Supabase CLI:
--   supabase storage create resumes --public

-- ============================================================
-- Seed: seed.sql
-- Description: Seed data for the Cold Email & Referral Outreach
--              Automation Platform
-- Requirement 5.5 — built-in "Standard Referral" template
-- ============================================================

-- Insert the built-in "Standard Referral" email template
-- Variables: role, company_name, firstName
INSERT INTO email_templates (id, name, subject_template, body_template, variables, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Standard Referral',
    'Quick Referral Inquiry - {role} at {company_name}',
    'Hi {firstName},

I hope this message finds you well! I came across your profile and noticed you work at {company_name} — I am really excited about the work being done there.

I am reaching out because I am actively exploring opportunities for a {role} position at {company_name}. I believe my background aligns well with the kind of work your team does, and I would love to learn more about the culture and any open roles that might be a good fit.

If you have 10–15 minutes for a quick chat, or if you could point me to the right person on the hiring team, I would genuinely appreciate it. I have attached my resume for your reference.

Thank you so much for your time — I truly appreciate it!

Best regards',
    ARRAY['role', 'company_name', 'firstName'],
    NOW()
)
ON CONFLICT (id) DO NOTHING;

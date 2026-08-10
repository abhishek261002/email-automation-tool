# Cron-Job.org Setup

## Prerequisites

- The application must be deployed to Vercel (or another public URL)
- `CRON_SECRET` must be set as an environment variable in Vercel

## Steps

1. Go to https://cron-job.org and create a free account

2. Create a new cron job with:
   - **URL**: `https://your-vercel-domain.vercel.app/api/cron/dispatch`
   - **Method**: GET
   - **Schedule**: Every 5 minutes (`*/5 * * * *`)
   - **Custom Header**:
     - Header name: `Authorization`
     - Header value: `Bearer YOUR_CRON_SECRET`

3. Add `CRON_SECRET` to Vercel environment variables:
   - Go to your Vercel project → Settings → Environment Variables
   - Add `CRON_SECRET` with a long random string value
   - Example (generate with): `openssl rand -hex 32`
   - Set it for all environments (Production, Preview, Development)

4. Deploy the application to Vercel:
   ```bash
   vercel --prod
   ```

5. Test the endpoint manually:
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
        https://your-vercel-domain.vercel.app/api/cron/dispatch
   ```

## Expected Responses

| Response | Meaning |
|---|---|
| `{ "status": "SENT", "leadId": "...", "sentTo": "..." }` | Email dispatched successfully |
| `{ "status": "NO_PENDING" }` | No active campaigns or no pending leads |
| `{ "status": "SKIPPED", "error": "..." }` | Send skipped — lead stays PENDING for retry |
| HTTP 401 | Wrong or missing `Authorization` header |

## Rate Limiting

The cron runs every 5 minutes, dispatching at most **1 email per invocation**.
This enforces a safe maximum of **12 emails per hour**, protecting your Gmail
sender reputation and reducing spam detection risk.

## Environment Variables Reference

| Variable | Description |
|---|---|
| `CRON_SECRET` | Shared secret for cron endpoint authentication |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `GMAIL_CLIENT_ID` | Google OAuth2 client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth2 client secret |
| `GMAIL_REFRESH_TOKEN` | Gmail OAuth2 refresh token |
| `GMAIL_SENDER_ADDRESS` | Gmail address used as the sender |

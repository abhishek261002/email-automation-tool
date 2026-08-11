/**
 * Gmail client — wraps nodemailer + Google Gmail API for sending emails
 * and querying bounce notifications from mailer-daemon.
 *
 * Requirements: 8.4, 9.1, 11.1
 */

import nodemailer from 'nodemailer'
import { google } from 'googleapis'
import type { Attachment, BounceNotification } from '@/types'

// ─── Internal types for Gmail API payload ────────────────────────────────────

interface GmailMessagePart {
  mimeType?: string | null
  body?: { data?: string | null } | null
  parts?: GmailMessagePart[] | null
  headers?: Array<{ name?: string | null; value?: string | null }> | null
}

interface GmailMessageData {
  payload?: GmailMessagePart | null
  internalDate?: string | null
}

// ─── SendEmailOptions ─────────────────────────────────────────────────────────

export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  attachments: Attachment[]
}

// ─── Environment validation ───────────────────────────────────────────────────

function getGmailCredentials() {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  const senderAddress = process.env.GMAIL_SENDER_ADDRESS

  if (!clientId) {
    throw new Error('Missing environment variable: GMAIL_CLIENT_ID')
  }
  if (!clientSecret) {
    throw new Error('Missing environment variable: GMAIL_CLIENT_SECRET')
  }
  if (!refreshToken) {
    throw new Error('Missing environment variable: GMAIL_REFRESH_TOKEN')
  }
  if (!senderAddress) {
    throw new Error('Missing environment variable: GMAIL_SENDER_ADDRESS')
  }

  return { clientId, clientSecret, refreshToken, senderAddress }
}

// ─── OAuth2 client factory ────────────────────────────────────────────────────

function createOAuth2Client() {
  const { clientId, clientSecret, refreshToken } = getGmailCredentials()

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground'
  )

  oauth2Client.setCredentials({ refresh_token: refreshToken })

  return oauth2Client
}

// ─── sendEmail ────────────────────────────────────────────────────────────────

/**
 * Sends an email via Gmail using OAuth2 + nodemailer.
 * Attachments are sent as Buffer/ArrayBuffer content.
 *
 * Requirements: 8.4
 */
// ─── sendEmail ────────────────────────────────────────────────────────────────

/**
 * Sends an email via Gmail using OAuth2 + nodemailer.
 * Preserves paragraph spacing, line breaks, and converts URLs to clickable links.
 *
 * Requirements: 8.4
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { senderAddress } = getGmailCredentials()
  const oauth2Client = createOAuth2Client()

  // Retrieve a fresh access token
  const { token: accessToken } = await oauth2Client.getAccessToken()

  if (!accessToken) {
    throw new Error('Failed to retrieve Gmail access token — check OAuth2 credentials')
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: senderAddress,
      clientId: oauth2Client._clientId,
      clientSecret: oauth2Client._clientSecret,
      refreshToken: (oauth2Client.credentials.refresh_token as string) ?? '',
      accessToken,
    },
  })

  // Convert attachments to nodemailer format
  const attachments = options.attachments.map((att) => ({
    filename: att.filename,
    content: Buffer.isBuffer(att.content)
      ? att.content
      : Buffer.from(att.content as ArrayBuffer),
  }))

  // Convert URLs in text into clickable HTML anchor tags
  const autoLink = (str: string) =>
    str.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" style="color: #2563eb; text-decoration: underline;">$1</a>'
    )

  // Transform raw text into well-formatted HTML with clean paragraph gaps
  const formattedHtml = options.body
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .map((paragraph) => {
      const cleanParagraph = autoLink(paragraph.trim()).replace(/\n/g, '<br/>')
      return `<p style="margin: 0 0 16px 0; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1f2937;">${cleanParagraph}</p>`
    })
    .join('')

  await transporter.sendMail({
    from: senderAddress,
    to: options.to,
    subject: options.subject,
    text: options.body, // Fallback plain text version
    html: `<div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">${formattedHtml}</div>`,
    attachments,
  })
}

// ─── queryBouncedEmails ───────────────────────────────────────────────────────

/**
 * Queries the Gmail inbox for mailer-daemon bounce notifications received
 * after `since`. Parses each bounce message to extract the failed recipient
 * email address.
 *
 * Returns an array of `{ recipientEmail, receivedAt }` objects.
 *
 * Requirements: 9.1
 */
export async function queryBouncedEmails(since: Date): Promise<BounceNotification[]> {
  const oauth2Client = createOAuth2Client()

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  // Build the search query — look for mailer-daemon bounce messages after `since`
  const sinceTimestamp = Math.floor(since.getTime() / 1000)
  const query = `from:mailer-daemon after:${sinceTimestamp}`

  const listResponse = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  })

  const messages = listResponse.data.messages ?? []

  if (messages.length === 0) {
    return []
  }

  const notifications: BounceNotification[] = []

  for (const msg of messages) {
    if (!msg.id) continue

    try {
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full',
      })

      const messageData = messageResponse.data as GmailMessageData

      // Extract the internalDate (milliseconds since epoch)
      const receivedAt = messageData.internalDate
        ? new Date(parseInt(messageData.internalDate, 10)).toISOString()
        : new Date().toISOString()

      // Try to parse the failed recipient from the message body
      const recipientEmail = extractBounceRecipient(messageData)

      if (recipientEmail) {
        notifications.push({ recipientEmail, receivedAt })
      }
    } catch (err) {
      // Log but continue processing other messages
      console.error(`[queryBouncedEmails] Failed to process message ${msg.id}:`, err)
    }
  }

  return notifications
}

// ─── extractBounceRecipient ───────────────────────────────────────────────────

/**
 * Parses a Gmail message payload to extract the bounced recipient email.
 * Tries multiple common bounce patterns:
 *   - "Final-Recipient: rfc822; email@example.com" (RFC 3464 DSN)
 *   - "Original-Recipient: rfc822; email@example.com"
 *   - X-Failed-Recipients message header
 *   - Fallback regex near "failed" or "undeliverable" keyword
 */
function extractBounceRecipient(messageData: GmailMessageData): string | null {
  if (!messageData.payload) return null

  // Check top-level headers for X-Failed-Recipients
  const topHeaders = messageData.payload.headers ?? []
  for (const header of topHeaders) {
    if (header.name?.toLowerCase() === 'x-failed-recipients' && header.value) {
      return header.value.trim().toLowerCase()
    }
  }

  // Decode all text parts recursively
  const textContent = collectTextContent(messageData.payload)

  if (!textContent) return null

  // Pattern 1: Final-Recipient header (RFC 3464 Delivery Status Notification)
  const finalRecipientMatch = textContent.match(
    /Final-Recipient\s*:\s*rfc822\s*;\s*([^\s\r\n<>]+)/i
  )
  if (finalRecipientMatch) {
    return finalRecipientMatch[1].trim().toLowerCase()
  }

  // Pattern 2: Original-Recipient header
  const originalRecipientMatch = textContent.match(
    /Original-Recipient\s*:\s*rfc822\s*;\s*([^\s\r\n<>]+)/i
  )
  if (originalRecipientMatch) {
    return originalRecipientMatch[1].trim().toLowerCase()
  }

  // Pattern 3: Fallback — find any email-like string near "failed" or "undeliverable"
  const failedEmailMatch = textContent.match(
    /(?:failed|undeliverable|unable to deliver)[^<@\n]*[<\s]([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[>\s]/i
  )
  if (failedEmailMatch) {
    return failedEmailMatch[1].trim().toLowerCase()
  }

  return null
}

// ─── collectTextContent ───────────────────────────────────────────────────────

/**
 * Recursively collects decoded text content from a Gmail message payload.
 */
function collectTextContent(payload: GmailMessagePart): string {
  let text = ''

  if (payload.body?.data) {
    text += Buffer.from(payload.body.data, 'base64').toString('utf-8')
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (
        part.mimeType?.startsWith('text/') ||
        part.mimeType === 'message/delivery-status' ||
        part.parts
      ) {
        text += collectTextContent(part)
      }
    }
  }

  return text
}

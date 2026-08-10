import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase client (service key, server-side only) ─────────────────────────

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
  }

  return createClient(url, key)
}

// ─── PDF magic-byte validation ────────────────────────────────────────────────

/**
 * Checks that the first 4 bytes of a buffer are the PDF signature: %PDF (0x25 0x50 0x44 0x46).
 * Requirement 11.3 — server-side MIME validation.
 */
function hasPdfMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false
  return (
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46    // F
  )
}

// ─── GET /api/resumes — list all resumes ──────────────────────────────────────

/**
 * Returns all uploaded resumes ordered by upload date (newest first).
 * Requirements: 4.4
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (error) {
      console.error('[GET /api/resumes] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch resumes', detail: error.message },
        { status: 500 }
      )
    }

    // Map snake_case DB columns → camelCase Resume interface
    const resumes = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      label: row.label,
      fileName: row.file_name,
      cdnUrl: row.cdn_url,
      uploadedAt: row.uploaded_at,
    }))

    return NextResponse.json({ resumes })
  } catch (err) {
    console.error('[GET /api/resumes] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ─── POST /api/resumes — upload a new resume ─────────────────────────────────

/**
 * Accepts a multipart/form-data payload with:
 *   - file: PDF file
 *   - label: user-assigned label (e.g. "MERN_AI_SaaS_Resume")
 *
 * Validates MIME type server-side (Content-Type header AND magic bytes).
 * Uploads to Supabase Storage `resumes` bucket.
 * Inserts metadata into `resumes` table.
 * Returns the created resume record.
 *
 * Requirements: 4.1, 4.2, 4.3, 11.3
 */
export async function POST(request: NextRequest) {
  try {
    // ── Parse multipart form ──────────────────────────────────────────────────
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request — expected multipart/form-data' },
        { status: 400 }
      )
    }

    const file = formData.get('file')
    const label = formData.get('label')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing required field: file' },
        { status: 400 }
      )
    }

    if (!label || typeof label !== 'string' || label.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: label (must be a non-empty string)' },
        { status: 400 }
      )
    }

    // ── Validate MIME type via Content-Type header ────────────────────────────
    // Requirement 4.1, 11.3 — check declared type first
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        {
          error: 'Invalid file format. Only PDF files are accepted.',
          detail: `Received MIME type: ${file.type || '(none)'}`,
        },
        { status: 422 }
      )
    }

    // ── Validate magic bytes (defence-in-depth) ───────────────────────────────
    // Requirement 11.3 — verify actual file content, not just declared type
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    if (!hasPdfMagicBytes(buffer)) {
      return NextResponse.json(
        {
          error: 'Invalid file format. File content does not match PDF signature.',
          detail: 'Expected PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)',
        },
        { status: 422 }
      )
    }

    // ── Upload to Supabase Storage ────────────────────────────────────────────
    const supabase = getSupabaseAdmin()

    // Create a unique storage path to avoid collisions
    const timestamp = Date.now()
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${timestamp}_${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      console.error('[POST /api/resumes] Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file to storage', detail: uploadError.message },
        { status: 500 }
      )
    }

    // ── Retrieve public CDN URL ───────────────────────────────────────────────
    const { data: publicUrlData } = supabase.storage
      .from('resumes')
      .getPublicUrl(storagePath)

    const cdnUrl = publicUrlData.publicUrl

    if (!cdnUrl || !cdnUrl.startsWith('https://')) {
      console.error('[POST /api/resumes] CDN URL is invalid:', cdnUrl)
      return NextResponse.json(
        { error: 'Failed to retrieve CDN URL after upload' },
        { status: 500 }
      )
    }

    // ── Insert record into resumes table ──────────────────────────────────────
    // Requirement 4.3
    const { data: insertData, error: insertError } = await supabase
      .from('resumes')
      .insert({
        label: label.trim(),
        file_name: file.name,
        cdn_url: cdnUrl,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('[POST /api/resumes] DB insert error:', insertError)
      // Attempt to clean up the orphaned storage file
      await supabase.storage.from('resumes').remove([storagePath])
      return NextResponse.json(
        { error: 'Failed to save resume metadata', detail: insertError.message },
        { status: 500 }
      )
    }

    // ── Return the created resume record (camelCase) ──────────────────────────
    const resume = {
      id: insertData.id,
      label: insertData.label,
      fileName: insertData.file_name,
      cdnUrl: insertData.cdn_url,
      uploadedAt: insertData.uploaded_at,
    }

    return NextResponse.json({ resume }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/resumes] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

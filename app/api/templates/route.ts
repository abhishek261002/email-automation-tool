import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key)
}

/**
 * GET /api/templates — list all email templates
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('email_templates')
      .select('id, name, subject_template, variables, created_at')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const templates = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      subjectTemplate: row.subject_template,
      variables: row.variables,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ templates })
  } catch (err) {
    console.error('[GET /api/templates]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

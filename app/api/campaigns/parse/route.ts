import { NextRequest, NextResponse } from 'next/server'
import { CampaignFormInputSchema } from '@/lib/schemas'
import { parseApolloData, ParseError } from '@/lib/gemini-parser'

/**
 * POST /api/campaigns/parse
 *
 * Stateless endpoint — validates the campaign form input, calls the Gemini
 * parser, and returns the filtered lead preview. Does NOT write to the DB.
 *
 * Requirements: 1.1, 1.2, 1.3, 2.1
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body — expected JSON' },
        { status: 400 }
      )
    }

    // ── Validate input ────────────────────────────────────────────────────────
    const parseResult = CampaignFormInputSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          fieldErrors: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const input = parseResult.data

    // ── Call Gemini parser ────────────────────────────────────────────────────
    const parsed = await parseApolloData({
      companyName: input.companyName,
      targetRole: input.targetRole,
      rawApolloText: input.rawApolloText,
    })

    return NextResponse.json({
      companyDomain: parsed.companyDomain,
      filteredLeads: parsed.filteredLeads,
    })
  } catch (err) {
    if (err instanceof ParseError) {
      console.error('[POST /api/campaigns/parse] ParseError:', err.message)
      return NextResponse.json(
        { error: 'AI parsing failed — please try again', detail: err.message },
        { status: 500 }
      )
    }
    console.error('[POST /api/campaigns/parse] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

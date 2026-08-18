import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'

// Bespoke, not RESOURCES-driven (2026-08-13): every generic
// /api/household/[resource] insert stamps the caller's household space_id,
// which would make every need shared by default — the opposite of the
// point. This route always writes space_id = null, private to the author.
// Sharing a need with the household happens later, from 4S OS directly
// (an authenticated `update` setting space_id), never through the bot.

export async function POST(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, 500) : ''
  if (!text) return NextResponse.json({ error: 'text is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('needs')
    .insert({ user_id: caller.userId, space_id: null, text })
    .select('id, text, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

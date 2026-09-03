import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'

// Bespoke, not RESOURCES-driven. Insert-only since 2026-09-03: a check-in is
// one submission per person per week with no edits after (the Discord bot
// that used to re-send full answer sets is gone). The
// (space_id, user_id, week_of) unique constraint rejects a second attempt.

interface AnswerIn { questionKey?: unknown; questionText?: unknown; answer?: unknown }

export async function POST(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const weekOf = typeof body.weekOf === 'string' ? body.weekOf : ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekOf)) {
    return NextResponse.json({ error: 'weekOf is required, as YYYY-MM-DD' }, { status: 400 })
  }
  const rawAnswers = Array.isArray(body.answers) ? (body.answers as AnswerIn[]) : []
  const answers = rawAnswers
    .filter(a => typeof a.questionKey === 'string' && typeof a.answer === 'string')
    .map(a => ({
      questionKey: a.questionKey,
      questionText: typeof a.questionText === 'string' ? a.questionText : null,
      answer: (a.answer as string).slice(0, 2000),
    }))
  if (!answers.length) return NextResponse.json({ error: 'answers must be a non-empty array' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('checkins')
    .insert({ user_id: caller.userId, space_id: caller.spaceId, week_of: weekOf, answers, completed_at: new Date().toISOString() })
    .select('id, week_of, completed_at')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already checked in for this week' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ item: data }, { status: 201 })
}

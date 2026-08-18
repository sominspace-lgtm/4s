import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'

// Bespoke, not RESOURCES-driven: the generic /api/household/[resource] route
// is insert-only, but a check-in genuinely needs upsert — a partner can revise
// an answer before the week's "both done" recap fires, and the bot always
// re-sends the full answer set on completion rather than tracking a diff.
// The (space_id, user_id, week_of) unique constraint in checkins.sql is what
// makes that safe: it can only ever overwrite YOUR OWN prior answers for that
// same week, never someone else's or a different week's.

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
    .upsert(
      { user_id: caller.userId, space_id: caller.spaceId, week_of: weekOf, answers, completed_at: new Date().toISOString() },
      { onConflict: 'space_id,user_id,week_of' },
    )
    .select('id, week_of, completed_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

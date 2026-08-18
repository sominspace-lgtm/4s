import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'

// Bespoke and read-only, and a genuine privacy-boundary decision rather than
// a RESOURCES entry: `people`/`person_preferences` are personal data — the
// people table has no space_id at all (see relationship_memory.sql) — so this
// scopes strictly to the CALLER's own contacts. A household bearer token
// identifies one person, not the couple, and a birthday reminder is exactly
// the kind of thing that must never leak to whoever the birthday is FOR.

function daysUntil(birthday: string, now = new Date()): number {
  const b = new Date(birthday)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate())
  if (next < today) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate())
  return Math.round((next.getTime() - today.getTime()) / 86400000)
}

export async function GET(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const withinDays = Math.min(60, Math.max(1, Number(url.searchParams.get('withinDays')) || 14))

  const admin = createAdminClient()
  const { data: people, error } = await admin
    .from('people')
    .select('id, name, birthday, gift_ideas, gift_budget')
    .eq('user_id', caller.userId)
    .not('birthday', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const upcoming = (people ?? [])
    .map(p => ({ ...p, daysUntil: daysUntil(p.birthday as string) }))
    .filter(p => p.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  if (upcoming.length === 0) return NextResponse.json({ items: [] })

  const { data: prefs } = await admin
    .from('person_preferences')
    .select('person_id, category, text')
    .in('person_id', upcoming.map(p => p.id))

  const items = upcoming.map(p => ({
    id: p.id,
    name: p.name,
    daysUntil: p.daysUntil,
    birthday: p.birthday,
    giftIdeas: p.gift_ideas,
    giftBudget: p.gift_budget,
    likes: (prefs ?? []).filter(x => x.person_id === p.id && x.category === 'like').map(x => x.text),
    dislikes: (prefs ?? []).filter(x => x.person_id === p.id && x.category === 'dislike').map(x => x.text),
  }))

  return NextResponse.json({ items })
}

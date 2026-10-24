import { NextResponse } from 'next/server'
import { requireGoogleUser } from '@/lib/google/server'
import { getShares, setShares, householdPeople } from '@/lib/google/shares'

// Your calendar sharing settings (2026-10-24). Only you can change yours,
// and only when signed in as yourself (never from the shared screen).

export async function GET() {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const mine = await getShares(who.userId)
  const others = (await householdPeople(who.userId)).filter(id => id !== who.userId)
  const partnerShares = others.length ? (await getShares(others[0])).calendar_partner : false
  return NextResponse.json({ mine, partnerShares, hasPartner: others.length > 0 })
}

export async function POST(request: Request) {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const err = await setShares(who.userId, body)
  if (err) return NextResponse.json({ error: 'Could not save. Has the sharing SQL been run?' }, { status: 500 })
  return NextResponse.json({ ok: true, mine: await getShares(who.userId) })
}

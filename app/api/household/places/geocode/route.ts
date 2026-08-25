import { NextResponse } from 'next/server'
import { resolveHouseholdToken } from '@/lib/household/resources'
import { geocodeAddress } from '@/lib/places/geocode'

// Free-text address → lat/lng/city/country, for pins that arrive as a
// street address rather than a name or a Maps link (Discord bot request,
// 2026-08-13). Bot-only (bearer token) — see app/api/places/geocode for the
// browser-session counterpart. Both call the same geocodeAddress() helper
// (lib/places/geocode.ts); this file is just the auth + request shape.
export async function GET(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const raw = (searchParams.get('q') ?? '').trim()
  if (raw.length < 5 || raw.length > 200) {
    return NextResponse.json({ error: 'q must be 5-200 characters' }, { status: 400 })
  }

  return NextResponse.json(await geocodeAddress(raw))
}

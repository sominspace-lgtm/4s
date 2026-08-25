import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/places/geocode'

// The browser-session counterpart to app/api/household/places/geocode
// (2026-08-25) — that route only accepts the Discord bot's bearer token, so
// the web app's own pin forms (AddPlacePanel, PlaceSheet) had no way to
// call it at all. This is the actual "copy paste doesn't recognize an
// address" bug: nothing in the UI ever called a geocode endpoint, bot or
// otherwise. Same geocodeAddress() helper (lib/places/geocode.ts), just a
// normal signed-in-user check instead of a token.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const raw = (searchParams.get('q') ?? '').trim()
  if (raw.length < 5 || raw.length > 200) {
    return NextResponse.json({ error: 'q must be 5-200 characters' }, { status: 400 })
  }

  return NextResponse.json(await geocodeAddress(raw))
}

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'

// Free-text address → lat/lng/city/country, for pins that arrive as a
// street address rather than a name or a Maps link (Discord bot request,
// 2026-08-13). Backed by Nominatim — the free OSM geocoder place_lookup_cache/
// place_search_cache were built for (see their comment in
// supabase/migrations/places_travel.sql) but nothing had called yet.
// Cache-first: Nominatim's fair-use policy is ~1req/sec on donated
// infrastructure, so a repeated query must never re-hit it.
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days — addresses don't move
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ')
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  osm_type: string
  osm_id: number
  address?: Record<string, string>
}

export async function GET(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const raw = (searchParams.get('q') ?? '').trim()
  if (raw.length < 5 || raw.length > 200) {
    return NextResponse.json({ error: 'q must be 5-200 characters' }, { status: 400 })
  }

  const admin = createAdminClient()
  const queryKey = normalizeQuery(raw)

  const cached = await admin
    .from('place_search_cache')
    .select('payload, fetched_at')
    .eq('query_key', queryKey)
    .eq('provider', 'osm')
    .maybeSingle()

  if (cached.data && Date.now() - new Date(cached.data.fetched_at).getTime() < CACHE_MAX_AGE_MS) {
    return NextResponse.json(cached.data.payload)
  }

  let results: NominatimResult[]
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?format=jsonv2&q=${encodeURIComponent(raw)}&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': '4S-OS/1.0 (household places pin capture)' } },
    )
    if (!res.ok) return NextResponse.json({ found: false })
    results = await res.json()
  } catch {
    return NextResponse.json({ found: false })
  }

  const match = results[0]
  const payload = match
    ? {
        found: true,
        lat: Number(match.lat),
        lng: Number(match.lon),
        address: [match.address?.house_number, match.address?.road].filter(Boolean).join(' ') || null,
        city: match.address?.city ?? match.address?.town ?? match.address?.village ?? null,
        country: match.address?.country ?? null,
        display_name: match.display_name,
      }
    : { found: false }

  await admin.from('place_search_cache').upsert({
    query_key: queryKey, provider: 'osm', field_mask: '', payload, fetched_at: new Date().toISOString(),
  })

  return NextResponse.json(payload)
}

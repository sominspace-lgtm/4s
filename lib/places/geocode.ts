import { createAdminClient } from '@/lib/supabase/admin'

// Free-text address → lat/lng/city/country. Shared by two routes: the
// Discord-bot-only one (bearer token, app/api/household/places/geocode) this
// was originally built for, and the browser-session one
// (app/api/places/geocode) added 2026-08-25 so the web app's own pin forms
// can look an address up too — pasting an address into AddPlacePanel/
// PlaceSheet never called either endpoint before, which is the actual "copy
// paste doesn't recognize" bug: there was no wiring, not a paste-vs-typing
// quirk. Backed by Nominatim, cache-first — its fair-use policy is ~1req/sec
// on donated infrastructure, so a repeated query must never re-hit it.
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

async function searchNominatim(q: string): Promise<NominatimResult[]> {
  const res = await fetch(
    `${NOMINATIM_URL}?format=jsonv2&q=${encodeURIComponent(q)}&limit=1&addressdetails=1`,
    { headers: { 'User-Agent': '4S-OS/1.0 (household places pin capture)' } },
  )
  if (!res.ok) return []
  return res.json()
}

interface PhotonFeature {
  properties: {
    housenumber?: string; street?: string; name?: string
    city?: string; town?: string; village?: string
    country?: string; countrycode?: string
  }
  geometry: { coordinates: [number, number] } // [lon, lat]
}

// Fallback when Nominatim's own parser comes up empty (2026-08-25) —
// confirmed case: "1292 Briar crest Dr, San Jose, CA" (the street is
// actually "Briarcrest", one word) returns [] from Nominatim, structured
// query params included, but resolves fine once the space is gone. Photon
// (komoot, same underlying OSM data, no API key, free) tokenizes more
// forgivingly and gets this right without any special-casing on our side —
// confirmed against the live API before wiring this in. Nominatim stays
// primary (it's what's cached, and this app was already built around its
// address shape); Photon only runs when Nominatim truly found nothing.
async function searchPhoton(q: string): Promise<NominatimResult[]> {
  const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`, {
    headers: { 'User-Agent': '4S-OS/1.0 (household places pin capture)' },
  })
  if (!res.ok) return []
  const body = await res.json().catch(() => null) as { features?: PhotonFeature[] } | null
  const f = body?.features?.[0]
  if (!f) return []
  const [lon, lat] = f.geometry.coordinates
  return [{
    lat: String(lat), lon: String(lon), osm_type: '', osm_id: 0,
    display_name: [f.properties.housenumber, f.properties.street, f.properties.city, f.properties.country].filter(Boolean).join(', '),
    address: {
      house_number: f.properties.housenumber ?? '', road: f.properties.street ?? '',
      city: f.properties.city ?? f.properties.town ?? f.properties.village ?? '',
      country: f.properties.country ?? '',
    },
  }]
}

export type GeocodeResult =
  | { found: true; lat: number; lng: number; address: string | null; city: string | null; country: string | null; display_name: string }
  | { found: false }

async function reverseNominatim(lat: number, lng: number): Promise<NominatimResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`,
    { headers: { 'User-Agent': '4S-OS/1.0 (household places pin capture)' } },
  )
  if (!res.ok) return []
  const body = await res.json().catch(() => null) as NominatimResult | { error?: string } | null
  return body && 'display_name' in body ? [body] : []
}

async function reversePhoton(lat: number, lng: number): Promise<NominatimResult[]> {
  const res = await fetch(`https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`, {
    headers: { 'User-Agent': '4S-OS/1.0 (household places pin capture)' },
  })
  if (!res.ok) return []
  const body = await res.json().catch(() => null) as { features?: PhotonFeature[] } | null
  const f = body?.features?.[0]
  if (!f) return []
  return [{
    lat: String(lat), lon: String(lng), osm_type: '', osm_id: 0,
    display_name: [f.properties.housenumber, f.properties.street, f.properties.city, f.properties.country].filter(Boolean).join(', '),
    address: {
      house_number: f.properties.housenumber ?? '', road: f.properties.street ?? '',
      city: f.properties.city ?? f.properties.town ?? f.properties.village ?? '',
      country: f.properties.country ?? '',
    },
  }]
}

/** Coordinates → a real address, the reverse of geocodeAddress() above. Used
 *  anywhere a pin has lat/lng but no saved address yet — a pin dropped from
 *  "mark a pin here" (NearbyTab.tsx) at save time, or self-healing an older
 *  pin the first time its sheet is opened (PlaceSheet.tsx) — so the app
 *  never shows raw coordinates as a stand-in for an address. Same cache
 *  table as the forward direction, a `rev:` key prefix so the two never
 *  collide, and coordinates rounded to 5 decimals (~1.1m) so two pins a
 *  few meters apart share one cached lookup instead of paying Nominatim's
 *  1req/sec budget twice for what is, for addressing purposes, one spot. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const admin = createAdminClient()
  const queryKey = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`

  const cached = await admin
    .from('place_search_cache')
    .select('payload, fetched_at')
    .eq('query_key', queryKey)
    .eq('provider', 'osm')
    .maybeSingle()

  if (cached.data && Date.now() - new Date(cached.data.fetched_at).getTime() < CACHE_MAX_AGE_MS) {
    return cached.data.payload as GeocodeResult
  }

  let results: NominatimResult[]
  try {
    results = await reverseNominatim(lat, lng)
    if (results.length === 0) results = await reversePhoton(lat, lng)
  } catch {
    return { found: false }
  }

  const match = results[0]
  const payload: GeocodeResult = match
    ? {
        found: true,
        lat, lng,
        address: [match.address?.house_number, match.address?.road].filter(Boolean).join(' ') || null,
        city: match.address?.city ?? match.address?.town ?? match.address?.village ?? null,
        country: match.address?.country ?? null,
        display_name: match.display_name,
      }
    : { found: false }

  await admin.from('place_search_cache').upsert({
    query_key: queryKey, provider: 'osm', field_mask: '', payload, fetched_at: new Date().toISOString(),
  })

  return payload
}

export async function geocodeAddress(raw: string): Promise<GeocodeResult> {
  const admin = createAdminClient()
  const queryKey = normalizeQuery(raw)

  const cached = await admin
    .from('place_search_cache')
    .select('payload, fetched_at')
    .eq('query_key', queryKey)
    .eq('provider', 'osm')
    .maybeSingle()

  if (cached.data && Date.now() - new Date(cached.data.fetched_at).getTime() < CACHE_MAX_AGE_MS) {
    return cached.data.payload as GeocodeResult
  }

  let results: NominatimResult[]
  try {
    results = await searchNominatim(raw)
    // Nominatim's free-form parser chokes on "Business Name, Street, City,
    // State Zip" — a business name glued onto the front of a real address
    // reliably returns nothing, even though the address alone resolves fine
    // (confirmed: "Alice Marbles Tennis Court, 1200 Greenwich St, San
    // Francisco, CA 94109" → [], "1200 Greenwich St, San Francisco, CA
    // 94109" → a match). If the full text has commas and came up empty,
    // retry with everything after the first comma — the address-shaped part
    // a name-prefixed pin almost always has.
    if (results.length === 0 && raw.includes(',')) {
      const afterFirstComma = raw.slice(raw.indexOf(',') + 1).trim()
      if (afterFirstComma.length >= 5) results = await searchNominatim(afterFirstComma)
    }
    // Photon fallback, full original text (2026-08-25) — see searchPhoton's
    // own comment. Tried last, only when both Nominatim attempts above came
    // up empty, since Nominatim is what's cached and already tuned for the
    // business-name-prefix case.
    if (results.length === 0) results = await searchPhoton(raw)
  } catch {
    return { found: false }
  }

  const match = results[0]
  const payload: GeocodeResult = match
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

  return payload
}

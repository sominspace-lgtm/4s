import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reverseGeocode } from '@/lib/places/geocode'

// The reverse of app/api/places/geocode — coordinates in, a real address
// out. Same browser-session gate, same underlying cache table via
// reverseGeocode() (lib/places/geocode.ts).
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'lat/lng must be valid coordinates' }, { status: 400 })
  }

  return NextResponse.json(await reverseGeocode(lat, lng))
}

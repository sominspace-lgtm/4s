import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hashSecret, isExpired, newSecret, DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE } from '@/lib/devices/token'

// The waiting iPad checks in every few seconds with its private secret
// (2026-11-08). Once a member has approved it, this hands over the screen's
// own key exactly once, as an httpOnly cookie the page's scripts can't read.
// Only the key's hash is saved.
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as { secret?: unknown }
  const secret = typeof b.secret === 'string' ? b.secret : ''
  if (secret.length < 20 || secret.length > 200) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const admin = createAdminClient()
  const { data: req } = await admin.from('device_pair_requests')
    .select('id, expires_at, device_id, claimed_at')
    .eq('secret_hash', hashSecret(secret))
    .maybeSingle()
  if (!req || req.claimed_at) return NextResponse.json({ status: 'expired' })
  if (!req.device_id) return NextResponse.json({ status: isExpired(req.expires_at) ? 'expired' : 'waiting' })

  // Claim first, so two polls racing can't both get a key.
  const { data: claimed } = await admin.from('device_pair_requests')
    .update({ claimed_at: new Date().toISOString() })
    .eq('id', req.id).is('claimed_at', null)
    .select('id').maybeSingle()
  if (!claimed) return NextResponse.json({ status: 'expired' })

  const token = newSecret()
  const { data: device, error } = await admin.from('home_devices')
    .update({ token_hash: hashSecret(token), last_seen_at: new Date().toISOString() })
    .eq('id', req.device_id).is('revoked_at', null)
    .select('id').maybeSingle()
  if (error || !device) return NextResponse.json({ error: 'Could not finish pairing.' }, { status: 500 })

  const res = NextResponse.json({ status: 'paired' })
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: DEVICE_COOKIE_MAX_AGE,
  })
  return res
}

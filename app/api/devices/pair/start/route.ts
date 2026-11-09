import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { newPairCode, newSecret, hashSecret, PAIR_TTL_MINUTES } from '@/lib/devices/token'

// Step one of pairing a screen (2026-11-08). The iPad, with no account, asks
// for a code to show as a QR. It gets back the public code (in the QR) and a
// private secret it keeps to itself and later trades for its own key. The
// code alone does nothing until a signed-in member approves it.

const MAX_PENDING = 30

export async function POST() {
  const admin = createAdminClient()
  const nowIso = new Date().toISOString()
  await admin.from('device_pair_requests').delete().lt('expires_at', nowIso)

  const { count } = await admin.from('device_pair_requests').select('id', { count: 'exact', head: true }).is('claimed_at', null)
  if ((count ?? 0) >= MAX_PENDING) {
    return NextResponse.json({ error: 'Too many screens are waiting. Try again in a few minutes.' }, { status: 429 })
  }

  const secret = newSecret()
  const expiresAt = new Date(Date.now() + PAIR_TTL_MINUTES * 60_000).toISOString()
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newPairCode()
    const { error } = await admin.from('device_pair_requests').insert({ code, secret_hash: hashSecret(secret), expires_at: expiresAt })
    if (!error) return NextResponse.json({ code, secret, expiresAt })
    if (error.code !== '23505') {
      return NextResponse.json({ error: (error.code === '42P01' || error.code === 'PGRST205') ? 'Pairing is not set up yet.' : 'Could not start pairing.' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Could not start pairing.' }, { status: 500 })
}

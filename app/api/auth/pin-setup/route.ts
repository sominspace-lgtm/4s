import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isProfile, hashPin, backingCredentials } from '@/lib/auth/pin'

// First-time PIN claim — only works while pin_hash is still null for that
// profile, so this can never overwrite a PIN someone already set (that's a
// separate, not-yet-built "change my PIN" flow, not this one). On success it
// also signs in immediately, same as pin-login, so setting your PIN doubles
// as your first login.
//
// Known, accepted tradeoff: this endpoint can't verify WHO is setting a
// profile's PIN, only that no one has yet. On a private two-person app this
// is an acceptable window, not a general-purpose account-creation flow —
// worth knowing if this URL ever becomes more widely reachable.

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const profile = body.profile
  const pin = typeof body.pin === 'string' ? body.pin : ''

  if (!isProfile(profile)) return NextResponse.json({ error: 'Unknown profile.' }, { status: 400 })
  if (pin.length < 4) return NextResponse.json({ error: 'PIN must be at least 4 digits.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: existing } = await admin.from('pin_login_attempts').select('pin_hash').eq('profile', profile).maybeSingle()
  if (existing?.pin_hash) return NextResponse.json({ error: 'This profile already has a PIN set.' }, { status: 409 })

  const hash = hashPin(pin)
  if (!hash) return NextResponse.json({ error: 'PIN setup is not configured yet.' }, { status: 500 })

  // Ensure a row exists without touching pin_hash if one already does —
  // ON CONFLICT DO NOTHING, so this never resets an existing hash.
  await admin.from('pin_login_attempts').upsert({ profile }, { onConflict: 'profile', ignoreDuplicates: true })

  // The atomic claim: `pin_hash is null` in the WHERE makes this a single
  // database statement, so a race between two simultaneous first-time setups
  // for the same profile has exactly one winner — the loser's UPDATE matches
  // zero rows (the winner already cleared pin_hash's null-ness) and gets
  // rejected below, rather than clobbering what the winner just wrote.
  const { data: written, error } = await admin
    .from('pin_login_attempts')
    .update({ pin_hash: hash, fail_count: 0, locked_until: null, updated_at: new Date().toISOString() })
    .eq('profile', profile)
    .is('pin_hash', null)
    .select('pin_hash')
    .maybeSingle()
  if (error || !written) return NextResponse.json({ error: 'This profile already has a PIN set.' }, { status: 409 })

  const backing = backingCredentials(profile)
  if (!backing.email || !backing.password) {
    return NextResponse.json({ error: 'This profile is not configured yet.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: backing.email, password: backing.password })
  if (signInError) return NextResponse.json({ error: 'PIN saved, but sign-in failed — try logging in again.' }, { status: 500 })

  const res = NextResponse.json({ ok: true })
  if (profile === 'shared') {
    res.cookies.set('4s-shared-mode', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  }
  return res
}

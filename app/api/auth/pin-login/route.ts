import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isProfile, hashPin, pinsMatch, backingCredentials } from '@/lib/auth/pin'

// PIN-unlock for a real sign-in, not a replacement for one. A correct PIN
// triggers an actual Supabase signInWithPassword server-side, using a
// dedicated strong password only this route ever sees (never typed by a
// human, never stored in the browser) — so the PIN's whole job is a fast,
// friendly front door, and the account-level security behind it is
// unchanged from before this existed.
//
// pin_hash lives in the database now, not an env var, so Harry and Sylvia
// can each set their own PIN from the login screen the first time (see
// pin-setup) rather than one being baked in at deploy time. This route only
// ever CHECKS a hash — it never sets one, that's pin-setup's job alone.

const LOCKOUT_AFTER = 5
const LOCKOUT_MINUTES = 15

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const profile = body.profile
  const pin = typeof body.pin === 'string' ? body.pin : ''

  if (!isProfile(profile)) return NextResponse.json({ error: 'Unknown profile.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: row } = await admin.from('pin_login_attempts').select('*').eq('profile', profile).maybeSingle()

  if (!row?.pin_hash) return NextResponse.json({ error: 'not_set_up' }, { status: 404 })

  if (row.locked_until && new Date(row.locked_until) > new Date()) {
    return NextResponse.json({ error: 'Too many wrong PINs. Try again in a few minutes.' }, { status: 429 })
  }

  const computed = pin ? hashPin(pin) : null
  const correct = !!computed && pinsMatch(computed, row.pin_hash)

  if (!correct) {
    const nextCount = (row.fail_count ?? 0) + 1
    const lockedUntil = nextCount >= LOCKOUT_AFTER
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
      : null
    await admin.from('pin_login_attempts').update({
      fail_count: lockedUntil ? 0 : nextCount, locked_until: lockedUntil, updated_at: new Date().toISOString(),
    }).eq('profile', profile)
    return NextResponse.json({ error: 'Wrong PIN.' }, { status: 401 })
  }

  // Correct PIN clears any prior failures.
  await admin.from('pin_login_attempts').update({ fail_count: 0, locked_until: null, updated_at: new Date().toISOString() }).eq('profile', profile)

  const backing = backingCredentials(profile)
  if (!backing.email || !backing.password) {
    return NextResponse.json({ error: 'This profile is not configured yet.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: backing.email, password: backing.password })
  if (error) return NextResponse.json({ error: 'Sign-in failed.' }, { status: 500 })

  const res = NextResponse.json({ ok: true })
  if (profile === 'shared') {
    res.cookies.set('4s-shared-mode', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  } else {
    res.cookies.delete('4s-shared-mode')
  }
  return res
}

import { NextResponse } from 'next/server'
import { pbkdf2Sync, timingSafeEqual } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// PIN-unlock for a real sign-in, not a replacement for one. A correct PIN
// triggers an actual Supabase signInWithPassword server-side, using a
// dedicated strong password only this route ever sees (never typed by a
// human, never stored in the browser) — so the PIN's whole job is a fast,
// friendly front door, and the account-level security behind it is
// unchanged from before this existed.
//
// 'shared' is not a third account: it always signs in as SYLVIA_EMAIL, then
// stamps a cookie DashboardClient reads to show a household-only view
// regardless of who's actually behind it. It also has no PIN gate — nothing
// reachable in that view is personal, so a lockout doesn't buy anything a
// tap doesn't already avoid. 'harry' and 'sylvia' both require one.

type Profile = 'harry' | 'sylvia' | 'shared'

const LOCKOUT_AFTER = 5
const LOCKOUT_MINUTES = 15

function pinHash(pin: string): string | null {
  const pepper = process.env.PIN_PEPPER
  if (!pepper) return null
  return pbkdf2Sync(pin, pepper, 100_000, 32, 'sha256').toString('hex')
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

const CREDENTIALS: Record<'harry' | 'sylvia', { email: string | undefined; password: string | undefined; pinHash: string | undefined }> = {
  harry:  { email: process.env.HARRY_EMAIL,  password: process.env.HARRY_PASSWORD,  pinHash: process.env.HARRY_PIN_HASH },
  sylvia: { email: process.env.SYLVIA_EMAIL, password: process.env.SYLVIA_PASSWORD, pinHash: process.env.SYLVIA_PIN_HASH },
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const profile = body.profile as Profile
  const pin = typeof body.pin === 'string' ? body.pin : ''

  if (profile !== 'harry' && profile !== 'sylvia' && profile !== 'shared') {
    return NextResponse.json({ error: 'Unknown profile.' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (profile !== 'shared') {
    const lockKey = profile
    const { data: lock } = await admin.from('pin_login_attempts').select('*').eq('profile', lockKey).maybeSingle()
    if (lock?.locked_until && new Date(lock.locked_until) > new Date()) {
      return NextResponse.json({ error: 'Too many wrong PINs. Try again in a few minutes.' }, { status: 429 })
    }

    const creds = CREDENTIALS[profile]
    const computed = pin ? pinHash(pin) : null
    const correct = !!creds.pinHash && !!computed && constantTimeEqual(computed, creds.pinHash)

    if (!correct) {
      const nextCount = (lock?.fail_count ?? 0) + 1
      const lockedUntil = nextCount >= LOCKOUT_AFTER
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
        : null
      await admin.from('pin_login_attempts').upsert({
        profile: lockKey, fail_count: lockedUntil ? 0 : nextCount, locked_until: lockedUntil, updated_at: new Date().toISOString(),
      })
      return NextResponse.json({ error: 'Wrong PIN.' }, { status: 401 })
    }

    // Correct PIN clears any prior failures.
    await admin.from('pin_login_attempts').upsert({ profile: lockKey, fail_count: 0, locked_until: null, updated_at: new Date().toISOString() })
  }

  const backing = profile === 'shared' ? CREDENTIALS.sylvia : CREDENTIALS[profile]
  if (!backing.email || !backing.password) {
    return NextResponse.json({ error: 'This profile is not configured yet.' }, { status: 500 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: backing.email, password: backing.password })
  if (error) return NextResponse.json({ error: 'Sign-in failed.' }, { status: 500 })

  const res = NextResponse.json({ ok: true })
  if (profile === 'shared') {
    // Read by app/dashboard/page.tsx to restrict the UI to Household only,
    // independent of which real account is backing the session.
    res.cookies.set('4s-shared-mode', '1', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
  } else {
    res.cookies.delete('4s-shared-mode')
  }
  return res
}

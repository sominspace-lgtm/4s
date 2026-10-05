import { NextResponse } from 'next/server'
import { getConnection, googleConfigured, requireGoogleUser } from '@/lib/google/server'

// What the browser is allowed to know: configured, connected, which account,
// which permissions. Never a token.
export async function GET() {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ configured: googleConfigured(), connected: false, blocked: true }, { status: who.status === 401 ? 401 : 200 })
  const conn = googleConfigured() ? await getConnection(who.userId).catch(() => null) : null
  const scopes = conn?.scopes ?? ''
  return NextResponse.json({
    configured: googleConfigured(),
    connected: !!conn,
    email: conn?.email ?? null,
    calendar: scopes.includes('/auth/calendar'),
    gmail: scopes.includes('gmail.readonly'),
    send: scopes.includes('gmail.send'),
  })
}

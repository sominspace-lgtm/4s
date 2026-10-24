import { NextResponse } from 'next/server'
import { getConnection, googleConfigured, householdOwner, requireGoogleUser } from '@/lib/google/server'

// What the browser is allowed to know: configured, connected, which account,
// which permissions. Never a token.
export async function GET() {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ configured: googleConfigured(), connected: false, blocked: true }, { status: who.status === 401 ? 401 : 200 })
  const conn = googleConfigured() ? await getConnection(who.userId).catch(() => null) : null
  const scopes = conn?.scopes ?? ''
  const hOwner = googleConfigured() ? await householdOwner(who.userId).catch(() => null) : null
  const hConn = hOwner ? await getConnection(hOwner).catch(() => null) : null
  return NextResponse.json({
    configured: googleConfigured(),
    connected: !!conn,
    email: conn?.email ?? null,
    calendar: scopes.includes('/auth/calendar'),
    gmail: scopes.includes('gmail.readonly'),
    send: scopes.includes('gmail.send'),
    tasks: scopes.includes('/auth/tasks'),
    drive: scopes.includes('drive.readonly'),
    drafts: scopes.includes('gmail.compose'),
    // The household's shared Google account (2026-10-24).
    household: { available: !!hOwner, connected: !!hConn, email: hConn?.email ?? null },
  })
}

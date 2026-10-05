import { NextResponse } from 'next/server'
import { deleteConnection, requireGoogleUser } from '@/lib/google/server'

// Removes the stored tokens and asks Google to revoke them, so disconnecting
// in 4S really ends access rather than just forgetting it on our side.
export async function POST() {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const token = await deleteConnection(who.userId)
  if (token) {
    try {
      await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
      })
    } catch { /* already gone locally; revoke is best-effort */ }
  }
  return NextResponse.json({ ok: true })
}

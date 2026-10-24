import { NextResponse } from 'next/server'
import { deleteConnection, requireGoogleAccess } from '@/lib/google/server'

// Removes the stored tokens and asks Google to revoke them, so disconnecting
// in 4S really ends access rather than just forgetting it on our side.
export async function POST(request: Request) {
  const who = await requireGoogleAccess(new URL(request.url).searchParams.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const token = await deleteConnection(who.owner)
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

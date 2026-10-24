import { NextResponse } from 'next/server'
import { deleteConnection, requireGoogleUser, resolveOwner } from '@/lib/google/server'

// Removes the stored tokens and asks Google to revoke them, so disconnecting
// in 4S really ends access rather than just forgetting it on our side.
export async function POST(request: Request) {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const account = new URL(request.url).searchParams.get('account')
  let owner: string
  try { owner = await resolveOwner(who.userId, account) } catch { return NextResponse.json({ ok: true }) }
  const token = await deleteConnection(owner)
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

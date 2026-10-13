import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveShare } from '@/lib/wishlist/share'

// A visitor on a shared wishlist marks something as theirs to buy, or takes it
// back (2026-10-12). No account: the link's token is the credential, every
// write is pinned to that link's owner and list, and un-claiming needs the
// private key handed back when the claim was made.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const share = await resolveShare(token)
  if (!share) return NextResponse.json({ error: 'This link is not valid.' }, { status: 404 })

  const b = await request.json().catch(() => ({})) as { id?: string; action?: string; name?: string; key?: string }
  const id = typeof b.id === 'string' ? b.id : ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const admin = createAdminClient()
  let q = admin.from('wish_items').select('id, reserved_by, claimed_name, claim_key')
    .eq('id', id).eq('user_id', share.userId).eq('status', 'wanted')
  if (share.list) q = q.eq('list', share.list)
  const { data: wish } = await q.maybeSingle()
  if (!wish) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (b.action === 'claim') {
    if (wish.reserved_by || wish.claimed_name) return NextResponse.json({ error: 'Someone already has this one.' }, { status: 409 })
    const key = crypto.randomBytes(16).toString('hex')
    const name = (typeof b.name === 'string' ? b.name.trim().slice(0, 40) : '') || 'A friend'
    const { error } = await admin.from('wish_items').update({ claimed_name: name, claim_key: key }).eq('id', id).is('claimed_name', null)
    if (error) return NextResponse.json({ error: 'Could not save that.' }, { status: 500 })
    return NextResponse.json({ ok: true, key })
  }

  if (b.action === 'unclaim') {
    if (!wish.claim_key || typeof b.key !== 'string' || b.key !== wish.claim_key) {
      return NextResponse.json({ error: 'Only the person who claimed it can undo it.' }, { status: 403 })
    }
    await admin.from('wish_items').update({ claimed_name: null, claim_key: null }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

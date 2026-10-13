import { createAdminClient } from '@/lib/supabase/admin'

// A shared wishlist link (2026-10-12). The random token is the only
// credential: it resolves to one owner and, optionally, one list. Everything
// the public page can read or change is pinned to that owner here.

export interface SharedWish {
  id: string
  name: string
  url: string | null
  image_url: string | null
  price: number | null
  store: string | null
  notes: string | null
  priority: number
  list: string
  taken: boolean
}

export interface ResolvedShare {
  token: string
  userId: string
  list: string | null
  title: string
  ownerName: string | null
}

export function validToken(token: string): boolean {
  return typeof token === 'string' && token.length >= 16 && token.length <= 64 && /^[A-Za-z0-9_-]+$/.test(token)
}

export async function resolveShare(token: string): Promise<ResolvedShare | null> {
  if (!validToken(token)) return null
  const admin = createAdminClient()
  const { data } = await admin.from('wish_shares').select('token, user_id, list, title').eq('token', token).maybeSingle()
  if (!data) return null
  const { data: prefs } = await admin.from('user_prefs').select('display_name').eq('user_id', data.user_id).maybeSingle()
  return {
    token: data.token as string,
    userId: data.user_id as string,
    list: (data.list as string | null) ?? null,
    title: data.title as string,
    ownerName: ((prefs?.display_name as string | null) ?? '').trim() || null,
  }
}

export async function sharedWishes(share: ResolvedShare): Promise<SharedWish[]> {
  const admin = createAdminClient()
  let q = admin.from('wish_items')
    .select('id, name, url, image_url, price, store, notes, priority, list, reserved_by, claimed_name')
    .eq('user_id', share.userId).eq('status', 'wanted')
  if (share.list) q = q.eq('list', share.list)
  const { data } = await q.order('priority', { ascending: false }).order('created_at', { ascending: false })
  return ((data ?? []) as (Omit<SharedWish, 'taken'> & { reserved_by: string | null; claimed_name: string | null })[]).map(w => ({
    id: w.id, name: w.name, url: w.url, image_url: w.image_url, price: w.price, store: w.store,
    notes: w.notes, priority: w.priority, list: w.list, taken: !!(w.reserved_by || w.claimed_name),
  }))
}

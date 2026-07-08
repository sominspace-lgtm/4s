import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Per-item "Shared With Me" feed. Complements /shared-with-me (which reports
// whole-section sharing via companions.shared_sections): this route surfaces
// the individual items a friend shared with the ⇆ ShareMenu (shared_item_links),
// which otherwise never appeared on the recipient's side at all.
//
// Reads run through the admin client because the shared rows and the items
// they point at belong to the *owner*, not the viewer — RLS would hide them.
// We stay safe by filtering strictly to links targeted at this user (directly
// or through an accepted space membership) before resolving anything.

interface ItemSource {
  table: string
  titleCol: string
  label: string
}

// item_type → where its content lives + how to title it. Mirrors the types
// ShareMenu can produce (work_item, buy_item, capture, wishlist_item).
const SOURCES: Record<string, ItemSource> = {
  work_item:     { table: 'work_items',     titleCol: 'title', label: 'Task' },
  buy_item:      { table: 'buy_items',      titleCol: 'name',  label: 'Buy Again' },
  capture:       { table: 'captures',       titleCol: 'text',  label: 'Note' },
  wishlist_item: { table: 'wishlist_items', titleCol: 'name',  label: 'Wishlist' },
}

interface Link {
  id: string
  owner_id: string
  item_type: string
  item_id: string
  permission: 'view' | 'edit'
  space_id: string | null
  created_at: string
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Which spaces is this user an accepted member of?
  const { data: memberRows } = await admin
    .from('shared_space_members')
    .select('space_id')
    .eq('member_id', user.id)
    .eq('status', 'accepted')
  const spaceIds = (memberRows ?? []).map(m => m.space_id as string)

  // Links targeted directly at the user, plus links shared into their spaces.
  const [directRes, spaceRes] = await Promise.all([
    admin.from('shared_item_links')
      .select('id, owner_id, item_type, item_id, permission, space_id, created_at')
      .eq('shared_with_user_id', user.id),
    spaceIds.length > 0
      ? admin.from('shared_item_links')
          .select('id, owner_id, item_type, item_id, permission, space_id, created_at')
          .in('space_id', spaceIds)
      : Promise.resolve({ data: [] as Link[] }),
  ])

  const links: Link[] = [...(directRes.data ?? []), ...((spaceRes.data as Link[]) ?? [])]
  if (links.length === 0) return NextResponse.json({ items: [] })

  // Resolve item titles in one query per table.
  const idsByType: Record<string, string[]> = {}
  for (const l of links) {
    if (!SOURCES[l.item_type]) continue
    ;(idsByType[l.item_type] ??= []).push(l.item_id)
  }
  const titles: Record<string, string> = {} // `${item_type}:${item_id}` -> title
  await Promise.all(Object.entries(idsByType).map(async ([type, ids]) => {
    const src = SOURCES[type]
    const { data } = await admin.from(src.table).select(`id, ${src.titleCol}`).in('id', ids)
    for (const row of ((data ?? []) as unknown as Record<string, string>[])) {
      titles[`${type}:${row.id}`] = row[src.titleCol]
    }
  }))

  // Space names (for "via <space>" attribution) and owner emails, each cached.
  const spaceNames: Record<string, string> = {}
  if (spaceIds.length > 0) {
    const { data } = await admin.from('shared_spaces').select('id, name').in('id', spaceIds)
    for (const s of (data ?? []) as { id: string; name: string }[]) spaceNames[s.id] = s.name
  }
  const emailCache: Record<string, string> = {}
  async function ownerEmail(ownerId: string): Promise<string> {
    if (emailCache[ownerId]) return emailCache[ownerId]
    const { data } = await admin.auth.admin.getUserById(ownerId)
    return (emailCache[ownerId] = data?.user?.email ?? 'unknown')
  }

  const items = await Promise.all(links.map(async l => {
    const src = SOURCES[l.item_type]
    return {
      id: l.id,
      itemType: l.item_type,
      typeLabel: src?.label ?? l.item_type,
      title: titles[`${l.item_type}:${l.item_id}`] ?? '(deleted item)',
      available: titles[`${l.item_type}:${l.item_id}`] !== undefined,
      permission: l.permission,
      ownerEmail: await ownerEmail(l.owner_id),
      via: l.space_id ? (spaceNames[l.space_id] ?? 'a space') : null,
      createdAt: l.created_at,
    }
  }))

  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return NextResponse.json({ items })
}

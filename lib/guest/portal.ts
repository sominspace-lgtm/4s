import { createAdminClient } from '@/lib/supabase/admin'
import type { MenuItem, AgendaItem, PetInfo } from '@/lib/hooks/useGathering'

// THE boundary for the Guest Layer (see supabase/migrations/guest_gatherings.sql).
//
// A party guest opens /g/<token> on their phone with no account and no
// Supabase session. Every write goes through /api/g/<token> with the
// service-role client; the random `token` is the only credential, and it
// resolves to exactly one gathering — every write below is pinned to that
// gathering's own id and space_id, and `kind` is checked against a
// hardcoded allowlist. A guest can never name another table or another
// space.

export type GuestKind = 'photo' | 'thank_you' | 'guestbook' | 'note' | 'song' | 'from' | 'fridge'

// Fields a guest may set, per kind. Anything else in the body is dropped
// (not rejected) so an older portal build never starts failing when this
// list grows — same rule lib/household/resources.ts uses for the bot.
export const KIND_FIELDS: Record<GuestKind, { body: boolean; meta: string[] }> = {
  thank_you: { body: true, meta: [] },
  guestbook: { body: true, meta: ['avatar'] },
  note: { body: true, meta: [] },
  song: { body: true, meta: ['title', 'url'] },
  from: { body: true, meta: ['place', 'lat', 'lng'] },
  fridge: { body: true, meta: ['icon'] },
  photo: { body: false, meta: [] }, // handled by the photo route, not the text route
}

export interface GuestInfo {
  wifiName?: string
  wifiPassword?: string
  notes?: string
}

export interface PinnedMessage { name: string | null; body: string }

export interface ResolvedGathering {
  id: string
  spaceId: string
  title: string
  musicUrl: string | null
  photoAlbumUrl: string | null
  active: boolean
  guestInfo: GuestInfo
  menu: MenuItem[]
  agenda: AgendaItem[]
  petInfo: PetInfo
  pinnedContributionId: string | null
  /** Only populated when resolveGathering(token, { full: true }). */
  pinnedMessage: PinnedMessage | null
  /** Host display names, for the "find a host" picker. `full` only. */
  hosts: { name: string }[]
}

/**
 * Resolve a gathering by its public token. null = no such token.
 *
 * `full` adds two extra queries (the pinned message + host names) — pass
 * it from the page loader, not from the hot /api/g POST path.
 */
export async function resolveGathering(
  token: string,
  opts?: { full?: boolean },
): Promise<ResolvedGathering | null> {
  if (!token || token.length < 8 || token.length > 64) return null
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('gatherings')
    .select('id, space_id, title, music_url, photo_album_url, active, closes_at, menu, agenda, pinned_contribution_id')
    .eq('token', token)
    .maybeSingle()
  if (error || !data) return null
  const closed = data.closes_at ? new Date(data.closes_at).getTime() < Date.now() : false

  const { data: space } = await admin
    .from('shared_spaces')
    .select('guest_info, pet_info, owner_id')
    .eq('id', data.space_id)
    .maybeSingle()

  let pinnedMessage: PinnedMessage | null = null
  let hosts: { name: string }[] = []
  if (opts?.full) {
    if (data.pinned_contribution_id) {
      const { data: pin } = await admin
        .from('guest_contributions')
        .select('guest_name, body, status')
        .eq('id', data.pinned_contribution_id)
        .maybeSingle()
      if (pin && pin.status === 'visible' && pin.body) {
        pinnedMessage = { name: pin.guest_name ?? null, body: pin.body }
      }
    }
    hosts = await resolveHostNames(admin, data.space_id, (space?.owner_id as string | null) ?? null)
  }

  return {
    id: data.id,
    spaceId: data.space_id,
    title: data.title,
    musicUrl: data.music_url,
    photoAlbumUrl: data.photo_album_url ?? null,
    active: data.active && !closed,
    guestInfo: (space?.guest_info as GuestInfo | null) ?? {},
    menu: (data.menu as MenuItem[] | null) ?? [],
    agenda: (data.agenda as AgendaItem[] | null) ?? [],
    petInfo: (space?.pet_info as PetInfo | null) ?? {},
    pinnedContributionId: (data.pinned_contribution_id as string | null) ?? null,
    pinnedMessage,
    hosts,
  }
}

/** Owner + accepted members → display names, in a stable order (owner first). */
async function resolveHostNames(
  admin: ReturnType<typeof createAdminClient>,
  spaceId: string,
  ownerId: string | null,
): Promise<{ name: string }[]> {
  const { data: members } = await admin
    .from('shared_space_members')
    .select('member_id, status')
    .eq('space_id', spaceId)
  const ids: string[] = []
  if (ownerId) ids.push(ownerId)
  for (const m of (members ?? []) as { member_id: string | null; status: string }[]) {
    if (m.member_id && m.status === 'accepted' && !ids.includes(m.member_id)) ids.push(m.member_id)
  }
  if (!ids.length) return []
  const { data: prefs } = await admin
    .from('user_prefs')
    .select('user_id, display_name')
    .in('user_id', ids)
  const byId = new Map((prefs ?? []).map(p => [p.user_id as string, (p.display_name as string | null) ?? '']))
  return ids
    .map(id => ({ name: (byId.get(id) ?? '').trim() }))
    .filter(h => h.name.length > 0)
}

/** Server-side recipient ids for a ping (never sent to the client). */
export async function resolveHostRecipients(spaceId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data: space } = await admin.from('shared_spaces').select('owner_id').eq('id', spaceId).maybeSingle()
  const { data: members } = await admin
    .from('shared_space_members')
    .select('member_id, status')
    .eq('space_id', spaceId)
  const ids: string[] = []
  const ownerId = (space?.owner_id as string | null) ?? null
  if (ownerId) ids.push(ownerId)
  for (const m of (members ?? []) as { member_id: string | null; status: string }[]) {
    if (m.member_id && m.status === 'accepted' && !ids.includes(m.member_id)) ids.push(m.member_id)
  }
  return ids
}

export function pick<T extends Record<string, unknown>>(src: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (src[k] !== undefined && src[k] !== null && src[k] !== '') out[k] = src[k]
  return out
}

/** Trim + hard-cap a free-text field so a guest can't paste a novel. */
export function clip(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

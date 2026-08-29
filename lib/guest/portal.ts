import { createAdminClient } from '@/lib/supabase/admin'

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

export interface ResolvedGathering {
  id: string
  spaceId: string
  title: string
  musicUrl: string | null
  photoAlbumUrl: string | null
  active: boolean
}

/** Resolve a gathering by its public token. null = no such token. */
export async function resolveGathering(token: string): Promise<ResolvedGathering | null> {
  if (!token || token.length < 8 || token.length > 64) return null
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('gatherings')
    .select('id, space_id, title, music_url, photo_album_url, active, closes_at')
    .eq('token', token)
    .maybeSingle()
  if (error || !data) return null
  const closed = data.closes_at ? new Date(data.closes_at).getTime() < Date.now() : false
  return {
    id: data.id,
    spaceId: data.space_id,
    title: data.title,
    musicUrl: data.music_url,
    photoAlbumUrl: data.photo_album_url ?? null,
    active: data.active && !closed,
  }
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

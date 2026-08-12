import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// THE privacy boundary for the Discord integration (spec §14).
//
// The bot never gets a Supabase key. It presents a bearer token, which resolves
// to exactly one (space_id, user_id) pair, and every query in this module is
// pinned to that space_id and to a table in RESOURCES below.
//
// This is why the allowlist is a hardcoded const and not a string from the
// request: work_items, captures, habits, journal and money tables are
// unreachable from Discord because no code path here can name them. Adding a
// table to RESOURCES is the single decision point for widening what Discord can
// see — treat it as a privacy review, not a config change.

export const RESOURCES = {
  rules: {
    table: 'household_rules',
    columns: 'id, text, category, note, active, created_at, updated_at',
    // Fields the bot may set on create, and may change on update. Anything else
    // in the request body is dropped rather than rejected — a bot on an older
    // build shouldn't start failing when this list changes.
    insert: ['text', 'category', 'note'],
    update: ['text', 'category', 'note', 'active'],
    order: 'created_at',
  },
  shopping: {
    table: 'household_shopping',
    columns: 'id, name, qty, category, got, created_at',
    insert: ['name', 'qty', 'category'],
    update: ['name', 'qty', 'category', 'got'],
    order: 'created_at',
  },
  chores: {
    table: 'household_chores',
    columns: 'id, name, cadence_days, last_done_at, created_at',
    // cadence_days 0 means a one-off task ("clean the bathroom Sunday") rather
    // than a recurring chore — same table, so Discord and the Household tab
    // never disagree about what's outstanding.
    insert: ['name', 'cadence_days'],
    update: ['name', 'cadence_days', 'last_done_at'],
    order: 'created_at',
  },
  facts: {
    table: 'home_facts',
    columns: 'id, label, value, category, created_at',
    insert: ['label', 'value', 'category'],
    update: ['label', 'value', 'category'],
    order: 'created_at',
  },
  inventory: {
    table: 'household_inventory',
    columns: 'id, name, room, note, created_at',
    insert: ['name', 'room', 'note'],
    update: ['name', 'room', 'note'],
    order: 'created_at',
  },
  notes: {
    table: 'household_notes',
    columns: 'id, body, pinned, created_at',
    insert: ['body', 'pinned'],
    update: ['body', 'pinned'],
    order: 'created_at',
  },
  // Not household chores, but they ride the same household link/token: a
  // couple's household is the same group either way, and a second auth model
  // for these would be pure duplication (2026-08-10).
  watchlist: {
    table: 'household_watchlist',
    columns: 'id, domain, title, subtype, status, created_at, updated_at',
    insert: ['domain', 'title', 'subtype', 'status'],
    update: ['title', 'subtype', 'status'],
    order: 'created_at',
  },
  dateIdeas: {
    table: 'household_date_ideas',
    columns: 'id, title, items, created_at',
    insert: ['title', 'items'],
    update: ['title', 'items'],
    order: 'created_at',
  },
  // Goals (2026-08-11). Every query in this module is pinned to the token's
  // space_id, and a personal goal has space_id null — so Discord can only
  // ever see goals explicitly SHARED with the household. Personal goals stay
  // invisible to the bot by the same mechanism that hides work_items, without
  // needing a rule of its own.
  goals: {
    table: 'goals',
    columns: 'id, title, why, next_action, status, last_touched_at, created_at',
    insert: ['title', 'why', 'next_action'],
    update: ['title', 'why', 'next_action', 'status', 'last_touched_at'],
    order: 'last_touched_at',
  },
  // Saved places (2026-08-12). Same reasoning as goals: a personal pin has
  // space_id null and every query here is pinned to the token's space, so
  // the bot can only ever see places explicitly shared with the household.
  // `details`, `provenance` and `verified_at` are NOT in insert/update — the
  // bot must not be able to stamp a field as looked-up/verified. Enrichment
  // happens in 4S, where the lookup provider lives, or not at all.
  places: {
    table: 'places',
    columns: 'id, name, kind, note, address, city, country, lat, lng, status, tags, maps_url, provider, provider_place_id, verified_at, created_at',
    insert: ['name', 'kind', 'note', 'address', 'city', 'country', 'lat', 'lng', 'status', 'tags', 'maps_url'],
    update: ['name', 'kind', 'note', 'status', 'tags'],
    order: 'created_at',
  },
  // Move-in items (2026-08-12) — furniture/appliance purchases for a shared
  // move, separate from household_shopping (groceries). Same shape, same
  // reasoning as shopping's own RESOURCES entry.
  moveinItems: {
    table: 'household_movein_items',
    columns: 'id, name, category, got, created_at',
    insert: ['name', 'category'],
    update: ['name', 'category', 'got'],
    order: 'created_at',
  },
} as const

export type ResourceName = keyof typeof RESOURCES

export function isResource(name: string): name is ResourceName {
  return Object.prototype.hasOwnProperty.call(RESOURCES, name)
}

export interface HouseholdCaller {
  spaceId: string
  /** The 4S user whose Discord account was linked — writes are attributed here,
   *  so "who added this" stays true instead of collapsing onto whoever set the
   *  integration up. */
  userId: string
  linkId: string
}

/** Tokens are stored hashed: a leaked database dump must not hand someone write
 *  access to the household. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Resolves the bearer token on a request to a household caller, or null.
 *
 * Uses the admin client deliberately: the bot has no Supabase session, so RLS
 * has no auth.uid() to work with. The scoping that RLS would normally provide
 * is enforced here instead, by pinning every downstream query to the space_id
 * this token resolved to.
 */
export async function resolveHouseholdToken(request: Request): Promise<HouseholdCaller | null> {
  const header = request.headers.get('authorization') ?? ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('household_discord_links')
    .select('id, space_id, user_id')
    .eq('token_hash', hashToken(token))
    .maybeSingle()
  if (!data) return null

  // Best-effort activity stamp; a failure here must never fail the request.
  void admin
    .from('household_discord_links')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => undefined)

  return { spaceId: data.space_id, userId: data.user_id, linkId: data.id }
}

/** Keeps only the fields this resource allows, dropping unknown keys silently. */
export function pick(body: Record<string, unknown>, allowed: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  return out
}

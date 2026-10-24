import { createAdminClient } from '@/lib/supabase/admin'
import { listEvents, type CalEvent } from './calendar'

// Sharing your own Google Calendar (2026-10-24). Settings live in
// google_shares (server only). "partner" is the other person in your
// household; "household" means the shared screen. With details off, the
// other side only sees "Busy".

export interface Shares { calendar_partner: boolean; calendar_household: boolean; details: boolean }
export const NO_SHARES: Shares = { calendar_partner: false, calendar_household: false, details: true }

export async function getShares(userId: string): Promise<Shares> {
  const { data } = await createAdminClient().from('google_shares')
    .select('calendar_partner, calendar_household, details').eq('user_id', userId).maybeSingle()
  return (data as Shares | null) ?? NO_SHARES
}

export async function setShares(userId: string, patch: Partial<Shares>): Promise<string | null> {
  const clean: Partial<Shares> = {}
  for (const k of ['calendar_partner', 'calendar_household', 'details'] as const) {
    if (typeof patch[k] === 'boolean') clean[k] = patch[k]
  }
  const { error } = await createAdminClient().from('google_shares')
    .upsert({ user_id: userId, ...clean, updated_at: new Date().toISOString() })
  return error ? error.message : null
}

/** Everyone in this person's household (owner and accepted members), themselves included. */
export async function householdPeople(userId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data: m } = await admin.from('shared_space_members').select('space_id').eq('member_id', userId).eq('status', 'accepted').limit(1).maybeSingle()
  const { data: own } = await admin.from('shared_spaces').select('id').eq('owner_id', userId).limit(1).maybeSingle()
  const spaceId = (m?.space_id as string | undefined) ?? (own?.id as string | undefined)
  if (!spaceId) return [userId]
  const [{ data: sp }, { data: mem }] = await Promise.all([
    admin.from('shared_spaces').select('owner_id').eq('id', spaceId).maybeSingle(),
    admin.from('shared_space_members').select('member_id').eq('space_id', spaceId).eq('status', 'accepted'),
  ])
  return [...new Set([sp?.owner_id as string, ...(mem ?? []).map(r => r.member_id as string)].filter(Boolean))]
}

async function displayName(userId: string): Promise<string> {
  const { data } = await createAdminClient().from('user_prefs').select('display_name').eq('user_id', userId).maybeSingle()
  const n = (data?.display_name as string | null | undefined)?.trim()
  return n ? n.split(/\s+/)[0] : 'Partner'
}

export interface SharedCalEvent extends CalEvent { who: string }

/**
 * Calendar events other people have shared with this viewer.
 * mode 'partner': the other person's, if they share with you.
 * mode 'household': everyone's who shows theirs on the shared screen.
 */
export async function sharedCalendarEvents(viewerId: string, mode: 'partner' | 'household', from: Date, to: Date): Promise<SharedCalEvent[]> {
  const people = (await householdPeople(viewerId)).filter(id => mode === 'household' || id !== viewerId)
  const out: SharedCalEvent[] = []
  for (const id of people) {
    const s = await getShares(id)
    if (mode === 'partner' ? !s.calendar_partner : !s.calendar_household) continue
    let events: CalEvent[]
    try { events = await listEvents(id, from, to) } catch { continue }
    const who = await displayName(id)
    for (const e of events) {
      out.push(s.details ? { ...e, who } : { ...e, title: 'Busy', location: null, link: null, who })
    }
  }
  return out
}

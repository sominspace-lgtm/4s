import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Proxies the separate Companion Discord-bot backend (private Oracle VM,
// repo sominspace-lgtm/companion) so its API key never reaches the browser.
//
// SECURITY: the connection (api_url + api_key) is looked up per CONFIRMED
// relationship_pairs row, never from a global env var. A global key would
// mean every 4S user hitting this route sees the same couple's Discord bot
// data — fine for a single developer, broken the moment a second couple
// signs up. Each pair gets its own row in companion_connections, gated by
// RLS to only the two confirmed people in that pair (see
// companion_connections.sql). If there's no confirmed pair, or the pair
// hasn't set up a connection yet, this returns mock data instead of ever
// falling back to someone else's real credentials.
//
// Three non-live states, handled differently:
//   - no confirmed relationship_pairs row  -> needsPair: true, mock data
//   - confirmed pair, no connection saved  -> needsConnection: true, mock data
//   - connection saved but unreachable     -> degraded: true, empty arrays

export interface CompanionCheckin {
  id: string; weekOf: string; status: 'completed' | 'pending'
  completedBy: string[]; summary: string; date: string
}
export interface CompanionTrackedItem {
  id: string; title: string; type: 'watchlist' | 'gaming'; status: string
}
export interface CompanionDateNightIdea {
  id: string; title: string; notes: string; createdAt: string
}
export interface CompanionOnThisDay {
  id: string; text: string; date: string; yearsAgo: number
}
export interface CompanionPhoto {
  id: string; url: string; caption: string; date: string; source: string
}
interface CompanionSummary {
  checkins: CompanionCheckin[]
  trackedItems: CompanionTrackedItem[]
  dateNightIdeas: CompanionDateNightIdea[]
  onThisDay: CompanionOnThisDay[]
  photos: CompanionPhoto[]
}

const CONFIRMABLE_TYPES = ['checkin', 'tracked_item', 'date_night', 'on_this_day'] as const
type ConfirmableType = typeof CONFIRMABLE_TYPES[number]

const MOCK_SUMMARY: CompanionSummary = {
  checkins: [
    { id: 'mock-checkin-1', weekOf: '2026-07-14', status: 'completed', completedBy: ['partnerA', 'partnerB'], summary: 'Good week — talked through the trip budget.', date: '2026-07-14T18:00:00Z' },
    { id: 'mock-checkin-2', weekOf: '2026-07-07', status: 'pending', completedBy: ['partnerA'], summary: 'Quick one, mostly logistics.', date: '2026-07-07T18:00:00Z' },
  ],
  trackedItems: [
    { id: 'mock-track-1', title: 'The Bear S4', type: 'watchlist', status: 'in progress' },
    { id: 'mock-track-2', title: 'It Takes Two', type: 'gaming', status: 'want to play' },
  ],
  dateNightIdeas: [
    { id: 'mock-date-1', title: 'Night market downtown', notes: 'Saw a post about it, ends this month.', createdAt: '2026-07-10T12:00:00Z' },
  ],
  onThisDay: [
    { id: 'mock-otd-1', text: 'First trip together', date: '2024-07-16T00:00:00Z', yearsAgo: 2 },
  ],
  photos: [
    { id: 'mock-photo-1', url: 'https://placehold.co/480x480?text=Google+Photos', caption: 'Preview only — real photos come from Companion', date: '2026-07-01T00:00:00Z', source: 'google_photos' },
  ],
}

function withConfirmations(
  summary: CompanionSummary,
  confirmations: { item_type: string; item_id: string; user_id: string }[],
  userId: string,
  partnerId: string | null,
) {
  const byKey = new Map<string, string[]>()
  for (const c of confirmations) {
    const key = `${c.item_type}:${c.item_id}`
    ;(byKey.get(key) ?? byKey.set(key, []).get(key)!).push(c.user_id)
  }
  function annotate<T extends { id: string }>(list: T[], type: ConfirmableType) {
    return list.map(item => {
      const confirmedUserIds = byKey.get(`${type}:${item.id}`) ?? []
      return {
        ...item,
        youConfirmed: confirmedUserIds.includes(userId),
        partnerConfirmed: !!partnerId && confirmedUserIds.includes(partnerId),
      }
    })
  }
  return {
    checkins: annotate(summary.checkins, 'checkin'),
    trackedItems: annotate(summary.trackedItems, 'tracked_item'),
    dateNightIdeas: annotate(summary.dateNightIdeas, 'date_night'),
    onThisDay: annotate(summary.onThisDay, 'on_this_day'),
    photos: summary.photos, // no confirmation workflow on photos
  }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS on relationship_pairs already scopes this to rows the caller is
  // requester or (confirmed) partner on.
  const { data: pair } = await supabase
    .from('relationship_pairs')
    .select('id, requester_id, partner_id, partner_email')
    .eq('status', 'confirmed')
    .or(`requester_id.eq.${user.id},partner_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle()

  if (!pair) {
    return NextResponse.json({
      needsPair: true, mocked: true, partner: null,
      ...withConfirmations(MOCK_SUMMARY, [], user.id, null),
    })
  }

  const partnerId = pair.requester_id === user.id ? pair.partner_id : pair.requester_id
  const partner = partnerId ? { id: partnerId, email: pair.partner_email } : null

  // RLS on relationship_sync_confirmations scopes this to the caller's own
  // rows plus their confirmed partner's — no admin client needed.
  const { data: confirmations } = await supabase
    .from('relationship_sync_confirmations')
    .select('item_type, item_id, user_id')
  const confirmationRows = confirmations ?? []

  // RLS on companion_connections scopes this to confirmed pair members only.
  const { data: connection } = await supabase
    .from('companion_connections')
    .select('api_url, api_key')
    .eq('pair_id', pair.id)
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({
      needsConnection: true, mocked: true, partner,
      ...withConfirmations(MOCK_SUMMARY, confirmationRows, user.id, partnerId),
    })
  }

  try {
    const res = await fetch(`${connection.api_url.replace(/\/$/, '')}/api/summary`, {
      headers: { 'x-api-key': connection.api_key },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Companion responded ${res.status}`)
    const data = (await res.json()) as CompanionSummary
    return NextResponse.json({
      degraded: false, partner,
      ...withConfirmations(data, confirmationRows, user.id, partnerId),
    })
  } catch {
    // VM down, network error, bad response shape — never throw. The client
    // renders "quiet for now" language, never alarm colors, for this state.
    return NextResponse.json({
      degraded: true, partner,
      checkins: [], trackedItems: [], dateNightIdeas: [], onThisDay: [], photos: [],
    })
  }
}

export const CONFIRMABLE_ITEM_TYPES = CONFIRMABLE_TYPES

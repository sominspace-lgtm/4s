import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Proxies the separate Companion Discord-bot backend (private Oracle VM,
// repo sominspace-lgtm/companion) so its API key never reaches the browser.
// Two distinct "not the real thing" states, handled differently on purpose:
//
//   - COMPANION_API_URL/KEY unset  -> return realistic MOCK data (`mocked:
//     true`). Lets the Relationship UI be built and reviewed before the VM
//     is live, same spirit as the AI route's graceful-fallback pattern.
//   - Configured but unreachable (VM down, network error, non-2xx) -> return
//     a DEGRADED empty response (`degraded: true`), never throw. The client
//     renders "not reviewed yet" / "quiet for now", the existing status-
//     language rule for unset/error states — never alarm colors for this.

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

async function fetchConfirmations(userId: string) {
  const supabase = await createClient()
  // RLS on relationship_sync_confirmations already scopes this to the caller's
  // own rows plus a mutually-accepted companion's — no admin client needed.
  const { data } = await supabase
    .from('relationship_sync_confirmations')
    .select('item_type, item_id, user_id, confirmed_at')
  return data ?? []
}

async function partnerInfo(userId: string): Promise<{ id: string; email: string } | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companions')
    .select('inviter_id, invitee_id, invitee_email')
    .eq('status', 'accepted')
    .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  const partnerId = data.inviter_id === userId ? data.invitee_id : data.inviter_id
  if (!partnerId) return null
  // invitee_email is stored at invite time; if the current user IS the
  // invitee, that field is the inviter's own address, not theirs — resolve
  // via admin lookup in that direction instead.
  if (data.inviter_id === userId) return { id: partnerId, email: data.invitee_email }
  const admin = createAdminClient()
  const { data: u } = await admin.auth.admin.getUserById(partnerId)
  return { id: partnerId, email: u?.user?.email ?? 'your partner' }
}

function withConfirmations(
  summary: CompanionSummary,
  confirmations: { item_type: string; item_id: string; user_id: string }[],
  userId: string,
  partner: { id: string; email: string } | null,
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
        partnerConfirmed: !!partner && confirmedUserIds.includes(partner.id),
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

  const apiUrl = process.env.COMPANION_API_URL
  const apiKey = process.env.COMPANION_API_KEY

  const partner = await partnerInfo(user.id)
  const confirmations = await fetchConfirmations(user.id)

  if (!apiUrl || !apiKey) {
    return NextResponse.json({
      mocked: true,
      partner,
      ...withConfirmations(MOCK_SUMMARY, confirmations, user.id, partner),
    })
  }

  try {
    const res = await fetch(`${apiUrl.replace(/\/$/, '')}/api/summary`, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`Companion responded ${res.status}`)
    const data = (await res.json()) as CompanionSummary
    return NextResponse.json({
      degraded: false,
      partner,
      ...withConfirmations(data, confirmations, user.id, partner),
    })
  } catch {
    // VM down, network error, bad response shape — never throw. Same empty
    // arrays, degraded:true tells the client to use quiet-state language
    // instead of treating this like "reviewed, nothing here."
    return NextResponse.json({
      degraded: true,
      partner,
      checkins: [], trackedItems: [], dateNightIdeas: [], onThisDay: [], photos: [],
    })
  }
}

export const CONFIRMABLE_ITEM_TYPES = CONFIRMABLE_TYPES

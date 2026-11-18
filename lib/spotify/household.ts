import { createAdminClient } from '@/lib/supabase/admin'
import { callerFor } from '@/lib/smarthome/auth'
import { currentDevice } from '@/lib/devices/session'
import { spacesFor } from '@/lib/devices/members'
import { linksFor } from './server'

// Whose Spotify a request may touch (2026-11-18): the linked accounts of the
// people in one household, decided on the server. A paired wall screen gets
// its own household only; a signed-in member, a household they belong to.
export async function householdSpotify(spaceId: unknown) {
  const caller = await callerFor(spaceId, true)
  if ('error' in caller) return { error: caller.error, status: caller.status } as const
  let space = caller.spaceId
  if (!space && caller.as === 'member') {
    // Signed in on the screen without naming a household: the screen's own
    // household if you are in it, otherwise your first one.
    const mine = await spacesFor(caller.userId)
    const device = await currentDevice()
    space = mine.find(s => s.id === device?.spaceId)?.id ?? mine[0]?.id ?? null
  }
  if (!space) return { error: 'Music needs a household.', status: 400 } as const
  const admin = createAdminClient()
  const [{ data: owner }, { data: members }] = await Promise.all([
    admin.from('shared_spaces').select('owner_id').eq('id', space).maybeSingle(),
    admin.from('shared_space_members').select('member_id').eq('space_id', space).eq('status', 'accepted'),
  ])
  const people = [...new Set([owner?.owner_id, ...(members ?? []).map(m => m.member_id)].filter((x): x is string => !!x))]
  return { links: await linksFor(people) } as const
}

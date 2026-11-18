import { createAdminClient } from '@/lib/supabase/admin'
import { callerFor } from '@/lib/smarthome/auth'
import { spacesFor } from '@/lib/devices/members'
import { linksFor, type Link } from './server'

// Whose Spotify a request may touch (2026-11-18): the linked accounts of the
// people in one household, decided on the server. A paired wall screen gets
// its own household only; a signed-in member, a household they belong to.
export async function householdSpotify(spaceId: unknown) {
  const caller = await callerFor(spaceId, true)
  if ('error' in caller) return { error: caller.error, status: caller.status } as const
  let spaces = caller.spaceId ? [caller.spaceId] : []
  if (!spaces.length && caller.as === 'member') {
    // Signed in without naming a household (the iPad in shared mode, or a
    // phone): every household you belong to.
    spaces = (await spacesFor(caller.userId)).map(s => s.id)
  }
  if (!spaces.length) return { error: 'Music needs a household.', status: 400 } as const
  return { links: await linksForSpaces(spaces) } as const
}

/** The linked Spotify accounts of everyone in these households. */
export async function linksForSpaces(spaces: string[]): Promise<Link[]> {
  if (!spaces.length) return []
  const admin = createAdminClient()
  const [{ data: owners }, { data: members }] = await Promise.all([
    admin.from('shared_spaces').select('owner_id').in('id', spaces),
    admin.from('shared_space_members').select('member_id').in('space_id', spaces).eq('status', 'accepted'),
  ])
  const people = [...new Set([...(owners ?? []).map(o => o.owner_id), ...(members ?? []).map(m => m.member_id)].filter((x): x is string => !!x))]
  return linksFor(people)
}

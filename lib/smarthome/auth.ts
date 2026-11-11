import { createClient } from '@/lib/supabase/server'
import { currentDevice } from '@/lib/devices/session'
import { spacesFor } from '@/lib/devices/members'

// Who is asking to change the house (2026-11-08), decided on the server.
//   member  one of you, signed in. May use any household you belong to.
//   screen  a paired wall screen. Only its own household, whatever the
//           request says, and only what screens are allowed (scenes).
export type Caller =
  | { as: 'member'; userId: string; spaceId: string | null }
  | { as: 'screen'; spaceId: string }

export async function callerFor(requestedSpaceId: unknown, allowScreen: boolean): Promise<Caller | { error: string; status: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    if (requestedSpaceId == null || requestedSpaceId === '') return { as: 'member', userId: user.id, spaceId: null }
    const spaces = await spacesFor(user.id)
    if (typeof requestedSpaceId !== 'string' || !spaces.some(s => s.id === requestedSpaceId)) {
      return { error: 'You are not in that household.', status: 403 }
    }
    return { as: 'member', userId: user.id, spaceId: requestedSpaceId }
  }
  if (allowScreen) {
    const device = await currentDevice()
    if (device) return { as: 'screen', spaceId: device.spaceId }
  }
  return { error: 'Sign in first.', status: 401 }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { checkChange, isOn, kindOf, sceneTarget, stateOf, type DeviceState } from './capabilities'
import { providerFor } from './providers'
import { isRestingScene, type Scene } from './apply'

// The one place a device actually changes (2026-11-08). Server-only. The
// caller has already decided who is asking and which household they may
// touch; everything here is pinned to that household (or, for a device on
// nobody's household, to its owner).

export type Scope = { spaceId: string } | { userId: string }

interface Row { id: string; name: string; kind: string | null; provider: string | null; state: unknown; on_state: boolean; space_id: string | null; external_id?: string | null; meta?: { celsius?: boolean } | null }

async function write(row: Row, change: DeviceState): Promise<{ ok: true; state: DeviceState } | { ok: false; error: string }> {
  const kind = kindOf(row.kind)
  const checked = checkChange(kind, change)
  if (!checked.ok) return checked
  const next = { ...stateOf(kind, row.state, row.on_state), ...checked.change }
  const sent = await providerFor(row.provider).send(
    { id: row.id, kind, name: row.name, spaceId: row.space_id, externalId: row.external_id ?? null, meta: row.meta ?? {} },
    next, checked.change)
  if (!sent.ok) return sent
  const { error } = await createAdminClient().from('household_smarthome_devices')
    .update({ state: next, on_state: isOn(kind, next), updated_at: new Date().toISOString() })
    .eq('id', row.id)
  if (error) return { ok: false, error: 'Could not save that.' }
  return { ok: true, state: next }
}

// external_id and meta arrive with the Home Assistant update; until it runs,
// the plain columns are used and nothing real is linked anyway.
const COLS_ST = 'id, name, kind, provider, state, on_state, space_id, external_id, meta'
const COLS_BASE = 'id, name, kind, provider, state, on_state, space_id'

// Reads device rows with the Home Assistant columns, falling back to the plain
// ones if that update has not run yet.
type Q = ReturnType<ReturnType<typeof createAdminClient>['from']>
async function rows(pick: (q: ReturnType<Q['select']>) => PromiseLike<{ data: unknown; error: unknown }>): Promise<Row[]> {
  const t = () => createAdminClient().from('household_smarthome_devices')
  const first = await pick(t().select(COLS_ST))
  if (!first.error) return (Array.isArray(first.data) ? first.data : first.data ? [first.data] : []) as Row[]
  const second = await pick(t().select(COLS_BASE))
  return (Array.isArray(second.data) ? second.data : second.data ? [second.data] : []) as Row[]
}

/** One device, one change. A hands-on change also ends the active scene. */
export async function setDevice(scope: Scope, deviceId: string, change: unknown) {
  const admin = createAdminClient()
  const [row] = await rows(q => ('spaceId' in scope
    ? q.eq('id', deviceId).eq('space_id', scope.spaceId)
    : q.eq('id', deviceId).eq('user_id', scope.userId).is('space_id', null)).maybeSingle())
  if (!row) return { ok: false as const, error: 'Device not found.' }
  const r = await write(row, change as DeviceState)
  if (r.ok && 'spaceId' in scope) await admin.from('shared_spaces').update({ active_scene: null }).eq('id', scope.spaceId)
  return r
}

/** Runs a saved scene for the household and records it as the active one. */
export async function runScene(spaceId: string, sceneId: string) {
  const admin = createAdminClient()
  const { data: space } = await admin.from('shared_spaces').select('scenes').eq('id', spaceId).maybeSingle()
  const scene = ((space?.scenes ?? []) as Scene[]).find(s => s.id === sceneId)
  if (!scene) return { ok: false as const, error: 'Scene not found.' }

  const ids = Object.keys(scene.devices ?? {})
  let failed = 0
  if (ids.length) {
    const list = await rows(q => q.eq('space_id', spaceId).in('id', ids))
    // Real devices answer slowly, so they all go at once.
    const done = await Promise.all(list.map(row => write(row, sceneTarget(kindOf(row.kind), scene.devices[row.id]))))
    failed = done.filter(r => !r.ok).length
  }
  const active = isRestingScene(scene.name) ? null : { id: scene.id, name: scene.name, appliedAt: new Date().toISOString() }
  await admin.from('shared_spaces').update({ active_scene: active }).eq('id', spaceId)
  return { ok: true as const, failed }
}

/** Everything that is on goes off: lights, plugs, switches, fans, speakers, TVs. Locks, blinds and the thermostat stay as they are. */
export async function allOff(spaceId: string) {
  const list = await rows(q => q.eq('space_id', spaceId).eq('on_state', true))
  const targets = list.filter(r => ['light', 'plug', 'switch', 'fan', 'speaker', 'tv'].includes(kindOf(r.kind)))
  const done = await Promise.all(targets.map(row => write(row, { on: false })))
  await createAdminClient().from('shared_spaces').update({ active_scene: null }).eq('id', spaceId)
  return { ok: true as const, count: targets.length, failed: done.filter(r => !r.ok).length }
}

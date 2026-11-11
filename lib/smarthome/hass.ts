import { createAdminClient } from '@/lib/supabase/admin'
import { isOn, type DeviceKind, type DeviceState } from './capabilities'
import { HA_DOMAINS, kindForHA, nameOfHA, stateFromHA, callsForHA, checkHAUrl, domainOf, type HAEntity } from './hassMap'

// Home Assistant (2026-11-10). Server-only. A household connects its own
// Home Assistant with its address and a long-lived access token made in Home
// Assistant (Profile, Security). Both live in smarthome_links, which only
// the service role can touch; the token never goes back to a browser.

interface Link { space_id: string; base_url: string; access_token: string; connected_by: string | null; synced_at: string | null }

export async function linkFor(spaceId: string): Promise<Link | null> {
  const { data, error } = await createAdminClient().from('smarthome_links')
    .select('space_id, base_url, access_token, connected_by, synced_at').eq('space_id', spaceId).maybeSingle()
  if (error) return null
  return (data as Link | null) ?? null
}

type Reply<T> = { ok: true; data: T } | { ok: false; error: string }

async function ha<T>(base: string, token: string, path: string, init?: { method?: string; body?: unknown; text?: boolean }): Promise<Reply<T>> {
  let r: Response
  try {
    r = await fetch(base + path, {
      method: init?.method ?? 'GET', cache: 'no-store', redirect: 'manual',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return { ok: false, error: 'Home Assistant did not answer. Is it on, and is the address right?' }
  }
  if (r.status === 401 || r.status === 403) return { ok: false, error: 'Home Assistant turned the key down. Make a new one and connect again.' }
  if (!r.ok) return { ok: false, error: 'Home Assistant did not answer. Try again in a moment.' }
  const data = init?.text ? await r.text() : await r.json().catch(() => null)
  return { ok: true, data: data as T }
}

/** Checks the address and key actually reach a Home Assistant, then saves them. */
export async function connectHA(spaceId: string, userId: string, rawUrl: string, token: string): Promise<string | null> {
  const u = checkHAUrl(rawUrl)
  if (!u.ok) return u.error
  const key = token.trim()
  if (key.length < 20 || /\s/.test(key)) return 'That key does not look right. Copy the whole long-lived access token.'
  const hello = await ha<{ message?: string }>(u.url, key, '/api/')
  if (!hello.ok) return hello.error
  if (!hello.data?.message) return 'That address answered, but not like a Home Assistant.'
  const { error } = await createAdminClient().from('smarthome_links').upsert({
    space_id: spaceId, provider: 'home_assistant', base_url: u.url, access_token: key, connected_by: userId,
    updated_at: new Date().toISOString(),
  })
  return error ? 'Could not save the connection. Has the Home Assistant database update been run?' : null
}

/** Sends one checked change to a real device. */
export async function sendToHA(spaceId: string, entityId: string, kind: DeviceKind, change: DeviceState, celsius: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const link = await linkFor(spaceId)
  if (!link) return { ok: false, error: 'Home Assistant is not connected.' }
  const calls = callsForHA(kind, entityId, change, celsius)
  if (calls.length === 0) return { ok: false, error: 'That device does not take that change.' }
  for (const c of calls) {
    const r = await ha(link.base_url, link.access_token, `/api/services/${c.domain}/${c.service}`, { method: 'POST', body: c.data })
    if (!r.ok) return r
  }
  return { ok: true }
}

// One template call gives every controllable entity's room (Home Assistant "area").
const AREA_TEMPLATE = `{% for s in states if s.domain in ${JSON.stringify([...HA_DOMAINS])} %}{{ s.entity_id }}|{{ area_name(s.entity_id) or '' }}
{% endfor %}`

/**
 * Brings the household's Home Assistant devices into Home controls: new ones
 * are added, names and status are refreshed, and ones that are gone from Home
 * Assistant are taken off. A room you set in SS wins over the Home Assistant one.
 */
export async function syncHA(spaceId: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const link = await linkFor(spaceId)
  if (!link) return { ok: false, error: 'Home Assistant is not connected.' }
  const [states, config, areasText] = await Promise.all([
    ha<HAEntity[]>(link.base_url, link.access_token, '/api/states'),
    ha<{ unit_system?: { temperature?: string } }>(link.base_url, link.access_token, '/api/config'),
    ha<string>(link.base_url, link.access_token, '/api/template', { method: 'POST', body: { template: AREA_TEMPLATE }, text: true }),
  ])
  if (!states.ok) return states
  const celsius = config.ok && (config.data?.unit_system?.temperature ?? '').includes('C')
  const areas = new Map<string, string>()
  if (areasText.ok) for (const line of String(areasText.data).split('\n')) {
    const [id, area] = line.trim().split('|')
    if (id && area) areas.set(id, area)
  }

  const wanted = (states.data ?? [])
    .map(e => ({ e, kind: kindForHA(e) }))
    .filter((x): x is { e: HAEntity; kind: DeviceKind } => !!x.kind && x.e.attributes?.hidden !== true)
    .slice(0, 200)

  const { data: existing } = await admin.from('household_smarthome_devices').select('id, external_id, room')
    .eq('space_id', spaceId).eq('provider', 'home_assistant')
  const byExt = new Map(((existing ?? []) as { id: string; external_id: string; room: string | null }[]).map(r => [r.external_id, r]))
  const now = new Date().toISOString()

  for (const { e, kind } of wanted) {
    const state = stateFromHA(kind, e, celsius)
    const room = areas.get(e.entity_id) || null
    const fields = {
      name: nameOfHA(e), kind, state, on_state: isOn(kind, state), updated_at: now,
      meta: { domain: domainOf(e.entity_id), celsius, offline: e.state === 'unavailable' },
    }
    const had = byExt.get(e.entity_id)
    if (had) {
      await admin.from('household_smarthome_devices').update(had.room ? fields : { ...fields, room, category: room }).eq('id', had.id)
      byExt.delete(e.entity_id)
    } else {
      await admin.from('household_smarthome_devices').insert({
        ...fields, room, category: room, user_id: link.connected_by, space_id: spaceId, provider: 'home_assistant', external_id: e.entity_id,
      })
    }
  }
  const gone = [...byExt.values()].map(r => r.id)
  if (gone.length) await admin.from('household_smarthome_devices').delete().in('id', gone)
  await admin.from('smarthome_links').update({ synced_at: now }).eq('space_id', spaceId)
  return { ok: true, count: wanted.length }
}

/** Forgets the Home Assistant connection and takes its devices off Home controls. */
export async function disconnectHA(spaceId: string) {
  const admin = createAdminClient()
  await admin.from('household_smarthome_devices').delete().eq('space_id', spaceId).eq('provider', 'home_assistant')
  await admin.from('smarthome_links').delete().eq('space_id', spaceId)
}

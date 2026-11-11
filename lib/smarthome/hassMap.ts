import type { DeviceKind, DeviceState } from './capabilities'

// Home Assistant to SS and back (2026-11-10). Pure, so it is easy to test:
// which kind of SS device a Home Assistant entity is, how its state reads as
// an SS state, and which Home Assistant service calls make an SS change happen.

export interface HAEntity {
  entity_id: string
  state: string
  attributes?: Record<string, unknown> & { friendly_name?: string; device_class?: string }
}

export interface HACall { domain: string; service: string; data: Record<string, unknown> }

/** The Home Assistant domains SS can control. Sensors and the rest are left out. */
export const HA_DOMAINS = ['light', 'switch', 'fan', 'climate', 'lock', 'cover', 'media_player'] as const

export const domainOf = (entityId: string) => entityId.split('.')[0]

/** The SS kind for an entity, or null for things SS can't control. */
export function kindForHA(e: HAEntity): DeviceKind | null {
  const dc = e.attributes?.device_class
  switch (domainOf(e.entity_id)) {
    case 'light': return 'light'
    case 'switch': return dc === 'outlet' ? 'plug' : 'switch'
    case 'fan': return 'fan'
    case 'climate': return 'thermostat'
    case 'lock': return 'lock'
    case 'cover': return 'blinds'
    case 'media_player': return dc === 'tv' ? 'tv' : 'speaker'
    default: return null
  }
}

export const nameOfHA = (e: HAEntity) =>
  String(e.attributes?.friendly_name || e.entity_id.split('.')[1]?.replace(/_/g, ' ') || 'Device').slice(0, 80)

const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const toF = (v: number, celsius: boolean) => (celsius ? Math.round(v * 9 / 5 + 32) : Math.round(v))
const fromF = (f: number, celsius: boolean) => (celsius ? Math.round(((f - 32) * 5 / 9) * 2) / 2 : f)

/** An entity's state, read as an SS state. `celsius` is the house's unit. */
export function stateFromHA(kind: DeviceKind, e: HAEntity, celsius = false): DeviceState {
  const a = e.attributes ?? {}
  const s = e.state
  const out: DeviceState = {}
  switch (kind) {
    case 'light': {
      out.on = s === 'on'
      const b = n(a.brightness)
      if (b !== null) out.brightness = Math.max(1, Math.round(b / 2.55))
      break
    }
    case 'plug': case 'switch': case 'fan':
      out.on = s === 'on'
      break
    case 'thermostat': {
      out.on = s !== 'off' && s !== 'unavailable'
      const t = n(a.temperature) ?? n(a.target_temp_low)
      if (t !== null) out.temperature = toF(t, celsius)
      break
    }
    case 'lock':
      if (s === 'locked' || s === 'unlocked') out.locked = s === 'locked'
      break
    case 'blinds': {
      const p = n(a.current_position)
      if (p !== null) out.position = Math.round(p)
      else if (s === 'open' || s === 'closed') out.position = s === 'open' ? 100 : 0
      break
    }
    case 'speaker': case 'tv': {
      out.on = !['off', 'standby', 'unavailable', 'unknown'].includes(s)
      const v = n(a.volume_level)
      if (v !== null) out.volume = Math.round(v * 100)
      break
    }
  }
  return out
}

/** The Home Assistant service calls that carry out one checked SS change. */
export function callsForHA(kind: DeviceKind, entityId: string, change: DeviceState, celsius = false): HACall[] {
  const domain = domainOf(entityId)
  const call = (service: string, data: Record<string, unknown> = {}, d = domain): HACall => ({ domain: d, service, data: { entity_id: entityId, ...data } })
  const out: HACall[] = []
  if (kind === 'thermostat') {
    if (change.on !== undefined) out.push(change.on ? call('turn_on') : call('set_hvac_mode', { hvac_mode: 'off' }))
    if (change.temperature !== undefined) out.push(call('set_temperature', { temperature: fromF(change.temperature, celsius) }))
    return out
  }
  if (kind === 'light' && change.brightness !== undefined && change.on !== false) {
    out.push(call('turn_on', { brightness_pct: change.brightness }))
  } else if (change.on !== undefined) {
    out.push(call(change.on ? 'turn_on' : 'turn_off'))
  }
  if (change.volume !== undefined && domain === 'media_player') out.push(call('volume_set', { volume_level: Math.round(change.volume) / 100 }))
  if (change.locked !== undefined && domain === 'lock') out.push(call(change.locked ? 'lock' : 'unlock'))
  if (change.position !== undefined && domain === 'cover') {
    if (change.position <= 0) out.push(call('close_cover'))
    else if (change.position >= 100) out.push(call('open_cover'))
    else out.push(call('set_cover_position', { position: change.position }))
  }
  return out
}

/**
 * Checks the address someone typed for their Home Assistant. It has to be a
 * public https address: SS runs in the cloud, and this keeps it from being
 * pointed at private or local addresses.
 */
export function checkHAUrl(raw: string): { ok: true; url: string } | { ok: false; error: string } {
  let u: URL
  try { u = new URL(raw.trim()) } catch { return { ok: false, error: 'That does not look like a web address.' } }
  if (u.protocol !== 'https:') return { ok: false, error: 'Use the https address of your Home Assistant.' }
  const h = u.hostname.toLowerCase()
  const privateHost = h === 'localhost' || h.endsWith('.local') || h.endsWith('.localhost') || h.endsWith('.internal')
    || /^(127|10|0)\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^169\.254\./.test(h)
    || h.startsWith('[') || /^\d+$/.test(h)
  if (privateHost) return { ok: false, error: 'That is a home-only address. Use the address that works away from home.' }
  return { ok: true, url: `${u.protocol}//${u.host}` }
}

// The Controller's rules (2026-11-08): what each kind of device can do, how a
// change is checked before it goes anywhere, and how a device's state reads.
// Pure, so it runs the same in the browser, on the server and in tests.

export const KINDS = ['light', 'plug', 'switch', 'thermostat', 'lock', 'blinds', 'speaker', 'fan', 'tv'] as const
export type DeviceKind = (typeof KINDS)[number]

export type Capability = 'power' | 'brightness' | 'temperature' | 'lock' | 'position' | 'volume'

export const KIND_INFO: Record<DeviceKind, { label: string; caps: Capability[] }> = {
  light: { label: 'Light', caps: ['power', 'brightness'] },
  plug: { label: 'Plug', caps: ['power'] },
  switch: { label: 'Switch', caps: ['power'] },
  thermostat: { label: 'Thermostat', caps: ['power', 'temperature'] },
  lock: { label: 'Lock', caps: ['lock'] },
  blinds: { label: 'Blinds', caps: ['position'] },
  speaker: { label: 'Speaker', caps: ['power', 'volume'] },
  fan: { label: 'Fan', caps: ['power'] },
  tv: { label: 'TV', caps: ['power'] },
}

export interface DeviceState {
  on?: boolean
  /** 1 to 100. */
  brightness?: number
  /** Target, in °F, 55 to 85. */
  temperature?: number
  locked?: boolean
  /** 0 closed to 100 open. */
  position?: number
  /** 0 to 100. */
  volume?: number
}

export const TEMP_MIN = 55
export const TEMP_MAX = 85

export function kindOf(k: unknown): DeviceKind {
  return typeof k === 'string' && (KINDS as readonly string[]).includes(k) ? (k as DeviceKind) : 'switch'
}

export function can(kind: DeviceKind, cap: Capability): boolean {
  return KIND_INFO[kind].caps.includes(cap)
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)))
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/**
 * Checks a requested change against what this kind of device can do. Unknown
 * fields and things the device can't do are an error, not silently dropped,
 * so a bad request never half-applies. Numbers are clamped to safe ranges.
 */
export function checkChange(kind: DeviceKind, change: unknown): { ok: true; change: DeviceState } | { ok: false; error: string } {
  if (!change || typeof change !== 'object' || Array.isArray(change)) return { ok: false, error: 'Nothing to change.' }
  const out: DeviceState = {}
  for (const [key, value] of Object.entries(change as Record<string, unknown>)) {
    if (key === 'on' && can(kind, 'power') && typeof value === 'boolean') out.on = value
    else if (key === 'locked' && can(kind, 'lock') && typeof value === 'boolean') out.locked = value
    else if (key === 'brightness' && can(kind, 'brightness') && num(value) !== null) out.brightness = clamp(num(value)!, 1, 100)
    else if (key === 'temperature' && can(kind, 'temperature') && num(value) !== null) out.temperature = clamp(num(value)!, TEMP_MIN, TEMP_MAX)
    else if (key === 'position' && can(kind, 'position') && num(value) !== null) out.position = clamp(num(value)!, 0, 100)
    else if (key === 'volume' && can(kind, 'volume') && num(value) !== null) out.volume = clamp(num(value)!, 0, 100)
    else return { ok: false, error: `A ${KIND_INFO[kind].label.toLowerCase()} can't do that.` }
  }
  if (Object.keys(out).length === 0) return { ok: false, error: 'Nothing to change.' }
  return { ok: true, change: out }
}

/** The simple yes/no the Village and older screens read as `on_state`. */
export function isOn(kind: DeviceKind, s: DeviceState): boolean {
  if (can(kind, 'lock')) return !!s.locked
  if (can(kind, 'position')) return (s.position ?? 0) > 0
  return !!s.on
}

/** A device's full state, filling gaps from its old on/off column. */
export function stateOf(kind: DeviceKind, raw: unknown, onState: boolean): DeviceState {
  const s = (raw && typeof raw === 'object' ? raw : {}) as DeviceState
  const out: DeviceState = {}
  if (can(kind, 'power')) out.on = typeof s.on === 'boolean' ? s.on : onState
  if (can(kind, 'brightness')) out.brightness = num(s.brightness) ?? 80
  if (can(kind, 'temperature')) out.temperature = num(s.temperature) ?? 68
  if (can(kind, 'lock')) out.locked = typeof s.locked === 'boolean' ? s.locked : onState
  if (can(kind, 'position')) out.position = num(s.position) ?? (onState ? 100 : 0)
  if (can(kind, 'volume')) out.volume = num(s.volume) ?? 30
  return out
}

/** Old scenes stored a plain true/false per device; newer ones a state. */
export function sceneTarget(kind: DeviceKind, target: boolean | DeviceState): DeviceState {
  if (typeof target !== 'boolean') return target
  if (can(kind, 'lock')) return { locked: target }
  if (can(kind, 'position')) return { position: target ? 100 : 0 }
  return { on: target }
}

/** "On · 60%", "68°", "Locked", "Open 40%", "Off". */
export function describe(kind: DeviceKind, s: DeviceState): string {
  if (can(kind, 'lock')) return s.locked ? 'Locked' : 'Unlocked'
  if (can(kind, 'position')) return (s.position ?? 0) === 0 ? 'Closed' : (s.position ?? 0) >= 100 ? 'Open' : `Open ${s.position}%`
  if (!s.on) return 'Off'
  if (can(kind, 'temperature')) return `Set to ${s.temperature}°`
  if (can(kind, 'brightness')) return `On · ${s.brightness}%`
  if (can(kind, 'volume')) return `On · volume ${s.volume}`
  return 'On'
}

/** The pretend house a Practice home starts with. */
export const PRACTICE_DEVICES: { name: string; room: string; kind: DeviceKind; state: DeviceState }[] = [
  { name: 'Floor lamp', room: 'Living room', kind: 'light', state: { on: true, brightness: 70 } },
  { name: 'TV', room: 'Living room', kind: 'tv', state: { on: false } },
  { name: 'Blinds', room: 'Living room', kind: 'blinds', state: { position: 100 } },
  { name: 'Ceiling lights', room: 'Kitchen', kind: 'light', state: { on: false, brightness: 100 } },
  { name: 'Kettle plug', room: 'Kitchen', kind: 'plug', state: { on: false } },
  { name: 'Speaker', room: 'Kitchen', kind: 'speaker', state: { on: false, volume: 30 } },
  { name: 'Bedside lamp', room: 'Bedroom', kind: 'light', state: { on: false, brightness: 30 } },
  { name: 'Fan', room: 'Bedroom', kind: 'fan', state: { on: false } },
  { name: 'Thermostat', room: 'Hallway', kind: 'thermostat', state: { on: true, temperature: 68 } },
  { name: 'Front door', room: 'Hallway', kind: 'lock', state: { locked: true } },
]

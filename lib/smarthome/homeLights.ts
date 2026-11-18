import type { DeviceKind, DeviceState } from './capabilities'

// What the house's lights add up to, for the Village cottage (2026-11-18).
//   on     any light is on
//   color  the average colour of the lights that are on and have one
//   level  how bright, 0..1, averaged over the lights that are on
// null when the house has no lights at all, so the Village keeps its own
// day and night glow instead.
export interface HomeLights { on: boolean; color: string | null; level: number }

export function homeLightsOf(devices: { kind: DeviceKind; state: DeviceState }[]): HomeLights | null {
  const lights = devices.filter(d => d.kind === 'light')
  if (!lights.length) return null
  const on = lights.filter(d => d.state.on)
  if (!on.length) return { on: false, color: null, level: 0 }
  const level = on.reduce((t, d) => t + (d.state.brightness ?? 80), 0) / on.length / 100
  const colored = on.map(d => d.state.color).filter((c): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c))
  let color: string | null = null
  if (colored.length) {
    const sum = [0, 0, 0]
    for (const c of colored) for (let i = 0; i < 3; i++) sum[i] += parseInt(c.slice(1 + i * 2, 3 + i * 2), 16)
    color = '#' + sum.map(v => Math.round(v / colored.length).toString(16).padStart(2, '0')).join('')
  }
  return { on: true, color, level: Math.max(0.15, Math.min(1, level)) }
}

import { describe, it, expect } from 'vitest'
import { homeLightsOf } from '@/lib/smarthome/homeLights'
import { lightColorHA, kelvinToHex, stateFromHA } from '@/lib/smarthome/hassMap'
import { stateOf } from '@/lib/smarthome/capabilities'

describe('homeLightsOf', () => {
  it('is null without lights, so the Village keeps its own glow', () => {
    expect(homeLightsOf([{ kind: 'switch', state: { on: true } }])).toBeNull()
  })
  it('is off when every light is off', () => {
    expect(homeLightsOf([{ kind: 'light', state: { on: false } }])).toEqual({ on: false, color: null, level: 0 })
  })
  it('averages colour and brightness of the lights that are on', () => {
    const r = homeLightsOf([
      { kind: 'light', state: { on: true, brightness: 100, color: '#ff0000' } },
      { kind: 'light', state: { on: true, brightness: 50, color: '#0000ff' } },
      { kind: 'light', state: { on: false, brightness: 100, color: '#00ff00' } },
    ])
    expect(r).toEqual({ on: true, color: '#800080', level: 0.75 })
  })
  it('has no colour when the lit lamps report none', () => {
    expect(homeLightsOf([{ kind: 'light', state: { on: true, brightness: 60 } }])).toEqual({ on: true, color: null, level: 0.6 })
  })
})

describe('light colour from Home Assistant', () => {
  it('reads rgb in a colour mode', () => {
    expect(lightColorHA({ color_mode: 'hs', rgb_color: [255, 128, 0] })).toBe('#ff8000')
  })
  it('reads warmth in white mode', () => {
    expect(lightColorHA({ color_mode: 'color_temp', color_temp_kelvin: 2700 })).toBe(kelvinToHex(2700))
    expect(kelvinToHex(2700).slice(0, 3)).toBe('#ff')
  })
  it('is null for a plain dimmer', () => {
    expect(lightColorHA({ color_mode: 'brightness' })).toBeNull()
  })
  it('travels through stateFromHA and stateOf', () => {
    const s = stateFromHA('light', { entity_id: 'light.lamp', state: 'on', attributes: { brightness: 255, color_mode: 'rgb', rgb_color: [10, 20, 30] } })
    expect(s.color).toBe('#0a141e')
    expect(stateOf('light', s, true).color).toBe('#0a141e')
    expect(stateOf('light', { color: 'red' }, true).color).toBeUndefined()
  })
})

import { checkChange } from '@/lib/smarthome/capabilities'
import { callsForHA, canColorHA } from '@/lib/smarthome/hassMap'

describe('setting a light colour', () => {
  it('accepts a hex colour for lights only, and turns the light on', () => {
    expect(checkChange('light', { color: '#FF8000' })).toEqual({ ok: true, change: { color: '#ff8000', on: true } })
    expect(checkChange('plug', { color: '#ff8000' }).ok).toBe(false)
    expect(checkChange('light', { color: 'red' }).ok).toBe(false)
  })
  it('sends rgb to Home Assistant with the brightness', () => {
    expect(callsForHA('light', 'light.lamp', { color: '#ff8000', on: true, brightness: 40 })).toEqual([
      { domain: 'light', service: 'turn_on', data: { entity_id: 'light.lamp', brightness_pct: 40, rgb_color: [255, 128, 0] } },
    ])
  })
  it('knows which lights can change colour', () => {
    expect(canColorHA({ supported_color_modes: ['color_temp', 'xy'] })).toBe(true)
    expect(canColorHA({ supported_color_modes: ['brightness'] })).toBe(false)
  })
})

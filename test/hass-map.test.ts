import { describe, it, expect } from 'vitest'
import { kindForHA, stateFromHA, callsForHA, checkHAUrl } from '@/lib/smarthome/hassMap'

const e = (entity_id: string, state: string, attributes: Record<string, unknown> = {}) => ({ entity_id, state, attributes })

describe('Home Assistant mapping', () => {
  it('picks an SS kind from the entity', () => {
    expect(kindForHA(e('light.lamp', 'on'))).toBe('light')
    expect(kindForHA(e('switch.kettle', 'off', { device_class: 'outlet' }))).toBe('plug')
    expect(kindForHA(e('switch.porch', 'off'))).toBe('switch')
    expect(kindForHA(e('climate.hall', 'heat'))).toBe('thermostat')
    expect(kindForHA(e('lock.front', 'locked'))).toBe('lock')
    expect(kindForHA(e('cover.blinds', 'open'))).toBe('blinds')
    expect(kindForHA(e('media_player.living_tv', 'off', { device_class: 'tv' }))).toBe('tv')
    expect(kindForHA(e('media_player.kitchen', 'idle'))).toBe('speaker')
    expect(kindForHA(e('sensor.temp', '21'))).toBeNull()
    expect(kindForHA(e('binary_sensor.door', 'off'))).toBeNull()
  })

  it('reads state into an SS state', () => {
    expect(stateFromHA('light', e('light.a', 'on', { brightness: 128 }))).toEqual({ on: true, brightness: 50 })
    expect(stateFromHA('lock', e('lock.a', 'unlocked'))).toEqual({ locked: false })
    expect(stateFromHA('blinds', e('cover.a', 'open', { current_position: 40 }))).toEqual({ position: 40 })
    expect(stateFromHA('blinds', e('cover.a', 'closed'))).toEqual({ position: 0 })
    expect(stateFromHA('thermostat', e('climate.a', 'heat', { temperature: 20 }), true)).toEqual({ on: true, temperature: 68 })
    expect(stateFromHA('speaker', e('media_player.a', 'playing', { volume_level: 0.35 }))).toEqual({ on: true, volume: 35 })
    expect(stateFromHA('tv', e('media_player.a', 'standby'))).toEqual({ on: false })
  })

  it('turns a change into the right service calls', () => {
    expect(callsForHA('light', 'light.a', { on: true, brightness: 60 })).toEqual([
      { domain: 'light', service: 'turn_on', data: { entity_id: 'light.a', brightness_pct: 60 } },
    ])
    expect(callsForHA('light', 'light.a', { on: false })).toEqual([{ domain: 'light', service: 'turn_off', data: { entity_id: 'light.a' } }])
    expect(callsForHA('lock', 'lock.f', { locked: true })).toEqual([{ domain: 'lock', service: 'lock', data: { entity_id: 'lock.f' } }])
    expect(callsForHA('blinds', 'cover.b', { position: 0 })).toEqual([{ domain: 'cover', service: 'close_cover', data: { entity_id: 'cover.b' } }])
    expect(callsForHA('blinds', 'cover.b', { position: 30 })).toEqual([{ domain: 'cover', service: 'set_cover_position', data: { entity_id: 'cover.b', position: 30 } }])
    expect(callsForHA('speaker', 'media_player.k', { volume: 40 })).toEqual([{ domain: 'media_player', service: 'volume_set', data: { entity_id: 'media_player.k', volume_level: 0.4 } }])
  })

  it('sets the thermostat in the house unit', () => {
    expect(callsForHA('thermostat', 'climate.h', { temperature: 70 }, true)).toEqual([
      { domain: 'climate', service: 'set_temperature', data: { entity_id: 'climate.h', temperature: 21 } },
    ])
    expect(callsForHA('thermostat', 'climate.h', { on: false })).toEqual([
      { domain: 'climate', service: 'set_hvac_mode', data: { entity_id: 'climate.h', hvac_mode: 'off' } },
    ])
  })

  it('only accepts a public https address', () => {
    expect(checkHAUrl('https://abc.ui.nabu.casa/lovelace/0')).toEqual({ ok: true, url: 'https://abc.ui.nabu.casa' })
    expect(checkHAUrl('http://abc.ui.nabu.casa').ok).toBe(false)
    expect(checkHAUrl('https://homeassistant.local:8123').ok).toBe(false)
    expect(checkHAUrl('https://192.168.1.20:8123').ok).toBe(false)
    expect(checkHAUrl('https://10.0.0.5').ok).toBe(false)
    expect(checkHAUrl('https://localhost').ok).toBe(false)
    expect(checkHAUrl('nonsense').ok).toBe(false)
  })
})

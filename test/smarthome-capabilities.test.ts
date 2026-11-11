import { describe, expect, it } from 'vitest'
import { checkChange, isOn, stateOf, sceneTarget, describe as say, kindOf, PRACTICE_DEVICES, KIND_INFO, TEMP_MAX } from '@/lib/smarthome/capabilities'
import { providerFor } from '@/lib/smarthome/providers'
import { isRestingScene } from '@/lib/smarthome/apply'

describe('the Controller', () => {
  it('only accepts what a device can actually do', () => {
    expect(checkChange('light', { on: true, brightness: 40 })).toEqual({ ok: true, change: { on: true, brightness: 40 } })
    expect(checkChange('plug', { brightness: 40 }).ok).toBe(false)
    expect(checkChange('lock', { on: true }).ok).toBe(false)
    expect(checkChange('light', { on: 'yes' }).ok).toBe(false)
    expect(checkChange('light', { on: true, hack: 1 }).ok).toBe(false)
    expect(checkChange('light', {}).ok).toBe(false)
    expect(checkChange('light', null).ok).toBe(false)
  })

  it('keeps numbers in safe ranges', () => {
    expect(checkChange('thermostat', { temperature: 120 })).toEqual({ ok: true, change: { temperature: TEMP_MAX } })
    expect(checkChange('light', { brightness: -5 })).toEqual({ ok: true, change: { brightness: 1 } })
    expect(checkChange('blinds', { position: 42.6 })).toEqual({ ok: true, change: { position: 43 } })
    expect(checkChange('blinds', { position: Number.NaN }).ok).toBe(false)
  })

  it('keeps the simple on/off the Village reads in step', () => {
    expect(isOn('light', { on: true })).toBe(true)
    expect(isOn('lock', { locked: true })).toBe(true)
    expect(isOn('blinds', { position: 0 })).toBe(false)
    expect(isOn('blinds', { position: 30 })).toBe(true)
  })

  it('reads old devices and old scenes', () => {
    expect(kindOf(null)).toBe('switch')
    expect(kindOf('toaster')).toBe('switch')
    expect(stateOf('switch', {}, true)).toEqual({ on: true })
    expect(stateOf('light', null, false)).toEqual({ on: false, brightness: 80 })
    expect(sceneTarget('lock', true)).toEqual({ locked: true })
    expect(sceneTarget('blinds', false)).toEqual({ position: 0 })
    expect(sceneTarget('light', { on: true, brightness: 20 })).toEqual({ on: true, brightness: 20 })
  })

  it('says what a device is doing in plain words', () => {
    expect(say('light', { on: true, brightness: 60 })).toBe('On · 60%')
    expect(say('light', { on: false })).toBe('Off')
    expect(say('thermostat', { on: true, temperature: 68 })).toBe('Set to 68°')
    expect(say('lock', { locked: false })).toBe('Unlocked')
    expect(say('blinds', { position: 40 })).toBe('Open 40%')
  })

  it('builds a practice home that passes its own checks', () => {
    for (const d of PRACTICE_DEVICES) {
      expect(checkChange(d.kind, d.state).ok).toBe(true)
      expect(KIND_INFO[d.kind]).toBeDefined()
    }
    expect(new Set(PRACTICE_DEVICES.map(d => d.room)).size).toBeGreaterThan(2)
  })

  it('never treats pretend devices as real', async () => {
    expect(providerFor('practice').simulated).toBe(true)
    expect(providerFor('manual').simulated).toBe(true)
    expect(providerFor('something-else').id).toBe('manual')
    expect(await providerFor('practice').send({ id: 'x', kind: 'light', name: 'Lamp', spaceId: null, externalId: null, meta: {} }, { on: true }, { on: true })).toEqual({ ok: true })
    expect(providerFor('home_assistant').simulated).toBe(false)
    expect(isRestingScene("We're home")).toBe(true)
    expect(isRestingScene('Movie')).toBe(false)
  })
})

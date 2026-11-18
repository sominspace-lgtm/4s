import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }))
import { TOOLS, toolByName } from '@/lib/jarvis/tools'
import { match } from '@/lib/jarvis/homeTools'

const d = (name: string, room: string, kind = 'light') => ({ id: name, name, kind, room, category: null, state: {}, on_state: false })

describe('Jarvis house tools', () => {
  it('are registered, and every change asks first', () => {
    for (const n of ['home_set', 'home_scene', 'home_all_off', 'music_control', 'music_queue', 'music_play_playlist']) expect(toolByName(n)?.write).toBe(true)
    for (const n of ['home_status', 'music_status', 'music_search', 'music_options']) expect(toolByName(n)?.write).toBeFalsy()
    expect(new Set(TOOLS.map(t => t.name)).size).toBe(TOOLS.length)
  })
  it('summarizes changes in plain words', () => {
    expect(toolByName('home_set')!.summarize!({ target: 'Living room', brightness: 40 })).toBe('Set Living room to 40%')
    expect(toolByName('home_set')!.summarize!({ target: 'Front door', locked: true })).toBe('Set Front door locked')
  })
  it('finds a device by name, or a whole room', () => {
    const all = [d('Floor lamp', 'Living room'), d('Ceiling', 'Living room'), d('Bedside', 'Bedroom'), d('Front door', 'Hall', 'lock')]
    expect(match(all, 'floor lamp').map(x => x.name)).toEqual(['Floor lamp'])
    expect(match(all, 'living room lights').map(x => x.name)).toEqual(['Floor lamp', 'Ceiling'])
    expect(match(all, 'bedroom').map(x => x.name)).toEqual(['Bedside'])
    expect(match(all, 'garage')).toEqual([])
  })
})

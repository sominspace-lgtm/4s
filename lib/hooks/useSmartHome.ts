'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isRestingScene, type Scene } from '@/lib/smarthome/apply'
import { isOn, kindOf, stateOf, sceneTarget, type DeviceKind, type DeviceState } from '@/lib/smarthome/capabilities'

export interface SmartHomeDevice {
  id: string
  space_id: string | null
  name: string
  category: string | null
  on_state: boolean
  note: string | null
  created_at: string
  updated_at: string
  /** The Controller's columns (2026-11-08). Missing until its SQL is run. */
  room?: string | null
  kind?: string | null
  provider?: string | null
  state?: DeviceState | null
}

/** A device's kind and full state, with sensible fallbacks for old rows. */
export function deviceView(d: SmartHomeDevice): { kind: DeviceKind; state: DeviceState; practice: boolean; real: boolean; room: string } {
  const kind = kindOf(d.kind)
  return { kind, state: stateOf(kind, d.state, d.on_state), practice: d.provider === 'practice', real: d.provider === 'home_assistant', room: d.room?.trim() || d.category?.trim() || 'Other' }
}

// Which scene is currently applied to the space. Persisted on
// shared_spaces.active_scene so the Village reacts and both partners agree.
export interface ActiveScene { id: string; name: string; appliedAt: string }

// Which weekday the bins go out. 0 = Sunday. Either can be unset.
export interface BinDays { trash?: number; recycling?: number }

// Smart Home (2026-08-25) — a manual device/status list. No real IoT
// integration yet; applying a scene flips the shared board (and, once a hub
// is linked, real bulbs — see lib/smarthome/apply.ts). Scenes + the active
// pointer live on shared_spaces; devices sync live between partners.
export function useSmartHome(spaceId: string | null) {
  const supabase = createClient()
  const [devices, setDevices] = useState<SmartHomeDevice[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [activeScene, setActiveScene] = useState<ActiveScene | null>(null)
  const [binDays, setBinDays] = useState<BinDays>({})
  const [loading, setLoading] = useState(true)

  // Serialised copy of what we last wrote to active_scene, so the realtime
  // channel doesn't echo our own write back (same trick as
  // useSharedVillageLayout). 'null' is a real sentinel value here.
  const lastSceneWriteRef = useRef<string>('')
  // useSmartHome runs in several places at once (the Village panel's House
  // card, the Village scene, the Smart Home overlay) — give each instance
  // its own channel topic so they don't evict each other's subscription.
  const instanceRef = useRef(Math.random().toString(36).slice(2))

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('household_smarthome_devices').select('*').eq('space_id', spaceId)
      : supabase.from('household_smarthome_devices').select('*').is('space_id', null)
    const [{ data }, spaceRes] = await Promise.all([
      scope.order('category').order('name'),
      spaceId
        ? supabase.from('shared_spaces').select('scenes, active_scene, bin_days').eq('id', spaceId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    setDevices((data as SmartHomeDevice[] | null) ?? [])
    const row = spaceRes?.data as { scenes?: Scene[]; active_scene?: ActiveScene | null; bin_days?: BinDays } | null
    setScenes((row?.scenes as Scene[] | undefined) ?? [])
    setActiveScene(row?.active_scene ?? null)
    setBinDays((row?.bin_days as BinDays | undefined) ?? {})
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  // Live sync between partners' screens + the wall.
  useEffect(() => {
    if (!spaceId) return
    let alive = true
    const ch = supabase
      .channel(`smarthome:${spaceId}:${instanceRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shared_spaces', filter: `id=eq.${spaceId}` },
        payload => {
          if (!alive) return
          const n = payload.new as { scenes?: Scene[]; active_scene?: ActiveScene | null; bin_days?: BinDays } | null
          if (!n) return
          if (Array.isArray(n.scenes)) setScenes(n.scenes)
          if (n.bin_days && typeof n.bin_days === 'object') setBinDays(n.bin_days)
          const nextActive = n.active_scene ?? null
          if (JSON.stringify(nextActive) !== lastSceneWriteRef.current) setActiveScene(nextActive)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'household_smarthome_devices', filter: `space_id=eq.${spaceId}` },
        payload => {
          if (!alive) return
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string } | null)?.id
            if (id) setDevices(prev => prev.filter(d => d.id !== id))
            return
          }
          const row = payload.new as SmartHomeDevice | null
          if (!row || !row.id || row.name == null) return
          setDevices(prev => {
            const rest = prev.filter(d => d.id !== row.id)
            return [...rest, row].sort((a, b) =>
              (a.category ?? '').localeCompare(b.category ?? '') || (a.name ?? '').localeCompare(b.name ?? ''))
          })
        },
      )
    try { ch.subscribe() } catch { /* realtime not available — reads still work */ }
    return () => { alive = false; try { supabase.removeChannel(ch) } catch { /* already gone */ } }
  }, [supabase, spaceId])

  async function persistActiveScene(next: ActiveScene | null) {
    if (!spaceId) return
    lastSceneWriteRef.current = JSON.stringify(next)
    setActiveScene(next)
    await supabase.from('shared_spaces').update({ active_scene: next }).eq('id', spaceId)
  }

  async function addDevice(name: string, room: string | null, kind: DeviceKind = 'switch'): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    let res = await supabase.from('household_smarthome_devices')
      .insert({ user_id: user.id, space_id: spaceId, name, category: room, room, kind, provider: 'manual' })
      .select().single()
    // Before the Controller's SQL is run there are no room/kind columns.
    if (res.error && (res.error.code === 'PGRST204' || res.error.code === '42703')) {
      res = await supabase.from('household_smarthome_devices')
        .insert({ user_id: user.id, space_id: spaceId, name, category: room })
        .select().single()
    }
    if (res.error) return res.error.message
    setDevices(prev => [...prev, res.data as SmartHomeDevice])
    return null
  }

  /** Any change a device can take, checked and sent by the server. */
  async function setDevice(id: string, change: DeviceState): Promise<string | null> {
    const before = devices
    setDevices(prev => prev.map(d => {
      if (d.id !== id) return d
      const v = deviceView(d)
      const next = { ...v.state, ...change }
      return { ...d, state: next, on_state: isOn(v.kind, next) }
    }))
    if (activeScene) { lastSceneWriteRef.current = 'null'; setActiveScene(null) }
    const res = await fetch('/api/smarthome/device', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spaceId, deviceId: id, change }),
    }).catch(() => null)
    if (res?.ok) return null
    setDevices(before)
    const data = res ? await res.json().catch(() => ({})) : {}
    return data.error ?? 'No connection. Try again.'
  }

  async function toggleDevice(id: string, on: boolean) {
    const d = devices.find(x => x.id === id)
    if (!d) return
    const kind = kindOf(d.kind)
    await setDevice(id, sceneTarget(kind, on))
  }

  async function updateRoom(id: string, room: string | null) {
    const { error } = await supabase.from('household_smarthome_devices')
      .update({ room, category: room, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setDevices(prev => prev.map(d => (d.id === id ? { ...d, room, category: room } : d)))
  }

  /** The Practice home: pretend devices to try the Controller with. */
  async function practice(action: 'add' | 'remove'): Promise<string | null> {
    const res = await fetch('/api/smarthome/practice', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spaceId, action }),
    }).catch(() => null)
    await load()
    if (res?.ok) return null
    const data = res ? await res.json().catch(() => ({})) : {}
    return data.error ?? 'No connection. Try again.'
  }

  async function updateNote(id: string, note: string | null) {
    const { error } = await supabase.from('household_smarthome_devices')
      .update({ note, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setDevices(prev => prev.map(d => (d.id === id ? { ...d, note } : d)))
  }

  async function removeDevice(id: string) {
    await supabase.from('household_smarthome_devices').delete().eq('id', id)
    setDevices(prev => prev.filter(d => d.id !== id))
  }

  // ── Scenes ──────────────────────────────────────────────────────────────
  async function persistScenes(next: Scene[]) {
    if (!spaceId) return
    setScenes(next)
    await supabase.from('shared_spaces').update({ scenes: next }).eq('id', spaceId)
  }

  async function saveBinDays(next: BinDays) {
    if (!spaceId) return
    setBinDays(next)
    await supabase.from('shared_spaces').update({ bin_days: next }).eq('id', spaceId)
  }

  /** Save the devices' current on/off state as a named scene (or overwrite
   *  one of the same name). */
  async function saveScene(name: string, icon: string) {
    const clean = name.trim()
    if (!clean) return
    const snapshot: Record<string, DeviceState> = {}
    for (const d of devices) snapshot[d.id] = deviceView(d).state
    const existing = scenes.find(s => s.name.toLowerCase() === clean.toLowerCase())
    const scene: Scene = { id: existing?.id ?? crypto.randomUUID(), name: clean, icon, devices: snapshot }
    await persistScenes(existing ? scenes.map(s => (s.id === existing.id ? scene : s)) : [...scenes, scene])
  }

  async function deleteScene(id: string) {
    await persistScenes(scenes.filter(s => s.id !== id))
    if (activeScene?.id === id) await persistActiveScene(null)
  }

  async function runScene(scene: Scene): Promise<string | null> {
    setDevices(prev => prev.map(d => {
      const target = scene.devices[d.id]
      if (target === undefined) return d
      const v = deviceView(d)
      const next = { ...v.state, ...sceneTarget(v.kind, target) }
      return { ...d, state: next, on_state: isOn(v.kind, next) }
    }))
    const next = isRestingScene(scene.name) ? null : { id: scene.id, name: scene.name, appliedAt: new Date().toISOString() }
    lastSceneWriteRef.current = JSON.stringify(next)
    setActiveScene(next)
    const res = await fetch('/api/smarthome/scene', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spaceId, sceneId: scene.id }),
    }).catch(() => null)
    if (res?.ok) return null
    await load()
    const data = res ? await res.json().catch(() => ({})) : {}
    return data.error ?? 'No connection. Try again.'
  }

  /** Flip every device the scene names to its target state, and record it as
   *  the active scene. */
  async function applyScene(id: string): Promise<string | null> {
    const scene = scenes.find(s => s.id === id)
    if (!scene) return 'Scene not found'
    return runScene(scene)
  }

  /** Apply a named preset — finding the saved scene of that name, or creating
   *  one on the spot (capturing the devices' current state, which may be
   *  none). Lets "Goodnight" / "Movie" / "We're out" work on the wall before
   *  any devices or a hub are wired — the village still reacts by name. */
  async function applyPreset(name: string, icon: string): Promise<string | null> {
    const key = name.trim().toLowerCase()
    let scene = scenes.find(s => s.name.trim().toLowerCase() === key)
    if (!scene) {
      const snapshot: Record<string, DeviceState> = {}
      for (const d of devices) snapshot[d.id] = deviceView(d).state
      scene = { id: crypto.randomUUID(), name: name.trim(), icon, devices: snapshot }
      await persistScenes([...scenes, scene])
    }
    return runScene(scene)
  }

  /** Lights, plugs, switches, fans, speakers and TVs off. */
  async function allOff(): Promise<string | null> {
    const res = await fetch('/api/smarthome/all-off', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spaceId }),
    }).catch(() => null)
    await load()
    if (res?.ok) { const d = await res.json().catch(() => ({})); return d.failed ? `${d.failed} could not be turned off.` : null }
    return 'No connection. Try again.'
  }

  return {
    devices, scenes, activeScene, binDays, loading, reload: load, allOff,
    addDevice, setDevice, toggleDevice, updateNote, updateRoom, removeDevice, practice,
    saveScene, deleteScene, applyScene, applyPreset, saveBinDays,
  }
}

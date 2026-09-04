'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { applySceneToDevices, type Scene } from '@/lib/smarthome/apply'

export interface SmartHomeDevice {
  id: string
  space_id: string | null
  name: string
  category: string | null
  on_state: boolean
  note: string | null
  created_at: string
  updated_at: string
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

  async function addDevice(name: string, category: string | null): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('household_smarthome_devices')
      .insert({ user_id: user.id, space_id: spaceId, name, category })
      .select().single()
    if (error) return error.message
    setDevices(prev => [...prev, data as SmartHomeDevice])
    return null
  }

  async function toggleDevice(id: string, on: boolean) {
    const { error } = await supabase.from('household_smarthome_devices')
      .update({ on_state: on, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return
    setDevices(prev => prev.map(d => (d.id === id ? { ...d, on_state: on } : d)))
    // A hands-on toggle means the scene no longer describes the room.
    if (activeScene) await persistActiveScene(null)
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
    const snapshot: Record<string, boolean> = {}
    for (const d of devices) snapshot[d.id] = d.on_state
    const existing = scenes.find(s => s.name.toLowerCase() === clean.toLowerCase())
    const scene: Scene = { id: existing?.id ?? crypto.randomUUID(), name: clean, icon, devices: snapshot }
    await persistScenes(existing ? scenes.map(s => (s.id === existing.id ? scene : s)) : [...scenes, scene])
  }

  async function deleteScene(id: string) {
    await persistScenes(scenes.filter(s => s.id !== id))
    if (activeScene?.id === id) await persistActiveScene(null)
  }

  const isHome = (name: string) => name.trim().toLowerCase().replace(/'/g, '') === 'were home'

  async function runScene(scene: Scene): Promise<string | null> {
    setDevices(prev => prev.map(d => (d.id in scene.devices ? { ...d, on_state: scene.devices[d.id] } : d)))
    const { error } = await applySceneToDevices(supabase, scene)
    if (error) return error
    // "We're home" is the resting state — applying it clears the mood.
    await persistActiveScene(isHome(scene.name) ? null : { id: scene.id, name: scene.name, appliedAt: new Date().toISOString() })
    return null
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
      const snapshot: Record<string, boolean> = {}
      for (const d of devices) snapshot[d.id] = d.on_state
      scene = { id: crypto.randomUUID(), name: name.trim(), icon, devices: snapshot }
      await persistScenes([...scenes, scene])
    }
    return runScene(scene)
  }

  return {
    devices, scenes, activeScene, binDays, loading,
    addDevice, toggleDevice, updateNote, removeDevice,
    saveScene, deleteScene, applyScene, applyPreset, saveBinDays,
  }
}

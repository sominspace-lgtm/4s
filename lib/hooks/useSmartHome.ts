'use client'

import { useCallback, useEffect, useState } from 'react'
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

// Smart Home (2026-08-25) — a manual device/status list, same shape as
// House Rules and Move-In's buy-list: no real automation integration exists
// in this app (no Home Assistant/IoT API), so this is deliberately just a
// place to note what's connected and flip its state, not a device
// controller. Shared "for all" access, same as household_rules.
export function useSmartHome(spaceId: string | null) {
  const supabase = createClient()
  const [devices, setDevices] = useState<SmartHomeDevice[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('household_smarthome_devices').select('*').eq('space_id', spaceId)
      : supabase.from('household_smarthome_devices').select('*').is('space_id', null)
    const [{ data }, sceneRes] = await Promise.all([
      scope.order('category').order('name'),
      spaceId
        ? supabase.from('shared_spaces').select('scenes').eq('id', spaceId).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    setDevices((data as SmartHomeDevice[] | null) ?? [])
    setScenes(((sceneRes?.data as { scenes?: Scene[] } | null)?.scenes as Scene[] | undefined) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

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
    if (!error) setDevices(prev => prev.map(d => (d.id === id ? { ...d, on_state: on } : d)))
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
  }

  /** Flip every device the scene names to its target state. */
  async function applyScene(id: string): Promise<string | null> {
    const scene = scenes.find(s => s.id === id)
    if (!scene) return 'Scene not found'
    // Optimistic — the board is the whole visible effect today.
    setDevices(prev => prev.map(d => (d.id in scene.devices ? { ...d, on_state: scene.devices[d.id] } : d)))
    const { error } = await applySceneToDevices(supabase, scene)
    return error
  }

  return {
    devices, scenes, loading,
    addDevice, toggleDevice, updateNote, removeDevice,
    saveScene, deleteScene, applyScene,
  }
}

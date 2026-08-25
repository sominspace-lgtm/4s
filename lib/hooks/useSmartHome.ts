'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('household_smarthome_devices').select('*').eq('space_id', spaceId)
      : supabase.from('household_smarthome_devices').select('*').is('space_id', null)
    const { data } = await scope.order('category').order('name')
    setDevices((data as SmartHomeDevice[] | null) ?? [])
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

  return { devices, loading, addDevice, toggleDevice, updateNote, removeDevice }
}

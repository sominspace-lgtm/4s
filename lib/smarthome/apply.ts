import type { SupabaseClient } from '@supabase/supabase-js'

// A named smart-home preset. `devices` maps a household_smarthome_devices id
// to the on/off state that scene wants it in. Anything not listed is left
// alone.
export interface Scene {
  id: string
  name: string
  /** An Icon name (components/ui/Icon.tsx) — falls back to a dot if unknown. */
  icon: string
  devices: Record<string, boolean>
}

export const SCENE_PRESETS: { name: string; icon: string }[] = [
  { name: 'Goodnight', icon: 'moon' },
  { name: "We're out", icon: 'walk' },
  { name: "We're home", icon: 'household' },
  { name: 'Movie', icon: 'tv' },
  { name: 'Party', icon: 'party' },
]

// The single place a scene turns into real state. Today it just writes the
// shared device board (household_smarthome_devices.on_state), which the
// Village scene and both partners' screens react to. When a real hub is
// linked (Home Assistant REST / Alexa), the outbound call goes RIGHT HERE,
// after the board write — nothing else in the app needs to change.
export async function applySceneToDevices(
  supabase: SupabaseClient,
  scene: Scene,
): Promise<{ error: string | null }> {
  const entries = Object.entries(scene.devices)
  if (entries.length === 0) return { error: null }

  const nowIso = new Date().toISOString()
  // One update per target state (usually just two: all-on ids, all-off ids).
  const onIds = entries.filter(([, on]) => on).map(([id]) => id)
  const offIds = entries.filter(([, on]) => !on).map(([id]) => id)

  for (const [ids, on] of [[onIds, true], [offIds, false]] as const) {
    if (ids.length === 0) continue
    const { error } = await supabase
      .from('household_smarthome_devices')
      .update({ on_state: on, updated_at: nowIso })
      .in('id', ids)
    if (error) return { error: error.message }
  }

  // ── Real hub call goes here ────────────────────────────────────────────
  // await fetch('/api/smarthome/apply', { method: 'POST',
  //   body: JSON.stringify({ devices: scene.devices }) })
  // (Home Assistant REST proxy / Alexa routine trigger.) Until then the
  // board write above is the whole effect.

  return { error: null }
}

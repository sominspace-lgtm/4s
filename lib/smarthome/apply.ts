import type { DeviceState } from './capabilities'

// A named smart-home preset. `devices` maps a household_smarthome_devices id
// to the state that scene wants it in. Scenes saved before the Controller
// (2026-11-08) hold a plain true/false; sceneTarget() in capabilities.ts
// reads both. Anything not listed is left alone.
export interface Scene {
  id: string
  name: string
  /** An Icon name (components/ui/Icon.tsx) — falls back to a dot if unknown. */
  icon: string
  devices: Record<string, boolean | DeviceState>
}

export const SCENE_PRESETS: { name: string; icon: string }[] = [
  { name: 'Goodnight', icon: 'moon' },
  { name: "We're out", icon: 'walk' },
  { name: "We're home", icon: 'household' },
  { name: 'Movie', icon: 'tv' },
  { name: 'Party', icon: 'party' },
]

/** "We're home" is the resting state, so running it clears the mood. */
export function isRestingScene(name: string): boolean {
  return name.trim().toLowerCase().replace(/'/g, '') === 'were home'
}

// Running a scene now happens on the server (lib/smarthome/command.ts), so
// every change goes through the same checks and the same provider, whether
// it came from a phone or the wall screen.

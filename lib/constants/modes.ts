// The voice of 4S OS. There used to be several Guides to pick from
// (Peaceful, Friend, Executive); since 2026-10-21 there is one warm voice,
// Friend, and nothing to choose. user_prefs.mode is still read, but every
// stored value lands here, so old rows never break.

export type Mode = 'friend'

export type Proactivity = 'low' | 'medium' | 'high'

export interface ModeConfig {
  label: string
  description: string
  proactivity: Proactivity
}

export const MODES: Record<Mode, ModeConfig> = {
  friend: {
    label: 'Friend',
    description: 'Warm and human. Encouraging, and quietly keeps an eye on the small stuff.',
    proactivity: 'medium',
  },
}

export function normalizeMode(_raw?: string | null): Mode {
  return 'friend'
}

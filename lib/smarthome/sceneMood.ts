// How the Village scene should look and behave for the currently-applied
// smart-home scene. Pure — maps the active scene's NAME (so both partners
// resolve identically, and a custom scene falls to 'custom') to a mood the
// scene reads alongside its own time-of-day / gathering logic.
//
// A live gathering always wins over scene mood (see VillageScene) — real
// guests are higher-intent than a preset.

export type SceneKind = 'goodnight' | 'movie' | 'out' | 'home' | 'party' | 'custom' | null
export type FigureMode = 'wander' | 'sleep' | 'movie' | 'gone' | 'party'

export interface SceneMood {
  kind: SceneKind
  figures: FigureMode
  /** Push the scene to night (stars, dark cottage) regardless of the clock. */
  forceNight: boolean
  /** 0..1 cool wash over the whole scene, eased in — not a time-of-day swap. */
  dim: number
  /** A flickering screen-glow element at a cottage window (Movie). */
  screenGlow: boolean
  /** Force the warm lights / lanterns on (Party). */
  lanterns: boolean
  /** Don't render the couple at all (We're out). */
  hideFigures: boolean
}

export const DEFAULT_SCENE_MOOD: SceneMood = {
  kind: null, figures: 'wander', forceNight: false, dim: 0,
  screenGlow: false, lanterns: false, hideFigures: false,
}

const NAME_TO_KIND: Partial<Record<string, Exclude<SceneKind, null | 'custom'>>> = {
  'goodnight': 'goodnight',
  "we're out": 'out',
  'were out': 'out',
  "we're home": 'home',
  'were home': 'home',
  'movie': 'movie',
  'party': 'party',
}

export function sceneMood(active: { name: string } | null | undefined): SceneMood {
  if (!active) return DEFAULT_SCENE_MOOD
  const kind = NAME_TO_KIND[active.name.trim().toLowerCase()] ?? 'custom'
  switch (kind) {
    case 'goodnight':
      return { kind, figures: 'sleep', forceNight: true, dim: 0.5, screenGlow: false, lanterns: false, hideFigures: false }
    case 'movie':
      return { kind, figures: 'movie', forceNight: false, dim: 0.4, screenGlow: true, lanterns: false, hideFigures: false }
    case 'out':
      return { kind, figures: 'gone', forceNight: false, dim: 0.12, screenGlow: false, lanterns: false, hideFigures: true }
    case 'party':
      return { kind, figures: 'party', forceNight: false, dim: 0, screenGlow: false, lanterns: true, hideFigures: false }
    case 'custom':
      return { kind, figures: 'wander', forceNight: false, dim: 0.1, screenGlow: false, lanterns: false, hideFigures: false }
    case 'home':
    default:
      return DEFAULT_SCENE_MOOD
  }
}

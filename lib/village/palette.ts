import type { VillageState } from './state'

// What the village is made of, this season.
//
// Every value is a color-mix over the theme's OWN custom properties, so the
// four seasons work across all six themes without a per-theme table. Autumn on
// cream Bloom lands olive-gold; autumn on near-black Obsidian lands warm gold.
// Same ratio, different world, because the vars did the work.
//
// `isLight` is the one thing the vars can't express. It comes from the theme's
// declared `--scheme`, passed down as a prop rather than read out of the DOM so
// this stays pure and hydration-safe. It's needed in exactly two places, both
// cases where no custom property has a stable lightness DIRECTION across
// themes: snow (which must be lighter than the ground either way, and
// `--surface` is lighter than `--bg` on light themes and darker on dark ones),
// and how hard to push the sky tint (night purple over cream turns it to mud
// at full strength).

export interface SeasonPalette {
  /** Plants, canopies, anything that grows. */
  foliage: string
  /** A wash laid over the ground, or null for none. */
  ground: string | null
  groundOpacity: number
  /** A very faint wash over the whole sky. */
  skyWash: string
  skyWashOpacity: number
  /** Falling things. null in summer, which gets stillness instead. */
  particle: { fill: string; opacity: number; kind: 'petal' | 'leaf' | 'snow' } | null
}

export function seasonPalette(season: VillageState['season'], isLight: boolean): SeasonPalette {
  // Light themes take roughly a third of the wash, or the tint stops being a
  // tint and starts being a colour cast.
  const wash = (pct: number) => (isLight ? pct * 0.65 : pct)

  switch (season) {
    case 'spring':
      return {
        foliage: 'color-mix(in srgb, var(--emerald) 78%, var(--blush) 22%)',
        ground: 'var(--emerald)',
        groundOpacity: wash(0.05),
        skyWash: 'var(--blush)',
        skyWashOpacity: wash(0.06),
        particle: { fill: 'var(--blush)', opacity: 0.32, kind: 'petal' },
      }
    case 'summer':
      return {
        foliage: 'var(--emerald)',
        ground: null,
        groundOpacity: 0,
        skyWash: 'var(--amber)',
        skyWashOpacity: wash(0.04),
        particle: null,
      }
    case 'autumn':
      return {
        foliage: 'color-mix(in srgb, var(--emerald) 32%, var(--amber) 68%)',
        ground: 'var(--amber)',
        groundOpacity: wash(0.07),
        skyWash: 'var(--amber)',
        skyWashOpacity: wash(0.07),
        particle: { fill: 'var(--amber)', opacity: 0.35, kind: 'leaf' },
      }
    case 'winter':
      return {
        // Mixed toward slate AND then washed toward the background, because
        // slate alone isn't enough: on Sage, --slate is itself a green, so the
        // straight emerald/slate mix landed within 17 of summer and winter was
        // effectively invisible. Pulling toward --bg fades the foliage instead
        // of only re-hueing it, which no theme can defeat — it's the one colour
        // guaranteed to be far from the foliage in every palette. That takes
        // the smallest separation across all six themes from 17 to 65.
        foliage: 'color-mix(in srgb, color-mix(in srgb, var(--emerald) 55%, var(--slate)) 78%, var(--bg) 22%)',
        // Frost, not snow cover: the ground keeps its shape, it just goes cold.
        ground: isLight ? 'var(--slate)' : '#ffffff',
        groundOpacity: isLight ? 0.06 : 0.05,
        skyWash: 'var(--slate)',
        skyWashOpacity: wash(0.08),
        particle: {
          // Snow has to be lighter than the ground on both light and dark
          // themes, and no var is reliably lighter than --bg in both. White is,
          // but it's invisible on cream, so light themes get it cooled toward
          // slate until it reads as snow rather than as nothing.
          fill: isLight ? 'color-mix(in srgb, #ffffff 62%, var(--slate))' : '#ffffff',
          opacity: isLight ? 0.5 : 0.3,
          kind: 'snow',
        },
      }
  }
}

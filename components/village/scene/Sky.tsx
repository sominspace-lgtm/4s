'use client'

import type { VillageState } from '@/lib/village/state'
import type { SeasonPalette } from '@/lib/village/palette'
import type { Celestial as CelestialData } from '@/lib/village/sky'
import Celestial from './Celestial'

// Real atmospheric colors, not theme-derived ones (2026-08-21) — the
// previous version mixed the time-of-day tint into --bg for every stop,
// which means the sky was never actually blue, orange, or navy; it was
// whatever --bg is, faintly tinted. That's backwards. Sky is a weather
// concept, not a themeable UI surface — the app doesn't let you recolor
// the moon either. A day sky should look like a day sky regardless of
// which theme or custom accent color is active.
//
// Zenith is a literal, fixed hex — always genuinely blue at midday,
// genuinely navy at night, no theme mixed in at all. Horizon blends
// partway toward --bg so the sky still meets the ground (rendered in
// theme colors) without a hard seam; mid bridges the two. This is the one
// place in the whole scene that deliberately ignores the active theme's
// palette on purpose.
// Day softened toward BloomScan's own sky gradient (2026-08-24) — its
// GardenGround.tsx runs a soft powder-blue-to-cream wash (#DCE9EC ->
// #F3ECDA), "afternoon light, not a screen" per its own theme.ts. The old
// day zenith (#4a90d9) was a real, saturated sky blue — genuinely correct
// weather, just not the pastel-storybook feel this scene is going for now.
// Dawn/dusk/night keep their own moodier saturation; softening those too
// would flatten the one part of the day that's supposed to feel dramatic.
const SKY: Record<VillageState['timeOfDay'], [string, string, string]> = {
  dawn:  ['#7fb3e0', 'color-mix(in srgb, #f2b5a0 75%, var(--bg))', 'color-mix(in srgb, #f7d9b8 40%, var(--bg))'],
  day:   ['#a9d4ea', 'color-mix(in srgb, #c9e4f0 75%, var(--bg))', 'color-mix(in srgb, #f3ecda 55%, var(--bg))'],
  dusk:  ['#3d4f7a', 'color-mix(in srgb, #d97b56 78%, var(--bg))', 'color-mix(in srgb, #f0a868 40%, var(--bg))'],
  night: ['#0c1226', 'color-mix(in srgb, #1c2544 82%, var(--bg))', 'color-mix(in srgb, #2a3358 45%, var(--bg))'],
}

/**
 * The sky, and the place the hydration fix actually lives.
 *
 * `live` is false on the server and on the first client render (see
 * useVillageClock). While it's false the sky uses the fixed `day` palette and
 * the stars aren't rendered at all, so both passes emit identical markup no
 * matter what timezone the server is in. Once it flips true the gradient stops
 * transition to the real time of day over 400ms, the "growth" tier of the
 * motion doctrine.
 *
 * That fix and the nicest bit of the ambience turn out to be the same
 * mechanism: because the stops animate rather than swap, dusk becoming night in
 * a tab you left open is a slow wash rather than a snap.
 */
export default function Sky({ timeOfDay, live, palette, celestial }: {
  timeOfDay: VillageState['timeOfDay']
  live: boolean
  palette: SeasonPalette
  celestial: CelestialData | null
}) {
  const [zenith, mid, horizon] = live ? SKY[timeOfDay] : SKY.day

  return (
    <>
      <defs>
        <linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="village-sky-stop" stopColor={zenith} />
          <stop offset="55%" className="village-sky-stop" stopColor={mid} />
          <stop offset="100%" className="village-sky-stop" stopColor={horizon} />
        </linearGradient>
      </defs>

      <rect width="800" height="440" fill="url(#vsky)" />

      {/* The season's own wash over the whole sky. Barely there on purpose:
          it should change how the picture feels, not announce itself.
          Real bug, found 2026-08-21 from a live report of a solid opaque
          amber sky: .village-fade's keyframes animate opacity 0→1, which
          OVERRIDES an element's own opacity attribute once the animation
          finishes — the rect was combining opacity={skyWashOpacity} (e.g.
          0.026) directly with className="village-fade" on the SAME
          element, so ~400ms after mount it settled at the animation's own
          end state (1), not the intended near-invisible wash. Fully opaque
          --amber over the whole canvas is exactly the "flat yellow sky"
          that was reported, and it explains "correct for a split second,
          then yellow" precisely: before the animation finishes, actual
          opacity is near the fade's own current keyframe value, which is
          still close to 0. Fixed by putting the REAL target opacity on a
          static outer <g> (never touched by the animation) and letting
          only the inner rect's own opacity animate — SVG opacity
          multiplies through the tree, so the effective final opacity is
          skyWashOpacity × 1, not 1 alone. */}
      {live && (
        <g opacity={palette.skyWashOpacity}>
          <rect width="800" height="440" fill={palette.skyWash} className="village-fade" />
        </g>
      )}

      {/* Night sky — quiet, never twinkling into a distraction */}
      {live && timeOfDay === 'night' && (
        <g className="village-fade">
          {[...Array(18)].map((_, i) => (
            <circle key={i} cx={(i * 137) % 780 + 10} cy={(i * 53) % 150 + 14} r={i % 3 === 0 ? 1.3 : 0.8}
              fill="var(--text)" opacity={0.28} />
          ))}
        </g>
      )}

      {live && celestial && <Celestial c={celestial} />}
    </>
  )
}

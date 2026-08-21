'use client'

import type { VillageState } from '@/lib/village/state'
import type { SeasonPalette } from '@/lib/village/palette'
import type { Celestial as CelestialData } from '@/lib/village/sky'
import Celestial from './Celestial'

// Sky colour by time of day — three stops now, not two (2026-08-21). At 20%
// mixed into --bg, the old two-stop gradient was so close to flat --bg at
// both ends that any theme whose --bg itself reads as a strong, saturated
// color (a custom theme's light bg, an Ember/Sunset dark one) rendered as
// one undifferentiated block covering 85% of the canvas — no visible
// gradient, just a wall of --bg with a tint too faint to read as weather.
// Zenith mixes in more of the time-of-day color (a real accent, not a
// whisper of one); horizon stays closer to --bg the way a real sky
// lightens toward the ground; the middle stop is what actually produces a
// gradient banding effect instead of two colors that are each ~80% the
// same base.
const SKY: Record<VillageState['timeOfDay'], [string, string, string]> = {
  dawn:  ['color-mix(in srgb, var(--amber) 40%, var(--bg))', 'color-mix(in srgb, var(--amber) 22%, var(--bg))', 'var(--bg)'],
  day:   ['color-mix(in srgb, var(--slate) 38%, var(--bg))', 'color-mix(in srgb, var(--slate) 18%, var(--bg))', 'var(--bg)'],
  dusk:  ['color-mix(in srgb, var(--rose) 40%, var(--bg))', 'color-mix(in srgb, var(--rose) 20%, var(--bg))', 'var(--bg)'],
  night: ['color-mix(in srgb, var(--purple) 32%, var(--bg))', 'color-mix(in srgb, var(--purple) 14%, var(--bg))', 'var(--bg)'],
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
          it should change how the picture feels, not announce itself. */}
      {live && (
        <rect width="800" height="440" fill={palette.skyWash} opacity={palette.skyWashOpacity}
          className="village-fade" />
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

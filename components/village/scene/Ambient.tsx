'use client'

import type { VillageState } from '@/lib/village/state'
import type { SeasonPalette } from '@/lib/village/palette'
import type { WeatherCondition } from '@/lib/village/weather'

/**
 * The things that move.
 *
 * Budget: never more than about six moving nodes at once, everything under 0.35
 * opacity, nothing faster than seven seconds. The existing rule for this scene
 * is that ambient means you notice it only if you stop and look, and the fastest
 * way to break the whole picture would be to make it busy.
 *
 * Each piece is gated on it making sense rather than on it being available:
 * smoke only when it's cold or dark, because a chimney going in July at noon
 * reads as a bug; fireflies only when there's actually a forest for them to be
 * over, because an empty village shouldn't be decorated to look less empty.
 */
export default function Ambient({ village: v, palette, groundY, weatherCondition }: {
  village: VillageState
  palette: SeasonPalette
  groundY: number
  /** Real weather, from lib/village/weather.ts — only 'rain'/'storm' get a
   *  visual today (see the rain-streak note below); everything else is just
   *  the text readout in VillageText/wherever the caller shows it. */
  weatherCondition?: WeatherCondition | null
}) {
  const cold = v.season === 'winter' || v.season === 'autumn'
  const dark = v.timeOfDay === 'dusk' || v.timeOfDay === 'night'
  const lived = v.buildings.length + v.plants.length > 6

  return (
    <g pointerEvents="none" className="village-fade">
      {/* Chimney smoke, only when the chimney itself is drawn and only when
          someone would plausibly have lit something. */}
      {/* x nudged 420→429 (round 8, 2026-08-27) — Home's chimney moved a few
          units when the hand-drawn house was replaced with the real
          home-house.png sprite; this keeps the smoke rising from the actual
          chimney instead of just beside it. */}
      {lived && (cold || dark) && (
        <g className="village-smoke" opacity={0.22}>
          <circle cx={430} cy={groundY - 88} r={3.5} fill="var(--text)" />
          <circle cx={433} cy={groundY - 99} r={4.5} fill="var(--text)" opacity={0.7} />
          <circle cx={429} cy={groundY - 111} r={5.5} fill="var(--text)" opacity={0.45} />
        </g>
      )}

      {/* Two birds, high and far, morning only. */}
      {(v.timeOfDay === 'dawn' || v.timeOfDay === 'day') && (
        <g className="village-birds" opacity={0.28}>
          <path d="M 0 0 q 4 -3 8 0 q 4 -3 8 0" fill="none" stroke="var(--text)" strokeWidth={1.1} transform="translate(120 96)" />
          <path d="M 0 0 q 3 -2.2 6 0 q 3 -2.2 6 0" fill="none" stroke="var(--text)" strokeWidth={1} transform="translate(158 112)" />
        </g>
      )}

      {/* Fireflies over the forest, and only if there is one. */}
      {dark && v.plants.length > 0 && (
        <g opacity={0.9}>
          {[[92, 336], [148, 320], [214, 344], [268, 328]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.7} fill="var(--amber)"
              className={`village-firefly village-firefly-${i % 3}`} />
          ))}
        </g>
      )}

      {/* Real rain, when it's actually raining out (2026-08-24) — the one
          weather condition worth a visual per the plan: cheap, obvious, and
          it doesn't fight the season's own falling-particle effect below
          since real rain and season are independent (it can rain in any
          season). Five short streaks, same fixed-position + staggered-delay
          trick as the snow/leaf/petal particles above. */}
      {(weatherCondition === 'rain' || weatherCondition === 'storm') && (
        <g opacity={0.35} stroke="var(--text)" strokeWidth={1.1} strokeLinecap="round">
          {[[70, 20], [210, 4], [350, 30], [500, 10], [640, 26], [720, 0]].map(([cx, cy], i) => (
            <line key={i} x1={cx} y1={cy} x2={cx - 3} y2={cy + 14}
              className={`village-rain village-rain-${i % 3}`} />
          ))}
        </g>
      )}

      {/* Two butterflies over the garden, daytime only and only when
          there's actually something growing for them to visit — same
          "gated on making sense" rule as the smoke/fireflies above. Kept
          out of any dark/rain combo so the moving-node count never really
          stacks past the budget in the header comment. */}
      {v.timeOfDay === 'day' && v.plants.length > 0 && weatherCondition !== 'rain' && weatherCondition !== 'storm' && (
        <g opacity={0.5}>
          {[{ x: 165, y: 250 }, { x: 305, y: 268 }].map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`} className={`village-butterfly village-butterfly-${i}`}>
              <path d="M -3.5 0 Q -6 -4 -3.2 -1 Q -6 2 -3.5 0 Z" fill="var(--blush)" />
              <path d="M 3.5 0 Q 6 -4 3.2 -1 Q 6 2 3.5 0 Z" fill="var(--blush)" />
            </g>
          ))}
        </g>
      )}

      {/* Whatever is falling this season. */}
      {palette.particle && (
        <g opacity={palette.particle.opacity} fill={palette.particle.fill}>
          {particlePositions(palette.particle.kind).map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={palette.particle!.kind === 'snow' ? 1.8 : 2.4}
              className={`village-${palette.particle!.kind} village-fall-${i % 3}`} />
          ))}
        </g>
      )}
    </g>
  )
}

// Fixed start points rather than random ones, so the scene is the same picture
// on every load — the same reasoning as hashPos for plant placement.
function particlePositions(kind: 'petal' | 'leaf' | 'snow'): [number, number][] {
  if (kind === 'snow') return [[90, 40], [230, 12], [370, 60], [520, 24], [680, 48]]
  if (kind === 'leaf') return [[140, 30], [330, 8], [560, 44], [700, 20]]
  return [[180, 26], [420, 50], [640, 16]]
}

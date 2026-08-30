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
export default function Ambient({ village: v, palette, groundY, weatherCondition, warm = false }: {
  village: VillageState
  palette: SeasonPalette
  groundY: number
  /** Real weather, from lib/village/weather.ts — only 'rain'/'storm' get a
   *  visual today (see the rain-streak note below); everything else is just
   *  the text readout in VillageText/wherever the caller shows it. */
  weatherCondition?: WeatherCondition | null
  /** Guest Mode (round 74) — the village is hosting, so the warm-evening
   *  layers (ground-glow pools, fireflies) come on whatever the hour. */
  warm?: boolean
}) {
  const cold = v.season === 'winter' || v.season === 'autumn'
  const dark = v.timeOfDay === 'dusk' || v.timeOfDay === 'night'
  const glowy = dark || warm
  const golden = v.timeOfDay === 'dawn' || v.timeOfDay === 'dusk'
  const bright = v.timeOfDay === 'day' || v.timeOfDay === 'dawn'
  const lived = v.buildings.length + v.plants.length > 6

  return (
    <g pointerEvents="none" className="village-fade">
      {/* Golden-hour wash (round 53) — a wide, very soft warm bloom over the
          village at dawn and dusk. Low enough opacity to read as light, not
          a colour filter. */}
      {golden && (
        <ellipse cx={400} cy={groundY - 34} rx={540} ry={250} fill="var(--amber)"
          opacity={v.timeOfDay === 'dusk' ? 0.09 : 0.07} filter="url(#vglow)" />
      )}

      {/* Light shafts slanting down through the tree line on a bright
          morning/afternoon (round 74, "cozy atmosphere") — narrow, faint,
          starting just below the horizon so they read as sun through
          branches, not spotlights. soft-light blend + a gradient that fades
          to nothing before it reaches the ground. */}
      {bright && weatherCondition !== 'rain' && weatherCondition !== 'storm' && (
        <g opacity={v.timeOfDay === 'dawn' ? 0.22 : 0.13} style={{ mixBlendMode: 'soft-light' }}>
          {[[150, 34, 7, 96, 12], [470, 30, 5, 110, -9], [660, 36, 6, 90, 8]].map(([x, y, w, len, skew], i) => (
            <path key={i}
              d={`M ${x} ${y} L ${x + w} ${y} L ${x + w + skew + len * 0.16} ${y + len} L ${x + skew - len * 0.16} ${y + len} Z`}
              fill="url(#vshaft)" className={`village-mote village-mote-${i}`} />
          ))}
        </g>
      )}

      {/* Warm glow pooling on the ground after dark (round 53; round 74 —
          also during Guest Mode). Under Home and a couple of spots along
          the path, the light everyone's windows and lamps are casting. */}
      {glowy && (
        <g>
          {[[432, 0.16], [150, 0.1], [600, 0.1], [300, 0.08]].map(([cx, op], i) => (
            <ellipse key={i} cx={cx} cy={groundY + 8} rx={i === 0 ? 60 : 42} ry={i === 0 ? 15 : 11}
              fill="var(--amber)" opacity={op} filter="url(#vglow)" />
          ))}
        </g>
      )}

      {/* Dust / pollen drifting in the daylight (round 53) — seven tiny warm
          motes on slow, uneven paths. Daytime only, so it never fights the
          fireflies or the falling-particle layer. */}
      {v.timeOfDay === 'day' && (
        <g opacity={0.5} fill="var(--amber)">
          {[[120, 150], [260, 120], [380, 175], [520, 135], [640, 160], [190, 200], [710, 190]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={1.5} className={`village-mote village-mote-${i % 4}`} />
          ))}
        </g>
      )}
      {/* Chimney smoke, only when the chimney itself is drawn and only when
          someone would plausibly have lit something. */}
      {/* Repositioned again for cottage.png (round 9, 2026-08-27) — Home's
          chimney moved once more when the free-tier farm-pack house was
          replaced with the user's own custom cottage sprite; its chimney
          sits further right and higher than the previous sprite's. */}
      {/* Dawn added to the gate (round 50, 2026-08-28, "living painting...
          smoke rises" as a morning beat) — a chimney just lit for breakfast,
          regardless of season/temperature; cold/dark keep covering the rest
          of the day as before. */}
      {lived && (cold || dark || v.timeOfDay === 'dawn') && (
        <g className="village-smoke" opacity={0.22}>
          <circle cx={436} cy={groundY - 92} r={3.5} fill="var(--text)" />
          <circle cx={439} cy={groundY - 103} r={4.5} fill="var(--text)" opacity={0.7} />
          <circle cx={435} cy={groundY - 115} r={5.5} fill="var(--text)" opacity={0.45} />
        </g>
      )}

      {/* Three birds, high and far, morning only — a third added round 29
          (2026-08-27, "add more ambient elements"), still well inside the
          six-moving-node budget above (this group only shows alongside
          smoke/fireflies at different times of day, never all at once). */}
      {(v.timeOfDay === 'dawn' || v.timeOfDay === 'day') && (
        <g className="village-birds" opacity={0.28}>
          <path d="M 0 0 q 4 -3 8 0 q 4 -3 8 0" fill="none" stroke="var(--text)" strokeWidth={1.1} transform="translate(120 96)" />
          <path d="M 0 0 q 3 -2.2 6 0 q 3 -2.2 6 0" fill="none" stroke="var(--text)" strokeWidth={1} transform="translate(158 112)" />
          <path d="M 0 0 q 3.5 -2.6 7 0 q 3.5 -2.6 7 0" fill="none" stroke="var(--text)" strokeWidth={1} transform="translate(560 88)" />
        </g>
      )}

      {/* Stars (round 66, "add ... stars or ambient things like that that
          don't need illustration") — a fixed scatter high in the sky, only
          at night, each twinkling on its own offset. Pure <circle>s, no art.
          Kept above the village band so they never mix with the fireflies. */}
      {v.timeOfDay === 'night' && (
        <g fill="#fdf6e3">
          {[[60, 40], [110, 22], [155, 55], [210, 30], [260, 48], [320, 20], [370, 44],
            [430, 28], [485, 52], [540, 24], [590, 46], [650, 30], [700, 50], [745, 26],
            [88, 66], [300, 64], [510, 68], [620, 62], [180, 74], [420, 72]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 4 === 0 ? 1.4 : 0.9}
              className={`village-twinkle village-twinkle-${i % 4}`} />
          ))}
        </g>
      )}

      {/* Fireflies (round 53: spread across the whole village at dusk/night;
          round 66 "add fireflies glow" — a couple more, bigger blur, and a
          soft pooled halo under the swarm; round 74 — also during a
          gathering). Each drifts on its own slow path. */}
      {glowy && (
        <g opacity={0.95}>
          <ellipse cx={230} cy={groundY + 30} rx={120} ry={26} fill="var(--amber)" opacity={0.06} filter="url(#vglow)" />
          <ellipse cx={560} cy={groundY + 28} rx={130} ry={26} fill="var(--amber)" opacity={0.06} filter="url(#vglow)" />
          {[[92, 336], [148, 320], [214, 344], [268, 328], [122, 352], [190, 330], [244, 314],
            [360, 316], [470, 340], [560, 322], [640, 348], [710, 330], [520, 356], [412, 326]].map(([cx, cy], i) => (
            <g key={i} className={`village-mote village-mote-${i % 4}`}>
              <circle cx={cx} cy={cy} r={i % 3 === 0 ? 2.3 : 1.7} fill="var(--amber)"
                className={`village-firefly village-firefly-${i % 3}`} style={{ filter: 'url(#vglow)' }} />
            </g>
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
        <>
          <g opacity={0.35} stroke="var(--text)" strokeWidth={1.1} strokeLinecap="round">
            {[[70, 20], [210, 4], [350, 30], [500, 10], [640, 26], [720, 0]].map(([cx, cy], i) => (
              <line key={i} x1={cx} y1={cy} x2={cx - 3} y2={cy + 14}
                className={`village-rain village-rain-${i % 3}`} />
            ))}
          </g>
          {/* Puddles collecting on the ground while it rains (round 54,
              "import all" — weather-puddles-wind-leaves-alpha.png). Static
              decals, low on the path. */}
          <g opacity={0.5}>
            {[[210, groundY + 40, 34], [470, groundY + 34, 26], [610, groundY + 44, 30]].map(([cx, cy, w], i) => (
              <image key={i} href="/village-assets/puddle.png" x={cx - w / 2} y={cy - (w / 2.8) / 2}
                width={w} height={w / 2.8} style={{ imageRendering: 'pixelated' }} preserveAspectRatio="none" />
            ))}
          </g>
        </>
      )}

      {/* Wind-blown leaves drifting along the ground in autumn (round 54) —
          two scattered patches, gentle horizontal drift. */}
      {v.season === 'autumn' && v.timeOfDay !== 'night' && (
        <g opacity={0.55}>
          {[[180, groundY + 36], [560, groundY + 30]].map(([cx, cy], i) => {
            const w = 30, h = w * (95 / 384)
            return (
              <image key={i} href="/village-assets/leaves-scatter.png" x={cx - w / 2} y={cy - h}
                width={w} height={h} style={{ imageRendering: 'pixelated' }} preserveAspectRatio="none"
                className={`village-mote village-mote-${i * 2 + 1}`} />
            )
          })}
        </g>
      )}

      {/* Two butterflies over the garden, daytime only and only when
          there's actually something growing for them to visit — same
          "gated on making sense" rule as the smoke/fireflies above. Kept
          out of any dark/rain combo so the moving-node count never really
          stacks past the budget in the header comment. */}
      {(v.timeOfDay === 'day' || v.timeOfDay === 'dawn') && v.plants.length > 0 && weatherCondition !== 'rain' && weatherCondition !== 'storm' && (
        <g opacity={0.5}>
          {/* A third added round 64 ("add more ... subtle animations"), over
              Growth Garden's flower symbol — still only shows alongside the
              day/dawn motes+birds, never with the dusk/night firefly set, so
              the moving-node count stays inside the header budget. */}
          {[{ x: 165, y: 250 }, { x: 305, y: 268 }, { x: 132, y: 236 }].map((p, i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`} className={`village-butterfly village-butterfly-${i % 2}`}>
              <path d="M -3.5 0 Q -6 -4 -3.2 -1 Q -6 2 -3.5 0 Z" fill={i === 2 ? 'var(--gold)' : 'var(--blush)'} />
              <path d="M 3.5 0 Q 6 -4 3.2 -1 Q 6 2 3.5 0 Z" fill={i === 2 ? 'var(--gold)' : 'var(--blush)'} />
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

'use client'

import type { VillageState } from '@/lib/village/state'

// Sky colour by time of day. `day` doubles as the pre-mount default: see the
// `live` prop below for why there has to be one.
const SKY: Record<VillageState['timeOfDay'], [string, string]> = {
  dawn:  ['color-mix(in srgb, var(--amber) 22%, var(--bg))', 'var(--bg)'],
  day:   ['color-mix(in srgb, var(--slate) 20%, var(--bg))', 'var(--bg)'],
  dusk:  ['color-mix(in srgb, var(--rose) 20%, var(--bg))', 'var(--bg)'],
  night: ['color-mix(in srgb, var(--purple) 14%, var(--bg))', 'var(--bg)'],
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
export default function Sky({ timeOfDay, live }: {
  timeOfDay: VillageState['timeOfDay']
  live: boolean
}) {
  const [top, bottom] = live ? SKY[timeOfDay] : SKY.day

  return (
    <>
      <defs>
        <linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="village-sky-stop" stopColor={top} />
          <stop offset="100%" className="village-sky-stop" stopColor={bottom} />
        </linearGradient>
      </defs>

      <rect width="800" height="440" fill="url(#vsky)" />

      {/* Night sky — quiet, never twinkling into a distraction */}
      {live && timeOfDay === 'night' && (
        <g className="village-fade">
          {[...Array(18)].map((_, i) => (
            <circle key={i} cx={(i * 137) % 780 + 10} cy={(i * 53) % 150 + 14} r={i % 3 === 0 ? 1.3 : 0.8}
              fill="var(--text)" opacity={0.28} />
          ))}
        </g>
      )}
    </>
  )
}

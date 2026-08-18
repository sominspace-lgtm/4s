'use client'

import type { Celestial as CelestialData } from '@/lib/village/sky'

/**
 * The sun, or the moon with tonight's actual phase.
 *
 * The shadow is a second circle filled with the sky colour rather than a mask
 * or a filter — masks don't inherit `color-mix` custom properties reliably
 * across themes, and a crescent is two circles anyway.
 */
export default function Celestial({ c }: { c: CelestialData }) {
  const r = c.body === 'sun' ? 15 : 12

  if (c.body === 'sun') {
    return (
      <g className="village-fade" pointerEvents="none">
        <circle cx={c.x} cy={c.y} r={r + 9} fill="var(--amber)" opacity={0.07} />
        <circle cx={c.x} cy={c.y} r={r} fill="var(--amber)" opacity={0.28} />
      </g>
    )
  }

  // Shadow offset: none at new moon, fully clear of the disc at full. Sits on
  // the left while waxing and the right while waning.
  const offset = r * (1 - Math.cos(2 * Math.PI * c.phase))
  const dir = c.phase < 0.5 ? -1 : 1

  return (
    <g className="village-fade" pointerEvents="none">
      <circle cx={c.x} cy={c.y} r={r + 8} fill="var(--text)" opacity={0.05} />
      <circle cx={c.x} cy={c.y} r={r} fill="var(--text)" opacity={0.3} />
      {/* Bites the disc back down to the current phase. */}
      <circle cx={c.x + offset * dir} cy={c.y} r={r} fill="url(#vsky)" />
    </g>
  )
}

'use client'

import { hashPos } from '@/lib/village/state'
import type { HorizonPlace } from '@/lib/hooks/useSharedHorizon'

/**
 * The far hills: places you and someone else have actually both been, in the
 * order you went to them.
 *
 * Drawn behind everything and very faint, because it's the one part of the
 * scene that isn't about you on your own, and it should read as distance
 * rather than as another district competing for attention.
 *
 * Returns null when there's nothing, which is the important bit: a solo user
 * sees sky here, not an empty band with a prompt in it. 4S is a personal OS
 * first, and the version of this that says "invite someone to fill this in"
 * would make being alone feel like a missing feature.
 */
export default function Horizon({ places, groundY }: { places: HorizonPlace[]; groundY: number }) {
  if (!places.length) return null

  const points = places.map((p, i) => ({
    place: p,
    x: 60 + (i / Math.max(1, places.length - 1)) * 680,
    // Hills of slightly different heights, stable per place.
    y: groundY - 52 - hashPos(p.id) * 16,
    // Earlier visits sit further back in memory as well as in the line.
    fade: 0.10 + (i / Math.max(1, places.length - 1)) * 0.14,
  }))

  return (
    <g pointerEvents="none">
      {points.map(({ place, x, y, fade }) => (
        <path key={`h${place.id}`}
          d={`M ${x - 62} ${groundY - 18} Q ${x} ${y} ${x + 62} ${groundY - 18} Z`}
          fill="var(--slate)" opacity={fade} />
      ))}

      <polyline
        points={points.map(p => `${p.x},${p.y + 6}`).join(' ')}
        fill="none" stroke="var(--slate)" strokeWidth={0.8} opacity={0.18}
        strokeDasharray="2 4"
      />

      {points.map(({ place, x, y, fade }) => (
        <circle key={place.id} cx={x} cy={y + 6} r={2.5} fill="var(--slate)" opacity={fade + 0.22}>
          <title>{`${place.name}, together since ${place.first_visited_on.slice(0, 4)}`}</title>
        </circle>
      ))}
    </g>
  )
}

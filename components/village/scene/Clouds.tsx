'use client'

import type { VillageState } from '@/lib/village/state'

/**
 * Clouds — the one piece of sky that was empty before. Fixed shapes,
 * deterministic positions (same reasoning as everything else in this file:
 * a place you recognise, not noise that reshuffles), drifting very slowly.
 *
 * Faint by day, warmed at dawn/dusk (a cheap but real "golden hour" cue —
 * same clouds, just catching the light differently), nearly gone at night so
 * they don't compete with the stars.
 */
export default function Clouds({ timeOfDay }: { timeOfDay: VillageState['timeOfDay'] }) {
  const tint = timeOfDay === 'dawn' || timeOfDay === 'dusk' ? 'var(--amber)' : 'var(--text)'
  const opacity = timeOfDay === 'night' ? 0.08 : timeOfDay === 'day' ? 0.16 : 0.22

  return (
    <g opacity={opacity} pointerEvents="none">
      <g className="village-cloud village-cloud-1" transform="translate(120 58)">
        <ellipse cx={0} cy={0} rx={34} ry={10} fill={tint} />
        <ellipse cx={-18} cy={4} rx={20} ry={7} fill={tint} />
        <ellipse cx={20} cy={3} rx={22} ry={8} fill={tint} />
      </g>
      <g className="village-cloud village-cloud-2" transform="translate(520 42)">
        <ellipse cx={0} cy={0} rx={26} ry={8} fill={tint} />
        <ellipse cx={16} cy={3} rx={16} ry={6} fill={tint} />
      </g>
      <g className="village-cloud village-cloud-3" transform="translate(660 80)">
        <ellipse cx={0} cy={0} rx={20} ry={6} fill={tint} />
        <ellipse cx={-13} cy={2} rx={13} ry={5} fill={tint} />
      </g>
    </g>
  )
}

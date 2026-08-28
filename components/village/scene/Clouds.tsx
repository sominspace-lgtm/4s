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
 *
 * Real pixel-art sprites now (round 18, 2026-08-27, same source pack as the
 * sun in Celestial.tsx — "everything should be same style except
 * background") — the three flat hand-drawn ellipse-blob clouds this
 * replaced were a different visual language from every sprite elsewhere in
 * the scene. Dawn/dusk still get a warm tint, done here with a CSS filter
 * (sepia+hue-rotate) since an <image> can't take a fill color the way the
 * old ellipses could.
 */
export default function Clouds({ timeOfDay }: { timeOfDay: VillageState['timeOfDay'] }) {
  const warm = timeOfDay === 'dawn' || timeOfDay === 'dusk'
  const opacity = timeOfDay === 'night' ? 0.22 : timeOfDay === 'day' ? 0.55 : 0.65
  const style: React.CSSProperties = {
    imageRendering: 'pixelated',
    filter: warm ? 'sepia(0.6) saturate(2) hue-rotate(-10deg)' : undefined,
  }

  return (
    <g opacity={opacity} pointerEvents="none">
      <image className="village-cloud village-cloud-1" href="/village-assets/cloud-big.png"
        x={120 - 34} y={58 - 10} width={68} height={40.4} style={style} />
      <image className="village-cloud village-cloud-2" href="/village-assets/cloud-small.png"
        x={520 - 22} y={42 - 7} width={44} height={27.9} style={style} />
      <image className="village-cloud village-cloud-3" href="/village-assets/cloud-small.png"
        x={660 - 16} y={80 - 5} width={32} height={20.3} style={style} />
    </g>
  )
}

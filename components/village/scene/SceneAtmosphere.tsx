import type { VillageState } from '@/lib/village/state'
import type { WeatherCondition } from '@/lib/village/weather'

// The light over the whole village, drawn last (moved out of VillageScene
// 2026-10-29). One wash for the time of day and one for the weather tint
// everything below them the same way, so a rainy dusk reads as one real
// condition rather than a colored sky over an unlit ground. Then the
// vignette, and a little grain for texture.

const TIME_CAST: Record<VillageState['timeOfDay'], [string, number]> = {
  dawn: ['#F5B88A', 0.07],
  day: ['#FFFFFF', 0],
  dusk: ['#E67A4A', 0.1],
  night: ['#2A3B6B', 0.1],
}
const WEATHER_CAST: Record<WeatherCondition, [string, number]> = {
  clear: ['#FFFFFF', 0],
  cloudy: ['#8B93A0', 0.06],
  fog: ['#C7CCD1', 0.14],
  rain: ['#5C7290', 0.1],
  snow: ['#DCE6F0', 0.08],
  storm: ['#3E4A5C', 0.16],
}

export default function SceneAtmosphere({ live, timeOfDay, condition, hosting, lite }: {
  live: boolean
  timeOfDay: VillageState['timeOfDay']
  condition: WeatherCondition
  /** A gathering is on: a faint golden wash so it feels warmer than a normal day. */
  hosting: boolean
  lite: boolean
}) {
  const [tColor, tOp] = TIME_CAST[timeOfDay]
  const [wColor, wOp] = WEATHER_CAST[condition]
  return (
    <>
      {live && (
        <>
          {/* A whisper of hearth-warmth, always, so the village is never cold. */}
          <rect width="800" height="440" fill="#F6D9A8" opacity={0.028} pointerEvents="none" style={{ mixBlendMode: 'soft-light' }} />
          {tOp > 0 && <rect width="800" height="440" fill={tColor} opacity={tOp} pointerEvents="none" />}
          {wOp > 0 && <rect width="800" height="440" fill={wColor} opacity={wOp} pointerEvents="none" />}
          {hosting && <rect width="800" height="440" fill="#F3C88A" opacity={0.06} pointerEvents="none" />}
        </>
      )}
      {/* Vignette: drawn in SVG so it can't catch the taps meant for the districts. */}
      <rect width="800" height="440" fill="url(#vhearth)" pointerEvents="none"
        opacity={timeOfDay === 'night' ? 0.2 : timeOfDay === 'dusk' ? 0.16 : timeOfDay === 'dawn' ? 0.1 : 0.06} />
      <rect width="800" height="440" fill="url(#vvignette)" pointerEvents="none" />
      {/* Grain, multiplied so it can only darken. Off on older iPads. */}
      {!lite && <rect width="800" height="440" filter="url(#vgrain)" opacity={0.05} pointerEvents="none" style={{ mixBlendMode: 'multiply' }} />}
    </>
  )
}

'use client'

import { useState } from 'react'
import VillageScene, { GROUND_Y } from '@/components/village/scene/VillageScene'
import { hashPos, type VillageState, type Plant, type Building } from '@/lib/village/state'
import { seasonPalette } from '@/lib/village/palette'
import { celestialOf } from '@/lib/village/sky'
import { THEMES, THEME_LABELS } from '@/lib/constants/themes'

const SEASONS: VillageState['season'][] = ['spring', 'summer', 'autumn', 'winter']
const TIMES: VillageState['timeOfDay'][] = ['dawn', 'day', 'dusk', 'night']

const PLANT_STAGES: Plant['stage'][] = ['seed', 'sprout', 'plant', 'young', 'tree']
const PHASES: Building['phase'][] = ['blueprint', 'foundation', 'construction', 'complete', 'landmark']

function fakeVillage(season: VillageState['season'], timeOfDay: VillageState['timeOfDay']): VillageState {
  const plants: Plant[] = [...Array(9)].map((_, i) => ({
    id: `p${i}`,
    name: `Habit ${i}`,
    stage: PLANT_STAGES[i % PLANT_STAGES.length],
    dormant: i === 4 || i === 7,
    category: null,
  }))
  const buildings: Building[] = [...Array(6)].map((_, i) => ({
    id: `b${i}`,
    title: `Project ${i}`,
    phase: PHASES[i % PHASES.length],
  }))
  return {
    plants, buildings, flowers: [],
    treeRings: 2, accountMonths: 29, canopy: 1,
    stillness: 0.7, reflectionDays: 5,
    season, timeOfDay,
    isEmpty: false,
  }
}

// The same placement maths Village.tsx uses, so the preview isn't a different
// picture from the real thing.
function slotsFor(v: VillageState) {
  return {
    plantSlots: v.plants.map((p, idx) => ({
      id: p.id, plant: p, scale: 1,
      x: 60 + ((hashPos(p.id) * 0.7 + (idx % 7) / 7 * 0.3) * 250),
      y: GROUND_Y - 6 + (hashPos(p.id + 'y') * 26),
    })),
    buildingSlots: v.buildings.map((b, idx) => ({
      id: b.id, building: b, scale: 1,
      x: 500 + ((hashPos(b.id) * 0.55 + (idx % 4) / 4 * 0.45) * 250),
      y: GROUND_Y - 4 + (hashPos(b.id + 'y') * 20),
    })),
  }
}

const HOUR_FOR: Record<VillageState['timeOfDay'], number> = { dawn: 8, day: 13, dusk: 18.5, night: 22 }

export default function VillagePreviewClient() {
  const [theme, setTheme] = useState('bloom')
  const themeVars = THEMES[theme] ?? {}
  const isLight = themeVars['--scheme'] === 'light'

  return (
    <div style={{ ...(themeVars as React.CSSProperties), background: 'var(--bg)', minHeight: '100vh', padding: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
        {Object.keys(THEMES).map(t => (
          <button key={t} onClick={() => setTheme(t)} style={{
            fontSize: '0.75rem', padding: '0.4em 0.9em', cursor: 'pointer',
            borderRadius: '8px', border: '1px solid var(--border)',
            background: t === theme ? 'var(--gold)' : 'var(--surface)',
            color: t === theme ? 'var(--bg)' : 'var(--text)',
          }}>{THEME_LABELS[t] ?? t}</button>
        ))}
      </div>

      {SEASONS.map(season => (
        <div key={season} style={{ marginBottom: '1.4rem' }}>
          <div style={{ color: 'var(--text)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            {season}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.7rem' }}>
            {TIMES.map(timeOfDay => {
              const v = fakeVillage(season, timeOfDay)
              const { plantSlots, buildingSlots } = slotsFor(v)
              const now = new Date(2026, season === 'winter' ? 0 : season === 'spring' ? 3 : season === 'summer' ? 6 : 9, 15)
              now.setHours(Math.floor(HOUR_FOR[timeOfDay]), (HOUR_FOR[timeOfDay] % 1) * 60)
              return (
                <div key={timeOfDay}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>{timeOfDay}</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface)' }}>
                    <VillageScene
                      village={v} live palette={seasonPalette(season, isLight)}
                      celestial={celestialOf(now)}
                      plantSlots={plantSlots} buildingSlots={buildingSlots}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

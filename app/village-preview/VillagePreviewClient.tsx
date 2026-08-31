'use client'

import { useState } from 'react'
import VillageScene, { GROUND_Y } from '@/components/village/scene/VillageScene'
import Village from '@/components/village/Village'
import { type VillageState, type Plant, type Building } from '@/lib/village/state'
import { forestSlots, districtSlots } from '@/lib/village/layout'
import { seasonPalette } from '@/lib/village/palette'
import { celestialOf } from '@/lib/village/sky'
import { THEMES, THEME_LABELS } from '@/lib/constants/themes'

const SEASONS: VillageState['season'][] = ['spring', 'summer', 'autumn', 'winter']
const TIMES: VillageState['timeOfDay'][] = ['dawn', 'day', 'dusk', 'night']

const PLANT_STAGES: Plant['stage'][] = ['seed', 'sprout', 'plant', 'young', 'tree']
const PHASES: Building['phase'][] = ['blueprint', 'foundation', 'construction', 'complete', 'landmark']

function fakeVillage(
  season: VillageState['season'], timeOfDay: VillageState['timeOfDay'],
  nPlants = 9, nBuildings = 6,
): VillageState {
  const plants: Plant[] = [...Array(nPlants)].map((_, i) => ({
    id: `p${i}`,
    name: `Habit ${i}`,
    stage: PLANT_STAGES[i % PLANT_STAGES.length],
    dormant: i === 4 || i === 7,
    category: null,
  }))
  const buildings: Building[] = [...Array(nBuildings)].map((_, i) => ({
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

// The real placement functions, not a copy, so the preview can't drift.
function slotsFor(v: VillageState) {
  const plantsById = new Map(v.plants.map(p => [p.id, p]))
  const buildingsById = new Map(v.buildings.map(b => [b.id, b]))
  return {
    plantSlots: forestSlots(v.plants.map(p => p.id), GROUND_Y)
      .map(s => ({ ...s, plant: plantsById.get(s.id)! }))
      .sort((a, b) => Number(b.back) - Number(a.back)),
    buildingSlots: districtSlots(v.buildings.map(b => b.id), GROUND_Y)
      .map(s => ({ ...s, building: buildingsById.get(s.id)! }))
      .sort((a, b) => Number(b.back) - Number(a.back)),
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

      {/* The slim cross-tab band (round 76) — the real <Village strip /> as
          it appears at the top of every other dashboard tab. Runs the real
          data hooks (empty here, no auth) so it also smoke-tests that path. */}
      <div style={{ marginBottom: '1.4rem' }}>
        <div style={{ color: 'var(--text)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          tab band (strip)
        </div>
        <Village strip userId="preview" />
      </div>

      {/* Density: growth has to stay visible past the old caps rather than
          silently stopping. Last one is deliberately over the cap. */}
      <div style={{ marginBottom: '1.4rem' }}>
        <div style={{ color: 'var(--text)', fontSize: '0.8rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          density
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.7rem' }}>
          {[[1, 1], [8, 5], [28, 16], [60, 40]].map(([np, nb]) => {
            const v = fakeVillage('summer', 'day', np, nb)
            const { plantSlots, buildingSlots } = slotsFor(v)
            return (
              <div key={np} data-density={np}>
                <div style={{ color: 'var(--muted)', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
                  {np} plants / {nb} projects
                </div>
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--surface)' }}>
                  <VillageScene village={v} live palette={seasonPalette('summer', isLight)}
                    celestial={celestialOf(new Date(2026, 6, 15, 13))}
                    plantSlots={plantSlots} buildingSlots={buildingSlots} />
                </div>
              </div>
            )
          })}
        </div>
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

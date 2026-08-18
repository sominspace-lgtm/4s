'use client'

import type { VillageState } from '@/lib/village/state'
import { goToSection, goToPersonal } from '@/lib/utils/navigate'
import { PlantShape, BuildingShape, DistrictLabel } from './shapes'
import Sky from './Sky'

export const GROUND_Y = 372

export interface Slot {
  id: string
  x: number
  y: number
  scale: number
}

/**
 * The scene itself: pure presentation, no hooks and no dates. Everything
 * time-shaped arrives as `live` (see Sky) and everything data-shaped arrives as
 * `village`, so this file can be read top to bottom as a draw order.
 */
export default function VillageScene({ village: v, live, plantSlots, buildingSlots }: {
  village: VillageState
  live: boolean
  plantSlots: (Slot & { plant: VillageState['plants'][number] })[]
  buildingSlots: (Slot & { building: VillageState['buildings'][number] })[]
}) {
  return (
    <svg
      viewBox="0 0 800 440"
      role="img"
      aria-label="Your village — a view of your habits, projects and history"
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <defs>
        <radialGradient id="vlake">
          <stop offset="0%" stopColor="var(--slate)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--slate)" stopOpacity="0.15" />
        </radialGradient>
        <radialGradient id="vvignette" cx="50%" cy="45%" r="75%">
          <stop offset="55%" stopColor="var(--bg)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--bg)" stopOpacity="0.5" />
        </radialGradient>
      </defs>

      <Sky timeOfDay={v.timeOfDay} live={live} />

      {/* Rolling ground */}
      <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18} L 800 440 L 0 440 Z`}
        fill="var(--surface)" opacity={0.95} />
      <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18}`}
        fill="none" stroke="var(--border)" strokeWidth="1.5" />

      {/* Rest Lake — clarity reflects actual rest taken */}
      <ellipse cx={150} cy={410} rx={110} ry={22} fill="url(#vlake)" opacity={0.4 + v.stillness * 0.6} />
      <ellipse cx={150} cy={410} rx={110} ry={22} fill="none" stroke="var(--slate)" strokeWidth={0.8} opacity={0.4} />
      <g className="village-drift">
        <ellipse cx={120} cy={406} rx={26} ry={3} fill="var(--text)" opacity={0.07} />
        <ellipse cx={186} cy={414} rx={18} ry={2.4} fill="var(--text)" opacity={0.05} />
      </g>

      {/* Growth Forest */}
      {plantSlots.map(({ plant, x, y, scale }) => (
        <PlantShape key={plant.id} plant={plant} x={x} y={y} scale={scale} />
      ))}

      {/* Home — always present, grows detail with activity */}
      <g transform={`translate(400 ${GROUND_Y - 4})`}>
        <title>Home — your Brief and today</title>
        <rect x={-30} y={-44} width={60} height={44} rx={3} fill="var(--surface2)" stroke="var(--border)" strokeWidth={1.2} />
        <path d="M -36 -44 L 0 -68 L 36 -44 Z" fill="var(--gold)" fillOpacity={0.55} stroke="var(--gold)" strokeWidth={1} strokeOpacity={0.7} />
        <rect x={-8} y={-24} width={16} height={24} rx={1.5} fill="var(--gold)" opacity={0.35} />
        <rect x={-22} y={-34} width={10} height={10} rx={1} fill="var(--amber)" opacity={0.75} className="village-glow" />
        <rect x={12} y={-34} width={10} height={10} rx={1} fill="var(--amber)" opacity={0.55} />
        {v.buildings.length + v.plants.length > 6 && (
          <path d="M 18 -68 L 18 -80 L 25 -80 L 25 -68" fill="none" stroke="var(--border)" strokeWidth={2} />
        )}
      </g>

      {/* Project District */}
      {buildingSlots.map(({ building, x, y, scale }) => (
        <BuildingShape key={building.id} building={building} x={x} y={y} scale={scale} />
      ))}

      {/* Archive Grove — the Life Tree. Rings are the yearly milestone; the
          canopy is the continuum underneath, so the tree visibly thickens
          across your first months instead of standing still until month 12. */}
      <g transform={`translate(725 ${GROUND_Y + 2})`}>
        <title>{
          v.treeRings > 0
            ? `Archive Grove, Life Tree, ${v.treeRings} year${v.treeRings === 1 ? '' : 's'}`
            : `Archive Grove, Life Tree in its first year, ${v.accountMonths} month${v.accountMonths === 1 ? '' : 's'} of growth`
        }</title>
        <rect x={-4} y={-40} width={8} height={40 * (0.75 + v.canopy * 0.25)} rx={2} fill="var(--slate)" opacity={0.7}
          transform={`translate(0 ${40 - 40 * (0.75 + v.canopy * 0.25)})`} />
        <circle cx={0} cy={-52} r={18 + v.canopy * 8} fill="var(--emerald)" opacity={0.35} />
        <circle cx={-14} cy={-44} r={11 + v.canopy * 5} fill="var(--emerald)" opacity={0.28} />
        <circle cx={14} cy={-45} r={10 + v.canopy * 5} fill="var(--emerald)" opacity={0.3} />
        {[...Array(Math.min(v.treeRings, 5))].map((_, i) => (
          <circle key={i} cx={0} cy={-52} r={7 + i * 4.5} fill="none" stroke="var(--gold)" strokeWidth={0.7} opacity={0.35} />
        ))}
      </g>

      {/* Bloom Garden — waiting on BloomScan */}
      <g transform={`translate(300 418)`} opacity={v.flowers.length ? 1 : 0.35}>
        <title>Bloom Garden — flowers you find in BloomScan appear here</title>
        {[0, 1, 2].map(i => (
          <g key={i} transform={`translate(${i * 22 - 22} 0)`}>
            <rect x={-0.8} y={-10} width={1.6} height={10} fill="var(--emerald)" opacity={0.6} />
            <circle cy={-12} r={3.4} fill="var(--blush)" opacity={v.flowers.length ? 0.9 : 0.5} />
          </g>
        ))}
      </g>

      {/* District labels — the actual navigation */}
      <DistrictLabel x={150} y={130} glyph="🌊" label="Rest Lake" onClick={() => goToSection('brief')}
        count={v.stillness > 0.5 ? 'still' : 'ready when you are'} />
      <DistrictLabel x={175} y={250} glyph="🌲" label="Growth Forest" onClick={() => goToPersonal('habits')}
        count={`${v.plants.length} growing`} />
      <DistrictLabel x={400} y={250} glyph="🏡" label="Home" onClick={() => goToSection('brief')} count="today" />
      <DistrictLabel x={620} y={250} glyph="🏗️" label="Projects" onClick={() => goToSection('work')}
        count={`${v.buildings.length} standing`} />
      <DistrictLabel x={725} y={190} glyph="📚" label="Archive" onClick={() => goToSection('brief')}
        count={v.treeRings > 0 ? `${v.treeRings}y` : `${v.accountMonths}mo`} />

      {/* Vignette — pulls the eye to the middle of the scene. Drawn in
          SVG rather than as a CSS overlay so it can't intercept the
          clicks on the district labels underneath it. */}
      <rect width="800" height="440" fill="url(#vvignette)" pointerEvents="none" />
    </svg>
  )
}

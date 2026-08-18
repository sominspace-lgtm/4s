'use client'

import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { useHabits } from '@/lib/hooks/useHabits'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useVillageWork } from '@/lib/hooks/useVillageWork'
import { useReflectionDays } from '@/lib/hooks/useReflectionDays'
import { buildVillage, hashPos, STAGE_INDEX, type Plant, type Building } from '@/lib/village/state'
import { goToSection, goToPersonal } from '@/lib/utils/navigate'
import VillageText from './VillageText'

// The village: your life as a place, not a dashboard.
//
// SVG rather than canvas/WebGL — every element is a real DOM node, so it
// themes for free off the CSS custom properties, stays crisp at any size,
// and can be labelled for screen readers. A village is a few hundred nodes;
// this is nowhere near needing a game engine.
//
// It renders once per data change, never on a frame loop. The only motion
// is CSS on a handful of elements, and all of it is disabled under
// prefers-reduced-motion (see globals.css).

const SKY: Record<string, [string, string]> = {
  dawn:  ['color-mix(in srgb, var(--amber) 22%, var(--bg))', 'var(--bg)'],
  day:   ['color-mix(in srgb, var(--slate) 20%, var(--bg))', 'var(--bg)'],
  dusk:  ['color-mix(in srgb, var(--rose) 20%, var(--bg))', 'var(--bg)'],
  night: ['color-mix(in srgb, var(--purple) 14%, var(--bg))', 'var(--bg)'],
}

// Plant silhouettes by stage. Each stage is a real change in shape, not just
// scale — growth should read at a glance, from across the room.
function PlantShape({ plant, x, y }: { plant: Plant; x: number; y: number }) {
  const i = STAGE_INDEX(plant.stage)
  const h = [8, 18, 34, 52, 72][i]
  const w = [7, 12, 22, 32, 44][i]
  const color = plant.dormant ? 'var(--muted)' : 'var(--emerald)'
  const opacity = plant.dormant ? 0.4 : 1

  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <title>{`${plant.name} — ${plant.stage}${plant.dormant ? ', resting' : ''}`}</title>
      {/* stem */}
      <rect x={-1.2} y={-h} width={2.4} height={h} rx={1.2} fill={color} opacity={0.75} />
      {i === 0 && <circle cy={-h - 2} r={3.5} fill={color} />}
      {i === 1 && (
        <>
          <ellipse cx={-5} cy={-h + 2} rx={5.5} ry={3.4} fill={color} transform="rotate(-24 -5 0)" />
          <ellipse cx={5} cy={-h - 1} rx={5.5} ry={3.4} fill={color} transform="rotate(24 5 0)" />
        </>
      )}
      {i >= 2 && (
        <>
          <circle cx={0} cy={-h} r={w / 2} fill={color} opacity={0.92} />
          <circle cx={-w / 3.2} cy={-h + w / 5} r={w / 3.4} fill={color} opacity={0.75} />
          <circle cx={w / 3.2} cy={-h + w / 5.5} r={w / 3.8} fill={color} opacity={0.7} />
        </>
      )}
      {plant.dormant && i >= 1 && (
        <circle cx={0} cy={-h - w / 2 - 6} r={1.6} fill="var(--muted)" opacity={0.5} />
      )}
    </g>
  )
}

function BuildingShape({ building, x, y }: { building: Building; x: number; y: number }) {
  const spec = {
    blueprint:    { h: 16, fill: 'transparent',        stroke: 'var(--slate)',  dash: '3 3' },
    foundation:   { h: 14, fill: 'var(--slate)',       stroke: 'var(--slate)',  dash: '' },
    construction: { h: 38, fill: 'var(--amber)',       stroke: 'var(--amber)',  dash: '' },
    complete:     { h: 52, fill: 'var(--slate)',       stroke: 'var(--slate)',  dash: '' },
    landmark:     { h: 68, fill: 'var(--gold)',        stroke: 'var(--gold)',   dash: '' },
  }[building.phase]
  const w = 26

  return (
    <g transform={`translate(${x} ${y})`}>
      <title>{`${building.title} — ${building.phase}`}</title>
      <rect
        x={-w / 2} y={-spec.h} width={w} height={spec.h} rx={2}
        fill={spec.fill} fillOpacity={building.phase === 'blueprint' ? 0 : 0.55}
        stroke={spec.stroke} strokeWidth={1.2} strokeDasharray={spec.dash} strokeOpacity={0.9}
      />
      {/* roof, once it's actually a building */}
      {(building.phase === 'complete' || building.phase === 'landmark') && (
        <path d={`M ${-w / 2 - 3} ${-spec.h} L 0 ${-spec.h - 12} L ${w / 2 + 3} ${-spec.h} Z`} fill={spec.stroke} fillOpacity={0.7} />
      )}
      {/* lit windows — a finished thing has someone in it */}
      {(building.phase === 'complete' || building.phase === 'landmark') && (
        <>
          <rect x={-7} y={-spec.h + 10} width={5} height={6} rx={1} fill="var(--amber)" opacity={0.8} />
          <rect x={2} y={-spec.h + 10} width={5} height={6} rx={1} fill="var(--amber)" opacity={0.6} />
        </>
      )}
      {building.phase === 'landmark' && (
        <text x={0} y={-spec.h - 17} textAnchor="middle" fontSize={11} fill="var(--gold)">◆</text>
      )}
    </g>
  )
}

function DistrictLabel({ x, y, glyph, label, count, onClick }: {
  x: number; y: number; glyph: string; label: string; count: string; onClick: () => void
}) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} className="village-district" style={{ cursor: 'pointer' }}>
      <title>{`${label} — ${count}. Click to open.`}</title>
      <text textAnchor="middle" fontSize={13} y={-13}>{glyph}</text>
      <text textAnchor="middle" fontSize={8.5} fill="var(--muted)" letterSpacing="0.06em">{label.toUpperCase()}</text>
      <text textAnchor="middle" fontSize={7.5} fill="var(--muted)" opacity={0.6} y={10}>{count}</text>
    </g>
  )
}

export default function Village({ userId, theme, accountCreatedAt = null }: {
  userId: string
  theme: string
  /** ISO string from auth.users.created_at, via DashboardClient. */
  accountCreatedAt?: string | null
}) {
  const { habits, completions } = useHabits()
  const { items: workItems } = useWorkItems()
  // Finished work, which useWorkItems deliberately excludes. Without this the
  // Project District can only ever show scaffolding — see useVillageWork.
  const { done } = useVillageWork()
  const reflectionDays = useReflectionDays()

  const accountCreated = useMemo(
    () => (accountCreatedAt ? parseISO(accountCreatedAt) : null),
    [accountCreatedAt]
  )
  const allWork = useMemo(() => [...workItems, ...done], [workItems, done])

  const v = useMemo(
    () => buildVillage({ habits, completions, workItems: allWork, reflectionDays, accountCreated }),
    [habits, completions, allWork, reflectionDays, accountCreated]
  )

  const [skyTop, skyBottom] = SKY[v.timeOfDay]
  const groundY = 372

  // Deterministic placement: same entity, same spot, every load. A place you
  // recognise, not a chart that reshuffles.
  const plantSlots = v.plants.slice(0, 14).map((p, idx) => ({
    plant: p,
    x: 60 + ((hashPos(p.id) * 0.7 + (idx % 7) / 7 * 0.3) * 250),
    y: groundY - 6 + (hashPos(p.id + 'y') * 26),
  }))
  const buildingSlots = v.buildings.slice(0, 8).map((b, idx) => ({
    building: b,
    x: 500 + ((hashPos(b.id) * 0.55 + (idx % 4) / 4 * 0.45) * 250),
    y: groundY - 4 + (hashPos(b.id + 'y') * 20),
  }))

  return (
    <div>
      {/* The village is the centerpiece, so it gets to be a picture rather
          than a widget: a framed, elevated panel with real depth, an inner
          highlight along the top edge, and the sky bleeding all the way to
          the corners. Nothing else on the page is allowed to look like
          this — that's what makes it read as the anchor. */}
      <div
        className="lift organic"
        style={{
          position: 'relative', overflow: 'hidden',
          border: '1px solid var(--border)', boxShadow: 'var(--elev-3)',
          background: 'var(--surface)',
        }}
      >
        <svg
          viewBox="0 0 800 440"
          role="img"
          aria-label="Your village — a view of your habits, projects and history"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
        <defs>
          <linearGradient id="vsky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={skyTop} />
            <stop offset="100%" stopColor={skyBottom} />
          </linearGradient>
          <radialGradient id="vlake">
            <stop offset="0%" stopColor="var(--slate)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--slate)" stopOpacity="0.15" />
          </radialGradient>
          <radialGradient id="vvignette" cx="50%" cy="45%" r="75%">
            <stop offset="55%" stopColor="var(--bg)" stopOpacity="0" />
            <stop offset="100%" stopColor="var(--bg)" stopOpacity="0.5" />
          </radialGradient>
        </defs>

        <rect width="800" height="440" fill="url(#vsky)" />

        {/* Night sky — quiet, never twinkling into a distraction */}
        {v.timeOfDay === 'night' && [...Array(18)].map((_, i) => (
          <circle key={i} cx={(i * 137) % 780 + 10} cy={(i * 53) % 150 + 14} r={i % 3 === 0 ? 1.3 : 0.8}
            fill="var(--text)" opacity={0.28} />
        ))}

        {/* Rolling ground */}
        <path d={`M 0 ${groundY} Q 200 ${groundY - 26} 400 ${groundY - 8} T 800 ${groundY - 18} L 800 440 L 0 440 Z`}
          fill="var(--surface)" opacity={0.95} />
        <path d={`M 0 ${groundY} Q 200 ${groundY - 26} 400 ${groundY - 8} T 800 ${groundY - 18}`}
          fill="none" stroke="var(--border)" strokeWidth="1.5" />

        {/* Rest Lake — clarity reflects actual rest taken */}
        <ellipse cx={150} cy={410} rx={110} ry={22} fill="url(#vlake)" opacity={0.4 + v.stillness * 0.6} />
        <ellipse cx={150} cy={410} rx={110} ry={22} fill="none" stroke="var(--slate)" strokeWidth={0.8} opacity={0.4} />
        <g className="village-drift">
          <ellipse cx={120} cy={406} rx={26} ry={3} fill="var(--text)" opacity={0.07} />
          <ellipse cx={186} cy={414} rx={18} ry={2.4} fill="var(--text)" opacity={0.05} />
        </g>

        {/* Growth Forest */}
        {plantSlots.map(({ plant, x, y }) => <PlantShape key={plant.id} plant={plant} x={x} y={y} />)}

        {/* Home — always present, grows detail with activity */}
        <g transform={`translate(400 ${groundY - 4})`}>
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
        {buildingSlots.map(({ building, x, y }) => <BuildingShape key={building.id} building={building} x={x} y={y} />)}

        {/* Archive Grove — the Life Tree. Rings are the yearly milestone; the
            canopy is the continuum underneath, so the tree visibly thickens
            across your first months instead of standing still until month 12. */}
        <g transform={`translate(725 ${groundY + 2})`}>
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
            count={`${v.treeRings}y`} />

          {/* Vignette — pulls the eye to the middle of the scene. Drawn in
              SVG rather than as a CSS overlay so it can't intercept the
              clicks on the district labels underneath it. */}
          <rect width="800" height="440" fill="url(#vvignette)" pointerEvents="none" />
        </svg>

        {/* Glass highlight along the top edge — the one bit of gloss in the
            whole app, and only because this is the piece meant to be looked
            at rather than used. */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--text) 7%, transparent) 0%, transparent 12%)',
          }}
        />
      </div>

      <VillageText village={v} />
    </div>
  )
}

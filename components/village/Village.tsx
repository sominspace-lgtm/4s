'use client'

import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { useHabits } from '@/lib/hooks/useHabits'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useVillageWork } from '@/lib/hooks/useVillageWork'
import { useReflectionDays } from '@/lib/hooks/useReflectionDays'
import { buildVillage, hashPos } from '@/lib/village/state'
import { seasonPalette } from '@/lib/village/palette'
import { celestialOf } from '@/lib/village/sky'
import { THEMES } from '@/lib/constants/themes'
import { useVillageClock } from './useVillageClock'
import VillageScene, { GROUND_Y } from './scene/VillageScene'
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
//
// This file is the orchestrator only: it gathers the real data, folds it into
// one VillageState, and hands that to a scene that has no hooks and no dates in
// it. Drawing lives in scene/.
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
  const clock = useVillageClock()

  const accountCreated = useMemo(
    () => (accountCreatedAt ? parseISO(accountCreatedAt) : null),
    [accountCreatedAt]
  )
  const allWork = useMemo(() => [...workItems, ...done], [workItems, done])

  const v = useMemo(
    () => buildVillage({
      habits, completions, workItems: allWork, reflectionDays, accountCreated,
      now: clock ?? undefined,
    }),
    [habits, completions, allWork, reflectionDays, accountCreated, clock]
  )

  // Light vs dark comes from the theme's declared --scheme rather than from
  // reading computed styles off the DOM, so the palette stays a pure function
  // and there's nothing for the server and client to disagree about.
  const isLight = THEMES[theme]?.['--scheme'] === 'light'
  const palette = useMemo(() => seasonPalette(v.season, isLight), [v.season, isLight])
  const celestial = useMemo(() => (clock ? celestialOf(clock) : null), [clock])

  // Deterministic placement: same entity, same spot, every load. A place you
  // recognise, not a chart that reshuffles.
  const plantSlots = useMemo(() => v.plants.slice(0, 14).map((p, idx) => ({
    id: p.id,
    plant: p,
    scale: 1,
    x: 60 + ((hashPos(p.id) * 0.7 + (idx % 7) / 7 * 0.3) * 250),
    y: GROUND_Y - 6 + (hashPos(p.id + 'y') * 26),
  })), [v.plants])

  const buildingSlots = useMemo(() => v.buildings.slice(0, 8).map((b, idx) => ({
    id: b.id,
    building: b,
    scale: 1,
    x: 500 + ((hashPos(b.id) * 0.55 + (idx % 4) / 4 * 0.45) * 250),
    y: GROUND_Y - 4 + (hashPos(b.id + 'y') * 20),
  })), [v.buildings])

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
        <VillageScene village={v} live={clock !== null} palette={palette} celestial={celestial}
          plantSlots={plantSlots} buildingSlots={buildingSlots} />

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

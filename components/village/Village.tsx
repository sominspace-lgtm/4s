'use client'

import { useEffect, useMemo, useState } from 'react'
import { parseISO } from 'date-fns'
import { useHabits } from '@/lib/hooks/useHabits'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useVillageWork } from '@/lib/hooks/useVillageWork'
import { useReflectionDays } from '@/lib/hooks/useReflectionDays'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useSharedHorizon } from '@/lib/hooks/useSharedHorizon'
import { buildVillage, villageChangesSince } from '@/lib/village/state'
import { forestSlots, districtSlots } from '@/lib/village/layout'
import { seasonPalette } from '@/lib/village/palette'
import { celestialOf } from '@/lib/village/sky'
import { resolveThemeVars, type CustomThemeSeed } from '@/lib/constants/themes'
import { useVillageClock } from './useVillageClock'
import VillageScene, { GROUND_Y } from './scene/VillageScene'
import VillageText from './VillageText'
import VillageArrival from './VillageArrival'

const ARRIVAL_KEY = '4s-village-arrival'

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
export default function Village({ userId, theme, customTheme = null, accountCreatedAt = null, lastSeen = null, onSeen, locked = false, onLockedNavigate }: {
  userId: string
  theme: string
  /** The active palette when theme === 'custom'. Ignored otherwise. */
  customTheme?: CustomThemeSeed | null
  /** ISO string from auth.users.created_at, via DashboardClient. */
  accountCreatedAt?: string | null
  /** ISO string of the previous visit, frozen for the session by the caller. */
  lastSeen?: string | null
  onSeen?: () => void
  /** Shared mode: show the scene, but require a PIN to walk into it. */
  locked?: boolean
  onLockedNavigate?: (label: string) => void
}) {
  const { habits, completions } = useHabits()
  const { items: workItems } = useWorkItems()
  // Finished work, which useWorkItems deliberately excludes. Without this the
  // Project District can only ever show scaffolding — see useVillageWork.
  const { done } = useVillageWork()
  const reflectionDays = useReflectionDays()
  const clock = useVillageClock()
  const { spaces } = useSharedSpaces(userId)
  const horizon = useSharedHorizon(spaces.length > 0)

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

  // The arrival line, computed once per visit.
  //
  // Guarded through sessionStorage because DashboardClient only renders the
  // active tab, so the Village unmounts and remounts on every tab switch and
  // the caption would otherwise replay each time you came back to it. Once you
  // have read what changed, it should stop being news.
  const [showArrival, setShowArrival] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(ARRIVAL_KEY)) return
    sessionStorage.setItem(ARRIVAL_KEY, '1')
    setShowArrival(true)
    onSeen?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changes = useMemo(
    () => (showArrival && lastSeen
      ? villageChangesSince({ habits, completions, workItems: allWork }, parseISO(lastSeen))
      : undefined),
    [showArrival, lastSeen, habits, completions, allWork]
  )

  // Light vs dark comes from the theme's declared --scheme rather than from
  // reading computed styles off the DOM, so the palette stays a pure function
  // and there's nothing for the server and client to disagree about.
  // resolveThemeVars (not a raw THEMES[theme] lookup) so this still resolves
  // correctly for a custom theme, which has no THEMES entry at all — that
  // used to silently read as undefined here and fall through to dark-mode
  // snow/sky math regardless of what the custom palette's scheme actually was.
  const isLight = resolveThemeVars(theme, customTheme)['--scheme'] === 'light'
  const palette = useMemo(() => seasonPalette(v.season, isLight), [v.season, isLight])
  const celestial = useMemo(() => (clock ? celestialOf(clock) : null), [clock])

  // Deterministic placement: same entity, same spot, every load. A place you
  // recognise, not a chart that reshuffles. See lib/village/layout.
  const plantSlots = useMemo(() => {
    const byId = new Map(v.plants.map(p => [p.id, p]))
    return forestSlots(v.plants.map(p => p.id), GROUND_Y)
      .map(s => ({ ...s, plant: byId.get(s.id)! }))
      // Back row first, so the front row overlaps it rather than the reverse.
      .sort((a, b) => Number(b.back) - Number(a.back))
  }, [v.plants])

  const buildingSlots = useMemo(() => {
    const byId = new Map(v.buildings.map(b => [b.id, b]))
    return districtSlots(v.buildings.map(b => b.id), GROUND_Y)
      .map(s => ({ ...s, building: byId.get(s.id)! }))
      .sort((a, b) => Number(b.back) - Number(a.back))
  }, [v.buildings])

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
          plantSlots={plantSlots} buildingSlots={buildingSlots}
          horizon={horizon} changes={changes}
          locked={locked} onLockedNavigate={onLockedNavigate} />

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

      <VillageArrival caption={changes?.caption ?? null} />
      <VillageText village={v} arrival={changes?.caption ?? null} horizonCount={horizon.length} />
    </div>
  )
}

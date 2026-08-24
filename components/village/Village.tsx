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
import { forestSlots, districtSlots, type VillageLayout } from '@/lib/village/layout'
import { seasonPalette } from '@/lib/village/palette'
import { celestialOf } from '@/lib/village/sky'
import { THEMES } from '@/lib/constants/themes'
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
export default function Village({ userId, accountCreatedAt = null, lastSeen = null, onSeen, locked = false, onLockedNavigate, layout = {}, onChangeLayout }: {
  userId: string
  /** ISO string from auth.users.created_at, via DashboardClient. */
  accountCreatedAt?: string | null
  /** ISO string of the previous visit, frozen for the session by the caller. */
  lastSeen?: string | null
  onSeen?: () => void
  /** Shared mode: show the scene, but require a PIN to walk into it. */
  locked?: boolean
  onLockedNavigate?: (label: string) => void
  /** Dragged positions for the five fixed landmarks. */
  layout?: VillageLayout
  onChangeLayout?: (next: VillageLayout) => void
}) {
  const [arranging, setArranging] = useState(false)
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

  // The village is always Bloom-flavored now (2026-08-24) — see the
  // BLOOM_VARS override on the wrapper div below, which scopes every CSS
  // custom property the scene reads (--emerald, --gold, --surface, etc.) to
  // Bloom's literal values regardless of the account's actual active theme.
  // isLight is hardcoded to match: Bloom is a light theme, and the snow/sky
  // math in seasonPalette() needs to agree with that or winter reads wrong
  // (a light-theme wash computed as if it were dark).
  const isLight = true
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
          // Scopes every custom property the scene reads (--emerald, --gold,
          // --surface, --bg, the aurora washes, even --radius-organic) to
          // Bloom's literal values via ordinary CSS cascade — nothing inside
          // this subtree needs to know it's happening. Redeclaring a custom
          // property on a descendant is a real, standard override; it just
          // has to be the SAME set of vars everything downstream already
          // reads by name, which is exactly what THEMES.bloom already is.
          ...THEMES.bloom,
          position: 'relative', overflow: 'hidden',
          border: '1px solid var(--border)', boxShadow: 'var(--elev-3)',
          background: 'var(--surface)',
        } as React.CSSProperties}
      >
        <VillageScene village={v} live={clock !== null} palette={palette} celestial={celestial}
          plantSlots={plantSlots} buildingSlots={buildingSlots}
          horizon={horizon} changes={changes}
          locked={locked} onLockedNavigate={onLockedNavigate}
          layout={layout} arranging={arranging}
          onMoveLandmark={onChangeLayout ? (id, x, y) => onChangeLayout({ ...layout, [id]: { x, y } }) : undefined} />

        {/* Glass highlight along the top edge — the one bit of gloss in the
            whole app, and only because this is the piece meant to be looked
            at rather than used. Skipped while arranging so it can't be
            mistaken for a drag-catching overlay. */}
        {!arranging && (
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--text) 7%, transparent) 0%, transparent 12%)',
            }}
          />
        )}

        {/* Arrange toggle — same "⚙ arrange" convention Household's Home
            tab already uses for its own drag-reorderable blocks. Available
            even in shared/locked mode: repositioning a landmark doesn't
            reveal anything, it's purely cosmetic. */}
        {onChangeLayout && (
          <div style={{ position: 'absolute', top: '0.7rem', right: '0.7rem', display: 'flex', gap: '0.4rem' }}>
            {arranging && Object.keys(layout).length > 0 && (
              <button
                onClick={() => onChangeLayout({})}
                className="press"
                style={{
                  background: 'color-mix(in srgb, var(--bg) 65%, transparent)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '0.3rem 0.6rem', color: 'var(--muted)', cursor: 'pointer',
                  fontSize: '0.65rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
                }}
              >Reset positions</button>
            )}
            <button
              onClick={() => setArranging(a => !a)}
              title={arranging ? 'Done arranging' : 'Arrange the village'}
              className="press"
              style={{
                background: arranging ? 'var(--gold)' : 'color-mix(in srgb, var(--bg) 65%, transparent)',
                border: `1px solid ${arranging ? 'var(--gold)' : 'var(--border)'}`,
                borderRadius: '8px', padding: '0.3rem 0.6rem',
                color: arranging ? 'var(--bg)' : 'var(--muted)', cursor: 'pointer',
                fontSize: '0.65rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
              }}
            >{arranging ? '✓ Done' : '⚙ Arrange'}</button>
          </div>
        )}
      </div>

      {arranging && (
        <p style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.75, marginTop: '0.5rem', textAlign: 'center' }}>
          Drag any landmark to move it. Your layout is saved automatically.
        </p>
      )}

      <VillageArrival caption={changes?.caption ?? null} />
      <VillageText village={v} arrival={changes?.caption ?? null} horizonCount={horizon.length} />
    </div>
  )
}

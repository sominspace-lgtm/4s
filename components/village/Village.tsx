'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useHabits } from '@/lib/hooks/useHabits'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useVillageWork } from '@/lib/hooks/useVillageWork'
import { useReflectionDays } from '@/lib/hooks/useReflectionDays'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useSmartHome } from '@/lib/hooks/useSmartHome'
import { useSharedHorizon } from '@/lib/hooks/useSharedHorizon'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { usePeople, daysUntilBirthday } from '@/lib/hooks/usePeople'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'
import { useTrips } from '@/lib/hooks/useTrips'
import { buildVillage, villageChangesSince } from '@/lib/village/state'
import { forestSlots, districtSlots, type VillageLayout } from '@/lib/village/layout'
import { seasonPalette } from '@/lib/village/palette'
import { celestialOf, moonPhaseLabel } from '@/lib/village/sky'
import { loadWeather, type WeatherNow } from '@/lib/village/weather'
import { THEMES } from '@/lib/constants/themes'
import { useVillageClock } from './useVillageClock'
import VillageScene, { GROUND_Y } from './scene/VillageScene'
import VillageText from './VillageText'
import VillageArrival from './VillageArrival'
import Icon from '@/components/ui/Icon'
import { ASSET_LIBRARY, makeCustomItemId } from '@/lib/village/assetLibrary'
import VillageWidgets from './VillageWidgets'
import VillageHomeSheet from './VillageHomeSheet'
import { goToSection } from '@/lib/utils/navigate'

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
export default function Village({ userId, accountCreatedAt = null, lastSeen = null, onSeen, locked = false, onLockedNavigate, layout = {}, onChangeLayout, ambient = false, resetIdleTimer, compact = false }: {
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
  /** Idle/kiosk mode (2026-08-25) — see useIdleAmbient. Only ever true in
   *  shared mode; hides the arrange controls and the arrival/text blocks so
   *  the scene stands alone as a picture frame. */
  ambient?: boolean
  /** Resets the idle timer — passed through to VillageHomeSheet so a drag
   *  gesture counts as interaction (see useIdleAmbient's own comment on why
   *  its window listeners alone don't cover a pointermove-only gesture). */
  resetIdleTimer?: () => void
  /** A small live-preview window for Today (2026-08-25) — just the scene,
   *  height-capped, individual districts non-interactive (one click
   *  anywhere opens the real Village tab instead). No arrange controls, no
   *  arrival banner, no widgets dock, no story text — those belong to the
   *  real thing, not a teaser of it. See TodayVillageWindow. */
  compact?: boolean
}) {
  const [arranging, setArranging] = useState(false)
  // The Inventory (round 31, 2026-08-27, "make a inventory tab in arrange
  // where we can place anything from asset library") — a small picker
  // panel, only reachable from inside arrange mode, that drops a new real
  // sprite into the scene at a fixed default spot; the user then drags it
  // into place with the exact same mechanism every other prop already
  // uses. See lib/village/assetLibrary.ts for the full "why this list,
  // why this id scheme" reasoning.
  const [inventoryOpen, setInventoryOpen] = useState(false)
  // A handful of candidate drop spots spread around the scene rather than
  // one fixed point (round 32, 2026-08-27, "when we place new item make
  // sure it shows up on empty space") — every item used to land at the
  // exact same (400, GROUND_Y+10), so a second or third addition landed
  // right on top of whatever was already there instead of somewhere you
  // could actually see it. Picked loosely around the scene's own open
  // ground (between districts, off the main path/Home cluster), not a
  // real collision solver — just enough spread that a fresh item is
  // visible immediately, with the closest-to-nothing spot chosen from
  // whichever of these is currently least crowded.
  const INVENTORY_DROP_SPOTS: { x: number; y: number }[] = [
    { x: 150, y: GROUND_Y - 25 }, { x: 650, y: GROUND_Y - 20 },
    { x: 400, y: GROUND_Y - 45 }, { x: 250, y: GROUND_Y + 50 },
    { x: 550, y: GROUND_Y + 50 }, { x: 90, y: GROUND_Y + 48 },
    { x: 730, y: GROUND_Y + 48 }, { x: 400, y: GROUND_Y + 55 },
  ]
  function addInventoryItem(assetKey: string) {
    if (!onChangeLayout) return
    const id = makeCustomItemId(assetKey)
    const existing = Object.values(layout).filter((p): p is { x: number; y: number } => !!p)
    const spot = INVENTORY_DROP_SPOTS.map(s => ({
      s, minDist: existing.reduce((m, p) => Math.min(m, Math.hypot(p.x - s.x, p.y - s.y)), Infinity),
    })).sort((a, b) => b.minDist - a.minDist)[0]?.s ?? { x: 400, y: GROUND_Y + 10 }
    onChangeLayout({ ...layout, [id]: spot })
  }
  // Zoom (2026-08-27, round 4) — "make it like a mini village we can zoom
  // in and out of and enjoy doing so." A discrete +/- control rather than
  // wheel/pinch gestures: those need to distinguish a zoom gesture from
  // page scroll and from arrange-mode dragging, real added risk for a
  // first pass. Floor clamped to 1 (not below), not 0.7 as first shipped —
  // the canvas is a fixed 800×440 with nothing drawn past its own edges,
  // so "zooming out" past the full view has no content to reveal and just
  // exposes blank canvas (the empty band reported live, round 4 point 2).
  // 1 already shows everything there is; "-" only matters once you've
  // zoomed in past it. Ceiling of 2 is close enough to read one building's
  // detail. Reset button only shows once actually zoomed.
  const [zoom, setZoom] = useState(1)
  // Fullscreen (round 59, "allow so we can view village in fullscreen on
  // ipad/mobile") — a CSS pseudo-fullscreen (fixed inset:0) rather than the
  // Fullscreen API, which iOS Safari only supports for <video>. Escape
  // exits; body scroll is locked while it's on.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [expanded])
  const { habits, completions } = useHabits()
  const { items: workItems } = useWorkItems()
  // Finished work, which useWorkItems deliberately excludes. Without this the
  // Project District can only ever show scaffolding — see useVillageWork.
  const { done } = useVillageWork()
  const reflectionDays = useReflectionDays()
  const clock = useVillageClock()
  const { spaces } = useSharedSpaces(userId)
  const horizon = useSharedHorizon(spaces.length > 0)
  // Real occupancy signal (round 16, 2026-08-27) — "Home → house lights ON,
  // Away → house lights OFF... structure it so additional Smart Home states
  // can be added later." No explicit "home/away" device exists yet, so this
  // starts as the simplest real proxy: is ANY device on right now. Null
  // (not false) while devices are still loading or there's no household
  // space at all — VillageScene falls back to its own day/night glow in
  // that case rather than reading "no data yet" as "definitely away."
  const { devices: smartHomeDevices, loading: smartHomeLoading } = useSmartHome(spaces[0]?.id ?? null)
  const homeOccupied = smartHomeLoading || smartHomeDevices.length === 0 ? null : smartHomeDevices.some(d => d.on_state)
  const { places } = usePlaces()
  const { people } = usePeople()
  const soonestBirthdayDays = useMemo(() => {
    const upcoming = people.map(p => daysUntilBirthday(p.birthday)).filter((d): d is number => d != null)
    return upcoming.length ? Math.min(...upcoming) : null
  }, [people])
  const { ideas } = useDateIdeas(spaces[0]?.id ?? null)
  const { trips } = useTrips()
  const tripCount = trips.filter(t => t.status !== 'done' && t.status !== 'cancelled').length
  const dateIdeaAreas = useMemo(() => {
    const counts = new Map<string, number>()
    for (const idea of ideas) {
      if (!idea.area) continue
      counts.set(idea.area, (counts.get(idea.area) ?? 0) + 1)
    }
    return [...counts.entries()].map(([area, count]) => ({ area, count }))
  }, [ideas])

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
    // A glance at Today's compact preview shouldn't consume the real
    // "welcome back" moment — that's earned by actually opening the
    // Village, not by it merely being visible in a mini card.
    if (compact) return
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(ARRIVAL_KEY)) return
    sessionStorage.setItem(ARRIVAL_KEY, '1')
    setShowArrival(true)
    onSeen?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact])

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

  // Real weather (2026-08-24) — fetched once per mount, not tied to the
  // render-triggering minute clock below. See lib/village/weather.ts for
  // why a failed fetch doesn't get stuck as "no weather" for the rest of
  // the session.
  const [weather, setWeather] = useState<WeatherNow | null>(null)
  useEffect(() => { loadWeather().then(setWeather) }, [])

  // Pre-formatted here, not in the (hookless, dateless) scene — see
  // VillageScene's own prop comments.
  const timeLabel = clock ? format(clock, 'h:mm a') : null
  const dateLabel = clock ? format(clock, 'EEEE, MMMM d') : null
  const moonLabel = clock && celestial?.body === 'moon' ? moonPhaseLabel(celestial.phase) : null
  // Same reasoning, round 50 (2026-08-28) — "living painting" day-to-day
  // flavor (see lib/village/vignette.ts) needs a stable per-day key, computed
  // here alongside the other clock-derived labels rather than inside the
  // hookless scene.
  const dateKey = clock ? format(clock, 'yyyy-MM-dd') : null

  // Deterministic placement: same entity, same spot, every load. A place you
  // recognise, not a chart that reshuffles. See lib/village/layout.
  // Round 33 (2026-08-27, "we can only grow them using habits and can move
  // them around once planted") — a plant's computed slot is still the
  // default, but `layout[plant.id]` (the same VillageLayout blob every
  // other drag already uses) overrides it once someone's actually dragged
  // that plant, same "custom position if dragged, else the real default"
  // rule as decorPos in VillageScene. Deliberately NOT extended to
  // buildingSlots below — only asked for plants.
  const plantSlots = useMemo(() => {
    const byId = new Map(v.plants.map(p => [p.id, p]))
    return forestSlots(v.plants.map(p => p.id), GROUND_Y)
      .map(s => ({ ...s, ...(layout[s.id] ?? {}), plant: byId.get(s.id)! }))
      // Back row first, so the front row overlaps it rather than the reverse.
      .sort((a, b) => Number(b.back) - Number(a.back))
  }, [v.plants, layout])

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
          // aspect-ratio, not a fixed height (2026-08-25 fix) — a fixed px
          // height cropped from the TOP of the 800×440 scene, and the
          // ground/village itself only starts around y=210 (roughly the
          // lower half); at 150px tall the crop showed almost nothing but
          // sky. aspect-ratio scales height to the card's actual width, so
          // the full scene always renders, never cropped — and at a normal
          // Today-card width that's naturally much bigger than 150px too.
          ...(compact ? { aspectRatio: '800 / 440', cursor: 'pointer' } : {}),
          ...(expanded ? {
            position: 'fixed', inset: 0, zIndex: 9999, borderRadius: 0, border: 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          } : {}),
        } as React.CSSProperties}
        {...(compact ? { onClick: () => goToSection('village'), role: 'button', 'aria-label': 'Open the Village' } : {})}
      >
        {/* Compact zoom (2026-08-26) — the full 800×440 scene left a lot of
            bare sky at Today's small window size, making the actual
            village (ground level down) hard to make out. Scaling the scene
            up slightly and biasing the transform origin toward the ground
            crops a bit more sky than grass off each edge — the parent's
            own overflow:hidden clips it, so nothing else has to change.
            Only compact mode uses this CSS-transform crop. Round 19 tried
            the same trick for the full view too, non-uniformly (more on Y
            than X) — but scaling X and Y by different amounts stretches
            every sprite's own aspect ratio along with the composition
            ("everything looks squished," round 21 fix). The full view's
            own version of "smaller world, less bare sky" now lives in
            VillageScene's viewBox math instead (BASE_VB_H) — an actual
            recrop of the coordinate system, which can shrink the visible
            window without distorting anything inside it. */}
        <div style={compact ? { transform: 'scale(1.18)', transformOrigin: '50% 60%' } : undefined}>
          <VillageScene village={v} live={clock !== null} palette={palette} celestial={celestial}
            plantSlots={plantSlots} buildingSlots={buildingSlots}
            horizon={horizon} changes={changes}
            locked={locked} onLockedNavigate={onLockedNavigate}
            layout={layout} arranging={arranging}
            onMoveLandmark={onChangeLayout ? (id, x, y) => onChangeLayout({ ...layout, [id]: { ...layout[id], x, y } }) : undefined}
            onResizeItem={onChangeLayout ? (id, x, y, scale) => onChangeLayout({ ...layout, [id]: { x, y, scale } }) : undefined}
            onRemoveItem={onChangeLayout ? (id) => {
              const next = { ...layout }
              delete next[id]
              onChangeLayout(next)
            } : undefined}
            placesCount={places.length} placeNames={places.slice(0, 3).map(p => p.name)}
            peopleCount={people.length} soonestBirthdayDays={soonestBirthdayDays}
            dateIdeaAreas={dateIdeaAreas} weather={weather}
            timeLabel={timeLabel} dateLabel={dateLabel} moonLabel={moonLabel} tripCount={tripCount} zoom={zoom}
            homeOccupied={homeOccupied} dateKey={dateKey} />
        </div>

        {/* Compact mode (2026-08-25): a transparent click-catcher over the
            whole scene — the preview should open the real Village on any
            tap, not fire an individual district's own click handler
            underneath it. */}
        {compact && (
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'transparent' }} />
        )}

        {/* Glass highlight along the top edge — the one bit of gloss in the
            whole app, and only because this is the piece meant to be looked
            at rather than used. Skipped while arranging so it can't be
            mistaken for a drag-catching overlay. */}
        {!compact && !arranging && (
          <div
            aria-hidden
            style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'linear-gradient(180deg, color-mix(in srgb, var(--text) 7%, transparent) 0%, transparent 12%)',
            }}
          />
        )}

        {/* Fullscreen toggle (round 59) — top-left, clear of Arrange
            (top-right) and the zoom controls (bottom-right). Shown in the
            full view always, including shared/locked mode: going fullscreen
            reveals nothing. */}
        {!compact && !ambient && (
          <button
            onClick={() => setExpanded(e => !e)}
            title={expanded ? 'Exit fullscreen' : 'View fullscreen'}
            aria-label={expanded ? 'Exit fullscreen' : 'View fullscreen'}
            className="press"
            style={{
              position: 'absolute', top: '0.7rem', left: '0.7rem', zIndex: 2,
              background: 'color-mix(in srgb, var(--bg) 65%, transparent)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '0.3rem 0.45rem', color: 'var(--muted)', cursor: 'pointer',
              fontSize: '0.65rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
              display: 'inline-flex', alignItems: 'center', gap: '0.3em',
            }}
          ><span aria-hidden style={{ fontSize: '0.85em' }}>{expanded ? '✕' : '⤢'}</span>{expanded ? ' Close' : ' Fullscreen'}</button>
        )}

        {/* Arrange toggle — same "arrange" convention Household's Home
            tab already uses for its own drag-reorderable blocks. Available
            even in shared/locked mode: repositioning a landmark doesn't
            reveal anything, it's purely cosmetic. Hidden while ambient —
            the picture-frame default shouldn't show a settings button. */}
        {!compact && onChangeLayout && !ambient && (
          <div style={{ position: 'absolute', top: '0.7rem', right: '0.7rem', display: 'flex', gap: '0.4rem' }}>
            {arranging && Object.keys(layout).length > 0 && (
              <>
                <button
                  onClick={() => { try { navigator.clipboard?.writeText(JSON.stringify(layout)) } catch { /* ignore */ } }}
                  title="Copy this arrangement as JSON"
                  className="press"
                  style={{
                    background: 'color-mix(in srgb, var(--bg) 65%, transparent)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.3rem 0.6rem', color: 'var(--muted)', cursor: 'pointer',
                    fontSize: '0.65rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
                  }}
                >Copy layout</button>
                <button
                  onClick={() => onChangeLayout({})}
                  className="press"
                  style={{
                    background: 'color-mix(in srgb, var(--bg) 65%, transparent)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '0.3rem 0.6rem', color: 'var(--muted)', cursor: 'pointer',
                    fontSize: '0.65rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
                  }}
                >Reset positions</button>
              </>
            )}
            {/* Inventory toggle — only reachable inside arrange mode, same
                "settings only when you're already customizing" logic as
                Reset positions above. */}
            {arranging && (
              <button
                onClick={() => setInventoryOpen(o => !o)}
                title="Add something from the asset library"
                className="press"
                style={{
                  background: inventoryOpen ? 'var(--gold)' : 'color-mix(in srgb, var(--bg) 65%, transparent)',
                  border: `1px solid ${inventoryOpen ? 'var(--gold)' : 'var(--border)'}`,
                  borderRadius: '8px', padding: '0.3rem 0.6rem',
                  color: inventoryOpen ? 'var(--bg)' : 'var(--muted)', cursor: 'pointer',
                  fontSize: '0.65rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
                  display: 'inline-flex', alignItems: 'center', gap: '0.3em',
                }}
              ><Icon name="box" size={10} /> Inventory</button>
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
                display: 'inline-flex', alignItems: 'center', gap: '0.3em',
              }}
            >{arranging ? <><Icon name="check" size={10} /> Done</> : <><Icon name="gear" size={10} /> Arrange</>}</button>
          </div>
        )}

        {/* The Inventory picker itself — a small grid of real sprite
            thumbnails, top-right under the button row. Tapping one drops
            it at a fixed default spot (see addInventoryItem above) and
            closes the panel; the new item then drags like anything else. */}
        {arranging && inventoryOpen && onChangeLayout && (
          <div style={{
            position: 'absolute', top: '2.8rem', right: '0.7rem', zIndex: 2,
            width: 'min(15.5rem, calc(100% - 1.4rem))', maxHeight: '13rem', overflowY: 'auto',
            background: 'color-mix(in srgb, var(--surface) 92%, transparent)', backdropFilter: 'blur(6px)',
            border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem',
            boxShadow: '0 4px 14px color-mix(in srgb, var(--text) 12%, transparent)',
          }}>
            {ASSET_LIBRARY.map(a => (
              <button
                key={a.key}
                onClick={() => { addInventoryItem(a.key); setInventoryOpen(false) }}
                title={a.label}
                className="press"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem',
                  background: 'color-mix(in srgb, var(--bg) 60%, transparent)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '0.3rem 0.15rem', cursor: 'pointer',
                }}
              >
                <img src={`/village-assets/${a.href}`} alt="" aria-hidden
                  style={{ width: '1.8rem', height: '1.8rem', objectFit: 'contain', imageRendering: 'pixelated' }} />
                <span style={{ fontSize: '0.55rem', color: 'var(--muted)', fontFamily: 'var(--font-body)', textAlign: 'center', lineHeight: 1.15 }}>
                  {a.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Zoom controls — bottom-right, clear of Arrange (top-right) and
            the weather card (top-left). Not shown while arranging: a zoom
            change mid-drag would be disorienting, and the two controls
            competing for the same corner language isn't worth it. */}
        {!compact && !ambient && !arranging && (
          // Buttons sized 1.8rem->2.4rem (round 4 iPad fix, 2026-08-27) —
          // ~32px was noticeably under Apple's own 44pt touch-target
          // guidance; 2.4rem (43.2px at this app's 18px root) gets close
          // without the corner control cluster overwhelming the frame.
          <div style={{ position: 'absolute', bottom: '0.7rem', right: '0.7rem', display: 'flex', gap: '0.4rem' }}>
            {zoom !== 1 && (
              <button
                onClick={() => setZoom(1)}
                title="Reset zoom"
                className="press"
                style={{
                  background: 'color-mix(in srgb, var(--bg) 65%, transparent)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '0.3rem 0.55rem', color: 'var(--muted)', cursor: 'pointer',
                  fontSize: '0.62rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
                }}
              >Reset</button>
            )}
            <button
              onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))}
              disabled={zoom <= 1}
              title="Zoom out"
              aria-label="Zoom out"
              className="press"
              style={{
                background: 'color-mix(in srgb, var(--bg) 65%, transparent)', border: '1px solid var(--border)',
                borderRadius: '8px', width: '2.4rem', height: '2.4rem', color: 'var(--muted)',
                cursor: zoom <= 1 ? 'default' : 'pointer', opacity: zoom <= 1 ? 0.4 : 1,
                fontSize: '0.85rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
            >−</button>
            <button
              onClick={() => setZoom(z => Math.min(2, +(z + 0.25).toFixed(2)))}
              disabled={zoom >= 2}
              title="Zoom in"
              aria-label="Zoom in"
              className="press"
              style={{
                background: 'color-mix(in srgb, var(--bg) 65%, transparent)', border: '1px solid var(--border)',
                borderRadius: '8px', width: '2.4rem', height: '2.4rem', color: 'var(--muted)',
                cursor: zoom >= 2 ? 'default' : 'pointer', opacity: zoom >= 2 ? 0.4 : 1,
                fontSize: '0.85rem', fontFamily: 'var(--font-body)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}
            >+</button>
          </div>
        )}

        {/* The shared/kiosk-mode swipe-up sheet (2026-08-25) — an overlay
            inside this panel (already position:relative + overflow:hidden)
            rather than a block below it, so it reads as sliding up over the
            picture rather than another widget under it. See
            VillageHomeSheet's own header comment. */}
        {!compact && locked && (
          <VillageHomeSheet userId={userId} spaceId={spaces[0]?.id ?? null} ambient={ambient} onInteract={resetIdleTimer} />
        )}
      </div>

      {!compact && arranging && (
        <p style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.75, marginTop: '0.5rem', textAlign: 'center' }}>
          Drag any landmark or prop to move it, or tap it once for size controls. Inventory adds
          something new — tap × on it to remove it. Your layout is saved automatically.
        </p>
      )}

      {/* Pan hint (2026-08-27, round 5) — only shown once zoomed in, since
          that's the only state where dragging the scene actually does
          anything (see VillageScene's own pan-clamp comment). */}
      {!compact && !arranging && zoom > 1 && (
        <p style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.75, marginTop: '0.5rem', textAlign: 'center' }}>
          Drag to look around.
        </p>
      )}

      {!compact && !ambient && <VillageArrival caption={changes?.caption ?? null} />}

      {/* Widgets (2026-08-24) — the useful half of Village for personal
          browsing. In shared/locked mode this content moves into
          VillageHomeSheet above instead (a swipe-up overlay, not a second
          copy below the scene). */}
      {!compact && !locked && <VillageWidgets userId={userId} spaceId={spaces[0]?.id ?? null} />}

      {!compact && !ambient && <VillageText village={v} arrival={changes?.caption ?? null} horizonCount={horizon.length} />}
    </div>
  )
}

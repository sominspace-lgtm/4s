'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { VillageState } from '@/lib/village/state'
import type { Slot } from '@/lib/village/layout'
import type { SeasonPalette } from '@/lib/village/palette'
import type { Celestial as CelestialData } from '@/lib/village/sky'
import type { WeatherCondition } from '@/lib/village/weather'
import { goToSection, goToPersonal, goToHousehold, openSmartHome } from '@/lib/utils/navigate'
import { HOME_URL } from '@/lib/utils/cheatSheets'
import { somiAgeText, somiBirthdayLabel } from '@/lib/village/somi'
import { PlantShape, DistrictLabel, EntityCallout, FeatureIcon, PondShape, BenchShape, FlowerBedShape, FenceShape, LampShape, MemoryMarker, VillagerShape, CatShape, MailboxShape, SignpostShape, BuntingShape, ClockTowerShape, WishingWellShape, Draggable, CoupleInteraction, CoupleContext, type ContextActivity, CoupleBenchShape, SleepwearFigure, seasonTree, COUPLE_BENCH_FRAME, COUPLE_PICNIC_FRAME, COUPLE_MOVIE_FRAME, COUPLE_NIGHTCAP_FRAME, WALL, WALL_SHADOW, ROOF, ROOF_LIGHT, TRIM, type Outfit } from './shapes'
import { createClient } from '@/lib/supabase/client'

// The swaying flower cluster (round 13) and its FLOWER_SWAY_FRAMES were
// removed round 57 — the tree-flower-sway-animation sheet they came from is
// no longer in the master folder.
import Sky from './Sky'
import Clouds from './Clouds'
import Ambient from './Ambient'
import Horizon from './Horizon'
import type { HorizonPlace } from '@/lib/hooks/useSharedHorizon'
import type { VillageChanges } from '@/lib/village/state'
import { hashPos } from '@/lib/village/state'
import { LANDMARK_IDS, type VillageLayout, type LandmarkId } from '@/lib/village/layout'
import { findAsset, parseCustomItemId } from '@/lib/village/assetLibrary'
import { useCoupleLife } from './useCoupleLife'
import { useWanderer } from './useWanderer'
import { DEFAULT_SCENE_MOOD, type SceneMood } from '@/lib/smarthome/sceneMood'
import HouseInfo from './HouseInfo'
import {
  GRASS_TUFTS, STONES, DISTANT_TREES, POLLEN, FOREGROUND, MIDGROUND_BUSHES, EXTRA_TREES,
  PATH_D, NATURE_DETAILS, PATH_PAVERS, PROPS, DEFAULT_ITEM_SCALE, POSTCARDS, spellCount,
  DEFAULT_LANDMARK_POS, SPUR_PAVERS, DECOR_DEFAULTS, GROUND_Y,
} from './sceneData'

export { GROUND_Y }

/**
 * The scene itself: pure presentation, no hooks and no dates. Everything
 * time-shaped arrives as `live` (see Sky) and everything data-shaped arrives as
 * `village`, so this file can be read top to bottom as a draw order.
 */


export default function VillageScene({
  village: v, live, palette, celestial, plantSlots, buildingSlots,
  horizon = [], changes, locked = false, onLockedNavigate, gathering = false,
  contributions = [], guestQrUri = null, guestAlbumUrl = null,
  layout = {}, arranging = false, onMoveLandmark, onRemoveItem, onResizeItem,
  placesCount = 0, placeNames = [], peopleCount = 0, soonestBirthdayDays = null, dateIdeaAreas = [], weather = null,
  timeLabel = null, dateLabel = null, moonLabel = null, tripCount = 0, zoom = 1,
  homeOccupied = null, dateKey = null, containerAspect = null, sceneMood: mood = DEFAULT_SCENE_MOOD,
  frozen = false, contextActivity = null,
  hosting = false, guestInfo = {}, soloFigure = false,
  menu = [], agenda = [], somi = null, hostPing = null,
  onOpenKitchen, homeCard = null, binLine = null, partOfDay = 'day',
}: {
  village: VillageState
  live: boolean
  /** Prep OR live gathering — quiet the districts, show the house-info card. */
  hosting?: boolean
  /** Wifi + house notes, shown on the scene only while hosting. */
  guestInfo?: { wifiName?: string; wifiPassword?: string; notes?: string }
  /** The other partner is out — render one figure near home, not the couple. */
  soloFigure?: boolean
  /** Wall-iPad ambient/idle mode — freeze all scene motion (CSS + SMIL) so
   *  it reads as a still picture and doesn't drive the panel 24/7. */
  frozen?: boolean
  /** The activity you've done most this week — swaps a context pose into the
   *  couple's idle rotation. See lib/village/figureActivity.ts. */
  contextActivity?: ContextActivity | null
  palette: SeasonPalette
  celestial: CelestialData | null
  /** How the scene reads for the applied smart-home scene — see lib/smarthome/sceneMood.ts. */
  sceneMood?: SceneMood
  plantSlots: (Slot & { plant: VillageState['plants'][number] })[]
  buildingSlots: (Slot & { building: VillageState['buildings'][number] })[]
  horizon?: HorizonPlace[]
  changes?: VillageChanges
  /** Saved pins, for the Places district's count badge. */
  placesCount?: number
  /** A few real place names for the Places hover-card (2026-08-25) — not
   *  personal data, safe to show in shared mode too (see districtLocked). */
  placeNames?: string[]
  /** Contacts, for the People district's count badge. */
  peopleCount?: number
  /** Days until the soonest upcoming birthday, if any — see usePeople's daysUntilBirthday. */
  soonestBirthdayDays?: number | null
  /** Date ideas grouped by area (SLO, Santa Cruz, …) — the memory map, see MemoryMarker. */
  dateIdeaAreas?: { area: string; count: number }[]
  /** Real weather, from lib/village/weather.ts. null while loading/unavailable — the scene never blocks on it. */
  weather?: { tempF: number; condition: WeatherCondition } | null
  /** Pre-formatted, real — this component stays a pure function of props,
   *  no dates computed in here (see the file's own header comment). */
  timeLabel?: string | null
  dateLabel?: string | null
  /** Only meaningful (and only ever passed) at night — see Village.tsx. */
  moonLabel?: string | null
  /** Trips not done/cancelled — drives the Trips signpost, see useTrips(). */
  tripCount?: number
  /** Round 16 (2026-08-27) — real Smart Home signal: true if any device in
   *  the household is currently on, null while unknown/no space yet. Drives
   *  Home's window glow independent of time-of-day (a lit window means
   *  someone's actually home right now, not "it happens to be night"). */
  homeOccupied?: boolean | null
  /** 1 = the full 800×440 scene (default/unchanged). Below 1 shows more of
   *  the world at once; above 1 zooms in. Purely a `viewBox` computation —
   *  every coordinate inside the scene stays exactly as authored, see
   *  Village.tsx's own zoom-control comment for why this is a discrete
   *  +/- control rather than a gesture. */
  zoom?: number
  /** 'YYYY-MM-DD', pre-formatted in Village.tsx from the same clock as
   *  timeLabel/dateLabel — round 50's "living painting" day-to-day flavor
   *  (lib/village/vignette.ts) needs a stable per-day key and this component
   *  stays date-computation-free, same reasoning as those two props. */
  dateKey?: string | null
  /** The aspect ratio (w/h) of the box this SVG should fill — passed only in
   *  fullscreen so the scene re-shapes to the viewport instead of
   *  letterboxing (round 67). null everywhere else = the curated default
   *  window. */
  containerAspect?: number | null
  /** Shared-mode: the scene is visible, but the districts lead into personal
   *  spaces, so tapping one asks for a PIN instead of navigating. */
  locked?: boolean
  onLockedNavigate?: (label: string) => void
  /** Guest Mode (2026-08-29) — the village is open to guests. Orthogonal to
   *  `locked`. Warms the scene up regardless of time of day: lanterns and
   *  window glow forced on, party bunting over Home, a warm colour wash. */
  gathering?: boolean
  /** Guest contributions (Phase 2) — scattered through the scene as physical
   *  objects. A derived layer, NOT in the layout blob: a guest's name/note
   *  isn't household personal data, so it's `locked`-safe, and it needs no
   *  host arrange step. Only `status === 'visible'` ones are drawn. */
  contributions?: {
    id: string; kind: string; guest_name: string | null; body: string | null
    meta: Record<string, unknown>; status: string
  }[]
  /** Data-URI QR for /g/<token>, shown on the welcome sign while a gathering
   *  is open. */
  guestQrUri?: string | null
  /** The gathering's shared photo album — the in-scene photo booth opens it. */
  guestAlbumUrl?: string | null
  /** What's on the menu tonight — a small board near the dinner table. */
  menu?: { id: string; name: string; note: string }[]
  /** The evening's plan — feeds the what's-on strip, not drawn in-scene. */
  agenda?: { id: string; time: string; label: string; done: boolean }[]
  /** Somi's resolved card (age / snack / tricks), shown when the cat is tapped. */
  somi?: { name: string; ageText: string; birthdayLabel: string; snack: string; tricks: string[]; notes: string | null } | null
  /** Tapping a couple figure during a live gathering pings that host.
   *  `who` is 'sylvia' | 'harry'. Wired in Village.tsx to the ping route. */
  hostPing?: { onPing: (who: 'sylvia' | 'harry', reason: string) => void } | null
  /** Opens the Kitchen overlay (from the reference nook in the scene). */
  onOpenKitchen?: () => void
  /** Live lines for the Home cottage tap-card: tonight's dinner, the next
   *  home task, a bins line, the active smart-home scene. */
  homeCard?: { dinner: string | null; nextTask: string | null; binLine: string | null; sceneName: string | null } | null
  /** "Bins out tonight" / "Bins out this morning", or null — draws the bin prop. */
  binLine?: string | null
  /** From Village.tsx's clock — the bin prop only shows evening/morning. */
  partOfDay?: 'morning' | 'day' | 'evening' | 'night'
  /** Dragged positions for the five landmark labels — only the pins move,
   *  not the scenery underneath them (see Village.tsx's own header comment
   *  on why: labels already float above their district as independent map
   *  pins, they were never glued to the art). */
  layout?: VillageLayout
  arranging?: boolean
  /** id is now any string, not just LandmarkId (round 12, 2026-08-27) —
   *  the same drag mechanism now also moves individual decorative props
   *  (see DECOR_DEFAULTS/decorDrag below), not just the six districts. */
  onMoveLandmark?: (id: string, x: number, y: number) => void
  /** Removes one custom-placed inventory item (round 31, 2026-08-27, "make
   *  a inventory tab in arrange where we can place anything from asset
   *  library") — only ever called with a `custom:` id, see
   *  lib/village/assetLibrary.ts. */
  onRemoveItem?: (id: string) => void
  /** Sets one item's stored scale (round 48, 2026-08-28, "make all
   *  elements resizable in arrange") — called with the item's own
   *  currently-resolved (x, y) so the caller never needs to know that
   *  item's own default position, only ever ADD a scale to what's already
   *  stored. */
  onResizeItem?: (id: string, x: number, y: number, scale: number) => void
}) {
  // Per-district lock (2026-08-25, Home exception added 2026-08-25) —
  // `locked` used to gate every district uniformly, but Places isn't
  // personal data (shared saved pins/trips) and shouldn't sit behind the
  // same PIN as a habit's or a contact's name. Home dropped out too once its
  // own tap target changed from Today's Brief (personal) to Smart Home
  // (shared household devices, not personal data) — see panelContent.home
  // below. Forest/Projects/Archive/People stay locked (habits, projects, the
  // reflection archive, and contacts are all personal). Non-landmark navs
  // (Mailbox, the Trips signpost, the date-idea memory markers) pass their
  // own lock intent explicitly.
  const districtLocked = (id: LandmarkId) => locked && id !== 'places' && id !== 'home' && id !== 'references'

  // One wrapper so every district gets the same treatment — a locked click
  // never silently no-ops, it always explains itself via the unlock prompt.
  // Also the arranging guard: a click shouldn't navigate away mid-drag-mode.
  const nav = (label: string, go: () => void, requiresLock = true) => () => {
    if (arranging) return
    if (locked && requiresLock) onLockedNavigate?.(label)
    else go()
  }

  // Dev-only time-of-day override (round 50, 2026-08-28) — a `?vtod=dawn|
  // day|dusk|night` URL param, so all four "living painting" buckets can
  // actually be screenshotted in one sitting instead of waiting for each to
  // occur naturally (real time-of-day only changes ~4x/day, see
  // useVillageClock's own header comment). No production UI exposes this —
  // it's a URL param, not a setting, and it only ever touches this one
  // render's local `v.timeOfDay`, never the real clock or any stored data.
  const [vtodOverride, setVtodOverride] = useState<VillageState['timeOfDay'] | null>(null)
  const [vseasonOverride, setVseasonOverride] = useState<VillageState['season'] | null>(null)
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const p = q.get('vtod')
      if (p === 'dawn' || p === 'day' || p === 'dusk' || p === 'night') setVtodOverride(p)
      const s = q.get('vseason')
      if (s === 'spring' || s === 'summer' || s === 'autumn' || s === 'winter') setVseasonOverride(s)
    } catch { /* ignore */ }
  }, [])
  if (vtodOverride) v = { ...v, timeOfDay: vtodOverride }
  if (vseasonOverride) v = { ...v, season: vseasonOverride }

  // Scene mood (2026-09-02) — a live gathering always wins over it (real
  // guests beat a preset). `?scene=goodnight|movie|out|party` previews it.
  const [sceneOverride, setSceneOverride] = useState<SceneMood['kind']>(null)
  useEffect(() => {
    try {
      const s = new URLSearchParams(window.location.search).get('scene')
      if (s === 'goodnight' || s === 'movie' || s === 'out' || s === 'party') setSceneOverride(s)
    } catch { /* ignore */ }
  }, [])
  const activeMood: SceneMood = sceneOverride
    ? { ...DEFAULT_SCENE_MOOD, kind: sceneOverride,
        figures: sceneOverride === 'goodnight' ? 'sleep' : sceneOverride === 'movie' ? 'movie' : sceneOverride === 'out' ? 'gone' : 'party',
        forceNight: sceneOverride === 'goodnight', dim: sceneOverride === 'goodnight' ? 0.5 : sceneOverride === 'movie' ? 0.4 : sceneOverride === 'out' ? 0.12 : 0,
        screenGlow: sceneOverride === 'movie', lanterns: sceneOverride === 'party', hideFigures: sceneOverride === 'out' }
    : mood
  const moodActive = !gathering && activeMood.kind != null && activeMood.kind !== 'home'
  const sceneHidesFigures = moodActive && activeMood.hideFigures
  if (moodActive && activeMood.forceNight) v = { ...v, timeOfDay: 'night' }

  // Same idea for the wardrobe (round 73) — `?outfit=party|tennis|travel|
  // artsy|business|winter|rain|cozy` so the new sets can be previewed
  // before they each get a real trigger. Dev-only URL param, no stored state.
  const [outfitOverrideState, setOutfitOverrideState] = useState<Outfit | null>(null)
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('outfit')
      const ok: Outfit[] = ['default', 'winter', 'rain', 'cozy', 'party', 'business', 'tennis', 'travel', 'artsy', 'pajama']
      if (p && (ok as string[]).includes(p)) setOutfitOverrideState(p as Outfit)
    } catch { /* ignore */ }
  }, [])

  // `?gathering=1` forces Guest Mode on (with a couple of fake contributions)
  // so the whole guest layer can be seen in /village-preview. Dev-only param.
  const [gatheringPreview, setGatheringPreview] = useState(false)
  const [menuPreview, setMenuPreview] = useState(false)
  // `?frozen=1` previews the wall-iPad idle freeze; `?context=garden|read`
  // forces a context pose.
  const [frozenPreview, setFrozenPreview] = useState(false)
  const [contextPreview, setContextPreview] = useState<ContextActivity | null>(null)
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      if (q.get('gathering') === '1') setGatheringPreview(true)
      if (q.get('menu') === '1') { setGatheringPreview(true); setMenuPreview(true) }
      if (q.get('frozen') === '1' || q.get('ambient') === '1') setFrozenPreview(true)
      const c = q.get('context')
      if (c === 'garden' || c === 'read') setContextPreview(c)
    } catch { /* ignore */ }
  }, [])
  const isFrozen = frozen || frozenPreview
  const activeContext = contextPreview ?? contextActivity
  if (gatheringPreview) {
    gathering = true
    if (contributions.length === 0) contributions = [
      { id: 'demo-t1', kind: 'thank_you', guest_name: 'Mara', body: 'Thank you for having us', meta: {}, status: 'visible' },
      { id: 'demo-t2', kind: 'thank_you', guest_name: 'Nate', body: 'What a night', meta: {}, status: 'visible' },
      { id: 'demo-g1', kind: 'guestbook', guest_name: 'The Kims', body: 'So cosy in here', meta: {}, status: 'visible' },
      { id: 'demo-g2', kind: 'guestbook', guest_name: 'Priya', body: 'xoxo', meta: {}, status: 'visible' },
      { id: 'demo-s1', kind: 'song', guest_name: 'Jules', body: 'Landslide', meta: { title: 'Landslide — Fleetwood Mac' }, status: 'visible' },
      { id: 'demo-s2', kind: 'song', guest_name: 'Theo', body: 'Dreams', meta: { title: 'Dreams' }, status: 'visible' },
      { id: 'demo-n1', kind: 'note', guest_name: 'Alex', body: 'wishing you both the best year', meta: {}, status: 'visible' },
      { id: 'demo-fr1', kind: 'from', guest_name: 'Lin', body: 'Taipei', meta: { place: 'Taipei' }, status: 'visible' },
      { id: 'demo-fr2', kind: 'from', guest_name: 'Ben', body: 'Lisbon', meta: { place: 'Lisbon' }, status: 'visible' },
    ]
  }
  if (menuPreview && menu.length === 0) {
    menu = [
      { id: 'dm1', name: 'Roast chicken', note: '' },
      { id: 'dm2', name: 'Charred greens', note: 'veg' },
      { id: 'dm3', name: 'Pear tart', note: 'has nuts' },
    ]
    agenda = [
      { id: 'da1', time: '7:00', label: 'Dinner', done: true },
      { id: 'da2', time: '8:00', label: 'Cake', done: false },
      { id: 'da3', time: 'later', label: 'Records & cards', done: false },
    ]
  }

  // Dusk/night — windows glow, otherwise they're just glass (2026-08-24).
  const dark = v.timeOfDay === 'dusk' || v.timeOfDay === 'night'
  // Guest Mode warms the village up whatever the hour: lanterns and window
  // glow come on, but the ground plane is NOT dimmed (that's `dark`'s job at
  // night). `lit` is "should the warm lights be on", `dark` stays "is it
  // actually night" (2026-08-29).
  const lit = dark || gathering
  // Quiet compositions (round 48, 2026-08-28, "certain moments where
  // almost nothing happens. but looks and feels very nice... Evening. The
  // sun is low. Birds are gone. ... Somi is asleep nearby.") — the cast's
  // wander/move loops pause during dusk/night rather than puttering
  // around, so the scene settles into real stillness instead of active
  // motion right when the mood calls for the opposite. This leans on what
  // the scene already does at night rather than new art: birds are
  // already dawn/day-only (Ambient.tsx), Home's window already glows, the
  // ground already dims. Round 48 could only fake "two figures on a bench"
  // with plain stillness since no seated-pose art existed; round 49
  // (2026-08-28) has the real thing now (CoupleBenchShape, shapes.tsx, from
  // sylvia-harry-interactions-special-moments-alpha.png) and swaps it in —
  // see the cast render below, where quiet replaces the two separate
  // figures with the one seated-together sprite instead of just holding
  // them still in place.
  // Round 70 ("figures are not moving") — narrowed from dusk+night to
  // night only. Dusk keeps the cast wandering (just under a warm low sun);
  // the fully-still bench / sleepwear composition is a night thing now.
  const quiet = v.timeOfDay === 'night'
  // A gathering overrides the night stillness — the cast stays up and about,
  // no bench/sleepwear swap (2026-08-29). `settled` is the real "let the
  // scene go quiet" gate everywhere the cast renders.
  const settled = quiet && !gathering
  // Auto wardrobe (round 71; round 73 adds the gathering + ?outfit= hooks)
  // — dressed up for a gathering, a rain coat when it's actually raining, a
  // winter coat + knit hat when it's cold, a cosy sweater in autumn. Each
  // outfit now carries its own walk cycle and couple pose (see
  // VILLAGER_OUTFIT_WALK / COUPLE_OUTFIT_POSE in shapes.tsx). `?outfit=` is
  // a dev override for the preview so party/tennis/travel/artsy/business
  // can be seen before they get their own real triggers.
  const outfit: Outfit =
    outfitOverrideState ?? (
      moodActive && activeMood.kind === 'goodnight' ? 'pajama'
      : gathering || (moodActive && activeMood.kind === 'party') ? 'party'
      : weather?.condition === 'rain' || weather?.condition === 'storm' ? 'rain'
      : v.season === 'winter' ? 'winter'
      : v.season === 'autumn' ? 'cozy'
      : 'default')
  // Full night (not just dusk) — the couple change into sleepwear near Home
  // and Somi curls up asleep (round 51, 2026-08-28, "all of these new
  // animations elements"): the real bedtime art behind round 48's evening
  // mood. Dusk keeps the bench.
  const night = v.timeOfDay === 'night'

  // Scene-mood overrides layered on top of the time-of-day flags above.
  //   nightish — night sky / dark cottage (real night, OR Goodnight).
  //   warm     — force the lanterns/window glow on (gathering, OR Party).
  // `holdTarget` / `settledNight` need decorPos and are computed lower down.
  const nightish = night || (moodActive && activeMood.forceNight)
  const warm = lit || (moodActive && activeMood.lanterns)
  // The cottage window: dark for Goodnight (everyone's asleep, lights off)
  // whatever the clock says, otherwise the usual occupancy/night/warm rule.
  const cottageGlow = (moodActive && activeMood.kind === 'goodnight')
    ? false
    : ((homeOccupied ?? dark) || warm)

  // A worn path near wherever you actually go (2026-08-24) — the one
  // "attention" cue in the scene, deliberately not a number or a
  // leaderboard, just a soft warm patch of ground under whichever landmark
  // has the most clicks. Counted locally (this browser, this account) via
  // localStorage — real interaction, not a stored village (see state.ts's
  // own rule against that): nothing here is stored ABOUT the village, it's
  // stored about which door you tend to walk through.
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    try { setVisitCounts(JSON.parse(localStorage.getItem('4s-village-visits') ?? '{}')) } catch { /* ignore */ }
  }, [])
  function recordVisit(id: string) {
    setVisitCounts(prev => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 }
      try { localStorage.setItem('4s-village-visits', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }
  // Filtered to CURRENT landmark ids — a browser that clicked "lake" before
  // it was removed still has that key in localStorage, and it must never be
  // treated as a real landmark again (DEFAULT_LANDMARK_POS has no entry for
  // it any more, so looking it up would throw).
  const visitEntries = Object.entries(visitCounts).filter(([id]) => (LANDMARK_IDS as readonly string[]).includes(id))
  const totalVisits = visitEntries.reduce((s, [, n]) => s + n, 0)
  // Only shown once there's a real pattern (5+ clicks) — a single early tap
  // shouldn't already look like a favorite spot.
  const wornPath = totalVisits >= 5 ? visitEntries.sort((a, b) => b[1] - a[1])[0]?.[0] : null

  // Tapping the pond or a flower bed now literally sends the couple there
  // (round 53) — walkTo, wired at the call sites below. The round-50
  // localStorage "nudge / attention" indirection is retired.

  // A small hover-board instead of leaving straight away (2026-08-25) —
  // same idea as Archive already opening its own panel rather than
  // navigating off the Village on the first click. Forest/Home/Projects/
  // Places/People now open a compact summary card near the icon; a second
  // click on its own button is what actually leaves the Village. Archive
  // is untouched — it already IS this pattern, via the real ArchivePanel.
  const [openPanel, setOpenPanel] = useState<LandmarkId | null>(null)

  // Tap-your-own-figure personal entry (2026-08-25) — same hover-card idea
  // as openPanel above, for Sylvia/Harry's cast figures. Only wired up in
  // shared mode: outside it, you're already in your own session, so tapping
  // your own figure means nothing. No real personal data in the card (the
  // shared session's RLS can't see it anyway — see onLockedNavigate below,
  // which is the exact same full-session-swap unlock every locked district
  // already uses, not a new mechanism).
  const [openFigure, setOpenFigure] = useState<'sylvia' | 'harry' | null>(null)
  const figureContent: Record<'sylvia' | 'harry', { title: string; lines: string[] }> = {
    sylvia: { title: 'Sylvia', lines: ['Tap to open your personal space'] },
    harry: { title: 'Harry', lines: ['Tap to open your personal space'] },
  }
  const openFigureOrToggle = (id: 'sylvia' | 'harry') => () => {
    if (arranging || !locked) return
    setOpenFigure(prev => (prev === id ? null : id))
  }

  // Tap a figure and they react (round 66, "when we click figures they
  // should react") — Sylvia/Harry throw a wave, Somi does a little stretch,
  // for ~2s, then back to whatever they were doing. Independent of the
  // locked-mode hover-card above; both can fire on the same tap.
  const [reactingId, setReactingId] = useState<'sylvia' | 'harry' | 'somi' | null>(null)
  const reactTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reactFigure = (id: 'sylvia' | 'harry' | 'somi') => {
    if (arranging) return
    setReactingId(id)
    if (reactTimer.current) clearTimeout(reactTimer.current)
    reactTimer.current = setTimeout(() => setReactingId(null), 2100)
  }
  useEffect(() => () => { if (reactTimer.current) clearTimeout(reactTimer.current) }, [])

  // Somi got a hover-card back (2026-08-26) — the direct one-tap navigate
  // tried on 2026-08-25 read as glitchy in practice (a tap on her tiny
  // figure hard-cutting straight to another tab, with nothing to visually
  // confirm the tap actually landed on HER and not the ground beside her).
  // Same card mechanism as Sylvia/Harry's openFigure below, just its own
  // state and no PIN gate — pet care isn't personal data, it's household
  // business, same as chores. "Somi's Care" is chores/routines/maintenance
  // tracked the same way every other recurring household task is (see
  // useHousehold.ts/useRoutines.ts) — not a separate pet-specific model.
  const [openSomiCard, setOpenSomiCard] = useState(false)
  // Which host a guest tapped to call over (null = card closed). Only live
  // during a gathering, driven by hostPing.
  const [pingOpen, setPingOpen] = useState<'sylvia' | 'harry' | null>(null)
  const [pingDone, setPingDone] = useState(false)
  // Somi's card, tapped from the cat. Falls back to sensible defaults when
  // the hosts haven't filled anything in (see lib/village/somi.ts).
  const somiCard = somi ?? { name: 'Somi', ageText: somiAgeText(), birthdayLabel: somiBirthdayLabel(), snack: 'Churu', tricks: ['sit', 'high five', 'spin', 'stand'], notes: null }

  // Postcard rack (round 66) — tap it to flip through your trip postcards.
  const [postcardsOpen, setPostcardsOpen] = useState(false)
  const openSomi = () => {
    if (arranging) return
    setOpenSomiCard(o => !o)
  }

  // Every unlocked district opens its glance-card first (2026-09-04) —
  // round 71's "one tap navigates" read as too eager once the card started
  // carrying real live info (Home's dinner/next-task/bins line was the
  // first case; the rest follow the same rule now for consistency). The
  // card's own action button is what actually navigates. Locked districts
  // are unchanged: straight to the PIN prompt, no card (its content is
  // only ever safe to render once a district ISN'T locked, same guard as
  // panelContent.forest's real-plant-names comment below).
  const openOrToggle = (id: LandmarkId, label: string) => () => {
    if (arranging) return
    recordVisit(id)
    if (districtLocked(id)) { setOpenPanel(null); onLockedNavigate?.(label); return }
    setOpenPanel(prev => (prev === id ? null : id))
  }
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelHoverClose = () => { if (hoverCloseTimer.current) { clearTimeout(hoverCloseTimer.current); hoverCloseTimer.current = null } }
  const hoverPreview = (id: LandmarkId) => ({
    onHoverIn: () => { if (!arranging) { cancelHoverClose(); setOpenPanel(id) } },
    // A short grace period so moving the pointer up into the card itself
    // (there's a gap above the district) doesn't dismiss it.
    onHoverOut: () => { cancelHoverClose(); hoverCloseTimer.current = setTimeout(() => setOpenPanel(null), 160) },
  })
  useEffect(() => () => cancelHoverClose(), [])

  const growingCount = v.plants.filter(p => !p.dormant).length
  const restingCount = v.plants.length - growingCount
  const standingCount = v.buildings.filter(b => b.phase === 'complete' || b.phase === 'landmark').length
  const underwayCount = v.buildings.length - standingCount
  const panelContent: Record<LandmarkId, { title: string; lines: string[]; actionLabel: string; go: () => void; secondary?: { label: string; go: () => void } }> = {
    forest: {
      title: 'Growth Garden',
      lines: [
        `${v.plants.length} habit${v.plants.length === 1 ? '' : 's'}`,
        v.plants.length ? `${growingCount} growing · ${restingCount} resting` : 'Nothing planted yet',
        // Real names, not just the count (2026-08-25) — "reveal depth
        // progressively" per the vision doc. Free data: plantSlots already
        // carries each plant's real name, no new prop needed. Safe to show
        // here specifically because this panel only ever renders when the
        // district ISN'T locked (see openOrToggle above) — a locked click
        // never reaches this content at all, it goes straight to the PIN
        // prompt instead.
        ...(v.plants.length ? [plantSlots.slice(0, 3).map(s => s.plant.name).join(', ')] : []),
      ],
      actionLabel: 'Open Habits', go: () => goToPersonal('habits'),
    },
    home: {
      title: 'Home',
      // Retargeted from Today's Brief to Smart Home (2026-08-25) — Home is
      // the primary entry to the shared household devices, not a personal
      // surface; Today stays reachable via the swipe-up sheet (shared mode)
      // or the Today tab (personal mode), just not through this tap.
      lines: homeCard && (homeCard.dinner || homeCard.nextTask || homeCard.binLine || homeCard.sceneName)
        ? [
            homeCard.dinner ? `Tonight · ${homeCard.dinner}` : null,
            homeCard.binLine,
            homeCard.nextTask ? `${homeCard.nextTask} due` : null,
            homeCard.sceneName ? `Scene · ${homeCard.sceneName}` : null,
          ].filter(Boolean).slice(0, 3) as string[]
        : ['Lights, scenes, and more'],
      actionLabel: 'Open Smart Home', go: openSmartHome,
    },
    projects: {
      title: 'Projects',
      lines: [
        `${v.buildings.length} project${v.buildings.length === 1 ? '' : 's'}`,
        v.buildings.length ? `${standingCount} standing · ${underwayCount} underway` : 'Nothing underway yet',
        // Same "real names, safe because it's locked-gated" reasoning as
        // Growth Forest above — buildingSlots already carries each
        // project's real title.
        ...(v.buildings.length ? [buildingSlots.slice(0, 3).map(s => s.building.title).join(', ')] : []),
      ],
      actionLabel: 'Open Tasks', go: () => goToPersonal('tasks'),
    },
    places: {
      title: 'Places',
      lines: [
        `${placesCount} saved place${placesCount === 1 ? '' : 's'}`,
        // Places isn't personal/locked data, so a few real names here are
        // fine even in shared mode — see districtLocked's own comment.
        ...(placeNames.length ? [placeNames.slice(0, 3).join(', ')] : []),
      ],
      actionLabel: 'Open Places', go: () => goToSection('places'),
    },
    people: {
      title: 'People',
      lines: [
        `${peopleCount} close`,
        ...(soonestBirthdayDays != null ? [soonestBirthdayDays === 0 ? 'Birthday today' : `Birthday in ${soonestBirthdayDays}d`] : []),
      ],
      actionLabel: 'Open People', go: () => goToPersonal('people'),
    },
    archive: {
      title: 'Archive',
      lines: [
        v.treeRings > 0 ? `${spellCount(v.treeRings)} year${v.treeRings === 1 ? '' : 's'} kept` : 'Its first year',
      ],
      actionLabel: 'Open Archive', go: () => window.dispatchEvent(new CustomEvent('app:open-archive')),
    },
    // References (2026-09-04) — a proper district instead of a nook prop
    // floating near the cottage; brought the same shortcut it replaced
    // (Kitchen + Home cheat sheets) into the normal card pattern every
    // other district uses. One action button (Kitchen — the more frequent
    // ask); Home Cheat Sheet rides along as a low-key secondary link,
    // same as the well/postcard cards' secondary actions, rather than
    // reworking this card renderer for one district.
    references: {
      title: 'References',
      lines: ['Kitchen & home know-how'],
      actionLabel: 'Open Kitchen', go: () => onOpenKitchen?.(),
      secondary: { label: 'Home Cheat Sheet', go: () => window.open(HOME_URL, '_blank', 'noopener') },
    },
  }

  const svgRef = useRef<SVGSVGElement>(null)

  // Idle freeze — CSS handles the keyframe animations (.village-idle-frozen in
  // globals.css); this stops the scene's SMIL <animate> too, which CSS can't.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    try { isFrozen ? svg.pauseAnimations() : svg.unpauseAnimations() } catch { /* SMIL unsupported */ }
  }, [isFrozen])

  const [draggingId, setDraggingId] = useState<string | null>(null)
  // Resize-in-arrange (round 48, 2026-08-28, "make all elements resizable
  // in arrange") — a tap (pointer down then up with no real movement) on a
  // draggable item, while arranging, SELECTS it for resize instead of
  // moving it; a real drag still just moves it, as before. itemDragRef
  // tracks whether the pointer actually travelled since the last
  // startDrag(), the same "was this a tap or a drag" distinction
  // onScenePointerMove already makes for the scene's own pan gesture.
  const [resizingId, setResizingId] = useState<string | null>(null)
  const itemDragRef = useRef<{ id: string; startClientX: number; startClientY: number; moved: boolean } | null>(null)
  // Keep everything inside the visible window (2026-08-29) — a stale saved
  // layout (or a drag that ran off the edge) used to be able to park a
  // district symbol or a prop below the frame, where it just silently
  // vanished ("make sure sylvia's flower is shown"). These clamps are
  // applied on READ, so an off-screen saved position is pulled back into
  // view instead of being lost, and a drag can't push past the floor.
  // Districts carry a label + count under the anchor, so their floor sits
  // higher than a bare prop's.
  const clampDistrict = (p: { x: number; y: number }) => ({
    x: Math.max(46, Math.min(756, p.x)),
    y: Math.max(90, Math.min(356, p.y)),
  })
  const clampDecor = <T extends { x: number; y: number }>(p: T): T =>
    ({ ...p, x: Math.max(24, Math.min(776, p.x)), y: Math.max(56, Math.min(378, p.y)) })
  const pos = (id: LandmarkId) => clampDistrict(layout[id] ?? DEFAULT_LANDMARK_POS[id])
  // Decorative props' own position lookup (round 12, 2026-08-27) — same
  // "custom position if dragged, else a fixed default" rule as pos() above,
  // just for the open-ended prop set in DECOR_DEFAULTS instead of the six
  // districts. One shared layout blob (VillageLayout is now string-keyed),
  // so a decor id and a landmark id can never collide as long as
  // DECOR_DEFAULTS' keys don't reuse a LandmarkId — they don't.
  const decorPos = (id: string) => clampDecor(layout[id] ?? DECOR_DEFAULTS[id])

  // Sylvia & Harry's day (round 53, 2026-08-28, "figures can wander around
  // the map / walk to clicked area and interact / usually still and smiling
  // but wander and interact time to time"). A JS state machine — see
  // useCoupleLife — replacing the retired CSS village-wander-* loop. `life`
  // gives each figure an absolute target position + pose + facing, plus
  // `walkTo(x,y)` for tap-to-walk and a `together`/`interactPose` gate for
  // the interaction art. Off entirely during arrange and quiet/night.
  // Known spots where the couple do a specific interaction (round 59, "when
  // we put sylvia harry in a known element like bench or picnic they do
  // their respective interaction") — every bench, plus the picnic mat.
  const restSpots = useMemo(() => [
    ...PROPS.benches.map((_, i) => { const p = decorPos(`bench-${i}`); return { x: p.x, y: p.y, frame: COUPLE_BENCH_FRAME } }),
    (() => { const p = decorPos('peopleCorner'); return { x: p.x, y: p.y, frame: COUPLE_BENCH_FRAME } })(),
    (() => { const p = decorPos('picnicMat'); return { x: p.x, y: p.y - 2, frame: COUPLE_PICNIC_FRAME } })(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [layout])

  // Scene "hold" (2026-09-02) — Goodnight / Movie / Party walk the couple to
  // a spot, then hold them there in a pose (useCoupleLife's `hold`). Null for
  // We're home (normal wander) and We're out (figures gone).
  const holdTarget: { x: number; y: number; frame: number } | null = (() => {
    if (gathering || !moodActive) return null
    const sp = decorPos('sylvia'), hp = decorPos('harry')
    const mx = (sp.x + hp.x) / 2, my = Math.max(sp.y, hp.y)
    if (activeMood.kind === 'goodnight') return { x: mx, y: my, frame: COUPLE_NIGHTCAP_FRAME }
    if (activeMood.kind === 'movie') return { x: mx, y: my + 2, frame: COUPLE_MOVIE_FRAME }
    if (activeMood.kind === 'party') { const g = decorPos('gazebo'); return { x: g.x - 8, y: g.y + 10, frame: 0 } }
    return null
  })()
  // Real night with no scene → the fully-still bedtime composition. A scene
  // walks them to `holdTarget` instead of freezing them home.
  const settledNight = settled && !holdTarget
  const life = useCoupleLife({
    // On for a scene hold too (they walk over, then hold) — only real
    // night with no scene, We're out, or arrange fully stop the machine.
    enabled: !arranging && !sceneHidesFigures && !settledNight && (!quiet || gathering || holdTarget != null),
    sylviaHome: decorPos('sylvia'),
    harryHome: decorPos('harry'),
    bounds: { x0: 70, x1: 730, y0: GROUND_Y + 2, y1: GROUND_Y + 74 },
    restSpots,
    hold: holdTarget,
  })
  // soloFigure (a partner is out) — Sylvia holds the village on her own: no
  // "together" interaction, Harry's group hidden below.
  const coupleTogether = life.together && !soloFigure
  const interactPose = life.interactPose

  // Somi roams too now (round 65, "allow somi to wander") — her own small
  // wander state machine (useWanderer), same glide-to-target model as the
  // couple. Off during arrange and quiet/night (she's asleep then).
  const somiHome = decorPos('somi')
  const somiLife = useWanderer({
    // Somi settles for a hold scene too (curls up for Movie / Goodnight).
    enabled: !arranging && !sceneHidesFigures && !settledNight && holdTarget == null && (!quiet || gathering),
    home: somiHome,
    bounds: { x0: 60, x1: 740, y0: GROUND_Y - 6, y1: GROUND_Y + 78 },
    restfulness: 0.62,
  })

  // Wishing well (round 57; round 60 "make cuter hover for thankful well")
  // — tapping it opens a small styled card with a real text field (a
  // <foreignObject> in the scene, same place the Somi card lives) instead
  // of a browser prompt. What's dropped in is saved as a personal note,
  // prefixed "Grateful for:" (2026-09-04 — was a gratitude-tagged capture).
  const [wellOpen, setWellOpen] = useState(false)
  const [wellGlow, setWellGlow] = useState(false)
  const [wellText, setWellText] = useState('')
  function submitGratitude() { setWellText(''); setWellOpen(true) }
  async function saveGratitude() {
    const text = wellText.trim()
    setWellOpen(false)
    if (!text) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('notes').insert({ user_id: user.id, space_id: null, title: '', body: `Grateful for: ${text}` })
      window.dispatchEvent(new CustomEvent('4s:notes-changed'))
    } catch { /* ignore — the well is a gesture, not a form */ }
    setWellGlow(true)
    setTimeout(() => setWellGlow(false), 1600)
  }

  // Screen coordinates → the SVG's own 800×440 user space, so a drag tracks
  // correctly regardless of how large the scene is actually rendered on the
  // page (viewBox scaling means CSS pixels and SVG units are never 1:1).
  function toSvgPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const local = pt.matrixTransform(ctm.inverse())
    return { x: Math.max(15, Math.min(785, local.x)), y: Math.max(15, Math.min(410, local.y)) }
  }

  // Unclamped version of the above, for pan (2026-08-27, round 5) — the
  // clamping in toSvgPoint exists to keep a dragged landmark on-canvas; for
  // measuring how far the pointer has moved in SVG units, clamping the raw
  // point would silently flatten the delta near the edges, making a drag
  // that starts or crosses near x=15/785 or y=15/410 feel like it stalls.
  function rawSvgPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  function startDrag(id: string) {
    return (e: React.PointerEvent) => {
      if (!arranging) return
      e.stopPropagation()
      ;(e.target as Element).setPointerCapture(e.pointerId)
      setDraggingId(id)
      itemDragRef.current = { id, startClientX: e.clientX, startClientY: e.clientY, moved: false }
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingId || !onMoveLandmark) return
    if (itemDragRef.current && Math.hypot(e.clientX - itemDragRef.current.startClientX, e.clientY - itemDragRef.current.startClientY) > 3) {
      itemDragRef.current.moved = true
    }
    const p = toSvgPoint(e.clientX, e.clientY)
    if (p) onMoveLandmark(draggingId, Math.round(p.x), Math.round(p.y))
  }
  function endDrag() {
    // A tap (no real movement) selects the item for resize instead of
    // having moved it; a real drag just ends normally, same item stays
    // deselected so the resize controls don't pop up under your thumb
    // mid-drag.
    if (draggingId && itemDragRef.current && !itemDragRef.current.moved) {
      setResizingId(prev => (prev === draggingId ? null : draggingId))
    }
    itemDragRef.current = null
    setDraggingId(null)
  }
  useEffect(() => { if (!arranging) setResizingId(null) }, [arranging])
  const itemScale = (id: string) => layout[id]?.scale ?? DEFAULT_ITEM_SCALE[id] ?? 1
  function resizeItem(id: string, x: number, y: number, delta: number) {
    if (!onResizeItem) return
    const next = Math.max(0.4, Math.min(2.5, +(itemScale(id) + delta).toFixed(2)))
    onResizeItem(id, x, y, next)
  }
  // Small −/+ buttons, shown only for the one item currently selected via
  // a tap (see endDrag's own comment). onPointerDown must stop
  // propagation too, not just onClick — a pointerdown on a child bubbles
  // to the item's own startDrag() before the click ever fires, which
  // would start dragging the item out from under the button.
  // `renderX/renderY` place the buttons relative to wherever this is
  // mounted (usually already inside a translated group); `storeX/storeY`
  // are the item's real absolute scene position, passed straight through
  // to onResizeItem — using the relative render offset there instead would
  // silently teleport the item to (0,0) the first time it's resized.
  function ResizeControls({ id, storeX, storeY, renderX, renderY }: {
    id: string; storeX: number; storeY: number; renderX: number; renderY: number
  }) {
    if (!arranging || resizingId !== id || !onResizeItem) return null
    const stop = (e: React.PointerEvent) => e.stopPropagation()
    return (
      <g transform={`translate(${renderX} ${renderY})`}>
        <g onPointerDown={stop} onClick={e => { e.stopPropagation(); resizeItem(id, storeX, storeY, -0.15) }} style={{ cursor: 'pointer' }}>
          <circle cx={-9} r={7.5} fill="var(--surface)" stroke="var(--gold)" strokeWidth={1} />
          <text x={-9} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--gold)" fontWeight={700}>−</text>
        </g>
        <g onPointerDown={stop} onClick={e => { e.stopPropagation(); resizeItem(id, storeX, storeY, 0.15) }} style={{ cursor: 'pointer' }}>
          <circle cx={9} r={7.5} fill="var(--surface)" stroke="var(--gold)" strokeWidth={1} />
          <text x={9} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--gold)" fontWeight={700}>+</text>
        </g>
      </g>
    )
  }

  // Drag-to-pan (2026-08-27, round 5) — "should we make the village like
  // Stardew/Animal Crossing, users can wander if they want." A full
  // controllable character and a pixel-art rebuild are a different project
  // (confirmed with the user); this is the scoped version: once you've
  // zoomed in, you can drag the scene around like a map instead of only
  // seeing whatever the zoom's fixed center happened to land on. At zoom 1
  // there's nothing off-screen to reveal, so panning is a no-op by
  // construction (see the clamp below) rather than something that needs to
  // be separately disabled.
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panDragRef = useRef<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number; moved: boolean } | null>(null)
  // Swallows the click that would otherwise follow a real pan-drag (e.g.
  // clearing the selected callout, or firing a district/entity's own
  // onClick if the drag happened to end over one) — set for one event loop
  // tick via a capturing listener below, then cleared.
  const suppressClickRef = useRef(false)

  function onScenePointerDown(e: React.PointerEvent) {
    if (arranging || zoom <= 1 || draggingId) return
    panDragRef.current = { startClientX: e.clientX, startClientY: e.clientY, startPanX: pan.x, startPanY: pan.y, moved: false }
  }
  function onScenePointerMove(e: React.PointerEvent) {
    onPointerMove(e) // landmark-drag path, unchanged
    const s = panDragRef.current
    if (!s) return
    const start = rawSvgPoint(s.startClientX, s.startClientY)
    const cur = rawSvgPoint(e.clientX, e.clientY)
    if (!start || !cur) return
    const dx = cur.x - start.x
    const dy = cur.y - start.y
    if (!s.moved && Math.hypot(dx, dy) < 3) return
    s.moved = true
    setPan({ x: s.startPanX - dx, y: s.startPanY - dy })
  }
  function onScenePointerUp() {
    endDrag()
    if (panDragRef.current?.moved) suppressClickRef.current = true
    panDragRef.current = null
  }
  function onSceneClickCapture(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.stopPropagation()
      e.preventDefault()
      suppressClickRef.current = false
    }
  }
  const grew = new Set(changes?.grownPlantIds ?? [])
  const planted = new Set(changes?.newPlantIds ?? [])
  const landmarked = new Set(changes?.newLandmarkIds ?? [])

  // Per-entity selection (2026-08-21) — clicking a plant or building opens a
  // styled callout with its actual name and stage, in place of the browser's
  // unstyled native tooltip. In locked (shared-mode) view a plant's name IS
  // personal data — a habit's title in someone's tooltip — so a click there
  // routes through the same unlock prompt as the district labels rather than
  // revealing it; see the `locked` branch below.
  const [selected, setSelected] = useState<{ type: 'plant' | 'building' | 'grove'; id: string } | null>(null)

  // Click-to-care (2026-08-24) — a tap already opened the name/stage
  // callout; this is the tactile half. careFor() bounces the tapped shape
  // (village-tapped, see shapes.tsx) and throws a few sparkles from its
  // spot, both self-clearing so the state stays a pure "is this happening
  // right now" flag rather than something that needs manual reset.
  const [caredId, setCaredId] = useState<string | null>(null)
  const [sparkles, setSparkles] = useState<{ id: string; x: number; y: number }[]>([])

  // A guest's contribution just landed — pulse it in (2026-09-04). First
  // population isn't "new"; only ids that appear after the scene already had
  // some.
  const seenContribRef = useRef<Set<string>>(new Set())
  const [freshContribs, setFreshContribs] = useState<Set<string>>(new Set())
  useEffect(() => {
    const cur = new Set(contributions.map(c => c.id))
    const hadSome = seenContribRef.current.size > 0
    const fresh = [...cur].filter(id => !seenContribRef.current.has(id))
    seenContribRef.current = cur
    if (!hadSome || fresh.length === 0) return
    setFreshContribs(prev => new Set([...prev, ...fresh]))
    const t = setTimeout(() => setFreshContribs(prev => {
      const n = new Set(prev); fresh.forEach(id => n.delete(id)); return n
    }), 1500)
    return () => clearTimeout(t)
  }, [contributions])
  const contribPulse = (id: string) => (freshContribs.has(id) ? ' village-changed' : '')
  function careFor(id: string, x: number, y: number) {
    setCaredId(id)
    setTimeout(() => setCaredId(c => (c === id ? null : c)), 480)
    const burst = Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${Date.now()}-${i}`, x, y }))
    setSparkles(prev => [...prev, ...burst])
    setTimeout(() => setSparkles(prev => prev.filter(s => !burst.some(b => b.id === s.id))), 650)
  }

  const selectPlant = (id: string, x: number, y: number) => () => {
    // arranging guard added round 33 (2026-08-27, "can move them around once
    // planted") — plants are draggable now (see the render block below), and
    // without this a drag-arrange tap would also fire the click-to-care
    // sparkle/callout, same reasoning nav()'s own guard already documents.
    if (arranging) return
    if (locked) { onLockedNavigate?.('Growth Garden'); return }
    setSelected(s => (s?.type === 'plant' && s.id === id ? null : { type: 'plant', id }))
    careFor(id, x, y)
  }
  const selectBuilding = (id: string, x: number, y: number) => () => {
    if (locked) { onLockedNavigate?.('Projects'); return }
    setSelected(s => (s?.type === 'building' && s.id === id ? null : { type: 'building', id }))
    careFor(id, x, y)
  }
  const selectedPlant = selected?.type === 'plant' ? plantSlots.find(p => p.plant.id === selected.id) : null
  const selectedBuilding = selected?.type === 'building' ? buildingSlots.find(b => b.building.id === selected.id) : null

  // Tap callout text. No date-fns here — the scene is deliberately hookless
  // and dateless; a YYYY-MM-DD string is formatted by hand. Forward-looking
  // on purpose (see lib/village/state.ts) — "3 waterings to grow", never
  // "3 short".
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  function fmtMonthDay(iso: string): string {
    const [, m, d] = iso.slice(0, 10).split('-').map(Number)
    return m >= 1 && m <= 12 ? `${MON[m - 1]} ${d}` : iso.slice(0, 10)
  }
  function plantSubtitle(p: VillageState['plants'][number]): string {
    if (p.dormant) return `${p.stage} · resting`
    if (p.toNextStage == null) return `${p.stage} · fully grown`
    return `${p.stage} · ${p.toNextStage} watering${p.toNextStage === 1 ? '' : 's'} to grow`
  }
  const BUILDING_PHASE: Record<VillageState['buildings'][number]['phase'], string> = {
    blueprint: 'blueprint', foundation: 'breaking ground', construction: 'under construction',
    complete: 'finished', landmark: 'a landmark',
  }
  function buildingSubtitle(b: VillageState['buildings'][number]): string {
    const base = BUILDING_PHASE[b.phase]
    return b.dueDate && b.phase !== 'complete' && b.phase !== 'landmark'
      ? `${base} · due ${fmtMonthDay(b.dueDate)}`
      : base
  }
  const groveSubtitle = v.treeRings > 0
    ? `${v.treeRings} year${v.treeRings === 1 ? '' : 's'} kept`
    : `${v.accountMonths} month${v.accountMonths === 1 ? '' : 's'} in`
  // Zoom is a viewBox computation, not a transform on the content — every
  // coordinate in this file stays exactly as authored, at a fixed 800:440
  // pixel aspect no matter what's on screen (no stretching). Centered on
  // the scene's true geometric middle (400, 220) — round 4's first pass
  // centered lower (260) to favor the ground over the empty sky, which
  // sounded right but wasn't: the canvas is exactly 440 tall, so at zoom 1
  // that shifted viewBox (40..480) cropped 40 units off the TOP of the sky
  // and revealed 40 units of nothing below y=440 (the canvas has no
  // content past its own edge) — the "cream bar" reported live.
  //
  // A DIFFERENT, safe way to bias toward the ground without that bug
  // (round 21, 2026-08-27, "limit the view window so the world is a bit
  // smaller") — shrink the DEFAULT window itself (BASE_VB_H, below 440)
  // rather than re-centering a same-size window past the canvas edge.
  // Because the window is smaller than the canvas on every axis, it can
  // sit anywhere inside [0,440] without ever exposing empty space past the
  // real content — no "cream bar" possible by construction. (Round 19's
  // attempt at this used a non-uniform CSS transform on the wrapper
  // instead — scale(1.08, 1.22) — which stretched every sprite's aspect
  // ratio ("everything looks squished"); this replaces that with an actual
  // recrop of the coordinate system, so nothing gets distorted.) zoom
  // still multiplies on top of this base, clamped to [1, 2] in
  // Village.tsx, so "Reset" still means "the curated default view," not
  // literally the full 800×440 canvas.
  // Shrunk again (round 23, 2026-08-27, "make the playable window of the
  // village smaller") — same safe recrop technique as round 21's own fix
  // (a smaller coordinate window, not a CSS transform), just a further ~10%
  // tighter on both axes. Still comfortably wider than the two farthest
  // props (the gate at x=58, the Trips signpost at x=770), so nothing real
  // falls off-canvas.
  // Tightened again round 40 (2026-08-28, "zoom in but make sure everything
  // is still in frame") — width stays 720 (real habit-plants can land as
  // far left as forestSlots' own FOREST.x0=40 in lib/village/layout.ts,
  // and clipping someone's actual habit is worse than clipping decor, so
  // this axis keeps its round 29 safety margin). Height drops instead —
  // vertical content is far more tightly bounded (everything real lives
  // within GROUND_Y-90..+70), so this is where an actual tighter crop is
  // safe. GROVE_TREES/DECOR_DEFAULTS.signpost were still nudged inward a
  // touch for a little extra breathing room on this same axis.
  // BASE_VB_CY dropped 232 → 180 (round 42, 2026-08-28, "make moon and sun
  // seen") — round 40's height cut left the top edge at y=82, but
  // Celestial's own real y range (lib/village/sky.ts) runs 60..120, so the
  // sun/moon disc was landing entirely above the visible window at its
  // highest point in the sky — a real regression the screenshot caught,
  // not a rare edge case. Recentering higher trades a little more
  // foreground crop (already partial by design, see FOREGROUND's own
  // comment) for the sky actually being able to show what's in it.
  // Eased back out a little (round 43, "zoom a little out now"), then out
  // again (round 44, 2026-08-28, "zoom out again") — back to the full
  // 800-wide canvas and close to round 21's original 380-tall crop. H
  // capped at 350, not 380, so BASE_VB_CY (180) - H/2 stays ≥ 5 — going
  // negative here would expose real blank canvas above y=0 (the exact
  // "cream bar" class of bug flagged earlier this project), not more sky.
  const CANVAS_W = 800, CANVAS_H = 440
  let baseW = 800
  // Taller default window (2026-08-29, "make sure the sky and moon/sun is
  // seen") — 330 kept the top edge around y=78 while the sun/moon arc peaks
  // at y=60, clipping the disc every midday. 380 + the top-edge cap in
  // skyThirdCY opens the sky back up without giving up the foreground.
  // 404 (2026-09-04, "image being cut") — 380 left the visible window at
  // y 18..398, so the nearest foreground band (y ~366-376) and any dragged-
  // low prop sat jammed against the card's bottom edge / rounded corner. The
  // extra 24 units is pure ground clearance; skyThirdCY still caps the top
  // edge at y=18 so the sun/moon disc stays fully in frame either way.
  let baseH = 404
  let BASE_VB_CX = 400
  // Horizon ~40% down the frame (round 69) — ground-weighted, top of window
  // = GROUND_Y - 0.4·h. But the sun/moon arc runs y 60..120 (lib/village/
  // sky.ts) and the sun sprite + glow reaches ~25px above its centre, so a
  // ground-weighted centre left the disc clipped off the top at midday
  // ("make sure the sky and moon/sun is seen", 2026-08-29). Cap the window's
  // TOP edge at y=18 (CY ≤ 18 + h/2) so the whole celestial body is always
  // in frame, then clamp CY ≥ h/2 so the top can't cross y=0 into blank
  // canvas.
  const skyThirdCY = (h: number) => {
    // Ground-weighted centre, but kept inside the canvas on both edges…
    const inCanvas = Math.max(h / 2, Math.min(CANVAS_H - h / 2, GROUND_Y + h * 0.1))
    // …then pulled up if needed so the window's TOP edge is never below
    // y=18 — the sun/moon disc + glow reaches ~25px above its centre and the
    // centre gets as high as y=60, so anything lower clips it.
    return Math.max(h / 2, Math.min(inCanvas, 18 + h / 2))
  }
  let BASE_VB_CY = skyThirdCY(baseH)
  // Fill an arbitrary container aspect (round 67, "ipad still shows white in
  // fullscreen") — when the caller passes the real viewport ratio, the
  // window is re-shaped to match it exactly (drawing more of the 800×440
  // canvas — extra sky and foreground — instead of letterboxing), so the
  // SVG fills its box edge to edge with no cream bands. Clamped to what the
  // canvas actually holds.
  if (containerAspect && containerAspect > 0) {
    if (containerAspect >= 2.0) {
      // Ultra-wide — the default window already fits, just trim a little
      // height so it's not letterboxed at the sides.
      baseH = Math.max(300, Math.min(350, CANVAS_W / containerAspect))
    } else if (containerAspect >= 1.15) {
      // Landscape tablet / desktop (the picture-frame case) — grow height
      // toward the full canvas, then narrow the width to match. The far
      // edges crop a touch, which is fine; nothing important lives past
      // x~110 / x~725.
      baseH = Math.max(300, Math.min(CANVAS_H, CANVAS_W / containerAspect))
      baseW = Math.max(560, Math.min(CANVAS_W, baseH * containerAspect))
    } else {
      // Portrait — the scene is inherently landscape, so show it full-width
      // and let it sit letterboxed (the card paints a calm ground behind).
      baseW = CANVAS_W
      baseH = CANVAS_H
    }
    BASE_VB_CX = 400
    BASE_VB_CY = skyThirdCY(baseH)
  }
  const vbW = baseW / zoom
  const vbH = baseH / zoom
  // Pan, clamped so the viewBox can never leave the DEFAULT window's own
  // bounds — at zoom 1, vbW/vbH already equal that window, so this clamp
  // collapses to (0, 0) automatically and dragging does nothing, matching
  // the zoom floor's own "nothing past the edge to reveal" rule.
  const maxPanX = Math.max(0, (baseW - vbW) / 2)
  const maxPanY = Math.max(0, (baseH - vbH) / 2)
  const panX = Math.min(maxPanX, Math.max(-maxPanX, pan.x))
  const panY = Math.min(maxPanY, Math.max(-maxPanY, pan.y))
  const viewBox = `${BASE_VB_CX - vbW / 2 - panX} ${BASE_VB_CY - vbH / 2 - panY} ${vbW} ${vbH}`
  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      role="img"
      aria-label="Your village — a view of your habits, projects and history"
      className={isFrozen ? 'village-idle-frozen' : undefined}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%', height: containerAspect ? '100%' : 'auto', display: 'block',
        touchAction: arranging || zoom > 1 ? 'none' : undefined,
        cursor: !arranging && zoom > 1 ? (panDragRef.current?.moved ? 'grabbing' : 'grab') : undefined,
      }}
      onClick={() => setSelected(null)}
      onClickCapture={onSceneClickCapture}
      onPointerDown={onScenePointerDown}
      onPointerMove={onScenePointerMove}
      onPointerUp={onScenePointerUp}
      onPointerLeave={onScenePointerUp}
      onPointerCancel={onScenePointerUp}
    >
      <defs>
        <radialGradient id="vvignette" cx="50%" cy="45%" r="75%">
          {/* Switched from var(--bg) to a fixed neutral black (2026-08-21) —
              a vignette is conventionally a darkening at the edges, not a
              wash of the theme's own background color, and using --bg meant
              this covered the ENTIRE 800×440 canvas (drawn last, on top of
              literally everything including the sky) with up to 35% of
              whatever --bg happens to be. On a theme whose --bg reads as a
              strong, saturated color rather than a deep neutral, that's not
              a subtle edge darkening, it's a second full-canvas color wash
              stacked on top of the sky gradient — enough to shift a genuinely
              blue sky toward whatever hue --bg carries. Pure black at low
              opacity can only ever darken, never re-hue, so this is no
              longer a variable that can fight the sky's own colors regardless
              of which theme or custom palette is active.
              Also: reach eased in from 75% (see the r attribute above is
              unchanged, but the stop offsets below now cover less of the
              canvas — 68% is where darkening starts instead of 55%. */}
          <stop offset="68%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
        {/* Party glow — a warm wash centred on the cottage while a gathering
            is on, so the wall reads as "a party is happening" and not just
            "night with the porch light on". */}
        <radialGradient id="vparty" cx="50%" cy="52%" r="70%">
          <stop offset="0%" stopColor="#ffb060" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#ff9b52" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ff9b52" stopOpacity="0" />
        </radialGradient>
        {/* Depth pass (2026-08-21) — the ground and every rounded shape were
            flat single-color fills, which is what read as sparse/flat rather
            than "not enough is drawn". vground gives the field a top-to-
            bottom gradient instead of one flat tone; vsheen is a soft
            highlight overlaid on canopies/roofs/hills so a plain circle
            reads as lit from above rather than as a paper cutout.
            objectBoundingBox (the SVG default) means every shape that
            references vsheen gets its own correctly-scaled highlight from
            this one definition — no per-shape gradient needed. */}
        {/* Real green field, not the theme's cream/beige surface tones
            (2026-08-24) — pulled directly from BloomScan's own ground
            gradient (src/art/GardenGround.tsx's `-field` gradient:
            #CBD9BB -> #BCCFAA -> #A9C096), the actual reference for "grass
            should be green, matching BloomScan's garden feel". Fixed hex,
            not var()-driven, for the same reason Sky.tsx's zenith blue is
            fixed: grass reading as green is a baseline fact about grass,
            not something a theme should be able to override into cream. */}
        <linearGradient id="vground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CBD9BB" />
          <stop offset="55%" stopColor="#BCCFAA" />
          <stop offset="100%" stopColor="#A9C096" />
        </linearGradient>
        {/* Sun-shaft gradient (round 74) — warm at the top, gone by the
            bottom, so a light beam fades out before it hits the grass. */}
        <linearGradient id="vshaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2D08A" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F2D08A" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="vsheen" cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.30" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* Atmosphere pass (2026-08-27, round 8) — "push SVG further," per the
            user's own direction after seeing painted-game reference art: this
            scene can't become painted illustration, but flat single-color
            fills read as clip-art next to ANYTHING with real light in it.
            Three cheap, reusable defs close some of that gap without a
            rendering rewrite:
            vwall/vroof — a top-to-bottom gradient instead of one flat hex, so
            a wall or roof reads as a lit surface rather than a paper cutout.
            objectBoundingBox (unspecified gradientUnits, same as vsheen
            above) means every shape using these gets its own correctly-
            scaled gradient regardless of size — one def, reused on Home's
            big house and the Places kiosk alike. */}
        <linearGradient id="vwall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={WALL} />
          <stop offset="100%" stopColor={WALL_SHADOW} />
        </linearGradient>
        <linearGradient id="vroof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ROOF_LIGHT} />
          <stop offset="100%" stopColor={ROOF} />
        </linearGradient>
        {/* vglow — a real Gaussian blur instead of the flat concentric-circle
            "glow" trick used everywhere so far (sun/moon in Celestial.tsx,
            lamp heads in LampShape). Concentric flat-opacity rings have a
            visible banded edge up close; an actual blur is what a soft light
            source looks like. feMerge layers the blurred copy behind the
            crisp original so the source shape stays sharp at its center. */}
        {/* stdDeviation bumped 3.2 → 5.5 (round 17, 2026-08-27, "make all
            light sources more ambient") — every glow in the scene (sun,
            moon, lamps, lanterns, the house/workshop/greenhouse/shop window
            accents) shares this one filter, so widening the blur here softens
            all of them at once instead of hand-tuning each source separately. */}
        <filter id="vglow" x="-250%" y="-250%" width="600%" height="600%">
          {/* stdDeviation bumped 5.5 → 7.5 (round 40, 2026-08-28, "add glow
              and ambience to light sources and ambience") — every light
              source in the scene shares this one filter (sun, moon, lamps,
              lanterns, window accents, district-symbol glows), so widening
              it here softens/enlarges all of them at once. */}
          <feGaussianBlur stdDeviation="7.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* vgrain — a faint monochrome noise field, used purely as an alpha
            mask (feColorMatrix zeroes the RGB channels and reads the noise
            into the alpha channel instead) so it can sit over the whole
            scene as a low-opacity multiply without tinting any color. This
            single texture pass is what separates "illustrated" from "clip
            art" more than any individual shape does — the reference art's
            hand-painted surfaces all carry this kind of grain; flat vector
            fills have none by construction. */}
        <filter id="vgrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.5 0.5 0.5 0 0" />
        </filter>
      </defs>

      <Sky timeOfDay={v.timeOfDay} live={live} palette={palette} celestial={celestial} />
      {live && <Clouds timeOfDay={v.timeOfDay} />}

      {/* Ground-plane scenery, dimmed after dark (2026-08-24 fix) — the
          field/tree/grass/stone colors just below are fixed hex on purpose
          (grass reading as green is a baseline fact, not a themeable one —
          see vground's own comment), which means they never varied with
          time of day OR the active theme. That was fine in daylight, but at
          night — exactly when a dark theme is most likely in use — a
          still-bright pastel field under a genuinely dark night sky (Sky.tsx
          DOES correctly darken) read as washed out, and light-on-dark theme
          colors like Obsidian's near-white --gold lost contrast against it.
          A CSS filter here is simpler and more complete than re-deriving
          every hex by hand — it dims and slightly desaturates the whole
          ground plane at once, the way moonlight actually would, without
          touching the district icons/labels drawn on top (those already
          use theme vars tuned for dark surfaces and don't need this). */}
      <g style={dark ? { filter: 'brightness(0.55) saturate(0.82)' } : undefined}>
        {/* Background hills (2026-08-25) — a third depth layer behind the
            treeline, per the "diorama, not a flat plane" direction: distant
            silhouettes, soft and low-opacity so they read as far away
            without competing with anything in front of them. Two gentle,
            overlapping humps rather than jagged peaks — this is a small
            village's own backdrop, not a mountain range. Fixed shapes, no
            data behind them, same "pure atmosphere" rule as DISTANT_TREES. */}
        <g opacity={0.28}>
          <path d={`M -20 ${GROUND_Y - 18} Q 140 ${GROUND_Y - 62} 320 ${GROUND_Y - 30} Q 480 ${GROUND_Y - 58} 640 ${GROUND_Y - 24} Q 740 ${GROUND_Y - 40} 820 ${GROUND_Y - 20} L 820 ${GROUND_Y + 4} L -20 ${GROUND_Y + 4} Z`} fill="#9FB08A" />
        </g>
        <g opacity={0.38}>
          <path d={`M -20 ${GROUND_Y - 8} Q 220 ${GROUND_Y - 34} 420 ${GROUND_Y - 14} Q 600 ${GROUND_Y - 32} 820 ${GROUND_Y - 10} L 820 ${GROUND_Y + 6} L -20 ${GROUND_Y + 6} Z`} fill="#8FA57E" />
        </g>
        {/* Distant treeline (2026-08-24) — the gap between the sky and the
            ground line used to be empty air, which is a lot of the reason the
            scene read flat/empty. Sits right at the horizon, behind the
            ground, two overlapping rows so it has some depth of its own. */}
        <g opacity={0.55}>
          {DISTANT_TREES.map(t => (
            <path key={t.id} d={`M ${t.x} ${GROUND_Y - 22} l ${-t.h * 0.6} ${t.h} h ${t.h * 1.2} Z`} fill="#8FA582" />
          ))}
        </g>
        <g opacity={0.7}>
          {DISTANT_TREES.map(t => (
            <path key={t.id} d={`M ${t.x + 9} ${GROUND_Y - 14} l ${-t.h * 0.55} ${t.h * 0.85} h ${t.h * 1.1} Z`} fill="#7E9673" />
          ))}
        </g>

        {/* Rolling ground — a top-to-bottom gradient now, not one flat tone */}
        <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18} L 800 440 L 0 440 Z`}
          fill="url(#vground)" opacity={0.95} />
        {/* The season, laid over the ground rather than replacing it: the land
            keeps its shape, it just goes gold or goes cold. Same opacity bug
            as Sky.tsx's skyWash, same fix: real target opacity on a static
            outer <g>, animation only on the inner path, so the animation's
            own opacity:1 end-state can't override the intended low wash. */}
        {live && palette.ground && (
          <g opacity={palette.groundOpacity}>
            <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18} L 800 440 L 0 440 Z`}
              fill={palette.ground} className="village-fade" />
          </g>
        )}
        {/* Seasonal ground freckle (round 74, "cozy atmosphere" / "the
            ground itself should turn with the season") — a light scatter of
            tiny marks across the grass: fallen leaves in autumn, snow
            patches in winter, flower flecks in spring, clover in summer.
            Deterministic per index, same hashPos idiom as GRASS_TUFTS. */}
        {live && (() => {
          const spec = {
            autumn: { fills: ['#c86a3a', '#b9532e', '#d98b45'], r: [0.8, 1.7], op: 0.5, n: 44 },
            winter: { fills: ['#eef2f6', '#e2e9f0'], r: [1.4, 3.2], op: 0.55, n: 30 },
            spring: { fills: ['#e8899f', '#f0c65a', '#ffffff'], r: [0.6, 1.1], op: 0.6, n: 40 },
            summer: { fills: ['#5f8f4e', '#6fa057'], r: [0.7, 1.3], op: 0.3, n: 24 },
          }[v.season]
          return (
            <g className="village-fade">
              {Array.from({ length: spec.n }, (_, i) => {
                const s = `frk-${v.season}-${i}`
                const x = 12 + hashPos(s) * 776
                const y = GROUND_Y + 6 + hashPos(s + 'y') * 150
                const r = spec.r[0] + hashPos(s + 'r') * (spec.r[1] - spec.r[0])
                const fill = spec.fills[Math.floor(hashPos(s + 'f') * spec.fills.length) % spec.fills.length]
                return <circle key={i} cx={x} cy={y} r={r} fill={fill} opacity={spec.op * (0.5 + hashPos(s + 'o') * 0.5)} />
              })}
            </g>
          )
        })()}
      </g>

      {/* Behind the ground line and above the sky: places you've both been.
          Drawn before the ground stroke so the hills sit properly behind it. */}
      <Horizon places={horizon} groundY={GROUND_Y} />

      <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18}`}
        fill="none" stroke="var(--border)" strokeWidth="1.5" />

      {/* Tap the open ground to send Sylvia & Harry over there for an
          interaction (round 53). Sits under every prop/figure/district in
          paint order, so those keep their own clicks; only a bare-ground
          tap reaches here. Off in arrange/quiet and We're-out; during a
          scene hold a tap re-parks them there (still no wander). */}
      {!arranging && !settledNight && !sceneHidesFigures && (
        <rect x={0} y={GROUND_Y - 6} width={800} height={440 - (GROUND_Y - 6)} fill="transparent"
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
          onClick={e => { const pt = toSvgPoint(e.clientX, e.clientY); if (pt) life.walkTo(pt.x, pt.y) }} />
      )}

      {/* The path — see PATH_D/PATH_PAVERS above. Fixed warm earth tones,
          not theme vars (round 4, 2026-08-27) — same reasoning WALL/ROOF/
          TRIM in shapes.tsx already established for buildings: a path's
          color isn't themeable.
          Rebuilt again (round 26, 2026-08-27, "make the path look more
          like a path... fit the style and theme more") — round 25's smooth
          gradient-stroke band was a real improvement over round 4's plain
          line, but it's still a vector-illustration technique (blurred
          soft edges, a gradient shoulder) sitting next to flat, blocky
          pixel-art sprites everywhere else in the scene; it read as a
          painted road, not this village's own stepping-stone dirt trail.
          Now a soft low-opacity dirt-tone connector (just enough to read as
          "these stones are on the same trail," not a road surface) under a
          scatter of small rounded pavers in the same TRIM-family palette
          the buildings use, each with its own tiny hashPos-seeded jitter/
          rotation/tone so they read as hand-laid stones, not a repeating
          tile. */}
      {/* Real path-tile.png (round 39) turned out wrong for this — 32
          overlapping rectangular stone-bordered tiles in a row along the
          path read as a continuous rail/fence line, not a path (round 40
          fix, "use the cobblestone paths"). path-stone.png instead —
          individual rounded cobblestones from the same source sheet,
          scattered (not tiled edge-to-edge) with the same per-stone
          hashPos jitter/rotation as before, which is what actually reads
          as a cobblestone path rather than a repeating strip. Bigger,
          denser, and fully opaque round 42 ("use the cobblestone path"
          repeated — round 40's version still read too faint/sparse to
          register as a path at a glance) — see PATH_PAVERS' own comment. */}
      <path d={PATH_D} fill="none" stroke="#B08659" strokeWidth={6} strokeLinecap="round" opacity={0.22} />
      {/* Spur paths first, so the main-path stones sit on top where they meet. */}
      {SPUR_PAVERS.map(p => {
        const tw = p.size * 1.7, th = tw * (41 / 56)
        return (
          <image key={p.id} href="/village-assets/path-stone.png" x={-tw / 2} y={-th / 2} width={tw} height={th}
            opacity={0.9} style={{ imageRendering: 'pixelated' }}
            transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} />
        )
      })}
      {PATH_PAVERS.map(p => {
        const tw = p.size * 1.7, th = tw * (41 / 56)
        return (
          <image key={p.id} href="/village-assets/path-stone.png" x={-tw / 2} y={-th / 2} width={tw} height={th}
            opacity={1} style={{ imageRendering: 'pixelated' }}
            transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} />
        )
      })}

      {/* Grass and stones — same dark-mode dimming as the ground-plane
          group above, kept as a second filtered group rather than merged
          into it so the walkway/Horizon still render between the field and
          this top texture layer, same as before the fix (2026-08-24). */}
      <g style={dark ? { filter: 'brightness(0.55) saturate(0.82)' } : undefined}>
        {/* Grass — texture along the ground line, see GRASS_TUFTS above.
            Fixed BloomScan grass greens (#8CA57C/#94AD84, same two tones its
            own tufts alternate between) instead of the theme's --emerald
            (2026-08-24) — grass reading as green is a baseline expectation
            independent of season or theme, and the field gradient above is
            the bigger fix, but the tufts should match the same reference
            rather than clash with it. */}
        <g opacity={0.9}>
          {GRASS_TUFTS.map((t, i) => (
            <path key={t.id}
              d={`M ${t.x - 2} ${GROUND_Y + 6} Q ${t.x} ${GROUND_Y + 6 - t.h} ${t.x + 2} ${GROUND_Y + 6}`}
              fill="none" stroke={i % 2 === 0 ? '#8CA57C' : '#94AD84'} strokeWidth={1.2} strokeLinecap="round" />
          ))}
        </g>

        {/* Stones, another layer of ground texture (2026-08-24), see STONES
            above. */}
        <g opacity={0.5}>
          {STONES.map(st => (
            <ellipse key={st.id} cx={st.x} cy={GROUND_Y + 10 + (st.r * 1.5)} rx={st.r} ry={st.r * 0.62} fill="#C9C6B2" />
          ))}
        </g>

        {/* Mid-ground bushes (2026-08-27, round 6) — see MIDGROUND_BUSHES'
            own comment. Volume between the flat grass-stroke texture above
            and the district row below, instead of a hard jump from
            "hairline" straight to "building." Real bush-mound.png sprite
            since round 12, same reasoning as FOREGROUND's own swap below. */}
        <g opacity={0.8}>
          {MIDGROUND_BUSHES.map(b => {
            const w = 12 * b.scale, h = 7 * b.scale
            return (
              <image key={b.id} href="/village-assets/bush-mound.png" x={b.x - w / 2} y={b.y - h} width={w} height={h}
                style={{ imageRendering: 'pixelated' }} />
            )
          })}
        </g>

        {/* EXTRA_TREES — the clustered woodland (round 74). A gentle
            per-tree sway on the nearer ones (village-sway-soft, staggered
            so the wood never rocks in lockstep); the dim far backdrop
            holds still to keep the moving-node count down. */}
        <g>
          {EXTRA_TREES.map((t, i) => {
            const spr = seasonTree(t.kind, v.season)
            const w = t.h * spr.aspect
            const sway = t.sway && !quiet
            return (
              <g key={i} opacity={t.opacity ?? 0.9}>
                <ellipse cx={t.x} cy={t.y + 1.5} rx={w * 0.42} ry={2.2} fill="var(--text)" opacity={0.14} />
                <image href={spr.src} x={t.x - w / 2} y={t.y - t.h} width={w} height={t.h}
                  className={sway ? 'village-sway-soft' : undefined}
                  style={{
                    imageRendering: 'pixelated',
                    ...(sway ? { animationDuration: `${(4.4 + hashPos(`tsw-${i}`) * 2.6).toFixed(2)}s`, animationDelay: `${(-hashPos(`tsd-${i}`) * 5).toFixed(2)}s` } : {}),
                  }} />
              </g>
            )
          })}
          {/* The lone path-side foreground tree was removed round 62 ("remove
              big tree except for people") — it stood right in the middle of
              the path band and read as a big centrepiece tree. The grove
              behind Growth Garden and the background tree line carry the
              greenery now. */}
        </g>

        {/* Fixed cozy nature details — boulders, wildflower meadows, a
            firewood bundle (round 74). See NATURE_DETAILS above. */}
        <g pointerEvents="none">
          {NATURE_DETAILS.map((d, i) => {
            const ar: Record<string, number> = {
              'boulder-cluster.png': 258 / 161, 'rock-cluster.png': 183 / 125,
              'wildflower-meadow.png': 680 / 204, 'flower-patch.png': 1.55,
              'firewood-bundle.png': 174 / 120,
            }
            const w = d.w, h = w / (ar[d.src] ?? 1.5)
            return (
              <g key={i} transform={d.flip ? `translate(${d.x} ${d.y}) scale(-1 1)` : `translate(${d.x} ${d.y})`}>
                <ellipse cx={0} cy={0.5} rx={w * 0.44} ry={h * 0.14} fill="var(--text)" opacity={0.12} />
                <image href={`/village-assets/${d.src}`} x={-w / 2} y={-h} width={w} height={h}
                  style={{ imageRendering: 'pixelated' }} />
              </g>
            )
          })}
        </g>

        {/* Seasonal ground litter (round 75) — the master weather-ground
            sheet's leaf piles / mushrooms / acorns in autumn, snow mounds in
            winter. A few deterministic decals near the grove and path edges,
            so the season shows on the ground and not just the trees. */}
        {(v.season === 'autumn' || v.season === 'winter') && (
          <g pointerEvents="none" opacity={0.9}>
            {(v.season === 'autumn'
              ? [
                  { src: 'leaf-pile.png', ar: 292 / 121, x: 214, y: GROUND_Y + 20, w: 20 },
                  { src: 'leaf-pile.png', ar: 292 / 121, x: 596, y: GROUND_Y + 30, w: 16, flip: true },
                  { src: 'mushrooms.png', ar: 298 / 79, x: 118, y: GROUND_Y + 44, w: 15 },
                  { src: 'acorns.png', ar: 130 / 116, x: 470, y: GROUND_Y + 12, w: 7 },
                  { src: 'acorns.png', ar: 130 / 116, x: 152, y: 262, w: 6 },
                ]
              : [
                  { src: 'snow-mound.png', ar: 221 / 104, x: 150, y: GROUND_Y + 16, w: 22 },
                  { src: 'snow-mound.png', ar: 221 / 104, x: 470, y: GROUND_Y + 34, w: 17 },
                  { src: 'snow-mound.png', ar: 221 / 104, x: 636, y: GROUND_Y + 22, w: 19, flip: true },
                ]
            ).map((d, i) => {
              const w = d.w, h = w / d.ar
              return (
                <g key={i} transform={d.flip ? `translate(${d.x} ${d.y}) scale(-1 1)` : `translate(${d.x} ${d.y})`}>
                  <ellipse cx={0} cy={0.4} rx={w * 0.44} ry={h * 0.16} fill="var(--text)" opacity={0.1} />
                  <image href={`/village-assets/${d.src}`} x={-w / 2} y={-h} width={w} height={h}
                    style={{ imageRendering: 'pixelated' }} />
                </g>
              )
            })}
          </g>
        )}

        {/* Cozy fixed features (round 74) — a flowering arbor bench to sit
            under, two path lamps that catch the light at dusk / during a
            gathering, tulip planters by the garden and the house. Static
            scenery, not draggable — same idiom as the nature details. */}
        <g pointerEvents="none">
          {/* Flower arbor + bench */}
          {(() => { const w = 23, h = w / (301 / 235), x = 348, y = GROUND_Y + 74; return (
            <g transform={`translate(${x} ${y})`}>
              <ellipse cx={0} cy={0.5} rx={w * 0.42} ry={2} fill="var(--text)" opacity={0.13} />
              <image href="/village-assets/arbor-bench.png" x={-w / 2} y={-h} width={w} height={h} style={{ imageRendering: 'pixelated' }} />
            </g>
          ) })()}
          {/* Path lamps */}
          {[{ x: 176, y: GROUND_Y + 20 }, { x: 528, y: GROUND_Y + 24 }].map((p, i) => {
            const w = 8, h = w / (136 / 242)
            return (
              <g key={i} transform={`translate(${p.x} ${p.y})`}>
                {warm && <circle cx={0} cy={-h + 3} r={7} fill="var(--amber)" opacity={0.4} filter="url(#vglow)" className="village-glow" />}
                <ellipse cx={0} cy={0.5} rx={3} ry={1.3} fill="var(--text)" opacity={0.14} />
                <image href="/village-assets/street-lamp.png" x={-w / 2} y={-h} width={w} height={h}
                  style={{ imageRendering: 'pixelated' }} className={warm ? 'village-glow' : undefined} />
              </g>
            )
          })}
          {/* Tulip planters */}
          {[{ x: 40, y: GROUND_Y + 52 }, { x: 366, y: GROUND_Y + 28 }].map((p, i) => {
            const w = 13, h = w / (251 / 115)
            return (
              <g key={i} transform={`translate(${p.x} ${p.y})`}>
                <ellipse cx={0} cy={0.5} rx={w * 0.42} ry={1.4} fill="var(--text)" opacity={0.12} />
                <image href="/village-assets/flower-planter-tulips.png" x={-w / 2} y={-h} width={w} height={h} style={{ imageRendering: 'pixelated' }} />
              </g>
            )
          })}
        </g>
      </g>

      {/* Small props along the path — see PROPS above. */}
      {/* Every prop below is now draggable (round 27, "make everything
          moveable") — Draggable wraps each shape at its decorPos() position
          instead of PROPS' own fixed one, same pattern as the generic
          item-prop loop further down. */}
      {(() => { const p = decorPos('pond'); return (
        <Draggable x={p.x} y={p.y} id="pond" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('pond')} r={22}>
          <PondShape x={0} y={0} scale={1.15} onClick={!arranging ? () => life.walkTo(p.x, p.y + 8) : undefined} />
        </Draggable>
      ) })()}
      {PROPS.benches.map((_, i) => { const id = `bench-${i}`; const p = decorPos(id); return (
        <Draggable key={id} x={p.x} y={p.y} id={id} arranging={arranging} draggingId={draggingId} onPointerDown={startDrag(id)} r={10}>
          <BenchShape x={0} y={0} scale={1.15} />
        </Draggable>
      ) })}
      {PROPS.flowerBeds.map((f, i) => { const id = `flowerBed-${i}`; const p = decorPos(id); return (
        <Draggable key={id} x={p.x} y={p.y} id={id} arranging={arranging} draggingId={draggingId} onPointerDown={startDrag(id)} r={14}>
          <FlowerBedShape x={0} y={0} scale={1.15} hue={f.hue} onClick={!arranging ? () => life.walkTo(p.x, p.y + 6) : undefined} />
        </Draggable>
      ) })}
      {/* The fence is back (round 39, 2026-08-27, "sync all new elements
          and animations") — real solid-panel art now (see FenceShape's own
          comment on why this crop is different from the lattice-gate one
          removed round 34/35). */}
      {PROPS.fences.map((f, i) => { const id = `fence-${i}`; const p = decorPos(id); return (
        <Draggable key={id} x={p.x} y={p.y} id={id} arranging={arranging} draggingId={draggingId} onPointerDown={startDrag(id)} r={16}>
          <FenceShape x={0} y={0} length={f.length} scale={1.1} />
        </Draggable>
      ) })}
      {PROPS.lamps.map((_, i) => { const id = `lamp-${i}`; const p = decorPos(id); return (
        <Draggable key={id} x={p.x} y={p.y} id={id} arranging={arranging} draggingId={draggingId} onPointerDown={startDrag(id)} r={10}>
          <LampShape x={0} y={0} dark={warm} scale={1.1} />
        </Draggable>
      ) })}
      {(() => { const p = decorPos('clockTower'); return (
        <Draggable x={p.x} y={p.y} id="clockTower" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('clockTower')} r={26}>
          <ClockTowerShape x={0} y={0} timeOfDay={v.timeOfDay} dark={dark} scale={itemScale('clockTower')} />
        </Draggable>
      ) })()}
      {(() => { const p = decorPos('wishingWell'); return (
        <Draggable x={p.x} y={p.y} id="wishingWell" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('wishingWell')} r={22}>
          <WishingWellShape x={0} y={0} glow={wellGlow} onClick={!arranging ? submitGratitude : undefined} />
        </Draggable>
      ) })()}
      {/* A standing garden lantern (round 63, "import all elements ... place
          some too") — garden-lantern.png from the village/ decor-lanterns
          sheet. Warm all the time, brighter after dark, same dark-gated
          vglow idiom as LampShape. */}
      {(() => { const p = decorPos('gardenLantern'); const s = itemScale('gardenLantern'); const h = 15 * s, w = h * (115 / 176); return (
        <Draggable x={p.x} y={p.y} id="gardenLantern" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('gardenLantern')} r={11}>
          <g>
            <title>A garden lantern</title>
            <ellipse cx={0} cy={1.5} rx={5} ry={1.4} fill="var(--text)" opacity={0.12} />
            <circle cx={0} cy={-h * 0.5} r={warm ? 8 : 5} fill="var(--amber)" opacity={warm ? 0.4 : 0.22} filter="url(#vglow)" className="village-glow" />
            <image href="/village-assets/garden-lantern.png" x={-w / 2} y={-h} width={w} height={h}
              style={{ imageRendering: 'pixelated' }} className={warm ? 'village-glow' : undefined} />
          </g>
        </Draggable>
      ) })()}
      {/* Postcard rack (round 66) — flip through your trip postcards. */}
      {(() => { const p = decorPos('postcardRack'); const s = itemScale('postcardRack'); const w = 24 * s, h = w * (145 / 203); return (
        <Draggable x={p.x} y={p.y} id="postcardRack" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('postcardRack')} r={14}>
          <g onClick={!arranging ? () => setPostcardsOpen(o => !o) : undefined}
            className={!arranging ? 'village-entity' : undefined} style={{ cursor: !arranging ? 'pointer' : undefined }}>
            <title>Your postcards</title>
            {!arranging && <rect x={-w / 2 - 2} y={-h - 2} width={w + 4} height={h + 4} fill="transparent" style={{ pointerEvents: 'all' }} />}
            <ellipse cx={0} cy={1.5} rx={w / 2.4} ry={1.8} fill="var(--text)" opacity={0.13} />
            <image href="/village-assets/postcard-rack.png" x={-w / 2} y={-h} width={w} height={h}
              style={{ imageRendering: 'pixelated' }} />
          </g>
        </Draggable>
      ) })()}
      {(() => { const p = decorPos('picnicMat'); const w = 22, h = w * (280 / 460); return (
        <Draggable x={p.x} y={p.y} id="picnicMat" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('picnicMat')} r={13}>
          <g>
            <title>A picnic spot</title>
            <ellipse cx={0} cy={0} rx={w / 2} ry={2} fill="var(--text)" opacity={0.1} />
            <image href="/village-assets/picnic-mat.png" x={-w / 2} y={-h + 2} width={w} height={h} style={{ imageRendering: 'pixelated' }} />
          </g>
        </Draggable>
      ) })()}

      {/* Ten more real sprites, rounds 11–12 (2026-08-27, the user's own
          village-matching-expansion-pack, v2 with real alpha) — a gate
          marking the village's own entrance, a car and a bus stop for two
          more districts to lean on, and four ground-cover accents (bush/
          flowering bush/tall grass/rock) for variety beyond the procedural
          FOREGROUND layer's own three shapes. All draggable in arrange
          mode now (round 12) — see decorPos/DECOR_DEFAULTS. */}
      {[
        // gate/car/busStop re-sourced round 23, 2026-08-27 ("update only
        // using these elements") from the master-visual-assets folder's own
        // structures-clean.png — dims recomputed from their real crop aspect
        // ratios, not carried over from the old custom-pack sprites. Sized
        // up again round 24 ("make sure things are scaled properly but so
        // we can also see them") — the round 23 sizes read a little small
        // next to the buildings they stand beside.
        // The gate is gone (round 35, 2026-08-27) — same "fence with white
        // in the middle" complaint as the actual fence, still standing
        // after that one was removed: gate.png is genuinely an open
        // wooden-lattice gate (real transparent gaps by design, not a
        // crop bug), and it reads exactly like a fence for the same
        // reason. Removed rather than patched, same call as the fence.
        // The standalone car near Home is gone (round 31, 2026-08-27,
        // "delete second car") — Places' own district badge became the
        // car (round 30), and having a second one parked by the house too
        // read as a duplicate rather than two different things.
        // Sized up again round 35 (2026-08-27, "things like bus stop still
        // too small") — 18 units tall still read small at full-scene zoom.
        { id: 'busStop', title: 'A bus stop', href: 'bus-stop.png', w: 41.2, h: 26 },
        // Curated scenery (round 56, trimmed round 57 to sprites whose
        // master-folder source still exists).
        { id: 'gazebo', title: 'A gazebo', href: 'gazebo.png', w: 46 * (346 / 338), h: 46 },
        { id: 'footBridgeScene', title: 'A little bridge', href: 'foot-bridge.png', w: 15 * (256 / 155), h: 15 },
        { id: 'firewoodScene', title: 'Firewood', href: 'firewood.png', w: 8 * (255 / 160), h: 8 },
        { id: 'wildflowerScene', title: 'Wildflowers', href: 'wildflower-strip.png', w: 15 * (512 / 341), h: 15 },
        { id: 'waterPumpScene', title: 'A water pump', href: 'water-pump.png', w: 15 * (207 / 253), h: 15 },
        // Round 63 — near Growth Garden. A raised bed and a planter box of
        // flowers; decorative, not a second way to plant a habit (real
        // plants only ever come from habit data, see PlantShape).
        { id: 'gardenBed', title: 'A raised garden bed', href: 'garden-bed.png', w: 16 * (289 / 171), h: 16 },
        { id: 'flowerPlanter', title: 'A flower planter', href: 'flower-planter.png', w: 14 * (286 / 172), h: 14 },
        // Round 65 — village-community-hobby-elements-alpha.png. Little
        // traces of what Sylvia & Harry get up to, scattered around the
        // gathering end of the village.
        { id: 'hobbyEasel', title: 'A painting easel', href: 'hobby-easel.png', w: 12 * (146 / 271), h: 12 },
        { id: 'hobbyTennis', title: 'A tennis racket', href: 'hobby-tennis.png', w: 9 * (235 / 247), h: 9 },
        { id: 'hobbyBookCoffee', title: 'A book and coffee', href: 'hobby-book-coffee.png', w: 11 * (348 / 166), h: 11 },
        { id: 'hobbyMusicStand', title: 'A music stand', href: 'hobby-music-stand.png', w: 11 * (152 / 253), h: 11 },
        { id: 'hobbyInstrumentCase', title: 'An instrument case', href: 'hobby-instrument-case.png', w: 12 * (334 / 182), h: 12 },
        { id: 'hobbyBicycle', title: 'A bicycle', href: 'hobby-bicycle.png', w: 13 * (292 / 253), h: 13 },
        { id: 'hobbyGardenBasket', title: 'A gardening basket', href: 'hobby-garden-basket.png', w: 10 * (293 / 216), h: 10 },
        // Sized up round 29 ("fix the sizing of everything, try to scale
        // but do not make anything too tiny") — these four read noticeably
        // smaller than everything else in the scene.
        { id: 'bushMound', title: 'A bush', href: 'bush-mound.png', w: 20.4, h: 12 },
        { id: 'floweringBush', title: 'A flowering bush', href: 'flowering-bush.png', w: 17.2, h: 13 },
        { id: 'tallGrass', title: 'Tall grass', href: 'tall-grass.png', w: 13.8, h: 13 },
        { id: 'rockCluster', title: 'A few rocks', href: 'rock-cluster.png', w: 18.3, h: 12.5 },
        // Round 27's seven community-props items are gone (round 32,
        // 2026-08-27, "delete any elements that are not from my folder and
        // currently not in my folder right now") — see DECOR_DEFAULTS' own
        // comment above on why (their source sheet is no longer in the
        // folder).
      ].map(p => {
        const p0 = decorPos(p.id)
        // Resizable in arrange (round 48, 2026-08-28) — itemScale(id)
        // multiplies both dimensions uniformly so nothing stretches.
        const s = itemScale(p.id)
        const pw = p.w * s, ph = p.h * s
        return (
          <g key={p.id} transform={`translate(${p0.x} ${p0.y})`} opacity={1}
            onPointerDown={startDrag(p.id)} style={{ cursor: arranging ? (draggingId === p.id ? 'grabbing' : 'grab') : undefined }}>
            <title>{p.title}</title>
            <ellipse cx={0} cy={ph * 0.28} rx={pw * 0.48} ry={2} fill="var(--text)" opacity={0.14} />
            <image href={`/village-assets/${p.href}`} x={-pw / 2} y={-ph} width={pw} height={ph}
              style={{ imageRendering: 'pixelated' }} />
            {arranging && (
              <rect x={-pw / 2 - 2} y={-ph - 2} width={pw + 4} height={ph + 6} rx={4}
                fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                opacity={draggingId === p.id ? 0.9 : 0.4} />
            )}
            <ResizeControls id={p.id} storeX={p0.x} storeY={p0.y} renderX={0} renderY={-ph - 4} />
          </g>
        )
      })}

      {/* Custom-placed inventory items (round 31, 2026-08-27, "make a
          inventory tab in arrange where we can place anything from asset
          library") — any `custom:<assetKey>:<uid>` key in `layout` (see
          lib/village/assetLibrary.ts) is one of these; Village.tsx's own
          Inventory picker is what actually creates them. Same drag
          mechanism as every other item-prop above, plus a small delete
          button that only appears while arranging — these are the one
          kind of prop a user can remove entirely, not just move. */}
      {Object.keys(layout).filter(id => id.startsWith('custom:')).map(id => {
        const assetKey = parseCustomItemId(id)
        const asset = assetKey ? findAsset(assetKey) : undefined
        const p = layout[id]
        if (!asset || !p) return null
        const s = itemScale(id)
        const h = asset.h * s, w = h * asset.aspect
        return (
          <g key={id} transform={`translate(${p.x} ${p.y})`}
            onPointerDown={startDrag(id)} style={{ cursor: arranging ? (draggingId === id ? 'grabbing' : 'grab') : undefined }}>
            <title>{asset.label}</title>
            <ellipse cx={0} cy={h * 0.28} rx={w * 0.48} ry={2} fill="var(--text)" opacity={0.14} />
            <image href={`/village-assets/${asset.href}`} x={-w / 2} y={-h} width={w} height={h}
              style={{ imageRendering: 'pixelated' }} />
            {arranging && (
              <>
                <rect x={-w / 2 - 2} y={-h - 2} width={w + 4} height={h + 6} rx={4}
                  fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                  opacity={draggingId === id ? 0.9 : 0.4} />
                {onRemoveItem && (
                  <g transform={`translate(${w / 2 + 3} ${-h - 3})`}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onRemoveItem(id) }}
                    style={{ cursor: 'pointer' }}>
                    <circle r={6} fill="var(--rose)" stroke="var(--surface)" strokeWidth={1.2} />
                    <text y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="#fff" fontWeight={700}>×</text>
                  </g>
                )}
              </>
            )}
            {/* Above the remove button, not overlapping it. */}
            <ResizeControls id={id} storeX={p.x} storeY={p.y} renderX={0} renderY={-h - 14} />
          </g>
        )
      })}

      {/* The hanging paper lantern that lights up after dark — draggable via
          the same decorPos/DECOR_DEFAULTS mechanism, rendered separately
          since it swaps by `dark`. (The swaying flower cluster that used to
          live here was dropped round 57 — its source sheet,
          tree-flower-sway-animation, is no longer in the master folder.) */}
      {(() => {
        const p0 = decorPos('paperLantern')
        const w = 5.7, h = 14 // 141×345 source, same aspect ratio
        // A real post now (round 14 fix, 2026-08-27, "make sure all
        // elements are on the ground") — the sprite itself is a HANGING
        // lantern (its own art includes a mounting bracket at top), and
        // rendering just that, floating at head height with only a ground
        // shadow under it, read as unsupported. A short post planted at
        // y=0 (the anchor's own ground level, unlike round 13's
        // GROUND_Y-20 default) carries the bracket up to where the sprite
        // takes over — the same "post holds the fixture up" logic
        // LampShape already uses for the stone lantern.
        const postH = 10
        return (
          <g transform={`translate(${p0.x} ${p0.y})`} opacity={0.95}
            onPointerDown={startDrag('paperLantern')} style={{ cursor: arranging ? (draggingId === 'paperLantern' ? 'grabbing' : 'grab') : undefined }}>
            <title>A paper lantern</title>
            <ellipse cx={0} cy={1.5} rx={4} ry={1.2} fill="var(--text)" opacity={0.12} />
            <rect x={-0.7} y={-postH} width={1.4} height={postH} fill={TRIM} opacity={0.8} />
            {warm && <circle cy={-postH - h / 2} r={9} fill="var(--amber)" opacity={0.28} filter="url(#vglow)" />}
            <image href={`/village-assets/paper-lantern-${warm ? 'lit' : 'unlit'}.png`} x={-w / 2} y={-postH - h} width={w} height={h}
              style={{ imageRendering: 'pixelated' }} className={warm ? 'village-glow' : undefined} />
            {arranging && (
              <rect x={-w / 2 - 2} y={-postH - h - 2} width={w + 4} height={postH + h + 4} rx={4}
                fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                opacity={draggingId === 'paperLantern' ? 0.9 : 0.4} />
            )}
          </g>
        )
      })()}

      {/* Memory map (2026-08-24) — one small marker per date-idea area,
          scattered near the path via the same hashPos-by-id determinism
          everything else in the scene uses, so a given area always lands in
          the same spot rather than reshuffling. Quieter than a district on
          purpose — see MemoryMarker's own header comment. */}
      {dateIdeaAreas.map(({ area, count }) => (
        <MemoryMarker key={area}
          x={70 + hashPos(area) * 660}
          y={GROUND_Y - 36 + hashPos(area + 'y') * 24}
          label={area} count={count}
          onClick={nav(area, () => goToHousehold('reference'), false)} />
      ))}

      {/* Pollen motes — pure atmosphere, see POLLEN above. */}
      <g opacity={0.3}>
        {POLLEN.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2 + (i % 2)} fill="var(--amber)" />
        ))}
      </g>


      {/* Growth Forest — plants are draggable in arrange mode (round 33,
          2026-08-27, "we can only grow them using habits and can move them
          around once planted") — same startDrag/onMoveLandmark mechanism
          every other prop uses, keyed by the plant's own real id (see
          Village.tsx's plantSlots useMemo for where the saved override
          actually gets read back in). A plant can never be ADDED this
          way — only ever moved once it exists from real habit data. */}
      {plantSlots.map(({ plant, x: rawX, y: rawY, scale, back }) => {
        // Clamp on read so a stale saved position can't hide a habit-plant
        // below the frame (2026-08-29, "make sure sylvia's flower is
        // shown") — plant slots come pre-merged with layout[plant.id] in
        // Village.tsx, so this is the presentation-side safety net.
        const { x, y } = clampDecor({ x: rawX, y: rawY })
        return (
        <g key={plant.id} opacity={back ? 0.55 : 1}
          onPointerDown={startDrag(plant.id)}
          style={{ cursor: arranging ? (draggingId === plant.id ? 'grabbing' : 'grab') : undefined }}>
          <PlantShape plant={plant} x={x} y={y} scale={scale}
            foliage={live ? palette.foliage : undefined}
            changed={grew.has(plant.id) || planted.has(plant.id)}
            selected={selected?.type === 'plant' && selected.id === plant.id}
            cared={caredId === plant.id}
            onClick={selectPlant(plant.id, x, y)} />
          {arranging && (
            <circle cx={x} cy={y - 12} r={22} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
              opacity={draggingId === plant.id ? 0.9 : 0.4} />
          )}
        </g>
        )
      })}
      {/* A zero-habit account leaves this whole band of ground bare — the
          same "quiet setup note, never an alarm" treatment the rest of the
          app gives an empty state, drawn small enough not to compete with a
          real plant once one exists. */}
      {plantSlots.length === 0 && (
        <g transform={`translate(200 ${GROUND_Y - 2})`} opacity={0.35}>
          <circle r={3} fill="none" stroke="var(--emerald)" strokeWidth={1} strokeDasharray="2 2" />
        </g>
      )}
      {/* The vegetable crate (round 10) is gone (round 23, 2026-08-27,
          "update only using these elements") — veg-crate.png has no
          equivalent in the master-visual-assets folder. */}
      {/* A leaf, literally next to a real plant (2026-08-24, was a fixed
          spot in the forest band) — anchored to the first plant slot's
          actual (x, y) so the icon marks something real growing there, not
          an arbitrary decorative position. Falls back near the empty-state
          dashed circle when there are no plants yet. */}
      <FeatureIcon kind="leaf" x={(plantSlots[0]?.x ?? 200) - 16} y={(plantSlots[0]?.y ?? GROUND_Y - 2) - 4} scale={0.75} opacity={0.55} />

      {/* Home — the anchor of the village (2026-08-25 enlarge), so it reads
          as the center rather than a district the same size as the rest.
          Body/roof scaled up from the old 60×44 to 84×58, plus a porch
          (roofed overhang + two posts + a step) since a door alone read as
          flat. Windows/chimney logic unchanged, just repositioned for the
          bigger frame. */}
      {(() => {
      // Anchored to pos('home') and a drag handle (round 71) — the Home
      // label was draggable but the house itself stayed pinned at 400, so
      // "moving Home" did nothing visible. Clamped so it can't leave frame.
      const hmp = pos('home')
      const hmx = Math.max(70, Math.min(730, hmp.x))
      const hmy = Math.min(GROUND_Y + 40, Math.max(GROUND_Y - 12, hmp.y))
      return (
      <g transform={`translate(${hmx} ${hmy})`}
        onClick={arranging ? undefined : openOrToggle('home', 'Home')}
        onPointerDown={arranging ? startDrag('home') : undefined}
        style={{ cursor: arranging ? (draggingId === 'home' ? 'grabbing' : 'grab') : 'pointer' }}>
        <title>Home — Smart Home</title>
        {/* Grounding shadow — same BloomScan-style reasoning as PlantShape/
            BuildingShape's own (2026-08-24). */}
        <ellipse cx={0} cy={1.5} rx={37} ry={3.2} fill="var(--text)" opacity={0.12} />
        {/* Swapped to the master-visual-assets folder's own house-lighting-
            states sheet (round 23, 2026-08-27, "update only using these
            elements. delete all old ones") — this is the real
            house-smart-home-states.png content flagged as "genuinely
            missing" back in round 16b, finally found: four real lit/unlit
            crops of the same house, not a synthetic glow ellipse layered
            over a single fixed sprite. cottage-lit.png (windows + door
            warmly lit) swaps in for cottage-dark.png on the same real Smart
            Home occupancy signal that used to just toggle an ellipse.
            313×262 source, ~1.19 aspect. */}
        {/* Smaller round 58 ("make house smaller and other buildings a bit
            bigger") — 107 -> 90 wide, so Home anchors the scene without
            dwarfing the districts. */}
        <image href={`/village-assets/cottage-${cottageGlow ? 'lit' : 'dark'}.png`}
          x={-45} y={-75.3} width={90} height={75.3}
          style={{ imageRendering: 'pixelated' }} />
        {/* Home breathes too now (round 66, "make sure the house also
            animates") — the window glow pulses on village-glow whenever
            it's lit, and a thin curl of chimney smoke always rises (a house
            with someone in it), drifting on village-smoke. */}
        {cottageGlow && <circle cx={-3} cy={-52} r={11} fill="var(--amber)" opacity={0.45} filter="url(#vglow)" className="village-glow" />}
        {/* Movie night — a cool flickering wash from the downstairs window. */}
        {moodActive && activeMood.screenGlow && (
          <rect x={-14} y={-40} width={13} height={10} rx={1.5} fill="#9fc7ff" style={{ mixBlendMode: 'screen' }}>
            <animate attributeName="opacity" values="0.5;0.85;0.4;0.75;0.55" dur="2.6s" repeatCount="indefinite" />
          </rect>
        )}
        {/* A window box of flowers under the upstairs window (round 74) —
            the one small "someone tends this place" detail on the house. */}
        <image href="/village-assets/window-flowerbox.png" x={-10} y={-46} width={14} height={8.4}
          style={{ imageRendering: 'pixelated' }} pointerEvents="none" />
        <g className="village-smoke" opacity={0.16} pointerEvents="none">
          <circle cx={26} cy={-84} r={2.4} fill="var(--text)" />
          <circle cx={28} cy={-92} r={3.2} fill="var(--text)" opacity={0.7} />
          <circle cx={25} cy={-101} r={3.8} fill="var(--text)" opacity={0.45} />
        </g>
        {v.buildings.length + v.plants.length > 6 && (
          <path d="M 24 -67 L 24 -79 L 30 -79 L 30 -67" fill="none" stroke="var(--border)" strokeWidth={2} />
        )}
        {arranging && (
          <rect x={-48} y={-78} width={96} height={82} rx={6} fill="none" stroke="var(--gold)"
            strokeWidth={1} strokeDasharray="3 3" opacity={draggingId === 'home' ? 0.9 : 0.45} />
        )}
      </g>
      ) })()}

      {/* Mailbox, beside Home (2026-08-24) — see MailboxShape's own comment:
          Rest Lake used to be where "jot something down" lived; this is its
          new, smaller home. Draggable too now (round 27) — nav()'s own
          `arranging` guard already no-ops the click while dragging is live,
          so layering Draggable's onPointerDown underneath is safe. */}
      {(() => { const p = decorPos('mailbox'); return (
        <Draggable x={p.x} y={p.y} id="mailbox" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('mailbox')} r={14}>
          <MailboxShape x={0} y={0} onClick={nav('Note', () => {
            window.dispatchEvent(new CustomEvent('app:open-quick-capture'))
          })} />
        </Draggable>
      ) })()}

      {/* The nook prop is gone — References is a proper district now
          (see the DistrictLabel + panelContent.references above). */}

      {/* Bin by the gate — the evening before / morning of collection.
          Arrangeable now (round 80) — decorPos('bins') instead of a fixed
          offset off Home. */}
      {(binLine && (partOfDay === 'evening' || partOfDay === 'morning')) && (() => {
        const p = decorPos('bins')
        return (
          <Draggable x={p.x} y={p.y} id="bins" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('bins')} r={10}>
            <title>{binLine}</title>
            <ellipse cx={0} cy={2} rx={6} ry={1.5} fill="var(--text)" opacity={0.12} />
            <rect x={-5} y={-12} width={10} height={14} rx={1.6} fill="#4e5b45" stroke="#3a4535" strokeWidth={0.6} />
            <rect x={-6} y={-13} width={12} height={2.6} rx={1} fill="#6b7a5e" />
          </Draggable>
        )
      })()}

      {/* Home's own personal objects — the bike, flower pot, laundry basket,
          and bread basket (rounds 9-10) are gone (round 23, 2026-08-27,
          "update only using these elements. delete all old ones") — none of
          those custom-pack sprites have an equivalent in the master-visual-
          assets folder, and leaving mismatched old art in Home's yard
          didn't fit the same standard applied everywhere else this round. */}

      {/* Projects — the log cabin, and a pile of logs for every project
          (round 58; cabin round 60, "use log cabin as projects"). No
          blueprint / foundation / under-construction phases growing into a
          landmark — just log-cabin.png (from village/village-matching-
          expansion-structures-clean, a real cabin with its own woodpile)
          and one firewood.png pile per project: faint while it's underway,
          solid once it's finished. Each pile keeps its click → the project
          callout, so selection still works. */}
      {(() => {
        // Anchored to the Projects district badge (round 61) so the cabin,
        // its logs, and the "Projects" label stay one coherent unit
        // wherever the badge is dragged. Clamped so a badge near the very
        // edge doesn't push the cabin off-canvas.
        // pos('projects') is already clamped to the visible band (see
        // clampDistrict) so the cabin now tracks the badge across that whole
        // range — round 71's "only the hit box moves at the bottom" was the
        // cabin's own tighter clamp (GROUND_Y+90) stopping ~50px short of
        // where the badge could still be dragged. Base sits right on the
        // district anchor (round 68) so the cabin and the label's hit-rect
        // cover the same spot.
        const bp = pos('projects')
        const hx = bp.x, hy = Math.min(356, Math.max(GROUND_Y - 40, bp.y))
        // Eased back round 68 ("make the log house ... a bit smaller") —
        // 88 -> 76.
        const w = 76, h = w / (390 / 293)
        const openProjects = () => { if (!arranging) openOrToggle('projects', 'Projects')() }
        return (
          <>
            {/* The whole cabin is a drag handle for the Projects district
                (round 71 — "the log house can't be moved, only the hit box
                moves at the bottom"). Same startDrag('projects') the label
                uses, so grabbing the cabin OR the label moves the district
                and the cabin re-anchors to it live. A tap (not arranging)
                still opens Projects. */}
            <g onClick={arranging ? undefined : openProjects}
              onPointerDown={arranging ? startDrag('projects') : undefined}
              style={{ cursor: arranging ? (draggingId === 'projects' ? 'grabbing' : 'grab') : 'pointer' }}>
              <ellipse cx={hx} cy={hy + 2} rx={w / 2} ry={3.2} fill="var(--text)" opacity={0.16} />
              <rect x={hx - w / 2 - 2} y={hy - h - 2} width={w + 4} height={h + 26} fill="transparent" style={{ pointerEvents: 'all' }} />
              <image href="/village-assets/log-cabin.png" x={hx - w / 2} y={hy - h} width={w} height={h}
                style={{ imageRendering: 'pixelated' }} />
              {warm && <circle cx={hx - 4} cy={hy - h * 0.55} r={10} fill="var(--amber)" opacity={0.28} filter="url(#vglow)" className="village-glow" />}
              {arranging && (
                <rect x={hx - w / 2 - 3} y={hy - h - 3} width={w + 6} height={h + 8} rx={5}
                  fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                  opacity={draggingId === 'projects' ? 0.9 : 0.45} />
              )}
            </g>
            {buildingSlots.map(({ building }, i) => {
              const done = building.phase === 'complete' || building.phase === 'landmark'
              const lx = hx + w / 2 - 2 + (i % 4) * 14 + Math.floor(i / 4) * 6
              const ly = hy + 6 + Math.floor(i / 4) * 12
              const bw = done ? 13 : 10, bh = bw * (160 / 255)
              return (
                <g key={building.id} opacity={done ? 1 : 0.45} className={landmarked.has(building.id) ? 'village-changed' : undefined}>
                  <image href="/village-assets/firewood.png" x={lx - bw / 2} y={ly - bh} width={bw} height={bh}
                    style={{ imageRendering: 'pixelated', cursor: 'pointer' }}
                    onClick={selectBuilding(building.id, lx, ly)} />
                  <title>{`${building.title} — ${done ? 'finished' : 'in progress'}`}</title>
                </g>
              )
            })}
          </>
        )
      })()}

      {/* The hand-drawn crane and blueprint sheet (2026-08-25) that used to
          stand in for Projects' identity are gone (round 14, 2026-08-27,
          "remove all old out of style elements") — redundant now that the
          district has a real workshop.png building (round 11) a few units
          away; keeping both was two different art styles competing for the
          same "this is a workshop" job. */}

      {/* People identity (2026-08-25) — a second bench angled toward the
          one already scattered near this district (see PROPS.benches
          above), so People reads as a social corner rather than the same
          tile language as everywhere else. The hand-drawn "letter" prop
          that used to sit beside it is gone (round 14) — real tea-set/
          picnic-blanket sprites already cover this corner's identity. */}
      <g transform={`translate(${decorPos('peopleCorner').x} ${decorPos('peopleCorner').y})`} opacity={0.75}
        onPointerDown={startDrag('peopleCorner')} style={{ cursor: arranging ? (draggingId === 'peopleCorner' ? 'grabbing' : 'grab') : undefined }}>
        <title>A quiet corner to sit and talk</title>
        <BenchShape x={0} y={0} />
      </g>

      {/* The tea set and porch swing (round 10) are gone (round 23,
          2026-08-27, "update only using these elements") — tea-set.png and
          swing.png have no equivalent in the master-visual-assets folder;
          People's own bench (BenchShape above) still carries the gathering-
          spot identity on its own. */}

      {/* The hand-drawn luggage stack (2026-08-25) is gone (round 14,
          2026-08-27) — Places now has a real shop.png building (round 11)
          and a real bus-stop.png (round 12); a hand-drawn suitcase next to
          both read as a leftover from before either existed. The blank
          signpost (round 10) is gone too (round 23) — blank-sign.png has no
          equivalent in the master folder either. */}

      {/* Archive Grove — a small wild patch beside the Archive greenhouse.
          Round 62 removed the big Life Tree here; round 64 ("fix cut down
          tree") removes what was left — flat concentric ground rings that
          read exactly like a fresh tree stump. In its place: a couple of
          bushes and a strip of wildflowers, so the corner reads as a quiet
          overgrown grove rather than a clearing where something was felled.
          The account-age still lives in the district badge count and in
          VillageText; the <title> keeps it for screen readers. */}
      <g transform={`translate(725 ${GROUND_Y + 2})`}
        className={!arranging ? 'village-entity' : undefined}
        style={{ cursor: !arranging ? 'pointer' : undefined }}
        onClick={arranging ? undefined : e => {
          e.stopPropagation()
          if (locked) { onLockedNavigate?.('Archive'); return }
          setSelected(s => (s?.type === 'grove' ? null : { type: 'grove', id: 'grove' }))
        }}>
        <title>{
          v.treeRings > 0
            ? `Archive Grove, ${v.treeRings} year${v.treeRings === 1 ? '' : 's'} of growth`
            : `Archive Grove, ${v.accountMonths} month${v.accountMonths === 1 ? '' : 's'} of growth`
        }</title>
        <g opacity={0.9}>
          <image href="/village-assets/wildflower-strip.png" x={-24} y={-9} width={44} height={44 * (341 / 512)}
            style={{ imageRendering: 'pixelated' }} />
          <image href="/village-assets/bush-mound.png" x={-30} y={-13} width={18} height={18 * (129 / 218)}
            style={{ imageRendering: 'pixelated' }} />
          <image href="/village-assets/flowering-bush.png" x={12} y={-15} width={17} height={17 * (209 / 276)}
            style={{ imageRendering: 'pixelated' }} />
        </g>
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

      {/* The things that move. Above the scenery so smoke reads as being in
          front of the house, below the labels so it never fights the text. */}
      {live && <Ambient village={v} palette={palette} groundY={GROUND_Y} weatherCondition={weather?.condition} warm={gathering} />}

      {/* Party warmth — a warm wash over the whole scene while hosting after
          dark, so it reads as a lit-up evening, not a cold night with one
          window on. Soft-light keeps it a tint, not a fog. */}
      {gathering && (dark || v.timeOfDay === 'dusk') && (
        <rect x={0} y={0} width={800} height={440} fill="url(#vparty)" opacity={0.55}
          pointerEvents="none" style={{ mixBlendMode: 'soft-light', transition: 'opacity 1200ms ease' }} />
      )}

      {/* Scene-mood dimmer — a cool wash for Movie / We're out / a custom
          scene, eased in over ~1.2s so it never snaps. Below the labels so
          navigation stays readable. Goodnight leans on the real night sky
          instead (v.timeOfDay forced above) plus a gentler wash. */}
      {moodActive && activeMood.dim > 0 && (
        <rect x={0} y={0} width={800} height={440} fill="#0b1533" opacity={activeMood.dim}
          pointerEvents="none" style={{ transition: 'opacity 1200ms ease' }} />
      )}

      {/* Click-to-care sparkles — see careFor() above. Self-removing via its
          own setTimeout, so this array is only ever non-empty for ~650ms. */}
      {sparkles.map((s, i) => {
        const angle = (i / 5) * Math.PI * 2 + (i * 0.7)
        const dist = 18 + (i % 3) * 6
        return (
          <circle key={s.id} cx={s.x} cy={s.y} r={2} fill="var(--gold)" className="village-sparkle"
            style={{ '--sx': `${Math.cos(angle) * dist}px`, '--sy': `${Math.sin(angle) * dist - 10}px` } as React.CSSProperties}
            pointerEvents="none" />
        )
      })}

      {/* District labels — the actual navigation. Icons are real silhouettes
          of what's actually in each district (a leaf for the forest, a
          building for projects, a book for the archive next to its own tree
          — see shapes.tsx's DistrictIcon) rather than the app's abstract
          nav glyph set (HomeBar), which shares no visual logic with the
          scene around it. Positions come from pos(id) — layout[id] if it's been
          dragged, otherwise the same defaults as always.

          Rest Lake removed 2026-08-24 (was here through 2026-08-24 morning:
          the lake ellipse/reflection/fish, and a "Rest Lake" district
          opening the Brief + focusing the capture box). stillness/
          reflectionDays stay computed in lib/village/state.ts — nothing else
          in the data model depended on the lake being drawn — in case a
          future district wants that number again. */}
      {/* A worn patch of ground under whichever landmark you actually visit
          most (2026-08-24) — see wornPath above. Drawn before the labels so
          it reads as ground, not as a badge on the tile. */}
      {wornPath && (
        <ellipse cx={pos(wornPath as LandmarkId).x} cy={pos(wornPath as LandmarkId).y + 34} rx={24} ry={6}
          fill="var(--gold)" opacity={0.1} pointerEvents="none" />
      )}

      {/* District captions read as words now, not counters (2026-08-25) —
          "kill the numbers first" per the Village vision doc's own success
          test ("if all labels and numbers disappeared, would I still
          understand this place?"). No raw digit ever leads these strings
          any more, which also quietly disables DistrictLabel's red
          notification-badge circle (it only triggers on a leading digit) —
          removing the badge and rewording the caption were the same fix. */}
      <DistrictLabel quiet={hosting} {...pos('forest')} icon="leaf" label="Growth Garden" onClick={openOrToggle('forest', 'Growth Garden')} {...hoverPreview('forest')} dark={dark} scale={1.12}
        count={v.plants.length === 0 ? 'waiting to be planted' : growingCount === 0 ? 'resting' : restingCount > 0 ? 'growing and resting' : 'growing quietly'}
        draggable={arranging} dragging={draggingId === 'forest'} onPointerDown={startDrag('forest')} selected={openPanel === 'forest'} />
      {/* "Living painting" sunset beat (round 50, 2026-08-28, "shadows
          stretch") — a real animated stretch would need shadow geometry this
          scene doesn't have; this is the confirmed cheap version instead, a
          fixed longer shadow shown only during dusk, drawn under Home before
          its own badge so it reads as ground, not a UI element. */}
      {v.timeOfDay === 'dusk' && (
        <ellipse cx={pos('home').x + 10} cy={pos('home').y + 4} rx={38} ry={5} fill="var(--text)" opacity={0.1} />
      )}
      {/* Home was 1.25x the rest (2026-08-27, "this is where you live");
          round 49 brought it to the standard 1x ("make house smaller"), and
          this round (50, "make all items a bit bigger and house smaller...
          make scaling make sense but nothing too big or small") goes a step
          further in both directions at once — Home down to 0.85x, the other
          five districts up to 1.12x — so Home reads clearly smaller than its
          neighbors rather than merely equal to them, without either extreme
          shrinking to illegible or ballooning back into dominating the
          scene. */}
      <DistrictLabel quiet={hosting} {...pos('home')} icon="home" label="Home" onClick={openOrToggle('home', 'Home')} {...hoverPreview('home')} count="today" dark={dark} scale={0.85}
        draggable={arranging} dragging={draggingId === 'home'} onPointerDown={startDrag('home')} selected={openPanel === 'home'} />
      {hosting && !arranging && (
        <HouseInfo x={pos('home').x + 46} y={pos('home').y + 6} info={guestInfo} />
      )}
      <DistrictLabel quiet={hosting} {...pos('projects')} icon="building" label="Projects" onClick={openOrToggle('projects', 'Projects')} {...hoverPreview('projects')} dark={dark} scale={1.12}
        count={v.buildings.length === 0 ? 'quiet for now' : underwayCount === 0 ? 'all standing' : 'under construction'}
        draggable={arranging} dragging={draggingId === 'projects'} onPointerDown={startDrag('projects')} selected={openPanel === 'projects'} />
      <DistrictLabel quiet={hosting} {...pos('archive')} icon="book" label="Archive" onClick={openOrToggle('archive', 'Archive')} {...hoverPreview('archive')} dark={dark} scale={1.12}
        count={v.treeRings > 0 ? `${spellCount(v.treeRings)} year${v.treeRings === 1 ? '' : 's'} kept` : 'its first year'}
        draggable={arranging} dragging={draggingId === 'archive'} onPointerDown={startDrag('archive')} selected={openPanel === 'archive'} />
      <DistrictLabel quiet={hosting} {...pos('references')} icon="shelf" label="References" onClick={openOrToggle('references', 'References')} {...hoverPreview('references')} dark={dark} scale={1.12}
        draggable={arranging} dragging={draggingId === 'references'} onPointerDown={startDrag('references')} selected={openPanel === 'references'} />
      {/* Places and People (2026-08-24) — the same real-district mechanism
          as the five above, extended to the two other things 4S already
          tracks that had no presence in the village at all: your saved pins
          and the people in your life. Counts come straight from
          usePlaces()/usePeople() in Village.tsx, no new data model. */}
      <DistrictLabel quiet={hosting} {...pos('places')} icon="places" label="Places" onClick={openOrToggle('places', 'Places')} {...hoverPreview('places')} dark={dark} scale={1.12}
        count={placesCount === 0 ? 'no pins yet' : 'the map is growing'}
        draggable={arranging} dragging={draggingId === 'places'} onPointerDown={startDrag('places')} selected={openPanel === 'places'} />
      <DistrictLabel quiet={hosting} {...pos('people')} icon="people" label="People" onClick={openOrToggle('people', 'People')} {...hoverPreview('people')} dark={dark} scale={1.12}
        count={soonestBirthdayDays != null ? (soonestBirthdayDays === 0 ? 'birthday today' : `birthday in ${spellCount(soonestBirthdayDays)} day${soonestBirthdayDays === 1 ? '' : 's'}`) : peopleCount === 0 ? 'no one yet' : 'your people'}
        draggable={arranging} dragging={draggingId === 'people'} onPointerDown={startDrag('people')} selected={openPanel === 'people'} />
      {/* Birthday bunting (2026-08-24) — only on the actual day, over the
          People district's current position. */}
      {soonestBirthdayDays === 0 && <BuntingShape x={pos('people').x} y={pos('people').y} />}
      {/* Guest Mode bunting (2026-08-29) — a string over Home while the
          village is open to guests, so the place reads as "we're hosting". */}
      {gathering && <BuntingShape x={pos('home').x} y={pos('home').y - 4} />}

      {/* ── Guest Layer (Phase 2, 2026-08-29) ────────────────────────────
          The physical objects that carry the gathering: a welcome sign with
          the live QR, the guestbook, the record player, the dinner table.
          Then every visible guest contribution scattered near the object it
          belongs to — a flower by the well for a thank-you, a record by the
          player for a song, a folded note drifting near Home. Positions are
          deterministic per contribution id (hashPos), never stored, so this
          whole layer is a pure function of `contributions` and needs no host
          arrange step. Kept dimly present for a beat after a gathering ends
          would be nice; for now it's strictly gathering-gated. */}
      {gathering && (() => {
        const clampX = (x: number) => Math.max(24, Math.min(776, x))
        const home = pos('home'), well = decorPos('wishingWell'), gaz = decorPos('gazebo')
        const signX = clampX(home.x - 66), signY = GROUND_Y + 34
        const bookX = clampX(well.x + 30), bookY = well.y + 2
        const juke = { x: clampX(gaz.x - 34), y: gaz.y + 8 }
        const booth = { x: clampX(gaz.x + 24), y: gaz.y - 4 }
        const table = decorPos('dinnerTable')
        const openAlbum = guestAlbumUrl && !arranging ? () => window.open(guestAlbumUrl, '_blank', 'noopener') : undefined
        const visible = contributions.filter(c => c.status === 'visible')
        const near = (k: string) => visible.filter(c => c.kind === k)
        const scatter = (id: string, cx: number, cy: number, sx: number, sy: number) => ({
          x: clampX(cx + (hashPos(id + 'gx') - 0.5) * sx),
          y: cy + (hashPos(id + 'gy') - 0.5) * sy,
        })
        return (
          <g>
            {/* Dinner table — the gathering's centre, set with a cake + mugs.
                Arrangeable (round 80) via decorPos('dinnerTable'). */}
            <Draggable x={table.x} y={table.y} id="dinnerTable" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('dinnerTable')} r={16}>
              <title>The table is set</title>
              <ellipse cx={0} cy={2} rx={16} ry={3.4} fill="var(--text)" opacity={0.16} />
              <image href="/village-assets/cake-table.png" x={-15} y={-21.5} width={30} height={21.2}
                style={{ imageRendering: 'pixelated' }} />
            </Draggable>

            {/* Menu board — a little standing chalkboard by the table when
                the hosts have set a menu (2026-09-03). Passive, no tap.
                Own arrangeable position (round 80) rather than derived from
                the table, so the whole cluster can be spread out. */}
            {menu.length > 0 && (() => {
              const items = menu.filter(m => m.name.trim()).slice(0, 4)
              if (!items.length) return null
              const mb = decorPos('menuBoard')
              const h = 12 + items.length * 6
              return (
                <Draggable x={mb.x} y={mb.y} id="menuBoard" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('menuBoard')} r={14}>
                  <title>{`On the menu: ${items.map(m => m.name).join(', ')}`}</title>
                  <rect x={-1} y={0} width={2} height={16} rx={0.8} fill="#8a6f52" />
                  <rect x={-15} y={-h} width={30} height={h} rx={2} fill="#3a4038" stroke="var(--border)" strokeWidth={0.6} />
                  <text x={0} y={-h + 6} textAnchor="middle" fontSize={4} fill="#e8e0cf" fontFamily="var(--font-body)">Tonight</text>
                  {items.map((m, i) => (
                    <text key={m.id} x={0} y={-h + 12 + i * 6} textAnchor="middle" fontSize={3.6} fill="#cfc7b4" fontFamily="var(--font-body)">
                      {m.name.length > 16 ? m.name.slice(0, 15) + '…' : m.name}
                    </text>
                  ))}
                </Draggable>
              )
            })()}

            {/* Party decor (round 75; round 80 2026-09-03 — bolder, and a
                string of warm lights over the path so the "people are here"
                read carries at a glance). Static, not interactive. */}
            <g transform={`translate(${table.x} ${table.y - 32})`} opacity={0.95} pointerEvents="none">
              <image href="/village-assets/flower-garland.png" x={-24} y={0} width={48} height={48 * (107 / 272)}
                style={{ imageRendering: 'pixelated' }} />
            </g>
            {/* String lights — a drooping swag between the welcome sign and
                the cottage, warm bulbs that glow after dark. */}
            {(() => {
              const x0 = signX + 6, x1 = home.x - 20, y0 = signY - 30, y1 = pos('home').y - 22
              const bulbs = 7
              return (
                <g pointerEvents="none">
                  <path d={`M ${x0} ${y0} Q ${(x0 + x1) / 2} ${Math.max(y0, y1) + 14} ${x1} ${y1}`}
                    fill="none" stroke="#6b5a44" strokeWidth={0.8} />
                  {Array.from({ length: bulbs }).map((_, i) => {
                    const t = (i + 1) / (bulbs + 1)
                    const bx = x0 + (x1 - x0) * t
                    const by = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * 14
                    return (
                      <circle key={i} cx={bx} cy={by + 2} r={warm ? 1.7 : 1.2}
                        fill="var(--amber)" opacity={warm ? 0.95 : 0.5}
                        filter={warm ? 'url(#vglow)' : undefined}
                        className={warm ? 'village-glow' : undefined} />
                    )
                  })}
                </g>
              )
            })()}
            {(() => { const p = decorPos('balloonsA'); return (
              <Draggable x={p.x} y={p.y} id="balloonsA" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('balloonsA')} r={12}>
                <image href="/village-assets/balloons.png" x={-10} y={-42} width={20} height={20 * (175 / 128)}
                  style={{ imageRendering: 'pixelated' }} className="village-mote village-mote-2" />
              </Draggable>
            ) })()}
            {(() => { const p = decorPos('balloonsB'); return (
              <Draggable x={p.x} y={p.y} id="balloonsB" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('balloonsB')} r={10}>
                <image href="/village-assets/balloons.png" x={-8} y={-34} width={16} height={16 * (175 / 128)}
                  style={{ imageRendering: 'pixelated' }} className="village-mote village-mote-4" />
              </Draggable>
            ) })()}
            {[[home.x - 26, GROUND_Y + 40], [home.x + 32, GROUND_Y + 46]].map(([gx, gy], i) => (
              <g key={i} transform={`translate(${clampX(gx)} ${gy})`} pointerEvents="none">
                <image href="/village-assets/gift-box.png" x={-5.5} y={-11} width={11} height={11}
                  style={{ imageRendering: 'pixelated' }} />
              </g>
            ))}

            {/* Photo booth — tapping opens the shared album */}
            <g transform={`translate(${booth.x} ${booth.y})`}
              onClick={openAlbum}
              className={openAlbum ? 'village-entity' : undefined}
              style={{ cursor: openAlbum ? 'pointer' : undefined }}>
              <title>{guestAlbumUrl ? 'Photo booth — open the album' : 'Photo booth'}</title>
              <ellipse cx={0} cy={1} rx={9} ry={2.4} fill="var(--text)" opacity={0.15} />
              <image href="/village-assets/photo-booth.png" x={-9} y={-27} width={18} height={27.3}
                style={{ imageRendering: 'pixelated' }} />
              {near('photo').length > 0 && (
                <image href="/village-assets/polaroid-stack.png" x={6} y={-6} width={9} height={9}
                  style={{ imageRendering: 'pixelated' }} />
              )}
            </g>

            {/* Welcome sign — just the sign now; the QR lives on its own
                easel to the left (2026-09-03, was a tiny unreadable overlay
                here plus a huge floating one that collided with everything). */}
            <g transform={`translate(${signX} ${signY})`}>
              <title>Welcome</title>
              <ellipse cx={0} cy={1} rx={11} ry={2.4} fill="var(--text)" opacity={0.15} />
              <image href="/village-assets/welcome-sign.png" x={-13} y={-26} width={26} height={26.6}
                style={{ imageRendering: 'pixelated' }} />
            </g>

            {/* The join QR lives in the sky panel now (GatheringSkyBox),
                not on a sign in the scene. */}

            {/* Guestbook — a page or two thicker for every signature */}
            <g transform={`translate(${bookX} ${bookY})`}>
              <title>{`The guestbook — ${spellCount(near('guestbook').length)} ${near('guestbook').length === 1 ? 'signature' : 'signatures'}`}</title>
              <ellipse cx={0} cy={1} rx={12} ry={2.6} fill="var(--text)" opacity={0.15} />
              <image href="/village-assets/guestbook-open.png" x={-12} y={-16} width={24} height={16.3}
                style={{ imageRendering: 'pixelated' }} />
              {near('guestbook').slice(0, 6).map((c, i) => (
                <rect key={c.id} x={-9 + i * 0.5} y={-3 - i * 0.7} width={18} height={1.4} rx={0.5}
                  fill="#f3ead5" stroke="var(--border)" strokeWidth={0.2} opacity={0.9} />
              ))}
            </g>

            {/* Record player + a record per song */}
            <g transform={`translate(${juke.x} ${juke.y})`}>
              <title>The record player</title>
              <ellipse cx={0} cy={1} rx={11} ry={2.6} fill="var(--text)" opacity={0.15} />
              <image href="/village-assets/jukebox.png" x={-10.5} y={-20} width={21} height={19.8}
                style={{ imageRendering: 'pixelated' }} />
            </g>
            {near('song').slice(0, 8).map((c, i) => {
              const p = scatter(c.id, juke.x + 14, juke.y - 1, 16, 7)
              return (
                <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={'village-entity' + contribPulse(c.id)}>
                  <title>{`${c.guest_name || 'A guest'} added: ${(c.meta.title as string) || c.body || 'a song'}`}</title>
                  <image href={`/village-assets/record-${(i % 3) + 1}.png`} x={-3} y={-6} width={6} height={6}
                    style={{ imageRendering: 'pixelated' }} />
                </g>
              )
            })}

            {/* Thank-yous — a little vase of flowers gathering by the well */}
            {near('thank_you').slice(0, 10).map(c => {
              const p = scatter(c.id, well.x, well.y + 8, 28, 8)
              return (
                <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={'village-entity' + contribPulse(c.id)}>
                  <title>{`${c.guest_name || 'A guest'}: ${c.body || 'thank you'}`}</title>
                  <image href="/village-assets/thankyou-vase.png" x={-3.5} y={-13} width={7} height={13}
                    style={{ imageRendering: 'pixelated' }} />
                </g>
              )
            })}

            {/* Notes — folded papers drifting in Home's yard */}
            {near('note').slice(0, 8).map(c => {
              const p = scatter(c.id, home.x + 44, GROUND_Y + 46, 40, 14)
              return (
                <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={'village-glow' + contribPulse(c.id)}>
                  <title>{`${c.guest_name || 'A guest'}: ${c.body || ''}`}</title>
                  <rect x={-3} y={-4} width={6} height={5} rx={0.6} fill="#fbf3df" stroke="var(--border)" strokeWidth={0.3}
                    transform={`rotate(${(hashPos(c.id + 'r') - 0.5) * 24})`} />
                </g>
              )
            })}

            {/* Fridge notes — magnets on a board near Home */}
            {near('fridge').map(c => {
              const p = scatter(c.id, home.x - 34, GROUND_Y + 12, 22, 16)
              return (
                <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={contribPulse(c.id).trim() || undefined}>
                  <title>{`${c.guest_name || 'A guest'} put up: ${c.body || ''}`}</title>
                  <rect x={-3.4} y={-4.2} width={6.8} height={5.6} rx={0.6} fill="#fdf6e6" stroke="var(--border)" strokeWidth={0.3} />
                  <text x={0} y={0.6} textAnchor="middle" fontSize={3.4}>{(c.meta.icon as string) || '❤️'}</text>
                </g>
              )
            })}

            {/* Where guests are from — a tight cluster of pins just below the
                horizon behind the cottage (was a 520-wide smear edge to edge). */}
            {near('from').slice(0, 10).map(c => {
              const p = scatter(c.id, home.x, GROUND_Y - 6, 150, 7)
              return (
                <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={'village-entity' + contribPulse(c.id)}>
                  <title>{`${c.guest_name || 'A guest'} — from ${(c.meta.place as string) || c.body || 'somewhere'}`}</title>
                  <path d="M 0 0 C -2.4 -4 -2.4 -6.4 0 -8 C 2.4 -6.4 2.4 -4 0 0 Z" fill="var(--blush)" stroke="var(--surface)" strokeWidth={0.4} />
                  <circle cy={-5} r={1} fill="var(--surface)" />
                </g>
              )
            })}
          </g>
        )
      })()}

      {/* The cast (2026-08-25) — replaces the old per-contact PersonMarker
          dots with the three actual, always-present characters, standing in
          Home's yard. See VillagerShape/CatShape's own header comment for
          why this is a deliberate exception to the district icons' "objects,
          not figures" rule. A slow, staggered idle bob (village-bob, see
          globals.css) is the one bit of "tiny people walking" life this
          scene gets — full movement/pathing is out of scope for now.
          Drawn AFTER every district label now too (2026-08-27 fix, was only
          after plants/buildings) — Sylvia (372, GROUND_Y+8) and Harry (428,
          GROUND_Y+8) both genuinely overlap the Home tile's own 44×56
          invisible hit-rect (pos('home') = 400, 250) in a real corner
          region, and Home was painted AFTER the cast, so it silently won
          that overlap — a tap meant for Sylvia or Harry could land on the
          Home tile instead ("glitchy, hard to select the figures"), same
          root cause the plants/buildings fix above already solved for a
          different pair of neighbors. Being last in the whole scene now
          means the cast always wins any future overlap too, not just this
          one measured case. */}
      {/* scale dropped from 1.7 to 1 (round 9, 2026-08-27) — that 1.7x was
          tuned for the old hand-drawn figures' much smaller ~12×21 base
          size; VillagerShape's new sprite-based rendering already targets a
          sensible height (30 units) on its own, so the old multiplier would
          now make the cast nearly as tall as the house. The idle bob
          (village-bob) is gone (round 24, 2026-08-27, "do not make
          anything bob") — the cast stands still now. Draggable too, as of
          round 27 ("make everything moveable") — the click handlers below
          only fire outside arrange mode (openFigureOrToggle/openSomi both
          bail on `arranging`), so wrapping in Draggable is safe. */}
      {/* Sylvia/Harry live their day here (round 53, 2026-08-28) — useCoupleLife
          drives an absolute target position + pose + facing for each. The
          inner <g> glides there with a CSS transition sized to the walk
          distance; the walk sprite plays while it moves. During a meeting
          `coupleTogether` swaps both individuals out for the one interaction
          pose (a different one each time), placed where they actually met.
          Still off entirely during arrange (Draggable wants a static target)
          and quiet/night (the bench / sleepwear block below takes over). */}
      <g>
        {!arranging && !settledNight && !sceneHidesFigures && (
          <g
            style={{ visibility: coupleTogether ? undefined : 'hidden', cursor: hostPing && gathering ? 'pointer' : undefined }}
            onClick={hostPing && gathering ? () => setPingOpen('sylvia') : undefined}
          >
            {/* One idle vignette in three is the week's context pose (gardening
                / reading) when there is one — no new timer, it rides the
                existing interactPose cycle. Never during a gathering or a
                smart-home scene (those own the figures). */}
            {activeContext && !gathering && !moodActive && (contextPreview != null || interactPose % 3 === 0)
              ? <CoupleContext x={life.interactAt.x} y={life.interactAt.y} activity={activeContext} />
              : <CoupleInteraction x={life.interactAt.x} y={life.interactAt.y} poseIndex={interactPose} outfit={outfit} />}
          </g>
        )}
        <g style={{ visibility: coupleTogether ? 'hidden' : undefined }}>
        {(() => { const p = decorPos('sylvia'); const active = !arranging && !settledNight && !sceneHidesFigures; return (
          <Draggable x={p.x} y={p.y} id="sylvia" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('sylvia')} r={17}>
            {!(settledNight && !arranging) && !sceneHidesFigures && (
              <g style={active ? { transform: `translate(${life.sylvia.x - p.x}px, ${life.sylvia.y - p.y}px)`, transition: `transform ${life.sylvia.dur}ms ease-in-out` } : undefined}>
                <VillagerShape x={0} y={0} name="Sylvia"
                  onClick={() => { if (arranging) return; if (hostPing && gathering) { setPingOpen('sylvia'); return } life.greet('sylvia'); if (locked) openFigureOrToggle('sylvia')() }}
                  wander={active} pose={life.sylvia.pose} face={life.sylvia.face} outfit={outfit} scale={itemScale('sylvia')} />
              </g>
            )}
            <ResizeControls id="sylvia" storeX={p.x} storeY={p.y} renderX={0} renderY={-32} />
          </Draggable>
        ) })()}
        {(() => { const p = decorPos('harry'); const active = !arranging && !settledNight && !sceneHidesFigures; return (
          <Draggable x={p.x} y={p.y} id="harry" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('harry')} r={17}>
            {!(settledNight && !arranging) && !sceneHidesFigures && !(soloFigure && !arranging) && (
              <g style={active ? { transform: `translate(${life.harry.x - p.x}px, ${life.harry.y - p.y}px)`, transition: `transform ${life.harry.dur}ms ease-in-out` } : undefined}>
                <VillagerShape x={0} y={0} name="Harry"
                  onClick={() => { if (arranging) return; if (hostPing && gathering) { setPingOpen('harry'); return } life.greet('harry'); if (locked) openFigureOrToggle('harry')() }}
                  wander={active} pose={life.harry.pose} face={life.harry.face} outfit={outfit} scale={itemScale('harry')} />
              </g>
            )}
            <ResizeControls id="harry" storeX={p.x} storeY={p.y} renderX={0} renderY={-32} />
          </Draggable>
        ) })()}
        </g>
      </g>
      {/* quiet/bench mode: the couple-cycle subtree above is empty (both its
          conditions are false), and this renders instead — an outright
          swap, not an opacity gate, so there's no shared-timeline risk to
          manage here at all. */}
      {/* Real night, no scene — the couple are already asleep in sleepwear
          near Home (dusk keeps the reading bench). A Goodnight/Movie/Party
          scene isn't `settledNight`: it walks them to a spot and holds them
          there in a pose via useCoupleLife's `hold`, drawn by the
          couple-cycle block above. */}
      {!arranging && settledNight && !sceneHidesFigures && (() => {
        const sp = decorPos('sylvia'), hp = decorPos('harry')
        if (nightish) return (
          <>
            <SleepwearFigure src="/village-assets/sylvia-pajama.png" aspect={144 / 289} x={sp.x} y={sp.y} />
            <SleepwearFigure src="/village-assets/harry-pajama.png" aspect={149 / 281} x={hp.x} y={hp.y} />
          </>
        )
        const midX = (sp.x + hp.x) / 2, midY = (sp.y + hp.y) / 2
        return <CoupleBenchShape x={midX} y={midY} />
      })()}
      {/* Moved next to Sylvia and shrunk (round 26, 2026-08-27, "put somi
          next to sylvia and make smaller") — was at (480, GROUND_Y+30,
          scale 1), clear of the Mailbox/Harry per the 2026-08-25 fix noted
          above but off on her own past Harry rather than with the family.
          x=345 sits ~27 units left of Sylvia (372) — clear of Sylvia's own
          hit-circle (r≈19) and Somi's own (r≈14 at this smaller scale)
          combined (~33 with a small margin). y dropped to GROUND_Y+20, well
          below PROPS.fences' first run (x 336-364, y GROUND_Y+1..+6) at the
          same x — Somi reads as standing in front of it, not through it. */}
      {(() => {
        const p = decorPos('somi')
        // We're out — Somi stays behind, sitting by the front door.
        if (sceneHidesFigures && !arranging) {
          const h = pos('home')
          return <CatShape x={h.x + 22} y={h.y + 6} scale={0.7 * itemScale('somi')} name="Somi" wander={false} pose="idle" face={-1} />
        }
        const active = !arranging && !settledNight && holdTarget == null
        // Curled asleep for real night AND for a Movie / Goodnight hold.
        const catSleeps = (nightish || (holdTarget != null && activeMood.kind !== 'party')) && !arranging && !gathering
        return (
        <Draggable x={p.x} y={p.y} id="somi" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('somi')} r={13}>
          <g style={active ? { transform: `translate(${somiLife.x - p.x}px, ${somiLife.y - p.y}px)`, transition: `transform ${somiLife.dur}ms ease-in-out` } : undefined}>
            {/* A quiet, constant glow so she reads as "the thing you can
                tap" without competing with the lanterns/windows for
                attention after dark (round 80, 2026-09-04). */}
            {!catSleeps && <circle cy={-8} r={11} fill="var(--amber)" opacity={0.16} filter="url(#vglow)" />}
            <CatShape x={0} y={0} scale={0.88 * itemScale('somi')} name="Somi"
              onClick={() => { if (arranging) return; reactFigure('somi'); somiLife.walkTo(p.x + 18, GROUND_Y + 68); openSomi() }}
              wander={active} pose={reactingId === 'somi' && somiLife.pose === 'idle' ? 'react' : somiLife.pose} face={somiLife.face} sleeping={catSleeps} />
          </g>
          <ResizeControls id="somi" storeX={p.x} storeY={p.y} renderX={0} renderY={-22} />
        </Draggable>
      ) })()}

      {/* Signpost toward Trips (2026-08-24) — Places' own Trips sub-tab has
          no district of its own; this points off-canvas at the village
          edge instead of inventing an eighth district. Draggable too now
          (round 27), same reasoning as the Mailbox above. */}
      {tripCount > 0 && (() => { const p = decorPos('signpost'); return (
        <Draggable x={p.x} y={p.y} id="signpost" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('signpost')} r={16}>
          <SignpostShape x={0} y={0} label={`${tripCount} upcoming trip${tripCount === 1 ? '' : 's'}`}
            onClick={nav('Trips', () => goToSection('places'), false)} />
        </Draggable>
      ) })()}

      {/* The near foreground (2026-08-27, round 6) — see FOREGROUND's own
          comment: everything above lives in one thin band (y 170..250ish),
          leaving the bottom ~43% of the canvas bare gradient ("too much
          empty space," a complaint that survived four rounds of adding
          detail because every round added it to that same band). Drawn
          LAST — after the districts and cast, so nearer scenery correctly
          overlaps the middle distance the way a real foreground would —
          and sorted back-to-front by its own depth so a far, small bush
          never paints over a near, large one out of order. Same night
          dimming filter as the rest of the ground layers, for the same
          reason: unfiltered, it would sit brighter than everything behind
          it after dark, the opposite of "nearer, in shadow." */}
      {/* Real sprites, round 12 (2026-08-27) — BushShape/WildflowerShape/
          GrassClumpShape (flat hand-drawn SVG) replaced with the user's
          own bush-mound/flowering-bush/tall-grass art, the same "remove
          old elements that don't fit anymore" direction applied to the
          scattered ground layer, not just the named props. Depth still
          drives size (f.scale, unchanged) and now opacity too, standing in
          for the old per-tone darkening (a fixed-color sprite can't be
          retinted the way a fill color could) — nearer items stay fuller,
          farther ones fade slightly toward the ground plane. Not made
          individually draggable (see DECOR_DEFAULTS' own comment) — 62
          procedurally-scattered items is texture, not something anyone
          wants to hand-place one at a time. */}
      <g pointerEvents="none" style={dark ? { filter: 'brightness(0.55) saturate(0.82)' } : undefined}>
        {FOREGROUND.map(f => {
          const spec = f.kind === 'bush' ? { href: 'bush-mound.png', w: 13.6, h: 8 }
            : f.kind === 'flower' ? { href: 'flowering-bush.png', w: 10.6, h: 8 }
            : { href: 'tall-grass.png', w: 8.5, h: 8 }
          const w = spec.w * f.scale, h = spec.h * f.scale
          // Round 64 ("add ... subtle animations") — the flowering bushes
          // and grass tufts get the same gentle lean as Growth Garden's
          // flowers, each on its own hashPos-seeded delay/duration so the
          // whole meadow ripples very slightly rather than in lockstep.
          // Bushes stay still — a swaying shrub reads as wind damage, not
          // calm.
          const sways = f.kind !== 'bush'
          const dur = 4 + hashPos(f.id + 'sd') * 2.5
          const delay = -hashPos(f.id + 'sl') * dur
          return (
            <image key={f.id} href={`/village-assets/${spec.href}`} x={f.x - w / 2} y={f.y - h} width={w} height={h}
              opacity={0.5 + f.depth * 0.45}
              className={sways ? 'village-sway-soft' : undefined}
              style={{ imageRendering: 'pixelated', ...(sways ? { animationDuration: `${dur.toFixed(2)}s`, animationDelay: `${delay.toFixed(2)}s` } : {}) }} />
          )
        })}
      </g>

      {/* The hover-board itself — see openOrToggle above. A transparent
          full-canvas rect behind the card closes it on any outside click;
          the card stops that click from reaching the rect so tapping
          inside never dismisses it. */}
      {openPanel && (() => {
        const p = pos(openPanel)
        const info = panelContent[openPanel]
        const width = 150
        const secondaryH = info.secondary ? 12 : 0
        const height = 34 + info.lines.length * 13 + 22 + secondaryH
        const cx = Math.min(800 - width / 2 - 10, Math.max(width / 2 + 10, p.x))
        const top = Math.max(10, p.y - 40 - height)
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setOpenPanel(null)} />
            <g transform={`translate(${cx - width / 2} ${top})`} onClick={e => e.stopPropagation()}
              onMouseEnter={cancelHoverClose} onMouseLeave={() => setOpenPanel(null)}>
              <rect width={width} height={height} rx={10} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <rect width={width} height={height} rx={10} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} style={{ pointerEvents: 'all' }} />
              <text x={width / 2} y={17} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--text)" fontFamily="var(--font-body)">{info.title}</text>
              {info.lines.map((line, i) => (
                <text key={i} x={width / 2} y={31 + i * 13} textAnchor="middle" fontSize={7.5} fill="var(--muted)" fontFamily="var(--font-body)">{line}</text>
              ))}
              <g transform={`translate(${width / 2} ${height - 15 - secondaryH})`} onClick={() => { info.go(); setOpenPanel(null) }}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}>
                <rect x={-48} y={-9} width={96} height={18} rx={9} fill="color-mix(in srgb, var(--gold) 14%, transparent)" stroke="var(--gold)" strokeWidth={0.8} />
                <text x={0} y={0.5} dominantBaseline="central" textAnchor="middle" fontSize={7.5} fill="var(--gold)" fontFamily="var(--font-body)">{info.actionLabel} →</text>
              </g>
              {info.secondary && (
                <text x={width / 2} y={height - 5} textAnchor="middle" fontSize={6.5} fill="var(--muted)" fontFamily="var(--font-body)"
                  onClick={() => { info.secondary!.go(); setOpenPanel(null) }} style={{ cursor: 'pointer', pointerEvents: 'all', textDecoration: 'underline' }}>
                  {info.secondary.label}
                </text>
              )}
            </g>
          </g>
        )
      })()}

      {/* Figure hover-card — same shape as the district hover-board above,
          positioned over Sylvia/Harry's own fixed spot rather than pos(id)
          since figures aren't landmarks. */}
      {openFigure && (() => {
        const figPos = decorPos(openFigure)
        const figX = figPos.x
        const figY = figPos.y
        const info = figureContent[openFigure]
        const width = 150
        const height = 34 + info.lines.length * 13 + 22
        const cx = Math.min(800 - width / 2 - 10, Math.max(width / 2 + 10, figX))
        const top = Math.max(10, figY - 40 - height)
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setOpenFigure(null)} />
            <g transform={`translate(${cx - width / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={width} height={height} rx={10} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <rect width={width} height={height} rx={10} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} style={{ pointerEvents: 'all' }} />
              <text x={width / 2} y={17} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--text)" fontFamily="var(--font-body)">{info.title}</text>
              {info.lines.map((line, i) => (
                <text key={i} x={width / 2} y={31 + i * 13} textAnchor="middle" fontSize={7.5} fill="var(--muted)" fontFamily="var(--font-body)">{line}</text>
              ))}
              <g transform={`translate(${width / 2} ${height - 15})`} onClick={() => { onLockedNavigate?.(info.title); setOpenFigure(null) }}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}>
                <rect x={-48} y={-9} width={96} height={18} rx={9} fill="color-mix(in srgb, var(--gold) 14%, transparent)" stroke="var(--gold)" strokeWidth={0.8} />
                <text x={0} y={0.5} dominantBaseline="central" textAnchor="middle" fontSize={7.5} fill="var(--gold)" fontFamily="var(--font-body)">Unlock →</text>
              </g>
            </g>
          </g>
        )
      })()}

      {/* Somi's own hover-card — same shape again, positioned over her fixed
          spot, no PIN gate (her card just navigates, never calls
          onLockedNavigate). */}
      {openSomiCard && (() => {
        const somiPos = decorPos('somi')
        const width = 176
        const height = 132
        const cx = Math.min(800 - width / 2 - 10, Math.max(width / 2 + 10, somiPos.x))
        const top = Math.max(10, somiPos.y - 40 - height)
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setOpenSomiCard(false)} />
            <g transform={`translate(${cx - width / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={width} height={height} rx={10} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <foreignObject width={width} height={height} style={{ overflow: 'visible' }}>
                <div style={{
                  boxSizing: 'border-box', width: '100%', height: '100%',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '8px 10px', fontFamily: 'var(--font-body)', color: 'var(--text)',
                  display: 'flex', flexDirection: 'column', gap: 3,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{somiCard.name}</div>
                  <div style={{ fontSize: 8, color: 'var(--muted)', opacity: 0.8 }}>{somiCard.birthdayLabel}</div>
                  {somiCard.ageText && <div style={{ fontSize: 8.5, color: 'var(--muted)' }}>{somiCard.ageText}</div>}
                  <div style={{ fontSize: 8.5, color: 'var(--muted)' }}>Favourite snack: {somiCard.snack}</div>
                  {somiCard.tricks.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 1 }}>
                      {somiCard.tricks.slice(0, 6).map(t => (
                        <span key={t} style={{
                          fontSize: 7.5, padding: '1px 5px', borderRadius: 999,
                          background: 'color-mix(in srgb, var(--gold) 12%, transparent)', color: 'var(--text)',
                          border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {somiCard.notes && <div style={{ fontSize: 8, color: 'var(--muted)', lineHeight: 1.4 }}>{somiCard.notes}</div>}
                  <button
                    onClick={() => { goToHousehold('reference'); setOpenSomiCard(false) }}
                    style={{
                      marginTop: 'auto', alignSelf: 'flex-start', cursor: 'pointer',
                      fontSize: 8, fontFamily: 'inherit', padding: '2px 8px', borderRadius: 999,
                      background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
                      border: '1px solid var(--gold)', color: 'var(--gold)',
                    }}
                  >Her care →</button>
                </div>
              </foreignObject>
            </g>
          </g>
        )
      })()}

      {pingOpen && hostPing && (() => {
        const p = decorPos(pingOpen)
        const width = 168
        const height = pingDone ? 52 : 96
        const cx = Math.min(800 - width / 2 - 10, Math.max(width / 2 + 10, p.x))
        const top = Math.max(10, p.y - 40 - height)
        const close = () => { setPingOpen(null); setPingDone(false) }
        const reasons = ['At the door', 'Need a hand', 'Phone', 'Come say hi']
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={close} />
            <g transform={`translate(${cx - width / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={width} height={height} rx={10} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <foreignObject width={width} height={height} style={{ overflow: 'visible' }}>
                <div style={{
                  boxSizing: 'border-box', width: '100%', height: '100%',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '8px 10px', fontFamily: 'var(--font-body)', color: 'var(--text)',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  {pingDone ? (
                    <div style={{ fontSize: 10, textAlign: 'center', margin: 'auto' }}>On their way.</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 9.5, fontWeight: 600 }}>
                        Call {pingOpen === 'sylvia' ? 'Sylvia' : 'Harry'} over
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {reasons.map(r => (
                          <button
                            key={r}
                            onClick={() => {
                              hostPing.onPing(pingOpen, r)
                              setPingDone(true)
                              setTimeout(close, 1600)
                            }}
                            style={{
                              fontSize: 8, fontFamily: 'inherit', cursor: 'pointer',
                              padding: '2px 6px', borderRadius: 999,
                              background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
                            }}
                          >{r}</button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </foreignObject>
            </g>
          </g>
        )
      })()}

      {/* Postcard panel (round 66, "postcard rack should be placed and it
          should import using the postcards in [post/] ... and also later
          connect to google photos") — a <foreignObject> strip of the trip
          postcards. The Google Photos link per card is the next step. */}
      {postcardsOpen && (() => {
        const p = decorPos('postcardRack')
        const w = 320, h = 216
        const cx = Math.min(800 - w / 2 - 10, Math.max(w / 2 + 10, p.x))
        const top = Math.max(10, Math.min(360 - h, p.y - 20 - h))
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setPostcardsOpen(false)} />
            <g transform={`translate(${cx - w / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={w} height={h} rx={12} fill="var(--text)" opacity={0.12} transform="translate(0 3)" />
              <rect width={w} height={h} rx={12} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} />
              <foreignObject x={0} y={0} width={w} height={h}>
                <div style={{ padding: '10px 12px', fontFamily: 'var(--font-body)', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>Postcards</span>
                    <span style={{ fontSize: 8, color: 'var(--muted)' }}>trips together</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, overflowY: 'auto', paddingRight: 2 }}>
                    {POSTCARDS.map(pc => (
                      <div key={pc.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <img src={`/village-assets/postcards/${pc.id}.png`} alt={pc.label}
                          style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'cover', borderRadius: 5, border: '1px solid var(--border)', imageRendering: 'pixelated' }} />
                        <span style={{ fontSize: 7.5, color: 'var(--muted)', lineHeight: 1.1 }}>{pc.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </foreignObject>
            </g>
          </g>
        )
      })()}

      {/* Wishing-well card (round 60) — a real input, drawn in the scene via
          <foreignObject> so it can be a proper text field without lifting
          state out to Village.tsx. */}
      {wellOpen && (() => {
        const p = decorPos('wishingWell')
        const w = 176, h = 92
        const cx = Math.min(800 - w / 2 - 10, Math.max(w / 2 + 10, p.x))
        const top = Math.max(10, p.y - 34 - h)
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setWellOpen(false)} />
            <g transform={`translate(${cx - w / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={w} height={h} rx={11} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <foreignObject width={w} height={h} style={{ pointerEvents: 'all' }}>
                <div style={{
                  width: '100%', height: '100%', boxSizing: 'border-box', padding: '9px 10px',
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 11,
                  fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: 5,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span aria-hidden>✨</span> A thank-you for the well
                  </div>
                  <textarea autoFocus value={wellText} onChange={e => setWellText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveGratitude() } }}
                    placeholder="Something you're grateful for…"
                    style={{
                      flex: 1, resize: 'none', width: '100%', boxSizing: 'border-box', padding: '4px 6px',
                      fontSize: 8.5, fontFamily: 'var(--font-body)', color: 'var(--text)',
                      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 7, outline: 'none',
                    }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
                    <button onClick={() => setWellOpen(false)} style={{
                      fontSize: 8, fontFamily: 'var(--font-body)', color: 'var(--muted)', background: 'transparent',
                      border: 'none', cursor: 'pointer', padding: '2px 6px',
                    }}>Never mind</button>
                    <button onClick={saveGratitude} style={{
                      fontSize: 8, fontFamily: 'var(--font-body)', color: 'var(--gold)', cursor: 'pointer', padding: '2px 8px',
                      background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
                      border: '0.8px solid var(--gold)', borderRadius: 8,
                    }}>Drop it in 🪙</button>
                  </div>
                </div>
              </foreignObject>
            </g>
          </g>
        )
      })()}

      {/* Styled callout for whichever plant/building is selected — see the
          selection state and locked-mode guard set up above. */}
      {selectedPlant && (
        <EntityCallout x={selectedPlant.x} y={selectedPlant.y}
          title={selectedPlant.plant.name}
          subtitle={plantSubtitle(selectedPlant.plant)} />
      )}
      {selectedBuilding && (
        <EntityCallout x={selectedBuilding.x} y={selectedBuilding.y}
          title={selectedBuilding.building.title}
          subtitle={buildingSubtitle(selectedBuilding.building)} />
      )}
      {selected?.type === 'grove' && (
        <EntityCallout x={725} y={GROUND_Y - 6} title="Archive Grove" subtitle={groveSubtitle} />
      )}

      {/* The time/season/weather readout card was removed (2026-08-29, "remove
          the weather widget from top left") — it overlapped the Fullscreen
          control and read as a dashboard chip stuck on the picture. The sky,
          palette and lighting already say what time and weather it is; the
          words belong in the Brief, not on the scene. */}

      {/* World cast (round 19, 2026-08-27, "make everything look apart of
          the same world so if there is a cast there should be a cast over
          everything (like rain, sunset, gloomy)") — before this, only
          Sky.tsx's own gradient knew what time or weather it was; a warm
          dusk sky sat directly above a ground/buildings layer with no
          matching warmth at all, so the two halves of the picture read as
          two different lighting conditions glued together. These two
          rects tint literally everything below them — sky, ground,
          buildings, cast, props — with the SAME light: one for time of
          day, one for weather, so either (or both together, a rainy dusk)
          reads as one real condition the whole village is sitting in, not
          just a colored sky backdrop. Low opacity, normal blend (not
          multiply) so it warms/cools without crushing contrast the way a
          multiply wash would. */}
      {live && (() => {
        const timeCast: Record<VillageState['timeOfDay'], [string, number]> = {
          dawn: ['#F5B88A', 0.07],
          day: ['#FFFFFF', 0],
          dusk: ['#E67A4A', 0.1],
          night: ['#2A3B6B', 0.1],
        }
        const weatherCast: Record<WeatherCondition, [string, number]> = {
          clear: ['#FFFFFF', 0],
          cloudy: ['#8B93A0', 0.06],
          fog: ['#C7CCD1', 0.14],
          rain: ['#5C7290', 0.1],
          snow: ['#DCE6F0', 0.08],
          storm: ['#3E4A5C', 0.16],
        }
        const [tColor, tOp] = timeCast[v.timeOfDay]
        const [wColor, wOp] = weatherCast[weather?.condition ?? 'clear']
        return (
          <>
            {/* A whisper of hearth-warmth over everything, always (round 74,
                "cozy atmosphere") — 2.5% amber so the village is never a
                cold picture even at flat midday. Below the time-of-day
                cast so dusk/night still lead. */}
            <rect width="800" height="440" fill="#F6D9A8" opacity={0.028} pointerEvents="none" style={{ mixBlendMode: 'soft-light' }} />
            {tOp > 0 && <rect width="800" height="440" fill={tColor} opacity={tOp} pointerEvents="none" />}
            {wOp > 0 && <rect width="800" height="440" fill={wColor} opacity={wOp} pointerEvents="none" />}
            {/* Guest Mode: a faint golden wash over the whole scene so a
                gathering feels warmer than an ordinary day (2026-08-29). */}
            {gathering && <rect width="800" height="440" fill="#F3C88A" opacity={0.06} pointerEvents="none" />}
          </>
        )
      })()}
      {/* Vignette — pulls the eye to the middle of the scene. Drawn in
          SVG rather than as a CSS overlay so it can't intercept the
          clicks on the district labels underneath it. */}
      <rect width="800" height="440" fill="url(#vvignette)" pointerEvents="none" />
      {/* Grain (round 8 atmosphere pass, 2026-08-27) — see vgrain's own
          def comment. Drawn last, over everything, at a low enough opacity
          it reads as texture rather than noise; multiply blend so it can
          only darken, never wash the scene out or shift its hue. */}
      <rect width="800" height="440" filter="url(#vgrain)" opacity={0.05} pointerEvents="none" style={{ mixBlendMode: 'multiply' }} />
    </svg>
  )
}

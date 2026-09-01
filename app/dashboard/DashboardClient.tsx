'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Header from '@/components/layout/Header'
import ThemeProvider from '@/components/ui/ThemeProvider'
import type { CustomThemeSeed } from '@/lib/constants/themes'
import SectionLabel from '@/components/ui/SectionLabel'
import CustomizePanel, { DEFAULT_SECTIONS, type SectionConfig } from '@/components/ui/CustomizePanel'
import QuickCapture from '@/components/ui/QuickCapture'
import ConnectPanel from '@/components/ui/ConnectPanel'
import SearchModal from '@/components/search/SearchModal'
import ArchivePanel from '@/components/archive/ArchivePanel'
import WeekReview from '@/components/review/WeekReview'
import MobileNav from '@/components/ui/MobileNav'
import HomeBar, { type HomeBarGroup } from '@/components/ui/HomeBar'
import { useProgression } from '@/lib/hooks/useProgression'
import { useIdleAmbient } from '@/lib/hooks/useIdleAmbient'
import { useAutoRelock } from '@/lib/hooks/useAutoRelock'
import { useSharedVillageLayout } from '@/lib/hooks/useSharedVillageLayout'
import { useGathering } from '@/lib/hooks/useGathering'
import Village from '@/components/village/Village'
import type { VillageLayout } from '@/lib/village/layout'
import DailyBrief from '@/components/brief/DailyBrief'
import PersonalHub from '@/components/personal/PersonalHub'
import HouseholdHub from '@/components/household/HouseholdHub'
import SmartHomeOverlay from '@/components/household/SmartHomeOverlay'
import PlacesHub from '@/components/places/PlacesHub'
import UnlockPanel from '@/components/ui/UnlockPanel'
import { createClient } from '@/lib/supabase/client'
import { saveLayout, type LayoutState } from '@/lib/persistence/saveLayout'
import { scrollToAnchor } from '@/lib/utils/navigate'
import { mergeTodayBlocks, type TodayBlockConfig } from '@/lib/utils/todayBlocks'
import TodayCustomizePanel from '@/components/brief/TodayCustomizePanel'
import { mergePersonalTabs } from '@/lib/utils/personalTabs'
import { mergeHouseholdTabs, mergeHomeBlocks, type HouseholdTabId } from '@/lib/utils/householdLayout'
import type { Mode } from '@/lib/constants/modes'
import { t } from '@/lib/i18n'
import { LangContext } from '@/lib/LangContext'

interface Props {
  email: string
  userId: string
  isAnonymous: boolean
  /** Set from the httpOnly 4s-shared-mode cookie the PIN-login route stamps
   *  for the "Shared" tile. Restricts the whole session to Household only,
   *  regardless of which real account is actually signed in behind it —
   *  nothing personal (Village, Personal, Places) should be reachable from a
   *  shared/no-PIN entry point. */
  sharedMode: boolean
  /** ISO string from auth.users.created_at. Drives the Village's Life Tree. */
  accountCreatedAt: string | null
  /** ISO string of the last Village visit, from user_prefs.layout. */
  initialVillageLastSeen: string | null
  initialUnlockAll: boolean
  initialName: string | null
  initialTheme: string
  /** From user_prefs.custom_theme — only meaningful when initialTheme === 'custom'. */
  initialCustomTheme: CustomThemeSeed | null
  initialMode: string
  initialLayout: SectionConfig[] | null
  initialTodayBlocks: TodayBlockConfig[] | null
  initialPersonalTabs: SectionConfig[] | null
  initialHouseholdTabs: SectionConfig[] | null
  initialHouseholdHomeBlocks: SectionConfig[] | null
  initialVillageLayout: VillageLayout | null
}

// Folded into Personal / Today / Household — strip from any saved layout so
// returning users don't see dangling, unrenderable section headings. Note
// that 'people' and 'money' are listed here now: they used to be live
// top-level ids and are Personal sub-tabs as of this change, so any layout
// saved before it still names them.
const DEPRECATED_SECTION_IDS = new Set([
  'pulse', 'wishlist', 'spending', 'capture',
  'relationship', 'shared',                          // → people (a Personal sub-tab)
  'habits', 'domains', 'growth',                     // → Personal sub-tabs
  'council',                                         // removed entirely (2026-09-01)
  'people', 'money',                                 // → Personal sub-tabs
  'work',                                            // → Personal sub-tab 'tasks' (2026-08-20)
  // 'household' folded into four real top-level sections (2026-08-25) —
  // home/calendar/reference (smarthome deliberately excluded, see
  // DEFAULT_SECTIONS' own comment; 'routines' was briefly a fifth, folded
  // into Reference and removed the same day). mergeLayout appends the
  // missing new ones the same way it always has, so this is a one-line
  // migration, not a special case.
  'household',
  // NOTE: 'calendar' was deprecated here 2026-08-20 through 2026-08-25 (→ a
  // panel inside Today) and reused 2026-08-25 for Household's own Calendar
  // sub-tab promoted to top level — a different meaning, not a collision:
  // any layout saved during that window had a STANDALONE calendar tab that
  // no longer exists, gets stripped once by this same set (the id was still
  // deprecated when they last saved), and mergeLayout's own "append missing
  // defaults" step brings the NEW 'calendar' meaning back on next load.
  // NOTE: 'places' was briefly deprecated here (2026-08-20) when it folded
  // into Household, and came back out to top level a day later. Anyone whose
  // layout was saved during that window had it stripped; mergeLayout appends
  // missing DEFAULT_SECTIONS entries, so it returns on next load by itself.
])

function mergeLayout(saved: SectionConfig[] | null): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_SECTIONS
  const cleaned = saved.filter(s => !DEPRECATED_SECTION_IDS.has(s.id))
  const savedIds = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_SECTIONS.filter(s => !savedIds.has(s.id))
  return [...cleaned, ...missing]
}

// Anchors are places inside the Today tab, not tabs of their own.
const ANCHORS = new Set(['week-review', 'brief-inbox', 'brief-calendar'])

const SECTION_GROUPS: Record<string, string> = {
  brief:     'mine',
  village:   'your world',
  personal:  'mine',
  places:    'ours',
  // Household's own sub-tabs — real top-level sections for both personal
  // and shared use as of 2026-08-25 (used to nest one click behind a single
  // "Household" tab; still grouped visually in shared mode's Home Bar, see
  // HOME_BAR_GROUPS below, but the underlying sections are flat everywhere
  // now, not just in shared mode).
  home:      'ours',
  calendar:  'ours',
  reference: 'ours',
}

// The Home Bar's contexts (2026-08-25, made universal 2026-08-25) — one nav
// component and one visual design for both personal and shared use, not
// just the same relative order. This is the full superset (Calendar lives
// inside Household here); DashboardClient filters it down to whatever ids
// are actually in `navSections` for the current mode and, in shared mode
// only, additionally splits Calendar out into its own top-level icon (see
// groupsForMode/homeBarGroups below) — shared mode has no Today/Personal,
// personal mode has everything and keeps Calendar nested. Today folded into
// the Personal group (2026-09-01, "mix today into personal like the
// household tab") now that the app lands on the Village, not Today — so
// Personal covers Today + the personal hub, shown as a secondary pill row,
// exactly the way Household covers Home/Calendar/Reference. Tasks/goals/
// projects stay out of Household here on purpose: those are personal data
// gated behind a PIN even in shared mode (see VillageScene's
// districtLocked). Places got its own icon back (2026-08-25 fix) — nesting
// it one tap deep under a group made it noticeably harder to find than the
// old flat nav, and findability matters more than a smaller icon count.
//
// Routines folded into Household (2026-08-25) — it used to be its own
// "Life" icon next to Household, which put two closely-related groups side
// by side for no real reason; its own tab was then folded into Reference
// and removed the same day, so Household's group covers three tabs today
// (Home/Calendar/Reference) plus Smart Home. Label is "Household", not
// "Home", even though its first member's own id/tab-label is "home" —
// "Home" would otherwise mean three different things at once: the Village
// building you tap (which actually opens Smart Home, see panelContent.home
// in VillageScene.tsx), the individual "Home" tab inside this group (meals/
// chores), and the group icon itself. "Household" — the group's original
// pre-refactor name — only means the second and third of those, same as
// it always did.
//
// Smart Home ("Controls") always opens as an overlay (special-cased in
// onSelect below) rather than ever being a real navSections member —
// 'smarthome' is unconditionally kept regardless of navSections for that
// reason (see the filter logic below). Its standalone bottom-nav icon was
// removed (2026-09-01, "remove the control tab from the bottom navigation")
// — it's now reached from Household's own trailing "Controls" pill, or by
// tapping the Home cottage in the Village scene (panelContent.home in
// VillageScene.tsx).
const ALL_HOME_BAR_GROUPS: HomeBarGroup[] = [
  { id: 'personal', icon: 'personal',  label: 'Personal',   members: ['brief', 'personal'] },
  { id: 'village',  icon: 'village',   label: 'Village',    members: ['village'] },
  { id: 'home',     icon: 'household', label: 'Household',  members: ['home', 'calendar', 'reference', 'smarthome'] },
  { id: 'places',   icon: 'places',    label: 'Places',     members: ['places'] },
]

export default function DashboardClient({ email, userId, isAnonymous, sharedMode, accountCreatedAt, initialVillageLastSeen, initialUnlockAll, initialName, initialTheme, initialCustomTheme, initialMode, initialLayout, initialTodayBlocks, initialPersonalTabs, initialHouseholdTabs, initialHouseholdHomeBlocks, initialVillageLayout }: Props) {
  const [theme, setTheme] = useState(initialTheme)
  const [customTheme, setCustomTheme] = useState<CustomThemeSeed | null>(initialCustomTheme)
  // Fetched here instead of on the server (see page.tsx's initialCustomTheme
  // comment) — this column may not exist yet if the migration hasn't been
  // run, and a failed select here just means "no custom theme", not a
  // broken dashboard for every user.
  useEffect(() => {
    if (theme !== 'custom') return
    createClient().from('user_prefs').select('custom_theme').eq('user_id', userId).single()
      .then(({ data, error }) => {
        if (!error && data?.custom_theme) setCustomTheme(data.custom_theme as CustomThemeSeed)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [mode, setMode] = useState<Mode>(initialMode as Mode)
  const [sections, setSections] = useState<SectionConfig[]>(mergeLayout(initialLayout))
  // Personal/Household sub-tab and Home-block customization (2026-08-12) —
  // same reasoning as todayBlocks below: owned here because saveLayout()
  // needs the FULL LayoutState to avoid the five-writer bug its own header
  // comment describes, so the write path lives at this level even though the
  // customize UI itself renders inside PersonalHub/HouseholdHub.
  const [personalTabs, setPersonalTabs] = useState<SectionConfig[]>(mergePersonalTabs(initialPersonalTabs))
  const [householdTabs, setHouseholdTabs] = useState<SectionConfig[]>(mergeHouseholdTabs(initialHouseholdTabs))
  const [householdHomeBlocks, setHouseholdHomeBlocks] = useState<SectionConfig[]>(mergeHomeBlocks(initialHouseholdHomeBlocks))
  const [todayBlocks, setTodayBlocks] = useState<TodayBlockConfig[]>(mergeTodayBlocks(initialTodayBlocks))
  const [villageLayout, setVillageLayout] = useState<VillageLayout>(initialVillageLayout ?? {})

  const lang = 'en' as const
  // Every session lands on the Village (2026-09-01, "make the village the
  // first screen people see when they login") — shared devices always did;
  // personal logins used to open on Today. `village` is a never-gated,
  // always-visible section so it's a safe initial tab in both modes.
  const [activeTab, setActiveTab] = useState('village')
  // Non-null = the unlock prompt is open. The value is what they tried to
  // reach ("Growth Forest") so the prompt can say why it's asking; an empty
  // string opens it with no specific destination (the header's own entry).
  const [unlockReason, setUnlockReason] = useState<string | null>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [todayCustomizeOpen, setTodayCustomizeOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  // Village's Archive district needs to open this same panel from deep
  // inside the scene, where a direct prop callback can't reach (2026-08-24)
  // — same "navigate, then dispatch" cross-component pattern
  // app:open-add-task/app:focus-capture already use elsewhere.
  useEffect(() => {
    function onOpenArchive() { setArchiveOpen(true) }
    window.addEventListener('app:open-archive', onOpenArchive)
    return () => window.removeEventListener('app:open-archive', onOpenArchive)
  }, [])

  // Smart Home overlay (2026-08-25) — same "navigate, then dispatch"
  // cross-component pattern as Archive above; Village's Home tap calls
  // openSmartHome() (lib/utils/navigate.ts) rather than switching tabs, so
  // it can rise as a sheet over the still-visible Village instead of
  // replacing it. See SmartHomeOverlay's own header comment.
  const [smartHomeOpen, setSmartHomeOpen] = useState(false)
  useEffect(() => {
    function onOpenSmartHome() { setSmartHomeOpen(true) }
    window.addEventListener('app:open-smarthome', onOpenSmartHome)
    return () => window.removeEventListener('app:open-smarthome', onOpenSmartHome)
  }, [])

  // Progressive unlocking — see lib/hooks/useProgression.ts. "Open everything
  // now" is a one-way choice, persisted in the layout JSON.
  const [unlockAll, setUnlockAll] = useState(initialUnlockAll)

  // Frozen for the whole session on purpose: if this tracked the value we're
  // about to write, the "since you were last here" line would vanish under the
  // reader a moment after they arrived. The stamp moves, the story doesn't.
  const [villageLastSeen] = useState(initialVillageLastSeen)
  const villageSeenWritten = useRef(false)
  const markVillageSeen = useCallback(() => {
    if (villageSeenWritten.current) return
    villageSeenWritten.current = true
    saveLayout(userId, layoutState(), { villageLastSeen: new Date().toISOString() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // All layout writes go through saveLayout(). See lib/persistence/saveLayout.ts:
  // the layout column is one JSON blob, so a hand-built object that omits a key
  // silently wipes that setting. Built fresh in each handler so every value is
  // current at write time.
  function layoutState(): LayoutState {
    return { sections, unlockAll, todayBlocks, personalTabs, householdTabs, householdHomeBlocks, villageLastSeen: villageLastSeen ?? undefined, villageLayout }
  }

  async function changePersonalTabs(next: SectionConfig[]) {
    setPersonalTabs(next)
    await saveLayout(userId, layoutState(), { personalTabs: next })
  }

  async function changeVillageLayout(next: VillageLayout) {
    setVillageLayout(next)
    await saveLayout(userId, layoutState(), { villageLayout: next })
  }
  // The village arrangement is shared across the couple (round 62) — one
  // row per shared space, both partners on the same layout, live. Falls
  // back to the personal layout above when there's no shared space (or the
  // migration hasn't run).
  const sharedVillage = useSharedVillageLayout(userId, villageLayout, changeVillageLayout)
  const gathering = useGathering(userId)

  async function changeHouseholdTabs(next: SectionConfig[]) {
    setHouseholdTabs(next)
    await saveLayout(userId, layoutState(), { householdTabs: next })
  }

  async function changeHouseholdHomeBlocks(next: SectionConfig[]) {
    setHouseholdHomeBlocks(next)
    await saveLayout(userId, layoutState(), { householdHomeBlocks: next })
  }

  // Guest mode's entire point is "experience the product before committing to
  // an account" — gating sections behind a progress bar asks a guest to prove
  // themselves before they've agreed to anything. Anonymous sessions always
  // see the full app; unlockAll itself stays untouched so if they later keep
  // their space (see the guest banner below), it starts fresh with real
  // progression rather than permanently unlocked by a guest-mode side effect.
  const prog = useProgression(unlockAll || isAnonymous)
  async function openEverything() {
    setUnlockAll(true)
    await saveLayout(userId, layoutState(), { unlockAll: true })
  }

  // Kept current via refs so the nav listener below (mounted once) always
  // sees live unlock state and the current openEverything closure without
  // re-subscribing on every render. Written in an effect, not during render
  // — mutating a ref while rendering is a React footgun even though it
  // "works" in practice.
  const progRef = useRef(prog)
  const openEverythingRef = useRef(openEverything)
  useEffect(() => { progRef.current = prog; openEverythingRef.current = openEverything })

  // Tab navigation from anywhere (Today's summary cards, search).
  // 'week-review', 'brief-inbox' and 'brief-calendar' are anchors inside the
  // Today tab rather than tabs of their own.
  // A direct request for a still-gated section (from search, say)
  // must never silently fail to appear — progression is a suggested order,
  // not a wall. Honoring it by opening everything, same as the journey bar's
  // own "open everything now" — there's no reason to invent a second,
  // narrower unlock path for the same choice.
  useEffect(() => {
    function onNav(e: Event) {
      const id = (e as CustomEvent<string>).detail
      const anchor = ANCHORS.has(id) ? id : null
      if (!anchor && !progRef.current.isUnlocked(id)) openEverythingRef.current()
      setActiveTab(anchor ? 'brief' : id)
      // scrollToAnchor retries until the target mounts and verifies the
      // scroll actually happened — see lib/utils/navigate.ts for why both
      // are necessary.
      if (anchor) scrollToAnchor(anchor)
      else requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    }
    window.addEventListener('4s:navigate', onNav)
    return () => window.removeEventListener('4s:navigate', onNav)
  }, [])

  // Switch the active Guide from anywhere (e.g. the Adaptive Guide suggestion
  // in Brief). Updates live state and persists — the user always chooses.
  useEffect(() => {
    function onGuide(e: Event) {
      const next = (e as CustomEvent<Mode>).detail
      if (!next) return
      setMode(next)
      createClient().from('user_prefs').upsert({ user_id: userId, mode: next })
    }
    window.addEventListener('4s:set-guide', onGuide)
    return () => window.removeEventListener('4s:set-guide', onGuide)
  }, [userId])

  // Global keyboard shortcuts — ⌘/ for Search only. ⌘K used to also open
  // Search here, colliding with QuickCapture's own ⌘K binding: both fired
  // on the same keypress, and Search rendered on top of Quick Capture,
  // reading as "quick capture opens search". Now ⌘K is Quick Capture's
  // alone.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); setSearchOpen(s => !s) }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The quiet waiting-reminder that used to live here as a tab-only
  // Notification() call is now a real server push (app/api/cron/waiting-notice,
  // once a day via Vercel Cron) — same rule (at most once a day, named not
  // counted, "waiting" not "missed"), just actually reaching you when the tab
  // isn't open instead of only when it happens to be. Keeping both would
  // double-notify anyone who has the tab open when the cron fires.

  // Shared-mode section ids — everything Household used to bundle, plus
  // Village and Places. Now that Household's sub-tabs are real top-level
  // ids (2026-08-25), this is a plain id list, not a flatMap over one
  // wrapping 'household' entry.
  const SHARED_MODE_IDS = new Set(['home', 'calendar', 'reference', 'village', 'places'])

  const visible = sections.filter(s =>
    !s.hidden
    && prog.isUnlocked(s.id)
    // Shared mode sees Household's sections, the Village and Places. The
    // Village is drawn FROM personal data (plants are habits, buildings are
    // tasks), which is deliberate here: it's a shared household device, so
    // seeing each other's shape-of-the-week is the point. Going from that
    // picture into the actual data still requires a PIN — see UnlockPanel
    // and the `locked` prop on Village. Places is different: it's a real
    // working surface, not a picture, so instead of locking it we scope it
    // to shared-only content (see PlacesHub's sharedOnly).
    && (!sharedMode || SHARED_MODE_IDS.has(s.id))
  )

  // Sections are flat now for both personal and shared use (2026-08-25) —
  // the old shared-mode-only flatMap over a single 'household' entry is
  // gone because there's no wrapping entry left to expand. `navSections` is
  // kept as its own name (rather than using `visible` directly at the call
  // sites below) so a future difference between "the customizable layout"
  // and "what the nav bar renders" has an obvious place to live again.
  const navSections = visible

  // ALL_HOME_BAR_GROUPS filtered to what's actually reachable this mode
  // (2026-08-25). Every member has to be a real, visible section or its
  // group is dropped entirely (e.g. shared mode has no 'brief'/'personal',
  // so the Personal group — which now covers both — vanishes rather than
  // rendering an empty icon).
  // 'village' is a permanent Home Bar icon in both modes now (2026-08-31) —
  // it sits between Personal and Household. (It briefly lost its personal-
  // mode icon in favour of a Today preview / a cross-tab band; the user
  // wanted it back as a plain tab.)
  // 'smarthome' is never a navSections member (it's overlay-only, see
  // ALL_HOME_BAR_GROUPS's own comment above) so it needs its own bypass of
  // the navIds check below, unconditionally — round two above briefly also
  // gated it to shared-mode-only alongside village, which silently dropped
  // the Controls icon from personal mode's Home Bar entirely (2026-08-25,
  // caught and reverted the same day: "add smarthome back").
  const navIds = new Set(navSections.map(s => s.id))
  // Calendar gets its own icon in shared mode specifically (2026-08-25) —
  // pulled out of Household's secondary row into a standalone group, right
  // after Household, before the rest run through the same visible-in-
  // navSections filter below. Personal mode is untouched: Calendar stays
  // inside Household there, same as Home/Reference/Routines.
  const groupsForMode = sharedMode
    ? ALL_HOME_BAR_GROUPS.flatMap(g => g.id === 'home'
        ? [{ ...g, members: g.members.filter(m => m !== 'calendar') },
           { id: 'calendar', icon: 'calendar' as const, label: 'Calendar', members: ['calendar'] }]
        : [g])
    : ALL_HOME_BAR_GROUPS
  const homeBarGroups = groupsForMode
    .map(g => ({
      ...g,
      members: g.members.filter(m => {
        if (m === 'smarthome') return true
        return navIds.has(m)
      }),
    }))
    .filter(g => g.members.length > 0)

  // Tab mode: only the active section renders. If the active tab was hidden
  // (customize / simple mode), fall back to the first visible one.
  const currentTab = navSections.some(s => s.id === activeTab) ? activeTab : (navSections[0]?.id ?? 'brief')

  // Idle/ambient mode (2026-08-25) — the wall-mounted "Shared" device is
  // meant to sit untouched as a picture frame, not a dashboard left open.
  // Only armed in sharedMode (see useIdleAmbient's own comment); only
  // actually hides chrome when Village is the visible tab, so switching to
  // Household/Places from a shared device isn't fighting a vanishing nav.
  // A longer idle grace while the village is open to guests (2026-08-29) —
  // the wall iPad shouldn't dim mid-gathering.
  const [idleAmbient, resetIdleTimer] = useIdleAmbient(sharedMode, gathering.gathering ? 300_000 : undefined)
  const ambient = idleAmbient && currentTab === 'village'

  // The other half of the same privacy story (2026-08-25) — useIdleAmbient
  // above only ever arms in sharedMode. This arms the opposite case: once
  // someone has unlocked THIS device into their own account (see
  // UnlockPanel), it signs back into the shared view after a few inactive
  // minutes, so a personal session left open on the wall iPad doesn't just
  // sit there indefinitely. No-ops entirely on a personal phone/laptop that
  // never went through shared mode — see useAutoRelock's own comment.
  useAutoRelock(sharedMode)

  // Tab mode only renders one section at a time, so its group header always
  // shows — there's no neighbouring section above it to already be carrying
  // the same group label the way a stacked scroll-through view would need.
  function sectionLabel(id: string): { label: string; group?: string } {
    const group = SECTION_GROUPS[id]

    const LABELS: Record<string, string> = {
      brief: t('Today', lang), village: t('Village', lang),
      personal: t('Personal', lang), places: t('Places', lang),
      // Household's own sub-tabs — real top-level sections now, for both
      // personal and shared use (2026-08-25). Smart Home isn't here: it's
      // overlay-only, never a tab (see SmartHomeOverlay).
      home: t('Home', lang), calendar: t('Calendar', lang),
      reference: t('Reference', lang),
    }

    return { label: LABELS[id] ?? id, group }
  }

  function renderSection(id: string) {
    const { label, group } = sectionLabel(id)

    // No section label while ambient — the picture-frame default shouldn't
    // caption itself "VILLAGE" above the scene.
    const heading = ambient && id === 'village' ? null : (
      <SectionLabel key={`lbl-${id}`} style={{ marginTop: 0 }} group={group}>
        {label}
      </SectionLabel>
    )

    const body = (() => {
      switch (id) {
        case 'brief':    return <DailyBrief key="brief" userId={userId} mode={mode} calendarConnected blocks={todayBlocks} onOpenCustomize={() => setTodayCustomizeOpen(true)} />
        case 'village':  return <Village key="village" userId={userId} accountCreatedAt={accountCreatedAt} lastSeen={villageLastSeen} onSeen={markVillageSeen} locked={sharedMode} onLockedNavigate={setUnlockReason} layout={sharedVillage.layout} onChangeLayout={sharedVillage.setLayout} ambient={ambient} resetIdleTimer={resetIdleTimer} gathering={gathering.gathering} onStartGathering={gathering.startGathering} onCloseGathering={gathering.closeGathering} guestCount={gathering.contributions.filter(c => c.status === 'visible').length} contributions={gathering.contributions} memories={gathering.memories} onSetMusicUrl={gathering.setMusicUrl} onSetPhotoAlbumUrl={gathering.setPhotoAlbumUrl} onModerate={gathering.moderate} onRemoveContribution={gathering.removeContribution} onUpdateMemory={gathering.updateMemory} onDeleteMemory={gathering.deleteMemory} />
        case 'personal': return <PersonalHub key="personal" userId={userId} tabs={personalTabs} onChangeTabs={changePersonalTabs} />
        // Tasks still folds into Personal as a sub-tab (see PersonalHub);
        // Places came back out to top level (2026-08-21).
        case 'places':   return <PlacesHub key="places" userId={userId} theme={theme} sharedOnly={sharedMode} />
        // Household's own sub-tabs — real top-level sections now, for both
        // personal and shared use (2026-08-25, was a single wrapping
        // 'household' tab with its own internal switcher). Same HouseholdHub
        // instance every time, just told which of its own tabs to show via
        // forcedTab. Smart Home is deliberately not one of these cases — it
        // only ever renders inside SmartHomeOverlay now.
        case 'home': case 'calendar': case 'reference':
          return <HouseholdHub key={id} userId={userId} userEmail={email} tabs={householdTabs} onChangeTabs={changeHouseholdTabs} homeBlocks={householdHomeBlocks} onChangeHomeBlocks={changeHouseholdHomeBlocks} sharedMode={sharedMode} onLockedNavigate={setUnlockReason} forcedTab={id as HouseholdTabId} />
        default: return null
      }
    })()

    return <>{heading}{body}</>
  }

  return (
    <LangContext.Provider value={lang}>
    <ThemeProvider theme={theme} customTheme={customTheme}>
      {/* Guest space notice — honest, quiet, dismissed by saving the space.
          Sits above the header so it reads as environment, not content. */}
      {isAnonymous && (
        <a href="/account" style={{
          display: 'block', textAlign: 'center', textDecoration: 'none',
          fontSize: '0.7rem', fontFamily: 'var(--font-body)', color: 'var(--muted)',
          padding: '0.45rem 1rem', borderBottom: '1px solid var(--border)',
          background: 'color-mix(in srgb, var(--gold) 6%, transparent)',
        }}>
          You&apos;re exploring as a guest — your space lives only in this browser.{' '}
          <span style={{ color: 'var(--gold)' }}>Keep it →</span>
        </a>
      )}
      {/* All of the chrome below is hidden in ambient/idle mode (2026-08-25)
          — the wall-mounted device should read as a picture frame, not an
          app with the light left on. Any tap/drag anywhere resets the idle
          timer (see useIdleAmbient), so this reappears the instant someone
          actually touches the screen. */}
      {!ambient && (
        <Header
          email={email} userId={userId} initialName={initialName} sharedMode={sharedMode}
          onUnlock={() => setUnlockReason('')}
          onCapture={() => window.dispatchEvent(new CustomEvent('app:open-quick-capture'))}
          initialTheme={theme} initialMode={mode} customTheme={customTheme}
          onThemeChange={setTheme} onModeChange={setMode} onCustomThemeChange={setCustomTheme}
          onCustomize={() => setCustomizeOpen(true)}
          onSearch={() => setSearchOpen(true)}
          onArchive={() => setArchiveOpen(true)}
          onConnect={() => setConnectOpen(true)}
        />
      )}

      <QuickCapture />
      <UnlockPanel open={unlockReason !== null} reason={unlockReason} onClose={() => setUnlockReason(null)} />

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ArchivePanel open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <CustomizePanel open={customizeOpen} sections={sections} current={layoutState()} userId={userId} onChange={setSections} onClose={() => setCustomizeOpen(false)} />
      <TodayCustomizePanel open={todayCustomizeOpen} blocks={todayBlocks} current={layoutState()} userId={userId} onChange={setTodayBlocks} onClose={() => setTodayCustomizeOpen(false)} />
      <ConnectPanel open={connectOpen} userId={userId} userEmail={email} onClose={() => setConnectOpen(false)} />

      {/* Bottom padding bumped 4rem→6rem (2026-08-25) — HomeBar is now the
          nav for every viewport, not just mobile, and its two-row state
          (a context with sub-destinations open) is taller than the old
          mobile-only BottomNav this used to just clear. */}
      <main style={{ maxWidth: ambient ? 'none' : 'min(1240px, 94vw)', margin: '0 auto', padding: ambient ? 0 : '1.2rem 2rem 6rem' }}>
        {currentTab === 'brief' && <div id="week-review"><WeekReview mode={mode} /></div>}
        {(() => {
          const s = navSections.find(v => v.id === currentTab)
          // key + .tab-in means React remounts on every tab change, so
          // the entrance animation replays instead of firing once on
          // first render and never again.
          return s ? <div key={s.id} id={`section-${s.id}`} className="tab-in">{renderSection(s.id)}</div> : null
        })()}
      </main>
      {!ambient && !sharedMode && <MobileNav onCapture={() => window.dispatchEvent(new CustomEvent('app:open-quick-capture'))} />}
      {/* One nav component for both modes now (2026-08-25) — same design
          everywhere, not just the same relative order. homeBarGroups is
          ALL_HOME_BAR_GROUPS filtered down to whatever's actually in
          navSections for this mode (Today/Personal only exist in personal
          mode; Controls is special-cased below, same as before). */}
      {!ambient && (
        <HomeBar
          groups={homeBarGroups}
          activeId={currentTab}
          onSelect={id => {
            // Controls opens the Smart Home overlay (2026-08-25) rather than
            // switching tabs — see openSmartHome()/SmartHomeOverlay. Nothing
            // else about currentTab changes, so whatever was showing (the
            // Village, most of the time) is still there underneath.
            if (id === 'smarthome') { setSmartHomeOpen(true); return }
            setActiveTab(id); window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}
      <SmartHomeOverlay
        open={smartHomeOpen} onClose={() => setSmartHomeOpen(false)}
        userId={userId} userEmail={email}
        tabs={householdTabs} onChangeTabs={changeHouseholdTabs}
        homeBlocks={householdHomeBlocks} onChangeHomeBlocks={changeHouseholdHomeBlocks}
        sharedMode={sharedMode} onLockedNavigate={setUnlockReason}
      />
    </ThemeProvider>
    </LangContext.Provider>
  )
}

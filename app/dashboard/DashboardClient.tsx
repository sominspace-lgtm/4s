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
import HelpPanel from '@/components/ui/HelpPanel'
import MobileNav from '@/components/ui/MobileNav'
import BottomNav from '@/components/ui/BottomNav'
import SectionNav from '@/components/ui/SectionNav'
import HomeBar, { type HomeBarGroup } from '@/components/ui/HomeBar'
import { useProgression } from '@/lib/hooks/useProgression'
import { useIdleAmbient } from '@/lib/hooks/useIdleAmbient'
import { useAutoRelock } from '@/lib/hooks/useAutoRelock'
import JourneyBar from '@/components/ui/JourneyBar'
import Village from '@/components/village/Village'
import type { VillageLayout } from '@/lib/village/layout'
import DailyBrief from '@/components/brief/DailyBrief'
import PersonalHub from '@/components/personal/PersonalHub'
import HouseholdHub from '@/components/household/HouseholdHub'
import SmartHomeOverlay from '@/components/household/SmartHomeOverlay'
import PlacesHub from '@/components/places/PlacesHub'
import UnlockPanel from '@/components/ui/UnlockPanel'
import CalendarEmbed from '@/components/calendar/CalendarEmbed'
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
  'habits', 'domains', 'council', 'growth',          // → Personal sub-tabs
  'people', 'money',                                 // → Personal sub-tabs
  'work',                                            // → Personal sub-tab 'tasks' (2026-08-20)
  // 'household' folded into five real top-level sections (2026-08-25) —
  // home/calendar/routines/reference (smarthome deliberately excluded, see
  // DEFAULT_SECTIONS' own comment). mergeLayout appends the missing new
  // ones the same way it always has, so this is a one-line migration, not a
  // special case.
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
  brief:     'now',
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
  routines:  'ours',
  reference: 'ours',
}

// The Home Bar's contexts (2026-08-25) — regroups the seven flat
// shared-mode tabs above into the wall-mounted-iPad vision's 🌳/🏠/🌱/💡
// structure. Tasks/goals/projects stay out of "Life" here on purpose: those
// are personal data gated behind a PIN even in shared mode (see
// VillageScene's districtLocked), so Life is scoped to Routines. Places got
// its own icon back (2026-08-25 fix) — nesting it one tap deep under Life
// made it noticeably harder to find than it was in the old flat nav, and
// findability matters more here than sticking to exactly four icons. Real
// smart-home control isn't built yet (see useSmartHome.ts) so Controls
// still opens the manual list.
const HOME_BAR_GROUPS: HomeBarGroup[] = [
  { id: 'village',  icon: '🌳', label: 'Village',  members: ['village'] },
  { id: 'home',     icon: '🏠', label: 'Home',     members: ['home', 'calendar', 'reference'] },
  { id: 'life',     icon: '🌱', label: 'Life',     members: ['routines'] },
  { id: 'places',   icon: '📍', label: 'Places',   members: ['places'] },
  { id: 'controls', icon: '💡', label: 'Controls', members: ['smarthome'] },
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
  // Landing view depends on who's here (2026-08-21). A shared-device session
  // opens on the Village — it's the ambient household view, the thing worth
  // glancing at from across the room. A personal login opens on Today, which
  // is where your own actual day is. Note `visible` filters shared mode to
  // Household only, so this is overridden there until Village is allowed
  // through — see the sharedMode clause in the filter below.
  const [activeTab, setActiveTab] = useState(sharedMode ? 'village' : 'brief')
  // Non-null = the unlock prompt is open. The value is what they tried to
  // reach ("Growth Forest") so the prompt can say why it's asking; an empty
  // string opens it with no specific destination (the header's own entry).
  const [unlockReason, setUnlockReason] = useState<string | null>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [todayCustomizeOpen, setTodayCustomizeOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
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
  const SHARED_MODE_IDS = new Set(['home', 'calendar', 'routines', 'reference', 'village', 'places'])

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

  // Tab mode: only the active section renders. If the active tab was hidden
  // (customize / simple mode), fall back to the first visible one.
  const currentTab = navSections.some(s => s.id === activeTab) ? activeTab : (navSections[0]?.id ?? 'brief')

  // Idle/ambient mode (2026-08-25) — the wall-mounted "Shared" device is
  // meant to sit untouched as a picture frame, not a dashboard left open.
  // Only armed in sharedMode (see useIdleAmbient's own comment); only
  // actually hides chrome when Village is the visible tab, so switching to
  // Household/Places from a shared device isn't fighting a vanishing nav.
  const [idleAmbient, resetIdleTimer] = useIdleAmbient(sharedMode)
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
      home: t('Home', lang), calendar: t('Calendar', lang), routines: t('Routines', lang),
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
        case 'village':  return <Village key="village" userId={userId} accountCreatedAt={accountCreatedAt} lastSeen={villageLastSeen} onSeen={markVillageSeen} locked={sharedMode} onLockedNavigate={setUnlockReason} layout={villageLayout} onChangeLayout={changeVillageLayout} ambient={ambient} resetIdleTimer={resetIdleTimer} />
        case 'personal': return <PersonalHub key="personal" userId={userId} mode={mode} tabs={personalTabs} onChangeTabs={changePersonalTabs} />
        // Tasks still folds into Personal as a sub-tab (see PersonalHub);
        // Places came back out to top level (2026-08-21).
        case 'places':   return <PlacesHub key="places" userId={userId} theme={theme} sharedOnly={sharedMode} />
        // Household's own sub-tabs — real top-level sections now, for both
        // personal and shared use (2026-08-25, was a single wrapping
        // 'household' tab with its own internal switcher). Same HouseholdHub
        // instance every time, just told which of its own tabs to show via
        // forcedTab. Smart Home is deliberately not one of these cases — it
        // only ever renders inside SmartHomeOverlay now.
        case 'home': case 'calendar': case 'routines': case 'reference':
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
          onHelp={() => setHelpOpen(true)}
          onConnect={() => setConnectOpen(true)}
        />
      )}

      <QuickCapture />
      <UnlockPanel open={unlockReason !== null} reason={unlockReason} onClose={() => setUnlockReason(null)} />
      {/* Shared/kiosk mode gets the Home Bar (both a top strip and, via its
          own sticky bottom:0, effectively the bottom nav too — see below,
          where BottomNav is skipped in sharedMode to avoid a redundant
          second bar). Personal mode is untouched: SectionNav up top,
          BottomNav down below, exactly as before. */}
      {!ambient && !sharedMode && (
        <SectionNav
          sections={navSections}
          activeId={currentTab}
          onSelect={id => { setActiveTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}

      {/* Journey bar — progress + a one-click tutorial. Quiet, disappears
          forever once everything is open. Not XP: no levels, no streaks,
          just "your OS grows as you use it" plus an unlock-now choice. */}
      {!ambient && !prog.loading && !prog.done && (
        <JourneyBar
          unlockedCount={prog.unlockedCount}
          total={prog.total}
          percent={prog.percent}
          stages={prog.stages}
          next={prog.next}
          onOpenEverything={openEverything}
        />
      )}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ArchivePanel open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} lang={lang} />
      <CustomizePanel open={customizeOpen} sections={sections} current={layoutState()} userId={userId} onChange={setSections} onClose={() => setCustomizeOpen(false)} />
      <TodayCustomizePanel open={todayCustomizeOpen} blocks={todayBlocks} current={layoutState()} userId={userId} onChange={setTodayBlocks} onClose={() => setTodayCustomizeOpen(false)} />
      <ConnectPanel open={connectOpen} userId={userId} userEmail={email} onClose={() => setConnectOpen(false)} />

      <main style={{ maxWidth: ambient ? 'none' : 'min(1240px, 94vw)', margin: '0 auto', padding: ambient ? 0 : '1.2rem 2rem 4rem' }}>
        {currentTab === 'brief' && <div id="week-review"><WeekReview mode={mode} /></div>}
        {(() => {
          const s = navSections.find(v => v.id === currentTab)
          // key + .tab-in means React remounts on every tab change, so
          // the entrance animation replays instead of firing once on
          // first render and never again.
          return s ? <div key={s.id} id={`section-${s.id}`} className="tab-in">{renderSection(s.id)}</div> : null
        })()}
        {/* The calendar lives inside Today rather than owning a tab — it's
            something you check, not a place you go to live. Rendered after
            the Brief so the day reads top-down: what's happening, what's
            waiting, then the month around it. Hideable via Customize Today
            (its position here stays fixed — see REORDERABLE in
            lib/utils/todayBlocks.ts for why). */}
        {currentTab === 'brief' && !todayBlocks.find(b => b.id === 'calendar')?.hidden && (
          <div id="brief-calendar" style={{ marginTop: '1.2rem' }}>
            <CalendarEmbed />
          </div>
        )}
      </main>
      {!ambient && !sharedMode && <MobileNav onCapture={() => window.dispatchEvent(new CustomEvent('app:open-quick-capture'))} />}
      {!ambient && !sharedMode && <BottomNav
        sections={navSections}
        activeId={currentTab}
        onSelect={id => { setActiveTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
      />}
      {!ambient && sharedMode && (
        <HomeBar
          groups={HOME_BAR_GROUPS}
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

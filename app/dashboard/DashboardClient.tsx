'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Header from '@/components/layout/Header'
import ThemeProvider from '@/components/ui/ThemeProvider'
import SectionLabel from '@/components/ui/SectionLabel'
import CustomizePanel, { DEFAULT_SECTIONS, DEFAULT_FOCUS_CONFIG, type SectionConfig, type FocusConfig } from '@/components/ui/CustomizePanel'
import FocusViewPanel from '@/components/ui/FocusViewPanel'
import AskJarvisPanel from '@/components/ui/AskJarvisPanel'
import QuickCapture from '@/components/ui/QuickCapture'
import CompanionPanel from '@/components/companion/CompanionPanel'
import ConnectPanel from '@/components/ui/ConnectPanel'
import SearchModal from '@/components/search/SearchModal'
import FocusMode from '@/components/focus/FocusMode'
import ArchivePanel from '@/components/archive/ArchivePanel'
import WeekReview from '@/components/review/WeekReview'
import HelpPanel from '@/components/ui/HelpPanel'
import MobileNav from '@/components/ui/MobileNav'
import BottomNav from '@/components/ui/BottomNav'
import SectionNav from '@/components/ui/SectionNav'
import { useProgression } from '@/lib/hooks/useProgression'
import JourneyBar from '@/components/ui/JourneyBar'
import Village from '@/components/village/Village'
import DailyBrief from '@/components/brief/DailyBrief'
import PersonalHub from '@/components/personal/PersonalHub'
import HouseholdHub from '@/components/household/HouseholdHub'
import CalendarEmbed from '@/components/calendar/CalendarEmbed'
import { createClient } from '@/lib/supabase/client'
import { saveLayout, type LayoutState } from '@/lib/persistence/saveLayout'
import { scrollToAnchor, goToPersonal } from '@/lib/utils/navigate'
import { mergeTodayBlocks, type TodayBlockConfig } from '@/lib/utils/todayBlocks'
import TodayCustomizePanel from '@/components/brief/TodayCustomizePanel'
import { mergePersonalTabs } from '@/lib/utils/personalTabs'
import { mergeHouseholdTabs, mergeHomeBlocks } from '@/lib/utils/householdLayout'
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
  initialMode: string
  initialLayout: SectionConfig[] | null
  initialFocusConfig: FocusConfig | null
  initialSimpleMode: boolean
  initialTodayBlocks: TodayBlockConfig[] | null
  initialPersonalTabs: SectionConfig[] | null
  initialHouseholdTabs: SectionConfig[] | null
  initialHouseholdHomeBlocks: SectionConfig[] | null
}

// Simple mode: Today · Personal · Village. Tasks folded into Personal
// (2026-08-20), so the three-you-open-daily set now names Personal itself
// rather than the sub-tab that used to be a top-level one; Household is
// still "go there when you mean to", which is exactly what a simplified view
// is meant to strip out.
const SIMPLE_SECTION_IDS = new Set(['brief', 'personal', 'village'])

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
  'calendar',                                        // → a panel inside Today
  'work',                                            // → Personal sub-tab 'tasks' (2026-08-20)
  'places',                                          // → Household sub-tab 'places' (2026-08-20)
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
  household: 'ours',
}

export default function DashboardClient({ email, userId, isAnonymous, sharedMode, accountCreatedAt, initialVillageLastSeen, initialUnlockAll, initialName, initialTheme, initialMode, initialLayout, initialFocusConfig, initialSimpleMode, initialTodayBlocks, initialPersonalTabs, initialHouseholdTabs, initialHouseholdHomeBlocks }: Props) {
  const [theme, setTheme] = useState(initialTheme)
  const [mode, setMode] = useState<Mode>(initialMode as Mode)
  const [sections, setSections] = useState<SectionConfig[]>(mergeLayout(initialLayout))
  const [focusConfig, setFocusConfig] = useState<FocusConfig>(initialFocusConfig ?? DEFAULT_FOCUS_CONFIG)
  // Personal/Household sub-tab and Home-block customization (2026-08-12) —
  // same reasoning as todayBlocks below: owned here because saveLayout()
  // needs the FULL LayoutState to avoid the five-writer bug its own header
  // comment describes, so the write path lives at this level even though the
  // customize UI itself renders inside PersonalHub/HouseholdHub.
  const [personalTabs, setPersonalTabs] = useState<SectionConfig[]>(mergePersonalTabs(initialPersonalTabs))
  const [householdTabs, setHouseholdTabs] = useState<SectionConfig[]>(mergeHouseholdTabs(initialHouseholdTabs))
  const [householdHomeBlocks, setHouseholdHomeBlocks] = useState<SectionConfig[]>(mergeHomeBlocks(initialHouseholdHomeBlocks))
  const [simpleMode, setSimpleMode] = useState(initialSimpleMode)
  const [todayBlocks, setTodayBlocks] = useState<TodayBlockConfig[]>(mergeTodayBlocks(initialTodayBlocks))

  const lang = 'en' as const
  const [activeTab, setActiveTab] = useState('brief')
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [todayCustomizeOpen, setTodayCustomizeOpen] = useState(false)
  const [companionsOpen, setCompanionsOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [zenView, setZenView] = useState(false)
  const [focusPanelOpen, setFocusPanelOpen] = useState(false)
  const [jarvisOpen, setJarvisOpen] = useState(false)

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
    return { sections, focus: focusConfig, simpleMode, unlockAll, todayBlocks, personalTabs, householdTabs, householdHomeBlocks, villageLastSeen: villageLastSeen ?? undefined }
  }

  async function toggleCollapsed(id: string) {
    const next = sections.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s)
    setSections(next)
    await saveLayout(userId, layoutState(), { sections: next })
  }

  async function changePersonalTabs(next: SectionConfig[]) {
    setPersonalTabs(next)
    await saveLayout(userId, layoutState(), { personalTabs: next })
  }

  async function changeHouseholdTabs(next: SectionConfig[]) {
    setHouseholdTabs(next)
    await saveLayout(userId, layoutState(), { householdTabs: next })
  }

  async function changeHouseholdHomeBlocks(next: SectionConfig[]) {
    setHouseholdHomeBlocks(next)
    await saveLayout(userId, layoutState(), { householdHomeBlocks: next })
  }

  async function toggleSimpleMode() {
    const next = !simpleMode
    setSimpleMode(next)
    await saveLayout(userId, layoutState(), { simpleMode: next })
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

  // Tab navigation from anywhere (Today's summary cards, search, Jarvis).
  // 'week-review', 'brief-inbox' and 'brief-calendar' are anchors inside the
  // Today tab rather than tabs of their own.
  // A direct request for a still-gated section (from search or Jarvis, say)
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

  // Entering Focus view from anywhere (e.g. the Brief energy row / Recovery).
  useEffect(() => {
    function onFocus() { setZenView(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    window.addEventListener('4s:enter-focus', onFocus)
    return () => window.removeEventListener('4s:enter-focus', onFocus)
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === '/' || e.key.toLowerCase() === 'k')) { e.preventDefault(); setSearchOpen(s => !s) }
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

  const visible = sections.filter(s =>
    !s.hidden
    && prog.isUnlocked(s.id)
    && (!zenView || focusConfig.sections.includes(s.id))
    && (!simpleMode || SIMPLE_SECTION_IDS.has(s.id))
    && (!sharedMode || s.id === 'household')
  )

  // Tab mode: only the active section renders. If the active tab was hidden
  // (customize / simple mode / focus view), fall back to the first visible one.
  const currentTab = visible.some(s => s.id === activeTab) ? activeTab : (visible[0]?.id ?? 'brief')

  function sectionLabel(id: string, idx: number): { label: string; group?: string } {
    const group = SECTION_GROUPS[id]
    const isFirstInGroup = idx === 0 || SECTION_GROUPS[visible[idx - 1]?.id] !== group

    const LABELS: Record<string, string> = {
      brief: t('Today', lang), village: t('Village', lang),
      // "Shared" (2026-08-20), not "Household" — the id stays 'household'
      // (every saved layout, goToSection call and RLS-adjacent check names
      // it), but the label now matches the vocabulary the PIN login screen
      // already uses: Personal vs Shared is the one split that runs through
      // the whole app now, not a name that happens to mean the same thing.
      personal: t('Personal', lang), household: t('Shared', lang),
    }

    return { label: LABELS[id] ?? id, group: isFirstInGroup ? group : undefined }
  }

  // Collapse only applies in Focus View's stacked layout — in tab mode the
  // active section is always expanded and the toggle is hidden.
  function renderSection(id: string, idx: number, collapsed: boolean, stacked: boolean) {
    const { label, group } = sectionLabel(id, idx)
    const isFirst = !stacked || idx === 0

    const heading = (
      <SectionLabel
        key={`lbl-${id}`}
        style={isFirst ? { marginTop: 0 } : undefined}
        group={group}
        collapsed={stacked ? collapsed : false}
        onToggleCollapse={stacked ? () => toggleCollapsed(id) : undefined}
      >
        {label}
      </SectionLabel>
    )

    const body = (() => {
      switch (id) {
        case 'brief':    return <DailyBrief key="brief" userId={userId} mode={mode} calendarConnected blocks={todayBlocks} onOpenCustomize={() => setTodayCustomizeOpen(true)} />
        case 'village':  return <Village key="village" userId={userId} theme={theme} accountCreatedAt={accountCreatedAt} lastSeen={villageLastSeen} onSeen={markVillageSeen} />
        case 'personal': return <PersonalHub key="personal" userId={userId} userEmail={email} mode={mode} onOpenCompanions={() => setCompanionsOpen(true)} tabs={personalTabs} onChangeTabs={changePersonalTabs} />
        // Tasks and Places both fold in as sub-tabs now (2026-08-20) — see
        // components/personal/PersonalHub.tsx and components/household/HouseholdHub.tsx.
        case 'household': return <HouseholdHub key="household" userId={userId} userEmail={email} theme={theme} tabs={householdTabs} onChangeTabs={changeHouseholdTabs} homeBlocks={householdHomeBlocks} onChangeHomeBlocks={changeHouseholdHomeBlocks} sharedMode={sharedMode} />
        default: return null
      }
    })()

    return <>{heading}<div style={{ display: stacked && collapsed ? 'none' : undefined }}>{body}</div></>
  }

  return (
    <LangContext.Provider value={lang}>
    <ThemeProvider theme={theme}>
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
      <Header
        email={email} userId={userId} initialName={initialName} sharedMode={sharedMode}
        initialTheme={theme} initialMode={mode}
        onThemeChange={setTheme} onModeChange={setMode}
        onCustomize={() => setCustomizeOpen(true)}
        onCompanions={() => setCompanionsOpen(true)}
        onSearch={() => setSearchOpen(true)}
        onArchive={() => setArchiveOpen(true)}
        onHelp={() => setHelpOpen(true)}
        onJarvis={() => setJarvisOpen(true)}
        onCouncil={() => goToPersonal('council')}
        onConnect={() => setConnectOpen(true)}
        zenView={zenView}
        onToggleZen={() => setZenView(z => !z)}
        onConfigureFocus={() => setFocusPanelOpen(true)}
        simpleMode={simpleMode}
        onToggleSimple={toggleSimpleMode}
      />

      <QuickCapture />
      {!zenView && (
        <SectionNav
          sections={visible}
          activeId={currentTab}
          onSelect={id => { setActiveTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}

      {/* Journey bar — progress + a one-click tutorial. Quiet, disappears
          forever once everything is open. Not XP: no levels, no streaks,
          just "your OS grows as you use it" plus an unlock-now choice. */}
      {!zenView && !prog.loading && !prog.done && (
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
      <AskJarvisPanel open={jarvisOpen} userId={userId} mode={mode} calendarConnected onClose={() => setJarvisOpen(false)} />
      <ArchivePanel open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} lang={lang} />
      <CustomizePanel open={customizeOpen} sections={sections} current={layoutState()} userId={userId} onChange={setSections} onClose={() => setCustomizeOpen(false)} />
      <TodayCustomizePanel open={todayCustomizeOpen} blocks={todayBlocks} current={layoutState()} userId={userId} onChange={setTodayBlocks} onClose={() => setTodayCustomizeOpen(false)} />
      <FocusViewPanel open={focusPanelOpen} sections={sections} focusConfig={focusConfig} current={layoutState()} userId={userId} onChange={setFocusConfig} onClose={() => setFocusPanelOpen(false)} />
      <CompanionPanel open={companionsOpen} userId={userId} userEmail={email} onClose={() => setCompanionsOpen(false)} />
      <ConnectPanel
        open={connectOpen} userId={userId} userEmail={email} onClose={() => setConnectOpen(false)}
        onOpenCompanions={() => setCompanionsOpen(true)}
      />

      <main style={{ maxWidth: 'min(1080px, 94vw)', margin: '0 auto', padding: '1.2rem 2rem 4rem' }}>
        {!zenView && currentTab === 'brief' && <div id="week-review"><WeekReview mode={mode} /></div>}
        {zenView && <FocusMode />}
        {zenView
          ? visible.map((s, i) => (
              <div key={s.id} id={`section-${s.id}`}>{renderSection(s.id, i, !!s.collapsed, true)}</div>
            ))
          : (() => {
              const s = visible.find(v => v.id === currentTab)
              // key + .tab-in means React remounts on every tab change, so
              // the entrance animation replays instead of firing once on
              // first render and never again.
              return s ? <div key={s.id} id={`section-${s.id}`} className="tab-in">{renderSection(s.id, 0, false, false)}</div> : null
            })()
        }
        {/* The calendar lives inside Today rather than owning a tab — it's
            something you check, not a place you go to live. Rendered after
            the Brief so the day reads top-down: what's happening, what's
            waiting, then the month around it. Hideable via Customize Today
            (its position here stays fixed — see REORDERABLE in
            lib/utils/todayBlocks.ts for why). */}
        {!zenView && currentTab === 'brief' && !todayBlocks.find(b => b.id === 'calendar')?.hidden && (
          <div id="brief-calendar" style={{ marginTop: '1.2rem' }}>
            <CalendarEmbed />
          </div>
        )}
      </main>
      <MobileNav onCapture={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))} />
      {!zenView && (
        <BottomNav
          sections={visible}
          activeId={currentTab}
          onSelect={id => { setActiveTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}
    </ThemeProvider>
    </LangContext.Provider>
  )
}

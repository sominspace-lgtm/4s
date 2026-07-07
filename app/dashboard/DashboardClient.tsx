'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import ThemeProvider from '@/components/ui/ThemeProvider'
import SectionLabel from '@/components/ui/SectionLabel'
import CustomizePanel, { DEFAULT_SECTIONS, DEFAULT_FOCUS_CONFIG, type SectionConfig, type FocusConfig } from '@/components/ui/CustomizePanel'
import FocusViewPanel from '@/components/ui/FocusViewPanel'
import AskJarvisPanel from '@/components/ui/AskJarvisPanel'
import TimerWidget from '@/components/focus/TimerWidget'
import QuickCapture from '@/components/ui/QuickCapture'
import TipsBanner from '@/components/ui/TipsBanner'
import CompanionPanel from '@/components/companion/CompanionPanel'
import SearchModal from '@/components/search/SearchModal'
import FocusMode from '@/components/focus/FocusMode'
import ArchivePanel from '@/components/archive/ArchivePanel'
import WeekReview from '@/components/review/WeekReview'
import HelpPanel from '@/components/ui/HelpPanel'
import MobileNav from '@/components/ui/MobileNav'
import BottomNav from '@/components/ui/BottomNav'
import SectionNav from '@/components/ui/SectionNav'
import DailyBrief from '@/components/brief/DailyBrief'
import HabitTracker from '@/components/habits/HabitTracker'
import DomainGrid from '@/components/domains/DomainGrid'
import MoneyHub from '@/components/money/MoneyHub'
import CouncilSection from '@/components/council/CouncilSection'
import SharedHub from '@/components/companion/SharedHub'
import CalendarEmbed from '@/components/calendar/CalendarEmbed'
import MasterDashboard from '@/components/work/MasterDashboard'
import FeedbackBox from '@/components/feedback/FeedbackBox'
import { createClient } from '@/lib/supabase/client'
import { dueUrgency } from '@/lib/hooks/useWorkItems'
import type { Mode } from '@/lib/constants/modes'
import { t } from '@/lib/i18n'
import { LangContext } from '@/lib/LangContext'

interface Props {
  email: string
  userId: string
  initialName: string | null
  initialTheme: string
  initialMode: string
  initialCalendarUrl: string | null
  initialLayout: SectionConfig[] | null
  initialFocusConfig: FocusConfig | null
  initialSimpleMode: boolean
}

// Simple mode: Today (Brief) · Quick Add (inside Brief) · Tasks · Calendar · Shared
const SIMPLE_SECTION_IDS = new Set(['brief', 'work', 'calendar', 'shared'])

// Folded into Money hub / Brief — strip from any saved layout so returning
// users don't see dangling, unrenderable section headings.
const DEPRECATED_SECTION_IDS = new Set(['pulse', 'wishlist', 'spending', 'capture', 'people'])

function mergeLayout(saved: SectionConfig[] | null): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_SECTIONS
  const cleaned = saved.filter(s => !DEPRECATED_SECTION_IDS.has(s.id))
  const savedIds = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_SECTIONS.filter(s => !savedIds.has(s.id))
  return [...cleaned, ...missing]
}

const SECTION_GROUPS: Record<string, string> = {
  brief:    'at a glance',
  work:     'focus',
  habits:   'focus',
  domains:  'life',
  money:    'money',
  calendar: 'review',
  council:  'review',
  shared:   'companions',
}

export default function DashboardClient({ email, userId, initialName, initialTheme, initialMode, initialCalendarUrl, initialLayout, initialFocusConfig, initialSimpleMode }: Props) {
  const [theme, setTheme] = useState(initialTheme)
  const [mode, setMode] = useState<Mode>(initialMode as Mode)
  const [sections, setSections] = useState<SectionConfig[]>(mergeLayout(initialLayout))
  const [focusConfig, setFocusConfig] = useState<FocusConfig>(initialFocusConfig ?? DEFAULT_FOCUS_CONFIG)
  const [simpleMode, setSimpleMode] = useState(initialSimpleMode)

  const lang = 'en' as const
  const [activeTab, setActiveTab] = useState('brief')
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [companionsOpen, setCompanionsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [zenView, setZenView] = useState(false)
  const [focusPanelOpen, setFocusPanelOpen] = useState(false)
  const [jarvisOpen, setJarvisOpen] = useState(false)

  async function toggleCollapsed(id: string) {
    const next = sections.map(s => s.id === id ? { ...s, collapsed: !s.collapsed } : s)
    setSections(next)
    const supabase = createClient()
    await supabase.from('user_prefs').upsert({ user_id: userId, layout: { sections: next, focus: focusConfig, simpleMode } })
  }

  async function toggleSimpleMode() {
    const next = !simpleMode
    setSimpleMode(next)
    const supabase = createClient()
    await supabase.from('user_prefs').upsert({ user_id: userId, layout: { sections, focus: focusConfig, simpleMode: next } })
  }

  // Tab navigation from anywhere (Brief summary cards, search, Jarvis).
  // 'week-review' and 'brief-inbox' are anchors inside the Brief tab.
  useEffect(() => {
    function onNav(e: Event) {
      const id = (e as CustomEvent<string>).detail
      const anchor = id === 'week-review' || id === 'brief-inbox' ? id : null
      setActiveTab(anchor ? 'brief' : id)
      requestAnimationFrame(() => {
        if (anchor) document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        else window.scrollTo({ top: 0, behavior: 'smooth' })
      })
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

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === '/' || e.key.toLowerCase() === 'k')) { e.preventDefault(); setSearchOpen(s => !s) }
      if (e.key === 'Escape') { setSearchOpen(false); setFocusOpen(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Notify about overdue items on load (if permission granted)
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const supabase = createClient()
    supabase.from('work_items')
      .select('title, due_date, status')
      .neq('status', 'done')
      .then(({ data }) => {
        const overdue = (data ?? []).filter(i => dueUrgency(i.due_date) === 'overdue')
        if (overdue.length > 0) {
          new Notification('4S — overdue items', {
            body: overdue.length === 1
              ? `"${overdue[0].title}" is overdue`
              : `${overdue.length} items are overdue`,
            icon: '/icons/192.png',
          })
        }
      })
  }, [])

  const visible = sections.filter(s =>
    !s.hidden
    && (!zenView || focusConfig.sections.includes(s.id))
    && (!simpleMode || SIMPLE_SECTION_IDS.has(s.id))
  )

  // Tab mode: only the active section renders. If the active tab was hidden
  // (customize / simple mode / focus view), fall back to the first visible one.
  const currentTab = visible.some(s => s.id === activeTab) ? activeTab : (visible[0]?.id ?? 'brief')

  function sectionLabel(id: string, idx: number): { label: string; group?: string } {
    const group = SECTION_GROUPS[id]
    const isFirstInGroup = idx === 0 || SECTION_GROUPS[visible[idx - 1]?.id] !== group

    const LABELS: Record<string, string> = {
      brief: t('Brief', lang), work: t('Tasks', lang), habits: t('Habits', lang),
      domains: t('Life', lang),
      money: t('Money', lang), calendar: t('Calendar', lang),
      council: t('Council', lang), shared: t('Shared', lang),
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
        case 'brief':    return <DailyBrief key="brief" userId={userId} mode={mode} calendarConnected={!!initialCalendarUrl} onOpenCompanions={() => setCompanionsOpen(true)} />
        case 'work':     return <MasterDashboard key="work" userId={userId} />
        case 'habits':   return <HabitTracker key="habits" />
        case 'domains':  return <DomainGrid key="domains" />
        case 'money':    return <MoneyHub key="money" userId={userId} />
        case 'calendar': return <CalendarEmbed key="calendar" userId={userId} initialUrl={initialCalendarUrl} />
        case 'council':  return <CouncilSection key="council" mode={mode} userId={userId} calendarConnected={!!initialCalendarUrl} />
        case 'shared':   return <SharedHub key="shared" userId={userId} userEmail={email} onOpenCompanions={() => setCompanionsOpen(true)} />
        default: return null
      }
    })()

    return <>{heading}<div style={{ display: stacked && collapsed ? 'none' : undefined }}>{body}</div></>
  }

  return (
    <LangContext.Provider value={lang}>
    <ThemeProvider theme={theme}>
      <Header
        email={email} userId={userId} initialName={initialName}
        initialTheme={theme} initialMode={mode}
        onThemeChange={setTheme} onModeChange={setMode}
        onCustomize={() => setCustomizeOpen(true)}
        onCompanions={() => setCompanionsOpen(true)}
        onSearch={() => setSearchOpen(true)}
        onFocus={() => setFocusOpen(true)}
        onArchive={() => setArchiveOpen(true)}
        onHelp={() => setHelpOpen(true)}
      />

      <QuickCapture />
      <div className="page-pad controls-row" style={{ maxWidth: 'min(1080px, 94vw)', margin: '0 auto', padding: '0 2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', flexWrap: 'wrap' }}>
        <button onClick={() => setJarvisOpen(true)} title="Ask a question about your day" className="pill pill-accent">
          <span aria-hidden>✦</span> Ask Jarvis
        </button>
        <button
          onClick={() => setZenView(z => !z)}
          title="Focus View — hide everything but what matters today"
          className={`pill${zenView ? ' pill-on' : ''}`}
        >
          <span aria-hidden>◐</span> {zenView ? 'Exit focus' : 'Focus view'}
        </button>
        {zenView && (
          <button onClick={() => setFocusPanelOpen(true)} title="Choose what Focus View shows" className="pill">
            <span aria-hidden>⚙</span> Configure
          </button>
        )}
        <button
          onClick={toggleSimpleMode}
          title={simpleMode ? 'Show all tabs' : 'Show only Brief, Tasks, Calendar, and Shared'}
          className={`pill${simpleMode ? ' pill-on' : ''}`}
        >
          <span aria-hidden>{simpleMode ? '▦' : '▤'}</span> {simpleMode ? 'Full view' : 'Simple view'}
        </button>
        <Link href="/guide" title="How to use 4S" className="pill">
          <span aria-hidden>?</span> Guide
        </Link>
      </div>
      {!zenView && (
        <SectionNav
          sections={visible}
          activeId={currentTab}
          onSelect={id => { setActiveTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AskJarvisPanel open={jarvisOpen} userId={userId} calendarConnected={!!initialCalendarUrl} onClose={() => setJarvisOpen(false)} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />
      <ArchivePanel open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} lang={lang} />
      <CustomizePanel open={customizeOpen} sections={sections} focusConfig={focusConfig} simpleMode={simpleMode} userId={userId} onChange={setSections} onClose={() => setCustomizeOpen(false)} />
      <FocusViewPanel open={focusPanelOpen} sections={sections} focusConfig={focusConfig} simpleMode={simpleMode} userId={userId} onChange={setFocusConfig} onClose={() => setFocusPanelOpen(false)} />
      <CompanionPanel open={companionsOpen} userId={userId} userEmail={email} onClose={() => setCompanionsOpen(false)} />

      <main style={{ maxWidth: 'min(1080px, 94vw)', margin: '0 auto', padding: '1.2rem 2rem 4rem' }}>
        {!zenView && currentTab === 'brief' && <TipsBanner />}
        {!zenView && currentTab === 'brief' && <div id="week-review"><WeekReview /></div>}
        {zenView && focusConfig.showTimer && (
          <div style={{ marginBottom: '1.2rem' }}><TimerWidget /></div>
        )}
        {zenView
          ? visible.map((s, i) => (
              <div key={s.id} id={`section-${s.id}`}>{renderSection(s.id, i, !!s.collapsed, true)}</div>
            ))
          : (() => {
              const s = visible.find(v => v.id === currentTab)
              return s ? <div key={s.id} id={`section-${s.id}`}>{renderSection(s.id, 0, false, false)}</div> : null
            })()
        }
        <FeedbackBox />
      </main>
      <MobileNav
        onCapture={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
        onSearch={() => setSearchOpen(true)}
        onFocus={() => setFocusOpen(true)}
      />
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

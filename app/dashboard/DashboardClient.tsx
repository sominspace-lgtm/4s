'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import ThemeProvider from '@/components/ui/ThemeProvider'
import SectionLabel from '@/components/ui/SectionLabel'
import CustomizePanel, { DEFAULT_SECTIONS, type SectionConfig } from '@/components/ui/CustomizePanel'
import QuickCapture from '@/components/ui/QuickCapture'
import TipsBanner from '@/components/ui/TipsBanner'
import CompanionPanel from '@/components/companion/CompanionPanel'
import SearchModal from '@/components/search/SearchModal'
import FocusMode from '@/components/focus/FocusMode'
import ArchivePanel from '@/components/archive/ArchivePanel'
import WeekReview from '@/components/review/WeekReview'
import HelpPanel from '@/components/ui/HelpPanel'
import MobileNav from '@/components/ui/MobileNav'
import XPBar from '@/components/gamer/XPBar'
import SectionNav from '@/components/ui/SectionNav'
import DailyBrief from '@/components/brief/DailyBrief'
import CaptureSection from '@/components/capture/CaptureSection'
import PulseSection from '@/components/pulse/PulseSection'
import HabitTracker from '@/components/habits/HabitTracker'
import DomainGrid from '@/components/domains/DomainGrid'
import SubsCard from '@/components/subscriptions/SubsCard'
import WishlistCard from '@/components/watchlist/WishlistCard'
import BuylistCard from '@/components/watchlist/BuylistCard'
import CouncilSection from '@/components/council/CouncilSection'
import CalendarEmbed from '@/components/calendar/CalendarEmbed'
import MasterDashboard from '@/components/work/MasterDashboard'
import FeedbackBox from '@/components/feedback/FeedbackBox'
import { createClient } from '@/lib/supabase/client'
import { dueUrgency } from '@/lib/hooks/useWorkItems'
import { useXP } from '@/lib/hooks/useXP'
import type { Mode } from '@/lib/constants/modes'
import { t, type Lang } from '@/lib/i18n'
import { LangContext } from '@/lib/LangContext'

interface Props {
  email: string
  userId: string
  initialName: string | null
  initialTheme: string
  initialMode: string
  initialCalendarUrl: string | null
  initialLayout: SectionConfig[] | null
}

function mergeLayout(saved: SectionConfig[] | null): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_SECTIONS
  const savedIds = new Set(saved.map(s => s.id))
  const missing = DEFAULT_SECTIONS.filter(s => !savedIds.has(s.id))
  return [...saved, ...missing]
}

const SECTION_GROUPS: Record<string, string> = {
  brief:    'at a glance',
  work:     'focus',
  habits:   'focus',
  capture:  'inbox',
  domains:  'inbox',
  pulse:    'check-in',
  wishlist: 'money',
  spending: 'money',
  calendar: 'review',
  council:  'review',
}

export default function DashboardClient({ email, userId, initialName, initialTheme, initialMode, initialCalendarUrl, initialLayout }: Props) {
  const [theme, setTheme] = useState(initialTheme)
  const [mode, setMode] = useState<Mode>(initialMode as Mode)
  const [sections, setSections] = useState<SectionConfig[]>(mergeLayout(initialLayout))
  const isGamer = mode === 'gamer'
  const { xp, level, progress, gain } = useXP(isGamer)

  // Listen for XP gain events (fired by work/habit hooks)
  useEffect(() => {
    function onXP(e: Event) { gain((e as CustomEvent<number>).detail) }
    window.addEventListener('4s:xp', onXP)
    return () => window.removeEventListener('4s:xp', onXP)
  }, [gain])

  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') return (localStorage.getItem('4s-lang') as Lang) ?? 'en'
    return 'en'
  })
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [companionsOpen, setCompanionsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); setSearchOpen(s => !s) }
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
            icon: '/icon-192.png',
          })
        }
      })
  }, [])

  const visible = sections.filter(s => !s.hidden)

  function sectionLabel(id: string, idx: number): { label: string; group?: string } {
    const group = SECTION_GROUPS[id]
    const isFirstInGroup = idx === 0 || SECTION_GROUPS[visible[idx - 1]?.id] !== group

    const LABELS: Record<string, string> = {
      brief: t('Today', lang), work: t('Work Hub', lang), habits: t('Daily Habits', lang),
      capture: t('Capture', lang), domains: t('Domains', lang),
      pulse: t("Today's Pulse", lang), wishlist: t('Wishlist', lang),
      spending: t('Recurring Spending', lang), calendar: t('Calendar', lang),
      council: t('Your Council', lang),
    }

    return { label: LABELS[id] ?? id, group: isFirstInGroup ? group : undefined }
  }

  function renderSection(id: string, idx: number) {
    const { label, group } = sectionLabel(id, idx)
    const isFirst = idx === 0

    const heading = (
      <SectionLabel key={`lbl-${id}`} style={isFirst ? { marginTop: 0 } : undefined} group={group}>
        {label}
      </SectionLabel>
    )

    switch (id) {
      case 'brief':    return <>{heading}<DailyBrief key="brief" /></>
      case 'capture':  return <>{heading}<CaptureSection key="capture" /></>
      case 'work':     return <>{heading}<MasterDashboard key="work" /></>
      case 'pulse':    return <>{heading}<PulseSection key="pulse" /></>
      case 'habits':   return <>{heading}<HabitTracker key="habits" /></>
      case 'domains':  return <>{heading}<DomainGrid key="domains" /></>
      case 'spending': return (
        <>
          {heading}
          <div key="spending" className="grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            <SubsCard /><BuylistCard />
          </div>
        </>
      )
      case 'wishlist': return <>{heading}<WishlistCard key="wishlist" /></>
      case 'calendar': return <>{heading}<CalendarEmbed key="calendar" userId={userId} initialUrl={initialCalendarUrl} /></>
      case 'council':  return <>{heading}<CouncilSection key="council" mode={mode} /></>
      default: return null
    }
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
        lang={lang}
        onLangToggle={() => {
          const next = lang === 'en' ? 'ko' : 'en'
          setLang(next)
          localStorage.setItem('4s-lang', next)
        }}
      />

      <QuickCapture />
      {isGamer && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem 0.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <XPBar />
          <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5 }}>
            LVL {level} · {xp} total XP · +25 per task, +10 per habit
          </span>
        </div>
      )}
      <SectionNav sections={visible} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <FocusMode open={focusOpen} onClose={() => setFocusOpen(false)} />
      <ArchivePanel open={archiveOpen} onClose={() => setArchiveOpen(false)} />
      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} lang={lang} />
      <CustomizePanel open={customizeOpen} sections={sections} userId={userId} onChange={setSections} onClose={() => setCustomizeOpen(false)} />
      <CompanionPanel open={companionsOpen} userId={userId} userEmail={email} onClose={() => setCompanionsOpen(false)} />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        <TipsBanner />
        <WeekReview />
        {visible.map((s, i) => (
          <div key={s.id} id={`section-${s.id}`}>{renderSection(s.id, i)}</div>
        ))}
        <FeedbackBox />
      </main>
      <MobileNav
        onCapture={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
        onSearch={() => setSearchOpen(true)}
        onFocus={() => setFocusOpen(true)}
      />
    </ThemeProvider>
    </LangContext.Provider>
  )
}

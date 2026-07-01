'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import ThemeProvider from '@/components/ui/ThemeProvider'
import SectionLabel from '@/components/ui/SectionLabel'
import CustomizePanel, { DEFAULT_SECTIONS, type SectionConfig } from '@/components/ui/CustomizePanel'
import QuickCapture from '@/components/ui/QuickCapture'
import TipsBanner from '@/components/ui/TipsBanner'
import CompanionPanel from '@/components/companion/CompanionPanel'
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
import DigestCard from '@/components/digest/DigestCard'
import MasterDashboard from '@/components/work/MasterDashboard'
import { createClient } from '@/lib/supabase/client'
import { dueUrgency } from '@/lib/hooks/useWorkItems'
import type { Mode } from '@/lib/constants/modes'

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
  capture:  'act',
  work:     'act',
  pulse:    'act',
  habits:   'build',
  domains:  'build',
  spending: 'money',
  wishlist: 'money',
  calendar: 'review',
  digest:   'review',
  council:  'review',
}

export default function DashboardClient({ email, userId, initialName, initialTheme, initialMode, initialCalendarUrl, initialLayout }: Props) {
  const [theme, setTheme] = useState(initialTheme)
  const [mode, setMode] = useState<Mode>(initialMode as Mode)
  const [sections, setSections] = useState<SectionConfig[]>(mergeLayout(initialLayout))
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [companionsOpen, setCompanionsOpen] = useState(false)

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
      brief: 'Today', capture: 'Capture', work: 'Work Hub',
      pulse: "Today's Pulse", habits: 'Daily Habits', domains: 'Your Domains',
      spending: 'Recurring Spending', wishlist: 'Wishlist',
      calendar: 'Calendar', digest: 'AI Digest', council: 'Your Council',
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
      case 'digest':   return <>{heading}<DigestCard key="digest" /></>
      case 'council':  return <>{heading}<CouncilSection key="council" mode={mode} /></>
      default: return null
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <Header
        email={email} userId={userId} initialName={initialName}
        initialTheme={theme} initialMode={mode}
        onThemeChange={setTheme} onModeChange={setMode}
        onCustomize={() => setCustomizeOpen(true)}
        onCompanions={() => setCompanionsOpen(true)}
      />

      <QuickCapture />
      <CustomizePanel open={customizeOpen} sections={sections} userId={userId} onChange={setSections} onClose={() => setCustomizeOpen(false)} />
      <CompanionPanel open={companionsOpen} userId={userId} userEmail={email} onClose={() => setCompanionsOpen(false)} />

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        <TipsBanner />
        {visible.map((s, i) => (
          <div key={s.id}>{renderSection(s.id, i)}</div>
        ))}
      </main>
    </ThemeProvider>
  )
}

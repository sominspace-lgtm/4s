'use client'

import { useEffect, useState } from 'react'
import MasterDashboard from '@/components/work/MasterDashboard'
import GoalsSection from '@/components/goals/GoalsSection'
import HabitTracker from '@/components/habits/HabitTracker'
import PersonalRoutines from '@/components/habits/PersonalRoutines'
import NotesHub from '@/components/notes/NotesHub'
import MoneyHub from '@/components/money/MoneyHub'
import PeopleHub from '@/components/people/PeopleHub'
import PreferencesHub from '@/components/personal/PreferencesHub'
import PersonalOverview from '@/components/personal/PersonalOverview'
import CouncilSection from '@/components/council/CouncilSection'
import SectionCustomizer, { type SectionConfig } from '@/components/ui/SectionCustomizer'
import { DEFAULT_PERSONAL_TABS } from '@/lib/utils/personalTabs'
import { consumePersonalTab, type PersonalTab } from '@/lib/utils/navigate'
import type { Mode } from '@/lib/constants/modes'

// Personal — everything that's about you, in one place: your habits, your
// life areas, your money, your people, and the Council that reads all of it.
//
// The counterpart is Household (what we share). That's the actual split a
// person feels day to day — "mine" vs "ours" — and it's a better dividing
// line than the old one, where Money and People each owned a top-level tab
// despite being visited far less often than Today or Tasks.
//
// Deliberately FLAT: Habits/Life/Council used to live inside a Growth tab,
// which would have meant Personal → Growth → Council, three levels deep for
// something that's one click from the Brief. Growth is dissolved here rather
// than nested — five sibling sub-tabs beat two levels of hierarchy.
//
// Sub-tabs are reorderable/hideable as of 2026-08-12 — `tabs` is owned by
// DashboardClient (see its layoutState()/saveLayout wiring) and passed down
// here, same relationship Today has with its own blocks.
//
// Council is a real tab again as of 2026-08-21 — it used to live only in
// the header ⋯ menu next to Ask Jarvis, both gone now. goToPersonal
// ('council') from the Brief's "Ask Council" card still lands here exactly
// as before; it's just also reachable by clicking the tab like anything else.
export default function PersonalHub({ userId, mode, tabs, onChangeTabs }: {
  userId: string
  mode: Mode
  tabs: SectionConfig[]
  onChangeTabs: (next: SectionConfig[]) => void
}) {
  // A caller can ask for a specific sub-tab (Brief's "Ask Council" card,
  // search's "Go to Money"). See lib/utils/navigate.ts for why this is both
  // a consumed value and a live event.
  const [tab, setTab] = useState<PersonalTab>(() => consumePersonalTab() ?? 'tasks')
  const [customizeOpen, setCustomizeOpen] = useState(false)

  // A deep link (search, Brief) must never land on a tab the user has
  // hidden via customize — un-hide it rather than rendering a blank pane,
  // the same "progression is a suggested order, not a wall" reasoning
  // DashboardClient already applies to top-level sections.
  function goTo(id: PersonalTab) {
    setTab(id)
    const entry = tabs.find(t => t.id === id)
    if (entry?.hidden) onChangeTabs(tabs.map(t => (t.id === id ? { ...t, hidden: false } : t)))
  }

  useEffect(() => {
    function onTab(e: Event) { goTo((e as CustomEvent<PersonalTab>).detail) }
    window.addEventListener('4s:personal-tab', onTab)
    return () => window.removeEventListener('4s:personal-tab', onTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs])

  const visibleTabs = tabs.filter(t => !t.hidden)

  return (
    <div>
      {/* Control-center strip (2026-08-21) — glance-level state before you
          pick a sub-tab. Own component, own hooks; nothing here reaches into
          MasterDashboard/HabitTracker/GoalsSection's own state. */}
      <PersonalOverview userId={userId} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
        <div className="tabs-wrap" style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
          {visibleTabs.map(tb => (
            <button key={tb.id} onClick={() => goTo(tb.id as PersonalTab)} className="btn press" style={{
              fontSize: '0.72rem', padding: '0.4em 0.9em',
              background: tab === tb.id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
              color: tab === tb.id ? 'var(--gold)' : 'var(--muted)', border: 'none',
            }}>{tb.label}</button>
          ))}
        </div>
        <button onClick={() => setCustomizeOpen(true)} title="Customize Personal" className="press" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.6, fontSize: '0.85rem', padding: '0.3rem',
        }}>⚙</button>
      </div>

      {tab === 'tasks'   && <MasterDashboard userId={userId} />}
      {tab === 'goals'   && <GoalsSection userId={userId} />}
      {tab === 'habits'  && <><PersonalRoutines userId={userId} /><HabitTracker /></>}
      {tab === 'notes'   && <NotesHub userId={userId} />}
      {tab === 'money'   && <MoneyHub userId={userId} />}
      {tab === 'people'  && <PeopleHub />}
      {tab === 'preferences' && <PreferencesHub userId={userId} />}
      {tab === 'council' && <CouncilSection mode={mode} userId={userId} calendarConnected />}

      <SectionCustomizer
        open={customizeOpen}
        title="Customize Personal"
        sections={tabs}
        defaultSections={DEFAULT_PERSONAL_TABS}
        onChange={onChangeTabs}
        onClose={() => setCustomizeOpen(false)}
      />
    </div>
  )
}

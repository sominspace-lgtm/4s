'use client'

import { useEffect, useState } from 'react'
import GoalsSection from '@/components/goals/GoalsSection'
import HabitTracker from '@/components/habits/HabitTracker'
import LifeHub from '@/components/life/LifeHub'
import MoneyHub from '@/components/money/MoneyHub'
import PeopleHub from '@/components/people/PeopleHub'
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
// Council is deliberately NOT in `tabs` at all (2026-08-11, unchanged by the
// customization work). It's an action you invoke occasionally, not a place
// you live, and as a sixth tab it competed for attention with Goals and
// Habits every single visit. It now lives in the header ⋯ menu next to Ask
// Jarvis — same reasoning, same kind of thing. The 'council' tab id still
// works, so goToPersonal('council') from the menu (and the Brief's Council
// card) lands here exactly as before, and it never gets a customize-panel
// row since it was never a visible tab to begin with.
export default function PersonalHub({ userId, userEmail, mode, onOpenCompanions, tabs, onChangeTabs }: {
  userId: string
  userEmail: string
  mode: Mode
  onOpenCompanions: () => void
  tabs: SectionConfig[]
  onChangeTabs: (next: SectionConfig[]) => void
}) {
  // A caller can ask for a specific sub-tab (Brief's "Ask Council" card,
  // search's "Go to Money"). See lib/utils/navigate.ts for why this is both
  // a consumed value and a live event.
  const [tab, setTab] = useState<PersonalTab>(() => consumePersonalTab() ?? 'goals')
  const [customizeOpen, setCustomizeOpen] = useState(false)

  // A deep link (search, Brief) must never land on a tab the user has
  // hidden via customize — un-hide it rather than rendering a blank pane,
  // the same "progression is a suggested order, not a wall" reasoning
  // DashboardClient already applies to top-level sections.
  function goTo(id: PersonalTab) {
    setTab(id)
    if (id !== 'council') {
      const entry = tabs.find(t => t.id === id)
      if (entry?.hidden) onChangeTabs(tabs.map(t => (t.id === id ? { ...t, hidden: false } : t)))
    }
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

      {tab === 'goals'   && <GoalsSection userId={userId} />}
      {tab === 'habits'  && <HabitTracker />}
      {tab === 'life'    && <LifeHub />}
      {tab === 'money'   && <MoneyHub userId={userId} />}
      {tab === 'people'  && <PeopleHub userId={userId} userEmail={userEmail} onOpenCompanions={onOpenCompanions} />}
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

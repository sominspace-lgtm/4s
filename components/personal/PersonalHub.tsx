'use client'

import { useEffect, useState } from 'react'
import GoalsSection from '@/components/goals/GoalsSection'
import HabitTracker from '@/components/habits/HabitTracker'
import LifeHub from '@/components/life/LifeHub'
import MoneyHub from '@/components/money/MoneyHub'
import PeopleHub from '@/components/people/PeopleHub'
import CouncilSection from '@/components/council/CouncilSection'
import { consumePersonalTab, type PersonalTab } from '@/lib/utils/navigate'
import type { Mode } from '@/lib/constants/modes'

const TABS: { id: PersonalTab; label: string }[] = [
  // Goals leads: it's the "why" the other four serve. Habits and Life are how
  // you maintain them, Money and People are the context they happen in.
  { id: 'goals',   label: 'Goals' },
  { id: 'habits',  label: 'Habits' },
  { id: 'life',    label: 'Life' },
  { id: 'money',   label: 'Money' },
  { id: 'people',  label: 'People' },
  // Council is deliberately NOT here (2026-08-11). It's an action you invoke
  // occasionally, not a place you live, and as a sixth tab it competed for
  // attention with Goals and Habits every single visit. It now lives in the
  // header ⋯ menu next to Ask Jarvis — same reasoning, same kind of thing.
  // The 'council' tab id still works, so goToPersonal('council') from the
  // menu (and the Brief's Council card) lands here exactly as before.
]

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
export default function PersonalHub({ userId, userEmail, mode, onOpenCompanions }: {
  userId: string
  userEmail: string
  mode: Mode
  onOpenCompanions: () => void
}) {
  // A caller can ask for a specific sub-tab (Brief's "Ask Council" card,
  // search's "Go to Money"). See lib/utils/navigate.ts for why this is both
  // a consumed value and a live event.
  const [tab, setTab] = useState<PersonalTab>(() => consumePersonalTab() ?? 'goals')

  useEffect(() => {
    function onTab(e: Event) { setTab((e as CustomEvent<PersonalTab>).detail) }
    window.addEventListener('4s:personal-tab', onTab)
    return () => window.removeEventListener('4s:personal-tab', onTab)
  }, [])

  return (
    <div>
      <div className="tabs-wrap" style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className="btn press" style={{
            fontSize: '0.72rem', padding: '0.4em 0.9em',
            background: tab === tb.id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
            color: tab === tb.id ? 'var(--gold)' : 'var(--muted)', border: 'none',
          }}>{tb.label}</button>
        ))}
      </div>

      {tab === 'goals'   && <GoalsSection userId={userId} />}
      {tab === 'habits'  && <HabitTracker />}
      {tab === 'life'    && <LifeHub />}
      {tab === 'money'   && <MoneyHub userId={userId} />}
      {tab === 'people'  && <PeopleHub userId={userId} userEmail={userEmail} onOpenCompanions={onOpenCompanions} />}
      {tab === 'council' && <CouncilSection mode={mode} userId={userId} calendarConnected />}
    </div>
  )
}

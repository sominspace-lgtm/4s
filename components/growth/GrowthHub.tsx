'use client'

import { useEffect, useState } from 'react'
import HabitTracker from '@/components/habits/HabitTracker'
import LifeHub from '@/components/life/LifeHub'
import CouncilSection from '@/components/council/CouncilSection'
import { consumeGrowthTab, type GrowthTab } from '@/lib/utils/navigate'
import type { Mode } from '@/lib/constants/modes'

const TABS: { id: GrowthTab; label: string }[] = [
  { id: 'habits',  label: 'Habits' },
  { id: 'life',    label: 'Life' },
  { id: 'council', label: 'Council' },
]

// Growth = everything about how you're doing, one destination instead of
// three tabs a user had to choose between with no obvious rule for which.
// Council in particular is a lens on the same data (habits, life, tasks),
// not a separate place — putting it a tab away from what it reviews makes
// that relationship visible instead of implied. Each child is still the
// exact same self-contained component/card it always was; this is a surface
// merge, same as People (components/people/PeopleHub.tsx) — no data moved.
export default function GrowthHub({ mode, userId, calendarConnected }: {
  mode: Mode
  userId: string
  calendarConnected: boolean
}) {
  // Which sub-tab opens: a specific one if a caller asked for it (e.g. Brief's
  // "Ask Council" card via goToGrowth('council')), otherwise Habits.
  const [tab, setTab] = useState<GrowthTab>(() => consumeGrowthTab() ?? 'habits')

  // Live retarget for when Growth is already mounted and a caller elsewhere
  // on the page asks for a specific sub-tab without a full remount.
  useEffect(() => {
    function onTab(e: Event) { setTab((e as CustomEvent<GrowthTab>).detail) }
    window.addEventListener('4s:growth-tab', onTab)
    return () => window.removeEventListener('4s:growth-tab', onTab)
  }, [])

  return (
    <div>
      <div className="tabs-wrap" style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className="btn" style={{
            fontSize: '0.72rem', padding: '0.4em 0.9em',
            background: tab === tb.id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
            color: tab === tb.id ? 'var(--gold)' : 'var(--muted)', border: 'none',
          }}>{tb.label}</button>
        ))}
      </div>

      {tab === 'habits'  && <HabitTracker />}
      {tab === 'life'    && <LifeHub />}
      {tab === 'council' && <CouncilSection mode={mode} userId={userId} calendarConnected={calendarConnected} />}
    </div>
  )
}

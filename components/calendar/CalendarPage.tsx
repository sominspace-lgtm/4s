'use client'

import { useEffect, useState } from 'react'
import Segmented from '@/components/ui/Segmented'

// One Calendar (2026-11-19), in Home. It used to be two pages: the house's
// calendar in Home and your own in Me. Now one page with a switch: Ours (the
// house: chores, meals, trips, the shared Google calendar) and Mine (every
// dated thing of yours, with your Google events). The shared screen only
// ever shows Ours.

export type CalendarView = 'ours' | 'mine'
export const CALENDAR_VIEW_EVENT = '4s:calendar-view'
const KEY = '4s:calendar-view'

export default function CalendarPage({ ours, mine, sharedMode = false }: {
  ours: React.ReactNode
  mine: React.ReactNode
  sharedMode?: boolean
}) {
  const [view, setView] = useState<CalendarView>('ours')
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the remembered view once
    try { if (localStorage.getItem(KEY) === 'mine') setView('mine') } catch { /* private mode */ }
    const on = (e: Event) => { const v = (e as CustomEvent<CalendarView>).detail; if (v === 'ours' || v === 'mine') setView(v) }
    window.addEventListener(CALENDAR_VIEW_EVENT, on)
    return () => window.removeEventListener(CALENDAR_VIEW_EVENT, on)
  }, [])
  function choose(v: CalendarView) {
    setView(v)
    try { localStorage.setItem(KEY, v) } catch { /* private mode */ }
  }
  if (sharedMode) return <>{ours}</>
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <Segmented value={view} onChange={choose} options={[['ours', 'Ours'], ['mine', 'Mine']]} />
      {view === 'ours' ? ours : mine}
    </div>
  )
}

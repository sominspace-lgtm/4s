'use client'

import { useEffect, useState } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { choreDue, type Chore, type Meal, type ShoppingItem } from '@/lib/hooks/useHousehold'
import { routineDue, type Routine } from '@/lib/hooks/useRoutines'
import { buildWeeklyRecap, type WeeklyRecap } from '@/lib/household/weeklyRecap'
import { goToHousehold } from '@/lib/utils/navigate'

// The top of Household, before any of the reorderable/hideable blocks
// (2026-08-21) — what's due, what shopping and tonight's meal look like,
// and how the week's gone so far. Picked from exactly the three things you
// chose over "who's around": due/overdue, shopping+meals status, this
// week's recap. Deliberately not reorderable or hideable itself — this is
// the one section meant to always be the first thing you see.
export default function HouseholdAtAGlance({ spaceId, chores, meals, shopping, routines }: {
  spaceId: string | null
  chores: Chore[]
  meals: Meal[]
  shopping: ShoppingItem[]
  routines: Routine[]
}) {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null)

  useEffect(() => {
    if (!spaceId) { setRecap(null); return }
    buildWeeklyRecap(createClient(), spaceId).then(setRecap)
  }, [spaceId])

  const overdueChores = chores.filter(c => choreDue(c) < 0)
  const dueTodayChores = chores.filter(c => choreDue(c) === 0)
  const overdueRoutines = routines.filter(r => r.kind === 'routine' && routineDue(r) < 0)

  const remaining = shopping.filter(s => !s.got).length
  const todaysMeals = meals.filter(m => isSameDay(parseISO(m.meal_date), new Date()))

  const stat = (value: number | string, label: string, color?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontSize: '1.35rem', fontFamily: 'var(--font-display)', color: color ?? 'var(--text)', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
    </div>
  )

  return (
    <div className="organic" style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '1.3rem 1.5rem', marginBottom: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1rem',
    }}>
      <div style={{ display: 'flex', gap: '1.8rem', flexWrap: 'wrap' }}>
        {(overdueChores.length + overdueRoutines.length) > 0 &&
          stat(overdueChores.length + overdueRoutines.length, 'Overdue', 'var(--rose)')}
        {dueTodayChores.length > 0 && stat(dueTodayChores.length, 'Due today', 'var(--amber)')}
        {stat(remaining, remaining === 1 ? 'Item to get' : 'Items to get')}
        {stat(todaysMeals.length, todaysMeals.length === 1 ? "Today's meal" : "Today's meals")}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
        {overdueChores.length + overdueRoutines.length + dueTodayChores.length === 0 && (
          <p style={{ color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}>Nothing due or overdue. Clear.</p>
        )}
        {todaysMeals.length === 0 && (
          <button onClick={() => goToHousehold('home')} className="press" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--muted)', fontStyle: 'italic', fontSize: '0.78rem' }}>
            Nothing planned to eat today — add something below.
          </button>
        )}
      </div>

      {recap && !recap.isEmpty && (
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', borderTop: '1px solid var(--faint)', paddingTop: '0.7rem' }}>
          This week: {[
            recap.choresDone.length > 0 && `${recap.choresDone.length} chore${recap.choresDone.length === 1 ? '' : 's'} done`,
            recap.goalsTouched.length > 0 && `${recap.goalsTouched.length} goal${recap.goalsTouched.length === 1 ? '' : 's'} touched`,
            recap.newPins.length > 0 && `${recap.newPins.length} new place${recap.newPins.length === 1 ? '' : 's'} saved`,
          ].filter(Boolean).join(' · ') || 'quiet so far'}.
        </div>
      )}
    </div>
  )
}

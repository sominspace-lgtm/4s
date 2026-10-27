'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useWorkItems, dueUrgency } from '@/lib/hooks/useWorkItems'
import { useHabits, isDueOn } from '@/lib/hooks/useHabits'
import { useFocusItems } from '@/lib/hooks/useFocusItems'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useHousehold, choreDue, dinnerFor } from '@/lib/hooks/useHousehold'
import DailyThread from '@/components/brief/DailyThread'
import CheckinCard from '@/components/checkin/CheckinCard'
import CalendarEmbed from '@/components/calendar/CalendarEmbed'
import PulseSection from '@/components/pulse/PulseSection'
import DoneCircle from '@/components/ui/DoneCircle'
import { goToSection, goToPersonal } from '@/lib/utils/navigate'
import { guideGreetingLine } from '@/lib/utils/guideVoice'
import type { Mode } from '@/lib/constants/modes'
import TodayRoutine from './TodayRoutine'
import GoodBecause from './GoodBecause'
import PlanWeek from './PlanWeek'
import Breathing from '@/components/focus/Breathing'
import WeekReview from '@/components/review/WeekReview'
import { useLang } from '@/lib/LangContext'

// Today on one screen (2026-10-26). What used to be a stack of a dozen
// blocks (energy, stats, a suggested action, a whisper, capacity, the area
// index…) is now: a short "Up next" you can finish in place, tonight's
// dinner, and the evening line. Everything else waits behind "More".

const CALM_QUOTES = [
  "You don't have to do everything today.",
  'One breath, then one small thing.',
  'Rest is productive too.',
  'Do less, but do it gently.',
]
const MORE_KEY = '4s:today-more'
const UP_NEXT = 5

interface Next { key: string; title: string; kind: string; late: boolean; finish: () => void; open: () => void }

export default function DailyBrief({ userId, mode = 'friend' }: { userId: string; mode?: Mode }) {
  const lang = useLang()
  const { items, setStatus } = useWorkItems()
  const { habits, completions, toggleDay } = useHabits()
  const { items: focusItems, snooze } = useFocusItems()
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const h = useHousehold(spaceId)

  const [hour, setHour] = useState<number | null>(null)
  const [sunday, setSunday] = useState(false)
  const [planOpen, setPlanOpen] = useState(false)
  const [more, setMore] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [quote, setQuote] = useState(CALM_QUOTES[0])
  const [finished, setFinished] = useState<Set<string>>(new Set())
  useEffect(() => {
    const now = new Date()
    setHour(now.getHours()); setSunday(now.getDay() === 0)
    try { setMore(localStorage.getItem(MORE_KEY) === '1'); setRecovery(localStorage.getItem('4s-recovery') === '1') } catch { /* private mode */ }
    setQuote(CALM_QUOTES[Math.floor(Math.random() * CALM_QUOTES.length)])
  }, [])
  useEffect(() => {
    const on = () => setPlanOpen(true)
    window.addEventListener('4s:open-plan-week', on)
    return () => window.removeEventListener('4s:open-plan-week', on)
  }, [])
  function toggleMore() { setMore(m => { try { localStorage.setItem(MORE_KEY, m ? '0' : '1') } catch { /* private mode */ } return !m }) }
  function setRecoveryMode(on: boolean) { try { if (on) localStorage.setItem('4s-recovery', '1'); else localStorage.removeItem('4s-recovery') } catch { /* private mode */ } setRecovery(on) }

  const today = format(new Date(), 'yyyy-MM-dd')
  const finish = (key: string, run: () => unknown) => { setFinished(prev => new Set(prev).add(key)); void run() }

  // Up next: late and due-today tasks, today's habits, and chores that are
  // due and yours (or either of yours). Late things first.
  const next: Next[] = []
  for (const t of items) {
    if (t.status === 'done') continue
    const u = dueUrgency(t.due_date)
    if (u !== 'overdue' && u !== 'today' && t.status !== 'in-progress') continue
    next.push({ key: `t-${t.id}`, title: t.title, kind: u === 'overdue' ? 'Task, late' : 'Task', late: u === 'overdue', finish: () => finish(`t-${t.id}`, () => setStatus(t.id, 'done')), open: () => goToPersonal('tasks') })
  }
  for (const c of h.chores) {
    if (choreDue(c) > 0) continue
    next.push({ key: `c-${c.id}`, title: c.name, kind: choreDue(c) < 0 ? 'Chore, late' : 'Chore', late: choreDue(c) < 0, finish: () => finish(`c-${c.id}`, () => h.markChoreDone(c.id)), open: () => goToSection('upkeep') })
  }
  for (const hb of habits) {
    if (hb.paused) continue
    const done = completions[hb.id] ?? []
    if (!isDueOn(hb, today, done) || done.includes(today)) continue
    next.push({ key: `h-${hb.id}`, title: hb.name, kind: 'Habit', late: false, finish: () => finish(`h-${hb.id}`, () => toggleDay(hb.id, today)), open: () => goToPersonal('habits') })
  }
  next.sort((a, b) => Number(b.late) - Number(a.late))
  const shown = next.slice(0, recovery ? 1 : UP_NEXT)
  const extra = Math.max(0, next.length - shown.length)
  const dinner = dinnerFor(h.meals)

  const greeting = hour === null ? '' : lang === 'ko'
    ? (hour < 12 ? '좋은 아침이에요' : hour < 18 ? '좋은 오후예요' : '편안한 저녁이에요')
    : guideGreetingLine(mode, hour)

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1rem 1.15rem', boxShadow: 'var(--elev-1)' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <section style={card}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginBottom: '0.7rem' }}>
          <span style={{ flex: 1, fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text)' }}>{greeting}</span>
          <span suppressHydrationWarning style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{format(new Date(), 'EEE, MMM d')}</span>
        </div>

        {recovery && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '0.5rem', padding: '0.8rem', marginBottom: '0.7rem', borderRadius: 12, background: 'color-mix(in srgb, var(--emerald) 7%, transparent)' }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>Just one thing today. You&apos;re doing enough.</span>
            <Breathing />
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', fontStyle: 'italic' }}>{quote}</span>
          </div>
        )}

        <div className="t-label" style={{ marginBottom: '0.2rem' }}>Up next</div>
        {shown.length === 0 ? (
          <div style={{ fontSize: '0.88rem', color: 'var(--muted)', padding: '0.5rem 0' }}>Nothing needs you right now.</div>
        ) : shown.map(n => {
          const isDone = finished.has(n.key)
          return (
            <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.45rem 0', borderBottom: '1px solid var(--faint)', opacity: isDone ? 0.5 : 1 }}>
              <DoneCircle done={isDone} onClick={() => { if (!isDone) n.finish() }} label={`${n.title}: mark done`} />
              <button onClick={n.open} style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>
                <span style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text)', textDecoration: isDone ? 'line-through' : 'none' }}>{n.title}</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: n.late ? 'var(--rose)' : 'var(--muted)' }}>{n.kind}</span>
              </button>
            </div>
          )
        })}
        {extra > 0 && !recovery && <div style={{ fontSize: '0.78rem', color: 'var(--muted)', paddingTop: '0.4rem' }}>And {extra} more after these.</div>}

        {spaceId && (
          <button onClick={() => goToSection('kitchen')} className="press" style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', width: '100%', marginTop: '0.8rem', padding: '0.6rem 0.75rem', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', width: '3.6rem', flexShrink: 0 }}>Tonight</span>
            <span style={{ flex: 1, fontSize: '0.9rem', color: dinner ? 'var(--text)' : 'var(--muted)' }}>{dinner ? dinner.title : 'No dinner planned yet'}</span>
            <span aria-hidden style={{ color: 'var(--muted)' }}>›</span>
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', marginTop: '0.75rem' }}>
          <button onClick={() => setPlanOpen(true)} className="btn btn-ghost press" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', padding: '0.4rem 0.5rem' }}>Plan the week</button>
          <button onClick={() => setRecoveryMode(!recovery)} className="btn btn-ghost press" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', padding: '0.4rem 0.5rem', color: 'var(--muted)' }}>{recovery ? "I'm okay now" : 'Overwhelmed?'}</button>
        </div>
      </section>

      {sunday && !recovery && (
        <button onClick={() => setPlanOpen(true)} className="press organic" style={{
          display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', textAlign: 'left', cursor: 'pointer',
          padding: '0.85rem 1rem', borderRadius: 14, fontFamily: 'var(--font-body)',
          background: 'color-mix(in srgb, var(--emerald) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--emerald) 24%, var(--border))',
        }}>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)' }}>Plan the week</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Tasks on days, dinners picked, chores split. A few minutes.</span>
          </span>
          <span aria-hidden style={{ color: 'var(--muted)' }}>›</span>
        </button>
      )}
      <PlanWeek open={planOpen} onClose={() => setPlanOpen(false)} userId={userId} />

      <GoodBecause userId={userId} />
      <CheckinCard userId={userId} />

      <button onClick={toggleMore} aria-expanded={more} className="press" style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', minHeight: 56, padding: '0.4rem 0.2rem',
        background: 'none', border: 'none', borderTop: '1px solid var(--faint)', cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
      }}>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>More on Today</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{focusItems.length ? `${focusItems.length} to look at · ` : ''}Routine, the day, calendar, the week</span>
        </span>
        <span aria-hidden style={{ color: 'var(--muted)', transform: more ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
      </button>
      {more && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {focusItems.length > 0 && <PulseSection items={focusItems} snooze={snooze} />}
          <TodayRoutine userId={userId} />
          <DailyThread userId={userId} />
          <div id="brief-calendar"><CalendarEmbed userId={userId} /></div>
          <div id="week-review"><WeekReview mode={mode} /></div>
        </div>
      )}
    </div>
  )
}

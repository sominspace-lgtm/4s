'use client'

import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { choreDue, type Chore, type Meal } from '@/lib/hooks/useHousehold'

// One calendar for everything the household has going on: which chores come
// due when, and what's being eaten.
//
// Separate from the personal calendar in Today on purpose. That one answers
// "what do I have on"; this answers "what does this house have on", and the
// two audiences are genuinely different — your dentist appointment isn't
// household business, and whose turn it is to do the bins isn't personal
// business. They'd fight for the same space if merged.
//
// Two weeks rather than a month grid: a household plans in days, not
// quarters, and a month of mostly-empty cells says less than fourteen dense
// ones.

type Entry = { kind: 'chore' | 'meal'; label: string; sub?: string; overdue?: boolean }

const KIND_COLOR: Record<Entry['kind'], string> = {
  chore: 'var(--amber)',
  meal:  'var(--emerald)',
}

const DAYS = 14

export default function HouseholdCalendar({ chores, meals }: { chores: Chore[]; meals: Meal[] }) {
  const today = new Date()
  const days = [...Array(DAYS)].map((_, i) => addDays(today, i))

  function entriesFor(day: Date): Entry[] {
    const out: Entry[] = []

    // A chore lands on the day it next comes due. Overdue ones surface on
    // today rather than in the past, where nobody would look for them.
    for (const c of chores) {
      const due = choreDue(c)
      const dueDate = addDays(today, due)
      const showOn = due < 0 ? today : dueDate
      if (isSameDay(showOn, day)) {
        out.push({ kind: 'chore', label: c.name, sub: due < 0 ? `${-due}d overdue` : undefined, overdue: due < 0 })
      }
    }

    for (const m of meals) {
      if (isSameDay(parseISO(m.meal_date), day)) {
        out.push({ kind: 'meal', label: m.title, sub: m.cook ? `${m.slot} · ${m.cook}` : m.slot })
      }
    }
    return out
  }

  const anything = days.some(d => entriesFor(d).length > 0)

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        <div className="t-card">The next two weeks</div>
        <div className="t-meta" style={{ display: 'flex', gap: '0.7rem' }}>
          {(['chore', 'meal'] as const).map(k => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: KIND_COLOR[k], display: 'inline-block' }} />
              {k}s
            </span>
          ))}
        </div>
      </div>

      {!anything && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing scheduled. Add a chore or plan a meal and it lands here.
        </div>
      )}

      {anything && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
          {days.map(day => {
            const entries = entriesFor(day)
            const isToday = isSameDay(day, today)
            // Empty days still render, so the fortnight reads as a continuous
            // stretch of time rather than a list of things that happen to
            // have something on them.
            return (
              <div key={+day} className="organic" style={{
                border: `1px solid ${isToday ? 'color-mix(in srgb, var(--gold) 45%, var(--border))' : 'var(--border)'}`,
                background: isToday ? 'color-mix(in srgb, var(--gold) 6%, var(--surface2))' : 'var(--surface2)',
                padding: '0.5rem 0.6rem', minHeight: '76px',
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
                opacity: entries.length === 0 ? 0.55 : 1,
              }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: isToday ? 'var(--gold)' : 'var(--muted)', opacity: isToday ? 1 : 0.7 }}>
                  {isToday ? 'Today' : format(day, 'EEE d')}
                </div>

                {entries.length === 0 && (
                  <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.3, fontStyle: 'italic' }}>—</div>
                )}

                {entries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                    <span aria-hidden style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: '0.34rem',
                      background: e.overdue ? 'var(--rose)' : KIND_COLOR[e.kind],
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.35, wordBreak: 'break-word' }}>{e.label}</div>
                      {e.sub && (
                        <div style={{ fontSize: '0.58rem', color: e.overdue ? 'var(--rose)' : 'var(--muted)', opacity: e.overdue ? 1 : 0.7 }}>{e.sub}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

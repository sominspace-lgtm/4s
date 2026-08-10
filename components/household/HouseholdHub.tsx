'use client'

import { useState } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { useHousehold, choreDue, type Chore } from '@/lib/hooks/useHousehold'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import HomeBrain from '@/components/home/HomeBrain'

const SLOTS = ['breakfast', 'lunch', 'dinner'] as const

type HouseholdTab = 'chores' | 'meals' | 'brain'

const TABS: { id: HouseholdTab; label: string }[] = [
  { id: 'chores', label: 'Chores' },
  { id: 'meals',  label: 'Meals' },
  { id: 'brain',  label: 'Home Brain' },
]

// Household — the shared-living tab for couples or families under one roof.
//
// It answers the two questions that actually cause friction between people
// who live together: "whose turn is it?" and "what are we eating?". Both are
// deliberately low-ceremony — a chore is a name and a rhythm, a meal is a
// day and a dish. No points, no leaderboards, no "you did 60% of the
// chores" scorekeeping: making housework competitive is a good way to make
// a household worse, and the product's whole premise is reducing guilt
// rather than redistributing it.
export default function HouseholdHub({ userId }: { userId: string }) {
  const { spaces } = useSharedSpaces(userId)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [tab, setTab] = useState<HouseholdTab>('chores')
  const h = useHousehold(spaceId)

  const [choreName, setChoreName] = useState('')
  const [choreCadence, setChoreCadence] = useState('7')
  const [mealDay, setMealDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [mealSlot, setMealSlot] = useState<typeof SLOTS[number]>('dinner')
  const [mealTitle, setMealTitle] = useState('')
  const [mealCook, setMealCook] = useState('')
  const [justDone, setJustDone] = useState<string | null>(null)

  const week = [...Array(7)].map((_, i) => addDays(new Date(), i))

  // Soonest-due first — the list orders itself by what actually needs doing,
  // so nobody has to scan for it.
  const sortedChores = [...h.chores].sort((a, b) => choreDue(a) - choreDue(b))

  async function doneChore(c: Chore) {
    setJustDone(c.id)
    await h.markChoreDone(c.id)
    setTimeout(() => setJustDone(null), 420)
  }

  const input: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
    padding: '0.4rem 0.6rem', outline: 'none',
  }

  function dueLabel(c: Chore) {
    const d = choreDue(c)
    if (!c.last_done_at) return { text: 'never done', color: 'var(--muted)' }
    if (d < 0) return { text: `${-d}d overdue`, color: 'var(--rose)' }
    if (d === 0) return { text: 'due today', color: 'var(--amber)' }
    return { text: `in ${d}d`, color: 'var(--muted)' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Which household */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.7 }}>Household</span>
        <select value={spaceId ?? ''} onChange={e => setSpaceId(e.target.value || null)} style={{ ...input, cursor: 'pointer' }}>
          <option value="">Just me</option>
          {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {spaces.length === 0 && (
          <span style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.7 }}>
            Create a space in People → Spaces to share this with someone.
          </span>
        )}
      </div>

      {h.error && (
        <div style={{ fontSize: '0.7rem', color: 'var(--rose)', background: 'color-mix(in srgb, var(--rose) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--rose) 25%, transparent)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
          {h.error}
        </div>
      )}

      <div className="tabs-wrap" style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem', alignSelf: 'flex-start' }}>
        {TABS.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className="btn press" style={{
            fontSize: '0.72rem', padding: '0.4em 0.9em',
            background: tab === tb.id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
            color: tab === tb.id ? 'var(--gold)' : 'var(--muted)', border: 'none',
          }}>{tb.label}</button>
        ))}
      </div>

      {/* Home Brain — the household's memory: wifi passwords, serial
          numbers, which filter the fridge takes. Moved here from Personal →
          Life (2026-08-07), where it never belonged: none of it is personal
          and all of it is the sort of thing the OTHER people in the house
          need at 9pm when you're not home. It sits under the same space
          picker as chores and meals, so it follows "just me" vs a shared
          household exactly like they do. */}
      {tab === 'brain' && <HomeBrain />}

      {/* ── Chores ─────────────────────────────────────────────── */}
      {tab === 'chores' && (
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)', marginBottom: '0.6rem' }}>
          Whose turn
        </div>

        {sortedChores.length === 0 && !h.loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
            Nothing tracked yet. Add the one chore you argue about most.
          </div>
        )}

        {sortedChores.map(c => {
          const due = dueLabel(c)
          return (
            <div key={c.id} className="lift" style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 0.6rem', borderRadius: '9px', marginBottom: '0.35rem',
              background: 'var(--hover-bg)', border: '1px solid var(--border)',
            }}>
              <button
                onClick={() => doneChore(c)}
                className={`press ${justDone === c.id ? 'settle' : ''}`}
                title="Mark done — resets the clock"
                style={{
                  background: 'none', border: '1.5px solid var(--emerald)', borderRadius: '50%',
                  width: 20, height: 20, cursor: 'pointer', color: 'var(--emerald)',
                  fontSize: '0.6rem', lineHeight: 1, flexShrink: 0,
                }}
              >✓</button>
              <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)' }}>{c.name}</span>
              <span style={{ fontSize: '0.62rem', color: due.color, flexShrink: 0 }}>{due.text}</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.55, flexShrink: 0 }}>every {c.cadence_days}d</span>
              <button onClick={() => h.removeChore(c.id)} aria-label={`Remove ${c.name}`} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
            </div>
          )
        })}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!choreName.trim()) return
            await h.addChore(choreName.trim(), Math.max(1, parseInt(choreCadence) || 7))
            setChoreName('')
          }}
          style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
        >
          <input value={choreName} onChange={e => setChoreName(e.target.value)} placeholder="Add a chore" style={{ ...input, flex: 1, minWidth: '140px' }} />
          <input type="number" min={1} value={choreCadence} onChange={e => setChoreCadence(e.target.value)} title="Every N days" style={{ ...input, width: '70px' }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>
      )}

      {/* ── Meals ──────────────────────────────────────────────── */}
      {tab === 'meals' && (
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)', marginBottom: '0.6rem' }}>
          This week&rsquo;s meals
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
          {week.map(day => {
            const dayMeals = h.meals.filter(m => isSameDay(parseISO(m.meal_date), day))
            const isToday = isSameDay(day, new Date())
            return (
              <div key={+day} style={{
                border: `1px solid ${isToday ? 'color-mix(in srgb, var(--gold) 40%, var(--border))' : 'var(--border)'}`,
                background: isToday ? 'color-mix(in srgb, var(--gold) 5%, transparent)' : 'transparent',
                borderRadius: '9px', padding: '0.5rem', minHeight: '64px',
              }}>
                <div style={{ fontSize: '0.6rem', color: isToday ? 'var(--gold)' : 'var(--muted)', opacity: isToday ? 1 : 0.7, marginBottom: '0.3rem' }}>
                  {format(day, 'EEE d')}
                </div>
                {dayMeals.length === 0 && <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.35, fontStyle: 'italic' }}>—</div>}
                {dayMeals.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text)', flex: 1, minWidth: 0 }}>{m.title}</span>
                    {m.cook && <span style={{ fontSize: '0.56rem', color: 'var(--emerald)', flexShrink: 0 }}>{m.cook}</span>}
                    <button onClick={() => h.removeMeal(m.id)} aria-label={`Remove ${m.title}`} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.35, fontSize: '0.55rem', flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!mealTitle.trim()) return
            await h.addMeal(mealDay, mealSlot, mealTitle.trim(), mealCook.trim() || null)
            setMealTitle(''); setMealCook('')
          }}
          style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem', flexWrap: 'wrap' }}
        >
          <input type="date" value={mealDay} onChange={e => setMealDay(e.target.value)} style={input} />
          <select value={mealSlot} onChange={e => setMealSlot(e.target.value as typeof SLOTS[number])} style={{ ...input, cursor: 'pointer' }}>
            {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={mealTitle} onChange={e => setMealTitle(e.target.value)} placeholder="What's cooking?" style={{ ...input, flex: 1, minWidth: '130px' }} />
          <input value={mealCook} onChange={e => setMealCook(e.target.value)} placeholder="Who cooks" style={{ ...input, width: '100px' }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>
      )}
    </div>
  )
}

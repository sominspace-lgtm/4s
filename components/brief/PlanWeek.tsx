'use client'

import { useMemo, useState } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import Sheet from '@/components/ui/Sheet'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { useRecipes } from '@/lib/hooks/useRecipes'

// Plan the week (2026-10-26). One Sunday screen with three short steps: give
// open tasks a day, pick the dinners, and split the chores coming due. Each
// tap saves on its own, so it can be left halfway.

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

/** The seven days being planned: from tomorrow on a Sunday, else from today. */
export function planDays(now = new Date()): Date[] {
  const start = new Date(now); start.setHours(12, 0, 0, 0)
  if (start.getDay() === 0) start.setDate(start.getDate() + 1)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1.3rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--gold)' }}>{n}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--text)' }}>{title}</span>
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '-0.35rem' }}>{hint}</div>
      {children}
    </section>
  )
}

function Chip({ on, onClick, children, wide = false }: { on: boolean; onClick: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <button onClick={onClick} className="press" style={{
      minWidth: wide ? 0 : 34, minHeight: 34, padding: wide ? '0 0.75rem' : 0, borderRadius: 10, cursor: 'pointer',
      fontSize: '0.8rem', fontFamily: 'var(--font-body)',
      border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
      background: on ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'var(--surface)',
      color: on ? 'var(--text)' : 'var(--muted)',
    }}>{children}</button>
  )
}

const row: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.65rem 0.75rem',
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12,
}

export default function PlanWeek({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const days = useMemo(() => planDays(), [])
  const first = ymd(days[0]), last = ymd(days[6])
  const { items, update } = useWorkItems()
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const h = useHousehold(spaceId)
  const book = useRecipes(spaceId)
  const [picking, setPicking] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [err, setErr] = useState<string | null>(null)

  // Open tasks that have no day yet, are late, or fall inside the week.
  const tasks = items.filter(i => i.status !== 'done' && (!i.due_date || i.due_date.slice(0, 10) <= last)).slice(0, 25)

  // The two of you, for splitting chores.
  const ownerId = spaces[0]?.owner_id ?? null
  const partnerId = ownerId === userId ? members.find(m => m.space_id === spaceId && m.status === 'accepted')?.member_id ?? null : ownerId
  const nameOf = (id: string | null) => (id === userId ? 'Me' : id === spaces[0]?.owner_id ? 'Sylvia' : 'Harry')
  const people = [userId, partnerId].filter((x): x is string => !!x)
  const chores = h.chores.filter(c => choreDue(c) <= 7).sort((a, b) => choreDue(a) - choreDue(b))

  const dinnerOn = (d: Date) => h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), d)) ?? null
  const recipes = [...book.recipes].sort((a, b) => Number(!!b.favorite) - Number(!!a.favorite) || a.times_cooked - b.times_cooked).slice(0, 10)

  async function pickDinner(date: string, title: string, recipeId?: string) {
    if (!title.trim()) return
    const r = await h.addMeal(date, 'dinner', title.trim(), null, recipeId ? { recipe_id: recipeId } : undefined)
    if (r.error) setErr(r.error)
    setPicking(null); setTyped('')
  }

  async function assign(id: string, who: string | null) {
    const r = await h.updateChore(id, { assigned_to: who })
    if (r.error) setErr(/assigned_to/.test(r.error) ? 'Splitting chores needs the new database step. Run the SQL, then try again.' : r.error)
  }

  const plannedDinners = days.filter(d => dinnerOn(d)).length
  const datedTasks = tasks.filter(t => t.due_date && t.due_date.slice(0, 10) >= first).length

  return (
    <Sheet open={open} title="Plan the week" onClose={onClose}>
      <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
        {format(days[0], 'EEEE, MMM d')} to {format(days[6], 'EEEE, MMM d')}. Every tap saves.
      </div>
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)', marginBottom: '0.8rem' }}>{err}</div>}

      <Step n={1} title="Give tasks a day" hint={tasks.length ? `${datedTasks} of ${tasks.length} have a day this week.` : 'No open tasks. Nice.'}>
        {tasks.map(t => {
          const due = t.due_date?.slice(0, 10) ?? null
          const late = !!due && due < first
          return (
            <div key={t.id} style={row}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{t.title}{late && <span style={{ color: 'var(--rose)', fontSize: '0.75rem' }}> · late</span>}</span>
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {days.map(d => <Chip key={ymd(d)} on={due === ymd(d)} onClick={() => void update(t.id, { due_date: ymd(d) })}>{format(d, 'EEEEE')}</Chip>)}
                <Chip wide on={!due} onClick={() => void update(t.id, { due_date: null })}>Later</Chip>
              </div>
            </div>
          )
        })}
      </Step>

      {spaceId && (
        <Step n={2} title="Pick the dinners" hint={`${plannedDinners} of 7 planned.`}>
          {days.map(d => {
            const date = ymd(d), m = dinnerOn(d)
            return (
              <div key={date} style={row}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', width: '2.6rem', flexShrink: 0 }}>{format(d, 'EEE')}</span>
                  {m ? (
                    <>
                      <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text)' }}>{m.title}</span>
                      <button className="btn btn-ghost press" style={{ fontSize: '0.75rem' }} onClick={() => void h.removeMeal(m.id)}>Change</button>
                    </>
                  ) : picking === date ? null : (
                    <button className="btn btn-ghost press" style={{ fontSize: '0.8rem' }} onClick={() => { setPicking(date); setTyped('') }}>+ Pick dinner</button>
                  )}
                </div>
                {!m && picking === date && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {recipes.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {recipes.map(r => <Chip key={r.id} wide on={false} onClick={() => void pickDinner(date, r.title, r.id)}>{r.favorite ? '♥ ' : ''}{r.title}</Chip>)}
                      </div>
                    )}
                    <form onSubmit={e => { e.preventDefault(); void pickDinner(date, typed) }} style={{ display: 'flex', gap: '0.3rem' }}>
                      <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Or type it: tacos, leftovers, eating out" autoFocus
                        style={{ flex: 1, minWidth: 0, minHeight: 40, padding: '0 0.65rem', fontSize: '16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-body)' }} />
                      <button type="submit" disabled={!typed.trim()} className="btn btn-primary press">Add</button>
                      <button type="button" className="btn btn-ghost press" onClick={() => setPicking(null)}>Cancel</button>
                    </form>
                  </div>
                )}
              </div>
            )
          })}
        </Step>
      )}

      {spaceId && (
        <Step n={3} title="Split the chores" hint={chores.length ? 'Who takes each one this week.' : 'Nothing comes due this week.'}>
          {chores.map(c => {
            const d = choreDue(c)
            return (
              <div key={c.id} style={row}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                  {c.name}
                  <span style={{ fontSize: '0.75rem', color: d < 0 ? 'var(--rose)' : 'var(--muted)' }}>
                    {' · '}{d < 0 ? `${-d}d late` : d === 0 ? 'due today' : `due ${format(addDays(new Date(), d), 'EEE')}`}
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {people.map(p => <Chip key={p} wide on={c.assigned_to === p} onClick={() => void assign(c.id, c.assigned_to === p ? null : p)}>{nameOf(p)}</Chip>)}
                  <Chip wide on={!c.assigned_to} onClick={() => void assign(c.id, null)}>Either</Chip>
                </div>
              </div>
            )
          })}
        </Step>
      )}

      <button className="btn btn-primary press" style={{ width: '100%', minHeight: 48 }} onClick={onClose}>Done</button>
    </Sheet>
  )
}

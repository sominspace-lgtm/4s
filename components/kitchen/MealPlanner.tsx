'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns'
import type { useHousehold, Meal } from '@/lib/hooks/useHousehold'
import type { useRecipes } from '@/lib/hooks/useRecipes'
import type { Recipe } from '@/lib/recipes/types'
import { card, chip, field, label, muted, small } from './ui'

// The meal plan (2026-10-13): a week at a time. Pick a recipe (or type "leftovers",
// "pizza night", a place you are eating out), choose which meals of the day
// you plan at all, copy last week, or let it fill the empty dinners from your
// favorites. Meals link to recipes, so the grocery list and the calorie count
// come from the plan.

type Slot = Meal['slot']
const ALL_SLOTS: Slot[] = ['breakfast', 'lunch', 'dinner']
const SLOTS_KEY = '4s:kitchen-slots'
const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

export default function MealPlanner({ h, book, onBuildList, onOpenRecipe }: {
  h: ReturnType<typeof useHousehold>; book: ReturnType<typeof useRecipes>
  onBuildList: (weekStart: string) => void; onOpenRecipe: (id: string) => void
}) {
  const [offset, setOffset] = useState(0)
  const [slots, setSlots] = useState<Slot[]>(['lunch', 'dinner'])
  const [adding, setAdding] = useState<{ date: string; slot: Slot } | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(SLOTS_KEY) ?? 'null'); if (Array.isArray(s) && s.length) setSlots(s.filter((x: string) => (ALL_SLOTS as string[]).includes(x))) } catch { /* keep default */ }
  }, [])
  const toggleSlot = (s: Slot) => setSlots(prev => {
    const next = prev.includes(s) ? prev.filter(x => x !== s) : ALL_SLOTS.filter(x => prev.includes(x) || x === s)
    if (next.length === 0) return prev
    try { localStorage.setItem(SLOTS_KEY, JSON.stringify(next)) } catch { /* private mode */ }
    return next
  })

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const recipeById = useMemo(() => new Map(book.recipes.map(r => [r.id, r])), [book.recipes])
  const mealsOn = (d: Date, s: Slot) => h.meals.filter(m => m.slot === s && isSameDay(parseISO(m.meal_date), d))
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(null), 4000) }

  // Calories one person eats from the plan that day (one serving of each planned recipe).
  const dayCalories = (d: Date) => {
    let total = 0, known = 0, unknown = 0
    for (const s of ALL_SLOTS) for (const m of mealsOn(d, s)) {
      const r = m.recipe_id ? recipeById.get(m.recipe_id) : undefined
      if (r?.calories != null) { total += r.calories; known++ } else unknown++
    }
    return { total: Math.round(total), known, unknown }
  }

  async function copyLastWeek() {
    const prevStart = addDays(weekStart, -7)
    const rows: Parameters<typeof h.addMeals>[0] = []
    for (let i = 0; i < 7; i++) {
      const from = addDays(prevStart, i), to = addDays(weekStart, i)
      for (const s of slots) {
        if (mealsOn(to, s).length) continue
        for (const m of mealsOn(from, s)) rows.push({ meal_date: ymd(to), slot: s, title: m.title, recipe_id: m.recipe_id, servings: m.servings, kind: m.kind })
      }
    }
    if (rows.length === 0) { flash('Nothing to copy, or those days are already planned.'); return }
    const e = await h.addMeals(rows)
    flash(e.error ?? `Copied ${rows.length} meal${rows.length === 1 ? '' : 's'} from last week.`)
  }

  async function fillDinners() {
    const pool = book.recipes.filter(r => r.ingredients.length > 0 || r.steps.length > 0)
    if (pool.length === 0) { flash('Save a few recipes first, then I can fill the week.'); return }
    const favs = pool.filter(r => r.favorite)
    const base = favs.length >= 3 ? favs : pool
    // Rarely-cooked first among equals, so the same three dinners do not run the week.
    const order = [...base].sort((a, b) => (a.times_cooked - b.times_cooked) + (Math.random() - 0.5) * 2)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const rows: Parameters<typeof h.addMeals>[0] = []
    let n = 0
    for (const d of days) {
      if (d < today || mealsOn(d, 'dinner').length) continue
      const r = order[n % order.length]; n++
      rows.push({ meal_date: ymd(d), slot: 'dinner', title: r.title, recipe_id: r.id, servings: r.servings })
    }
    if (rows.length === 0) { flash('Every dinner this week is already planned.'); return }
    const e = await h.addMeals(rows)
    flash(e.error ?? `Filled ${rows.length} dinner${rows.length === 1 ? '' : 's'}. Swap any you do not fancy.`)
  }

  const today = new Date()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <button style={small} onClick={() => setOffset(o => o - 1)} aria-label="Previous week">‹</button>
          <span style={{ fontSize: '0.8rem', minWidth: '9rem', textAlign: 'center' }}>{offset === 0 ? 'This week' : offset === 1 ? 'Next week' : `${format(days[0], 'MMM d')} to ${format(days[6], 'MMM d')}`}</span>
          <button style={small} onClick={() => setOffset(o => o + 1)} aria-label="Next week">›</button>
          {offset !== 0 && <button style={{ ...small, border: 'none' }} onClick={() => setOffset(0)}>Today</button>}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={muted}>Plan:</span>
          {ALL_SLOTS.map(s => <button key={s} className="press" style={chip(slots.includes(s))} onClick={() => toggleSlot(s)}>{s}</button>)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary press" style={{ fontSize: '0.72rem' }} onClick={fillDinners}>Fill empty dinners</button>
        <button className="btn btn-ghost press" style={{ fontSize: '0.72rem' }} onClick={copyLastWeek}>Copy last week</button>
        <button className="btn btn-primary press" style={{ fontSize: '0.72rem' }} onClick={() => onBuildList(ymd(weekStart))}>Shopping list for this week</button>
      </div>
      {note && <div style={{ ...muted, color: 'var(--text)' }}>{note}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(10rem, 1fr))', gap: '0.7rem' }}>
        {days.map(d => {
          const cal = dayCalories(d)
          const isToday = isSameDay(d, today)
          return (
            <div key={d.toISOString()} style={{ ...card, padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderColor: isToday ? 'var(--gold)' : 'var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '0.8rem', color: isToday ? 'var(--gold)' : 'var(--text)', fontWeight: 500 }}>{format(d, 'EEE d')}</span>
                {cal.known > 0 && <span style={{ ...muted, fontSize: '0.6rem' }} title={cal.unknown ? 'Some planned meals have no calories yet' : 'Calories for one person'}>{cal.total} cal{cal.unknown ? '+' : ''}</span>}
              </div>
              {slots.map(s => {
                const ms = mealsOn(d, s)
                const isAdding = adding?.date === ymd(d) && adding.slot === s
                return (
                  <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ ...label, fontSize: '0.54rem' }}>{s}</div>
                    {ms.map(m => {
                      const r = m.recipe_id ? recipeById.get(m.recipe_id) : undefined
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.74rem', lineHeight: 1.3 }}>
                          {r
                            ? <button onClick={() => onOpenRecipe(r.id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--gold)', fontFamily: 'inherit', fontSize: 'inherit', textAlign: 'left', flex: 1 }}>{m.title}</button>
                            : <span style={{ flex: 1 }}>{m.kind === 'eating_out' ? `Out: ${m.title}` : m.title}</span>}
                          <button onClick={() => h.removeMeal(m.id)} aria-label={`Remove ${m.title}`} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', opacity: 0.5 }}>✕</button>
                        </div>
                      )
                    })}
                    {isAdding
                      ? <AddMeal recipes={book.recipes} onCancel={() => setAdding(null)} onAdd={async (title, recipe, kind) => {
                          const e = await h.addMeal(ymd(d), s, title, null, { kind, recipe_id: recipe?.id ?? null, servings: recipe?.servings ?? null })
                          if (!e.error) setAdding(null); else flash(e.error)
                        }} />
                      : <button onClick={() => setAdding({ date: ymd(d), slot: s })} style={{ ...small, border: '1px dashed var(--border)', opacity: 0.7, alignSelf: 'flex-start' }}>+ add</button>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AddMeal({ recipes, onAdd, onCancel }: {
  recipes: Recipe[]; onAdd: (title: string, recipe: Recipe | null, kind: Meal['kind']) => void; onCancel: () => void
}) {
  const [q, setQ] = useState('')
  const [out, setOut] = useState(false)
  const matches = recipes.filter(r => !q.trim() || r.title.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite)).slice(0, 6)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Find a recipe, or type a meal" style={{ ...field, fontSize: '0.72rem', padding: '0.3rem 0.5rem' }}
        onKeyDown={e => { if (e.key === 'Enter' && q.trim()) onAdd(q.trim(), null, out ? 'eating_out' : 'cooking'); if (e.key === 'Escape') onCancel() }} />
      {matches.map(r => (
        <button key={r.id} onClick={() => onAdd(r.title, r, 'cooking')} style={{ ...small, textAlign: 'left', color: 'var(--text)' }}>{r.favorite ? '★ ' : ''}{r.title}</button>
      ))}
      {q.trim() && (
        <>
          <label style={{ ...muted, fontSize: '0.64rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}><input type="checkbox" checked={out} onChange={e => setOut(e.target.checked)} />Eating out</label>
          <button onClick={() => onAdd(q.trim(), null, out ? 'eating_out' : 'cooking')} className="btn btn-secondary press" style={{ fontSize: '0.66rem' }}>Add &ldquo;{q.trim()}&rdquo;</button>
        </>
      )}
      <button onClick={onCancel} style={{ ...small, border: 'none', alignSelf: 'flex-start' }}>Cancel</button>
    </div>
  )
}

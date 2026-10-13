'use client'

import { useMemo, useState } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { useFoodLog, useCalorieGoal, sumDay, FOOD_SLOTS, type FoodSlot } from '@/lib/hooks/useFoodLog'
import type { useRecipes } from '@/lib/hooks/useRecipes'
import type { useHousehold } from '@/lib/hooks/useHousehold'
import { card, field, label, muted, small } from './ui'

// Calories (2026-10-13): your own log, by day. Add something by hand, from a
// saved recipe (with how many servings you ate), or straight from today's
// plan. A daily goal you set shows as a ring. These are only ever your
// numbers: nothing here is shared with the household, and the recipe
// calories behind it are estimates unless you typed them in.

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

export default function CalorieTracker({ userId, book, h }: {
  userId: string; book: ReturnType<typeof useRecipes>; h: ReturnType<typeof useHousehold>
}) {
  const [day, setDay] = useState(() => new Date())
  const dayKey = ymd(day)
  const log = useFoodLog(ymd(addDays(day, -6)), dayKey)
  const { goal, setGoal } = useCalorieGoal(userId)
  const [editGoal, setEditGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [adding, setAdding] = useState<'quick' | 'recipe' | null>(null)
  const [name, setName] = useState('')
  const [cal, setCal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [slot, setSlot] = useState<FoodSlot>('snack')
  const [recipeId, setRecipeId] = useState('')
  const [servings, setServings] = useState('1')
  const [err, setErr] = useState<string | null>(null)

  const entries = log.entries.filter(e => e.day === dayKey)
  const total = sumDay(entries)
  const left = goal ? goal - total.calories : null
  const pct = goal ? Math.min(1.2, total.calories / goal) : 0

  // Past foods you have logged, newest first, for one-tap re-adding.
  const recent = useMemo(() => {
    const seen = new Map<string, (typeof log.entries)[number]>()
    for (const e of [...log.entries].reverse()) if (!e.recipe_id && !seen.has(e.name.toLowerCase())) seen.set(e.name.toLowerCase(), e)
    return [...seen.values()].slice(0, 6)
  }, [log.entries])

  const plannedToday = h.meals.filter(m => m.recipe_id && isSameDay(parseISO(m.meal_date), day))
  const week = Array.from({ length: 7 }, (_, i) => addDays(day, i - 6)).map(d => ({ d, cal: sumDay(log.entries.filter(e => e.day === ymd(d))).calories }))
  const weekMax = Math.max(goal ?? 0, ...week.map(w => w.cal), 1)

  async function addQuick() {
    const e = await log.add({
      name, slot, day: dayKey, calories: Number(cal) || 0,
      protein: protein ? Number(protein) : null, carbs: carbs ? Number(carbs) : null, fat: fat ? Number(fat) : null,
    })
    if (e) { setErr(e); return }
    setErr(null); setName(''); setCal(''); setProtein(''); setCarbs(''); setFat(''); setAdding(null)
  }

  async function addRecipe(rid: string, n: number, s: FoodSlot) {
    const r = book.recipes.find(x => x.id === rid)
    if (!r) return
    const e = await log.add({
      name: r.title, slot: s, day: dayKey, servings: n, recipe_id: r.id, calories: Math.round((r.calories ?? 0) * n),
      protein: r.protein != null ? Math.round(r.protein * n) : null, carbs: r.carbs != null ? Math.round(r.carbs * n) : null, fat: r.fat != null ? Math.round(r.fat * n) : null,
    })
    setErr(e ?? (r.calories == null ? `"${r.title}" has no calories saved, so it counted as 0. Add or estimate them in the recipe.` : null))
    if (!e) setAdding(null)
  }

  const R = 46, C = 2 * Math.PI * R
  const over = goal != null && total.calories > goal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
        <button style={small} onClick={() => setDay(d => addDays(d, -1))} aria-label="Previous day">‹</button>
        <span style={{ fontSize: '0.82rem', minWidth: '9rem', textAlign: 'center' }}>{isSameDay(day, new Date()) ? 'Today' : format(day, 'EEE, MMM d')}</span>
        <button style={small} onClick={() => setDay(d => addDays(d, 1))} aria-label="Next day" disabled={isSameDay(day, new Date())}>›</button>
        {!isSameDay(day, new Date()) && <button style={{ ...small, border: 'none' }} onClick={() => setDay(new Date())}>Today</button>}
      </div>

      {log.error && <div style={muted}>{log.error}</div>}

      <div style={{ ...card, display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={goal ? `${Math.round(total.calories)} of ${goal} calories` : `${Math.round(total.calories)} calories`}>
          <circle cx="56" cy="56" r={R} fill="none" stroke="var(--faint)" strokeWidth="9" />
          {goal && <circle cx="56" cy="56" r={R} fill="none" stroke={over ? 'var(--amber)' : 'var(--emerald)'} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={`${C * Math.min(1, pct)} ${C}`} transform="rotate(-90 56 56)" />}
          <text x="56" y="56" textAnchor="middle" fontSize="20" fill="var(--text)" fontFamily="var(--font-display)">{Math.round(total.calories)}</text>
          <text x="56" y="73" textAnchor="middle" fontSize="9" fill="var(--muted)">{goal ? `of ${goal}` : 'calories'}</text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '10rem' }}>
          {goal != null && <div style={{ fontSize: '0.86rem' }}>{left! >= 0 ? <><strong>{Math.round(left!)}</strong> left today</> : <><strong>{Math.round(-left!)}</strong> over today. No harm done, tomorrow is a new day.</>}</div>}
          <div style={muted}>Protein {Math.round(total.protein)}g · Carbs {Math.round(total.carbs)}g · Fat {Math.round(total.fat)}g</div>
          {editGoal ? (
            <form onSubmit={async e => { e.preventDefault(); setErr(await setGoal(Number(goalDraft))); setEditGoal(false) }} style={{ display: 'flex', gap: '0.4rem' }}>
              <input type="number" min="0" value={goalDraft} onChange={e => setGoalDraft(e.target.value)} placeholder="Daily calories" style={{ ...field, width: '9rem' }} autoFocus />
              <button className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Save</button>
            </form>
          ) : (
            <button style={{ ...small, alignSelf: 'flex-start' }} onClick={() => { setGoalDraft(goal ? String(goal) : ''); setEditGoal(true) }}>{goal ? 'Change daily goal' : 'Set a daily goal'}</button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary press" style={{ fontSize: '0.74rem' }} onClick={() => setAdding(adding === 'quick' ? null : 'quick')}>+ Add food</button>
        <button className="btn btn-secondary press" style={{ fontSize: '0.74rem' }} onClick={() => setAdding(adding === 'recipe' ? null : 'recipe')}>From a recipe</button>
      </div>

      {adding === 'quick' && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="What was it" style={field} autoFocus />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(6.5rem, 1fr))', gap: '0.4rem' }}>
            <input type="number" min="0" value={cal} onChange={e => setCal(e.target.value)} placeholder="Calories" style={field} />
            <input type="number" min="0" value={protein} onChange={e => setProtein(e.target.value)} placeholder="Protein g" style={field} />
            <input type="number" min="0" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="Carbs g" style={field} />
            <input type="number" min="0" value={fat} onChange={e => setFat(e.target.value)} placeholder="Fat g" style={field} />
            <select value={slot} onChange={e => setSlot(e.target.value as FoodSlot)} style={field}>{FOOD_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          {recent.length > 0 && (
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={muted}>Again:</span>
              {recent.map(r => <button key={r.id} style={small} onClick={() => { setName(r.name); setCal(String(r.calories)); setProtein(r.protein != null ? String(r.protein) : ''); setCarbs(r.carbs != null ? String(r.carbs) : ''); setFat(r.fat != null ? String(r.fat) : ''); setSlot(r.slot) }}>{r.name} · {Math.round(r.calories)}</button>)}
            </div>
          )}
          <div><button className="btn btn-primary press" style={{ fontSize: '0.72rem' }} disabled={!name.trim()} onClick={addQuick}>Log it</button></div>
        </div>
      )}

      {adding === 'recipe' && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {plannedToday.length > 0 && (
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={muted}>On today&rsquo;s plan:</span>
              {plannedToday.map(m => <button key={m.id} style={small} onClick={() => addRecipe(m.recipe_id!, 1, m.slot)}>{m.title} ({m.slot})</button>)}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <select value={recipeId} onChange={e => setRecipeId(e.target.value)} style={{ ...field, flex: 1, minWidth: '10rem' }}>
              <option value="">Choose a recipe</option>
              {book.recipes.map(r => <option key={r.id} value={r.id}>{r.title}{r.calories != null ? ` (${Math.round(r.calories)} cal)` : ''}</option>)}
            </select>
            <input type="number" min="0.25" step="0.25" value={servings} onChange={e => setServings(e.target.value)} style={{ ...field, width: '5rem' }} aria-label="Servings eaten" />
            <select value={slot} onChange={e => setSlot(e.target.value as FoodSlot)} style={{ ...field, width: 'auto' }}>{FOOD_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <button className="btn btn-primary press" style={{ fontSize: '0.72rem' }} disabled={!recipeId} onClick={() => addRecipe(recipeId, Number(servings) || 1, slot)}>Log it</button>
          </div>
        </div>
      )}
      {err && <div style={{ ...muted, color: 'var(--text)' }}>{err}</div>}

      {FOOD_SLOTS.map(s => {
        const list = entries.filter(e => e.slot === s)
        if (list.length === 0) return null
        return (
          <div key={s} style={card}>
            <div style={{ ...label, marginBottom: '0.3rem' }}>{s} · {Math.round(sumDay(list).calories)} cal</div>
            {list.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', padding: '0.2rem 0', fontSize: '0.84rem' }}>
                <span style={{ flex: 1 }}>{e.name}{e.servings && e.servings !== 1 ? <span style={muted}> · {e.servings} servings</span> : null}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(e.calories)}</span>
                <button onClick={() => log.remove(e.id)} aria-label={`Remove ${e.name}`} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', opacity: 0.5 }}>✕</button>
              </div>
            ))}
          </div>
        )
      })}
      {entries.length === 0 && !log.loading && <div style={{ ...muted, fontStyle: 'italic', textAlign: 'center' }}>Nothing logged for this day.</div>}

      <div style={card}>
        <div style={{ ...label, marginBottom: '0.5rem' }}>The last 7 days</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '5rem' }}>
          {week.map(w => (
            <button key={w.d.toISOString()} onClick={() => setDay(w.d)} aria-label={`${format(w.d, 'EEE')}: ${Math.round(w.cal)} calories`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', background: 'none', border: 'none', cursor: 'pointer', height: '100%', justifyContent: 'flex-end', padding: 0 }}>
              <span style={{ width: '100%', borderRadius: 4, background: isSameDay(w.d, day) ? 'var(--gold)' : 'var(--faint)', height: `${Math.max(3, (w.cal / weekMax) * 100)}%`, opacity: w.cal === 0 ? 0.4 : 1 }} />
              <span style={{ fontSize: '0.56rem', color: 'var(--muted)' }}>{format(w.d, 'EEEEE')}</span>
            </button>
          ))}
        </div>
        {(() => { const logged = week.filter(w => w.cal > 0); return logged.length > 0 ? <div style={{ ...muted, marginTop: '0.4rem' }}>Average on days you logged: {Math.round(logged.reduce((s, w) => s + w.cal, 0) / logged.length)} cal</div> : null })()}
      </div>
    </div>
  )
}

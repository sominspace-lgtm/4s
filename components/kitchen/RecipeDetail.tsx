'use client'

import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import type { Recipe } from '@/lib/recipes/types'
import { scaleIngredient, mergeIngredients, alreadyListed, qtyText } from '@/lib/recipes/ingredients'
import { minutesLabel } from '@/lib/recipes/time'
import type { useHousehold, Meal } from '@/lib/hooks/useHousehold'
import type { useFoodLog, FoodSlot } from '@/lib/hooks/useFoodLog'
import CookMode from './CookMode'
import RecipeShare from './RecipeShare'
import { card, field, label, muted, small } from './ui'

// One recipe (2026-10-13): scale it, tick ingredients as you gather them, cook
// it step by step, put it on the plan, put its ingredients on the shopping
// list, and log what you ate. Nutrition is per serving and scales with how
// many you make.

type Household = ReturnType<typeof useHousehold>
type FoodLog = ReturnType<typeof useFoodLog>

export default function RecipeDetail({ r, h, food, canShare, shared, onBack, onEdit, onDelete, onFavorite, onRate, onCooked, onShare }: {
  r: Recipe; h: Household; food: FoodLog; canShare: boolean; shared: boolean
  onBack: () => void; onEdit: () => void; onDelete: () => void
  onFavorite: () => void; onRate: (n: number) => void; onCooked: () => void; onShare: () => void
}) {
  const [servings, setServings] = useState(r.servings)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [cooking, setCooking] = useState(false)
  const [panel, setPanel] = useState<'plan' | 'log' | 'send' | null>(null)
  const [planDay, setPlanDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [planSlot, setPlanSlot] = useState<Meal['slot']>('dinner')
  const [logSlot, setLogSlot] = useState<FoodSlot>('dinner')
  const [note, setNote] = useState<string | null>(null)

  const factor = servings / r.servings
  const scaled = useMemo(() => r.ingredients.map(i => scaleIngredient(i, factor)), [r.ingredients, factor])
  const perServing = r.calories != null
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(null), 3500) }

  async function toShoppingList() {
    const lines = mergeIngredients(r.ingredients.map(ing => ({ ing, factor, from: r.title })))
    const have = h.shopping.filter(s => !s.got).map(s => s.name)
    const fresh = lines.filter(l => !alreadyListed(l.name, have))
    if (fresh.length === 0) { flash('Everything is already on the list.'); return }
    const e = await h.addShoppingMany(fresh.map(l => ({ name: l.name, qty: qtyText(l.qty, l.unit) || null, category: l.aisle })))
    flash(e.error ? e.error : `Added ${fresh.length} to the shopping list${lines.length > fresh.length ? ` (${lines.length - fresh.length} already there)` : ''}.`)
  }

  async function planIt() {
    const e = await h.addMeal(planDay, planSlot, r.title, null, { recipe_id: r.id, servings })
    if (e.error) { flash(e.error); return }
    setPanel(null); flash(`Planned for ${format(new Date(planDay + 'T12:00:00'), 'EEE MMM d')}.`)
  }

  async function logIt() {
    const cal = (r.calories ?? 0) * servings
    const e = await food.add({
      name: r.title, slot: logSlot, calories: Math.round(cal), servings, recipe_id: r.id,
      protein: r.protein != null ? Math.round(r.protein * servings) : null,
      carbs: r.carbs != null ? Math.round(r.carbs * servings) : null,
      fat: r.fat != null ? Math.round(r.fat * servings) : null,
    })
    if (e) { flash(e); return }
    setPanel(null); flash(perServing ? `Logged ${Math.round(cal)} calories.` : 'Logged. This recipe has no calories yet, so it counted as 0. Add them in Edit.')
  }

  const link = r.source_url && /^https?:\/\//i.test(r.source_url) ? r.source_url : null
  const total = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <button onClick={onBack} style={{ ...small, border: 'none', padding: 0, alignSelf: 'flex-start' }}>‹ Recipes</button>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {r.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary recipe-site hosts
          <img src={r.image_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', maxHeight: '15rem', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.4rem', margin: 0, flex: 1 }}>{r.title}</h2>
            <button onClick={onFavorite} aria-label={r.favorite ? 'Remove from favorites' : 'Add to favorites'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: r.favorite ? 'var(--gold)' : 'var(--muted)' }}>{r.favorite ? '★' : '☆'}</button>
          </div>
          <div style={{ ...muted, display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
            {total > 0 && <span>{minutesLabel(total)}</span>}
            {r.prep_minutes != null && r.cook_minutes != null && <span>{minutesLabel(r.prep_minutes)} prep, {minutesLabel(r.cook_minutes)} cook</span>}
            {link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>{r.source_name ?? 'Source'} ↗</a> : r.source_name && <span>{r.source_name}</span>}
            {r.times_cooked > 0 && <span>Made {r.times_cooked} {r.times_cooked === 1 ? 'time' : 'times'}{r.last_cooked ? `, last ${format(new Date(r.last_cooked + 'T12:00:00'), 'MMM d')}` : ''}</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.15rem', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => onRate(n === r.rating ? 0 : n)} aria-label={`${n} star${n === 1 ? '' : 's'}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0, color: n <= (r.rating ?? 0) ? 'var(--gold)' : 'var(--faint)' }}>★</button>
            ))}
          </div>
          {r.tags.length > 0 && <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>{r.tags.map(t => <span key={t} style={{ ...small, cursor: 'default' }}>#{t}</span>)}</div>}
          {perServing && (
            <div style={{ ...muted }}>
              Per serving: <strong style={{ color: 'var(--text)' }}>{Math.round(r.calories!)} cal</strong>
              {r.protein != null && ` · ${Math.round(r.protein)}g protein`}{r.carbs != null && ` · ${Math.round(r.carbs)}g carbs`}{r.fat != null && ` · ${Math.round(r.fat)}g fat`}
              {servings !== 1 && <> · all {servings} {Math.round(r.calories! * servings)} cal</>}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary press" style={{ fontSize: '0.74rem' }} disabled={r.steps.length === 0} onClick={() => setCooking(true)}>Cook it</button>
        <button className="btn btn-secondary press" style={{ fontSize: '0.74rem' }} onClick={toShoppingList}>Add to shopping list</button>
        <button className="btn btn-ghost press" style={{ fontSize: '0.74rem' }} onClick={() => setPanel(panel === 'plan' ? null : 'plan')}>Put on the plan</button>
        <button className="btn btn-ghost press" style={{ fontSize: '0.74rem' }} onClick={() => setPanel(panel === 'log' ? null : 'log')}>Log what we ate</button>
        <button className="btn btn-ghost press" style={{ fontSize: '0.74rem' }} onClick={onCooked}>We made this</button>
        <button className="btn btn-ghost press" style={{ fontSize: '0.74rem' }} onClick={() => setPanel(panel === 'send' ? null : 'send')}>Send to someone</button>
      </div>
      {note && <div style={{ ...muted, color: 'var(--text)' }}>{note}</div>}
      {panel === 'send' && <RecipeShare recipeId={r.id} title={r.title} />}

      {panel === 'plan' && (
        <div style={{ ...card, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={planDay} onChange={e => setPlanDay(e.target.value)} style={{ ...field, width: 'auto' }} min={format(new Date(), 'yyyy-MM-dd')} max={format(addDays(new Date(), 120), 'yyyy-MM-dd')} />
          <select value={planSlot} onChange={e => setPlanSlot(e.target.value as Meal['slot'])} style={{ ...field, width: 'auto' }}>
            <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option>
          </select>
          <button className="btn btn-primary press" style={{ fontSize: '0.72rem' }} onClick={planIt}>Plan it</button>
        </div>
      )}
      {panel === 'log' && (
        <div style={{ ...card, display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={muted}>{servings} serving{servings === 1 ? '' : 's'} as</span>
          <select value={logSlot} onChange={e => setLogSlot(e.target.value as FoodSlot)} style={{ ...field, width: 'auto' }}>
            <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option>
          </select>
          <button className="btn btn-primary press" style={{ fontSize: '0.72rem' }} onClick={logIt}>Log it</button>
        </div>
      )}

      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={label}>Ingredients</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={muted}>Servings</span>
            <button style={small} onClick={() => setServings(s => Math.max(0.5, s - (s > 1 ? 1 : 0.5)))} aria-label="Fewer servings">−</button>
            <strong style={{ minWidth: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>{servings}</strong>
            <button style={small} onClick={() => setServings(s => Math.min(99, s + (s >= 1 ? 1 : 0.5)))} aria-label="More servings">+</button>
            {servings !== r.servings && <button style={{ ...small, border: 'none' }} onClick={() => setServings(r.servings)}>Reset</button>}
          </div>
        </div>
        {scaled.length === 0 && <div style={{ ...muted, fontStyle: 'italic' }}>No ingredients yet. Add some in Edit.</div>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {scaled.map(g => (
            <li key={g.id}>
              <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.84rem', cursor: 'pointer', textDecoration: ticked.has(g.id) ? 'line-through' : 'none', opacity: ticked.has(g.id) ? 0.5 : 1 }}>
                <input type="checkbox" checked={ticked.has(g.id)} style={{ marginTop: '0.25rem' }}
                  onChange={() => setTicked(prev => { const n = new Set(prev); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n })} />
                {g.text}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {r.steps.length > 0 && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={label}>Method</div>
          <ol style={{ margin: 0, paddingLeft: '1.4rem', listStyle: 'decimal', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.86rem', lineHeight: 1.6 }}>
            {r.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}

      {r.notes && <div style={{ ...card }}><div style={{ ...label, marginBottom: '0.3rem' }}>Notes</div><div style={{ fontSize: '0.84rem', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{r.notes}</div></div>}

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button style={small} onClick={onEdit}>Edit</button>
        {canShare && <button style={{ ...small, color: shared ? 'var(--gold)' : 'var(--muted)' }} onClick={onShare}>{shared ? 'Shared with the household' : 'Private. Share it'}</button>}
        <button style={{ ...small, color: 'var(--rose)' }} onClick={onDelete}>Delete</button>
      </div>

      {cooking && <CookMode title={r.title} steps={r.steps} ingredients={scaled} onClose={() => setCooking(false)} onDone={() => { setCooking(false); onCooked() }} />}
    </div>
  )
}

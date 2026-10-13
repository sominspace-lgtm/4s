'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import type { useHousehold } from '@/lib/hooks/useHousehold'
import type { useRecipes } from '@/lib/hooks/useRecipes'
import { alreadyListed, mergeIngredients, qtyText, type GroceryLine } from '@/lib/recipes/ingredients'
import { card, field, label, muted, small } from './ui'

// Groceries (2026-10-13): build the list from the plan. Every recipe on the
// chosen week's meals is scaled to how many you are cooking for, merged into
// one list (two recipes needing onions become one line), sorted by aisle, and
// anything already on your shopping list is left unticked so nothing doubles.
// Below it, the live shopping list the two of you share.

export default function GroceryBuilder({ h, book, weekStart: initialWeek }: {
  h: ReturnType<typeof useHousehold>; book: ReturnType<typeof useRecipes>; weekStart: string | null
}) {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  const [week, setWeek] = useState(initialWeek ?? format(monday, 'yyyy-MM-dd'))
  useEffect(() => { if (initialWeek) setWeek(initialWeek) }, [initialWeek])
  const [pastToo, setPastToo] = useState(false)
  const [extras, setExtras] = useState<{ id: string; servings: number }[]>([])
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [note, setNote] = useState<string | null>(null)
  const [quick, setQuick] = useState('')

  const weekOptions = [0, 1, 2].map(i => format(addDays(monday, i * 7), 'yyyy-MM-dd'))
  const from = parseISO(week)
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const recipeById = useMemo(() => new Map(book.recipes.map(r => [r.id, r])), [book.recipes])

  const planned = h.meals.filter(m => {
    if (!m.recipe_id) return false
    const d = parseISO(m.meal_date)
    return d >= from && d < addDays(from, 7) && (pastToo || d >= todayStart)
  })

  const lines: GroceryLine[] = useMemo(() => {
    const items: Parameters<typeof mergeIngredients>[0] = []
    for (const m of planned) {
      const r = recipeById.get(m.recipe_id!)
      if (!r) continue
      const factor = (m.servings ?? r.servings) / r.servings
      for (const ing of r.ingredients) items.push({ ing, factor, from: r.title })
    }
    for (const x of extras) {
      const r = recipeById.get(x.id)
      if (!r) continue
      for (const ing of r.ingredients) items.push({ ing, factor: x.servings / r.servings, from: r.title })
    }
    return mergeIngredients(items)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `planned` is derived from h.meals + the filters above
  }, [h.meals, recipeById, extras, week, pastToo])

  const onList = h.shopping.filter(s => !s.got).map(s => s.name)
  const isOnList = (l: GroceryLine) => alreadyListed(l.name, onList)
  const wanted = lines.filter(l => !isOnList(l) && !skipped.has(l.key))
  const aisles = [...new Set(lines.map(l => l.aisle))]

  async function addAll() {
    const e = await h.addShoppingMany(wanted.map(l => ({ name: l.name, qty: qtyText(l.qty, l.unit) || null, category: l.aisle })))
    setNote(e.error ?? `Added ${wanted.length} item${wanted.length === 1 ? '' : 's'} to the shopping list.`)
    setTimeout(() => setNote(null), 4000)
  }

  const open = h.shopping.filter(s => !s.got)
  const got = h.shopping.filter(s => s.got)
  const groups = [...new Set(open.map(s => s.category || 'Other'))].sort()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={label}>Build from the plan</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={week} onChange={e => setWeek(e.target.value)} style={{ ...field, width: 'auto' }}>
              {(weekOptions.includes(week) ? weekOptions : [week, ...weekOptions]).map((w, i) => (
                <option key={w} value={w}>{w === weekOptions[0] ? 'This week' : w === weekOptions[1] ? 'Next week' : w === weekOptions[2] ? 'The week after' : `Week of ${format(parseISO(w), 'MMM d')}`}</option>
              ))}
            </select>
            <label style={{ ...muted, display: 'flex', gap: '0.3rem', alignItems: 'center' }}><input type="checkbox" checked={pastToo} onChange={e => setPastToo(e.target.checked)} />Include days already past</label>
          </div>
        </div>

        {planned.length === 0 && extras.length === 0 && (
          <div style={{ ...muted, fontStyle: 'italic' }}>No planned meals with recipes in this week. Plan some in the Plan tab, or add a recipe below.</div>
        )}
        {planned.length > 0 && (
          <div style={{ ...muted }}>From {planned.length} planned meal{planned.length === 1 ? '' : 's'}: {[...new Set(planned.map(m => m.title))].join(', ')}</div>
        )}

        {extras.map((x, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.78rem' }}>
            <span style={{ flex: 1 }}>+ {recipeById.get(x.id)?.title}</span>
            <input type="number" min="1" value={x.servings} onChange={e => setExtras(prev => prev.map((p, j) => (j === i ? { ...p, servings: Math.max(1, Number(e.target.value) || 1) } : p)))} style={{ ...field, width: '4rem' }} aria-label="Servings" />
            <button style={{ ...small, border: 'none' }} onClick={() => setExtras(prev => prev.filter((_, j) => j !== i))}>Remove</button>
          </div>
        ))}
        <select value="" onChange={e => { const r = recipeById.get(e.target.value); if (r) setExtras(prev => [...prev, { id: r.id, servings: r.servings }]) }} style={{ ...field, width: 'auto', alignSelf: 'flex-start' }}>
          <option value="">+ Add another recipe</option>
          {book.recipes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>

        {lines.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {aisles.map(a => (
              <div key={a}>
                <div style={{ ...label, marginBottom: '0.25rem' }}>{a}</div>
                {lines.filter(l => l.aisle === a).map(l => {
                  const have = isOnList(l)
                  const checked = !have && !skipped.has(l.key)
                  return (
                    <label key={l.key + l.unit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', fontSize: '0.82rem', padding: '0.15rem 0', opacity: have ? 0.5 : 1, cursor: have ? 'default' : 'pointer' }}>
                      <input type="checkbox" checked={checked} disabled={have}
                        onChange={() => setSkipped(prev => { const n = new Set(prev); if (n.has(l.key)) n.delete(l.key); else n.add(l.key); return n })} />
                      <span style={{ flex: 1 }}>{l.text}{have && <span style={muted}> · already on the list</span>}</span>
                      {l.from.length > 0 && <span style={{ ...muted, fontSize: '0.62rem' }}>{l.from.join(', ')}</span>}
                    </label>
                  )
                })}
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary press" style={{ fontSize: '0.74rem' }} disabled={wanted.length === 0} onClick={addAll}>
                {wanted.length === 0 ? 'Nothing new to add' : `Add ${wanted.length} to the shopping list`}
              </button>
              {note && <span style={muted}>{note}</span>}
            </div>
          </div>
        )}
      </div>

      <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={label}>Shopping list</div>
          {got.length > 0 && <button style={small} onClick={() => h.clearGot()}>Clear {got.length} got</button>}
        </div>
        <form onSubmit={async e => { e.preventDefault(); const t = quick.trim(); if (!t) return; await h.addShopping(t, null, null); setQuick('') }} style={{ display: 'flex', gap: '0.4rem' }}>
          <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Add something" style={field} />
          <button className="btn btn-secondary press" style={{ fontSize: '0.72rem' }}>Add</button>
        </form>
        {open.length === 0 && got.length === 0 && <div style={{ ...muted, fontStyle: 'italic' }}>The list is empty.</div>}
        {groups.map(g => (
          <div key={g}>
            <div style={{ ...label, marginBottom: '0.2rem' }}>{g}</div>
            {open.filter(s => (s.category || 'Other') === g).map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0', fontSize: '0.84rem' }}>
                <input type="checkbox" checked={false} onChange={() => h.toggleGot(s.id, true)} aria-label={`Got ${s.name}`} />
                <span style={{ flex: 1 }}>{s.qty ? `${s.qty} ` : ''}{s.name}</span>
                <button onClick={() => h.removeShopping(s.id)} aria-label={`Remove ${s.name}`} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', opacity: 0.5 }}>✕</button>
              </div>
            ))}
          </div>
        ))}
        {got.length > 0 && (
          <div>
            <div style={{ ...label, marginBottom: '0.2rem' }}>Got</div>
            {got.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0', fontSize: '0.8rem', opacity: 0.5, textDecoration: 'line-through' }}>
                <input type="checkbox" checked onChange={() => h.toggleGot(s.id, false)} aria-label={`Un-get ${s.name}`} />
                <span>{s.qty ? `${s.qty} ` : ''}{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

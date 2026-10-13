'use client'

import { useState } from 'react'
import { parseIngredient } from '@/lib/recipes/ingredients'
import { EMPTY_DRAFT, type RecipeDraft } from '@/lib/recipes/types'
import { card, field, label, muted, small } from './ui'

// Write or fix a recipe (2026-10-13). Ingredients and steps are one per line,
// the quickest thing to type or paste; ingredients are read into amounts on
// save so scaling and grocery lists work. "Estimate" asks the AI for a rough
// calorie count from the ingredients, and says it is rough.

const num = (s: string): number | null => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))

export default function RecipeEditor({ initial, canShare, shared, onSave, onCancel, title = 'Edit recipe' }: {
  initial: RecipeDraft | null
  canShare: boolean
  shared: boolean
  onSave: (d: RecipeDraft, shared: boolean) => Promise<string | null>
  onCancel: () => void
  title?: string
}) {
  const d = initial ?? EMPTY_DRAFT
  const [name, setName] = useState(d.title)
  const [image, setImage] = useState(d.image_url ?? '')
  const [source, setSource] = useState(d.source_url ?? '')
  const [servings, setServings] = useState(String(d.servings))
  const [prep, setPrep] = useState(d.prep_minutes != null ? String(d.prep_minutes) : '')
  const [cook, setCook] = useState(d.cook_minutes != null ? String(d.cook_minutes) : '')
  const [tags, setTags] = useState(d.tags.join(', '))
  const [ingredients, setIngredients] = useState(d.ingredients.map(i => i.text).join('\n'))
  const [steps, setSteps] = useState(d.steps.join('\n'))
  const [notes, setNotes] = useState(d.notes ?? '')
  const [cal, setCal] = useState(d.calories != null ? String(Math.round(d.calories)) : '')
  const [protein, setProtein] = useState(d.protein != null ? String(Math.round(d.protein)) : '')
  const [carbs, setCarbs] = useState(d.carbs != null ? String(Math.round(d.carbs)) : '')
  const [fat, setFat] = useState(d.fat != null ? String(Math.round(d.fat)) : '')
  const [isShared, setIsShared] = useState(shared)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [estNote, setEstNote] = useState<string | null>(null)

  const lines = (s: string) => s.split('\n').map(l => l.trim()).filter(Boolean)

  async function estimate() {
    setEstimating(true); setEstNote(null)
    try {
      const res = await fetch('/api/recipes/nutrition', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: name, servings: num(servings) ?? 2, ingredients: lines(ingredients) }),
      })
      const j = await res.json() as { nutrition?: { calories: number; protein: number; carbs: number; fat: number; confidence: string }; error?: string }
      if (!res.ok || !j.nutrition) { setEstNote(j.error ?? 'Could not estimate that.'); return }
      setCal(String(Math.round(j.nutrition.calories))); setProtein(String(Math.round(j.nutrition.protein)))
      setCarbs(String(Math.round(j.nutrition.carbs))); setFat(String(Math.round(j.nutrition.fat)))
      setEstNote(`Rough estimate per serving (${j.nutrition.confidence} confidence). Adjust it if you know better.`)
    } finally { setEstimating(false) }
  }

  async function save() {
    if (!name.trim()) { setErr('Give it a name.'); return }
    setSaving(true); setErr(null)
    const draft: RecipeDraft = {
      title: name.trim(), image_url: image.trim() || null, source_url: source.trim() || null, source_name: d.source_name,
      servings: num(servings) && num(servings)! > 0 ? num(servings)! : 2,
      prep_minutes: num(prep), cook_minutes: num(cook),
      ingredients: lines(ingredients).map(t => parseIngredient(t)),
      steps: lines(steps), notes: notes.trim() || null,
      tags: tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 10),
      calories: num(cal), protein: num(protein), carbs: num(carbs), fat: num(fat),
    }
    const e = await onSave(draft, isShared)
    setSaving(false)
    if (e) setErr(e)
  }

  const half: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(7rem, 1fr))', gap: '0.4rem' }

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={label}>{title}</div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Recipe name" style={field} autoFocus />
      <div style={{ display: 'flex', gap: '0.6rem' }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary recipe-site hosts
          <img src={image} alt="" referrerPolicy="no-referrer" style={{ width: '4.5rem', height: '4.5rem', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <input value={image} onChange={e => setImage(e.target.value)} placeholder="Picture link (optional)" style={field} />
          <input value={source} onChange={e => setSource(e.target.value)} placeholder="Where it is from (link, optional)" style={field} />
        </div>
      </div>
      <div style={half}>
        <label style={muted}>Servings<input type="number" min="0.5" step="0.5" value={servings} onChange={e => setServings(e.target.value)} style={field} /></label>
        <label style={muted}>Prep (min)<input type="number" min="0" value={prep} onChange={e => setPrep(e.target.value)} style={field} /></label>
        <label style={muted}>Cook (min)<input type="number" min="0" value={cook} onChange={e => setCook(e.target.value)} style={field} /></label>
      </div>
      <label style={muted}>Ingredients, one per line
        <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} rows={7} style={{ ...field, resize: 'vertical', lineHeight: 1.55 }}
          placeholder={'2 cups flour\n1 1/2 tsp salt\n3 cloves garlic, minced'} />
      </label>
      <label style={muted}>Steps, one per line
        <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={7} style={{ ...field, resize: 'vertical', lineHeight: 1.55 }}
          placeholder={'Heat the oil.\nSimmer for 10 minutes.'} />
      </label>
      <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags, comma separated (dinner, quick, italian)" style={field} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes: swaps, tips, what to change next time" rows={2} style={{ ...field, resize: 'vertical' }} />

      <div>
        <div style={{ ...label, marginBottom: '0.3rem' }}>Nutrition per serving</div>
        <div style={half}>
          <input type="number" min="0" value={cal} onChange={e => setCal(e.target.value)} placeholder="Calories" style={field} />
          <input type="number" min="0" value={protein} onChange={e => setProtein(e.target.value)} placeholder="Protein g" style={field} />
          <input type="number" min="0" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="Carbs g" style={field} />
          <input type="number" min="0" value={fat} onChange={e => setFat(e.target.value)} placeholder="Fat g" style={field} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap' }}>
          <button type="button" style={small} disabled={estimating || lines(ingredients).length === 0} onClick={estimate}>{estimating ? 'Estimating…' : 'Estimate from ingredients'}</button>
          {estNote && <span style={muted}>{estNote}</span>}
        </div>
      </div>

      {canShare && (
        <label style={{ ...muted, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} />
          Shared with the household (either of you can use and edit it)
        </label>
      )}
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={save} disabled={saving} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>{saving ? 'Saving…' : 'Save recipe'}</button>
        <button onClick={onCancel} className="btn btn-ghost press" style={{ fontSize: '0.74rem' }}>Cancel</button>
      </div>
    </div>
  )
}

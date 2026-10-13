'use client'

import { useEffect, useMemo, useState } from 'react'
import type { useRecipes } from '@/lib/hooks/useRecipes'
import type { useHousehold } from '@/lib/hooks/useHousehold'
import type { useFoodLog } from '@/lib/hooks/useFoodLog'
import type { Recipe, RecipeDraft } from '@/lib/recipes/types'
import { minutesLabel } from '@/lib/recipes/time'
import RecipeImport from './RecipeImport'
import RecipeEditor from './RecipeEditor'
import RecipeDetail from './RecipeDetail'
import { card, chip, field, muted } from './ui'

// The recipe book (2026-10-13): everything you have saved, searchable by name,
// ingredient or tag, with one place to add more by link, text, photo, or hand.

type Sort = 'new' | 'fav' | 'cooked' | 'quick'

export default function RecipeBook({ book, h, food, spaceId, openId, onOpen, incoming, onIncomingHandled, shared, onSharedHandled }: {
  book: ReturnType<typeof useRecipes>; h: ReturnType<typeof useHousehold>; food: ReturnType<typeof useFoodLog>
  spaceId: string | null; openId: string | null; onOpen: (id: string | null) => void
  /** Sent from the bookmarklet: a ready draft, or page text to read. */
  incoming?: { draft: RecipeDraft | null; text: string | null; url: string } | null
  onIncomingHandled?: () => void
  /** Sent from the phone's share sheet: read it straight away. */
  shared?: { url: string | null; text: string } | null
  onSharedHandled?: () => void
}) {
  const { recipes, loading } = book
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>('new')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState<{ d: RecipeDraft | null; via: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [prefill, setPrefill] = useState<{ text: string; url: string } | null>(null)

  // A page saved with the bookmarklet: a recipe with markup goes straight to review;
  // plain page text opens the importer with the text ready to read.
  useEffect(() => {
    if (!incoming) return
    if (incoming.draft) setDraft({ d: incoming.draft, via: 'bookmarklet' })
    else if (incoming.text) { setPrefill({ text: incoming.text, url: incoming.url }); setAdding(true) }
    onIncomingHandled?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per incoming recipe
  }, [incoming])

  const [auto, setAuto] = useState<{ url: string | null; text: string } | null>(null)
  useEffect(() => {
    if (!shared) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hand the share to the importer once
    setAuto(shared); setAdding(true); onSharedHandled?.()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per share
  }, [shared])

  const open = recipes.find(r => r.id === openId) ?? null
  const tags = useMemo(() => {
    const c = new Map<string, number>()
    for (const r of recipes) for (const t of r.tags) c.set(t, (c.get(t) ?? 0) + 1)
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t]) => t)
  }, [recipes])

  const shown = recipes.filter(r => {
    if (tag && !r.tags.includes(tag)) return false
    const n = q.trim().toLowerCase()
    return !n || r.title.toLowerCase().includes(n) || r.tags.some(t => t.includes(n)) || r.ingredients.some(i => i.name.toLowerCase().includes(n))
  }).sort((a, b) => {
    if (sort === 'fav') return Number(b.favorite) - Number(a.favorite) || b.created_at.localeCompare(a.created_at)
    if (sort === 'cooked') return b.times_cooked - a.times_cooked || b.created_at.localeCompare(a.created_at)
    if (sort === 'quick') return ((a.prep_minutes ?? 0) + (a.cook_minutes ?? 0) || 9999) - ((b.prep_minutes ?? 0) + (b.cook_minutes ?? 0) || 9999)
    return b.created_at.localeCompare(a.created_at)
  })

  async function saveNew(d: RecipeDraft, shared: boolean): Promise<string | null> {
    const r = await book.add(d, { shared })
    if (r.error) return r.error
    setDraft(null); setAdding(false); onOpen(r.id)
    setNotice(null)
    return null
  }

  // --- new recipe being reviewed
  if (draft) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {draft.via !== 'manual' && <div style={muted}>Look it over before saving. Imports can miss a line or misread an amount.</div>}
        <RecipeEditor initial={draft.d} canShare={!!spaceId} shared={!!spaceId} title={draft.via === 'manual' ? 'New recipe' : 'Review recipe'}
          onSave={saveNew} onCancel={() => setDraft(null)} />
      </div>
    )
  }

  // --- one recipe
  if (open) {
    if (editing) {
      return (
        <RecipeEditor initial={open} canShare={!!spaceId} shared={!!open.space_id}
          onSave={async (d, shared) => { const e = await book.update(open.id, { ...d, space_id: shared ? spaceId : null }); if (!e) setEditing(false); return e }}
          onCancel={() => setEditing(false)} />
      )
    }
    return (
      <RecipeDetail r={open} h={h} food={food} canShare={!!spaceId && open.user_id !== undefined} shared={!!open.space_id}
        onBack={() => onOpen(null)} onEdit={() => setEditing(true)}
        onDelete={async () => { if (window.confirm(`Delete "${open.title}"?`)) { await book.remove(open.id); onOpen(null) } }}
        onFavorite={() => book.update(open.id, { favorite: !open.favorite })}
        onRate={n => book.update(open.id, { rating: n || null } as Partial<RecipeDraft>)}
        onCooked={() => book.markCooked(open)}
        onShare={() => book.update(open.id, { space_id: open.space_id ? null : spaceId })} />
    )
  }

  // --- the book
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search recipes, ingredients, tags" style={{ ...field, flex: 1, minWidth: '10rem' }} />
        <select value={sort} onChange={e => setSort(e.target.value as Sort)} style={{ ...field, width: 'auto' }}>
          <option value="new">Newest</option><option value="fav">Favorites</option><option value="cooked">Most cooked</option><option value="quick">Quickest</option>
        </select>
        <button className="btn btn-primary press" style={{ fontSize: '0.74rem' }} onClick={() => setAdding(a => !a)}>{adding ? 'Close' : '+ Add a recipe'}</button>
      </div>

      {adding && (
        <RecipeImport prefill={prefill} auto={auto} onClose={() => { setAdding(false); setPrefill(null); setAuto(null) }} onWrite={() => { setAdding(false); setDraft({ d: null, via: 'manual' }) }}
          onDraft={(d, via) => { setAdding(false); setDraft({ d, via }) }} />
      )}
      {notice && <div style={muted}>{notice}</div>}

      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {tags.map(t => <button key={t} className="press" style={chip(tag === t)} onClick={() => setTag(tag === t ? null : t)}>#{t}</button>)}
        </div>
      )}

      {!loading && recipes.length === 0 && !adding && (
        <div style={{ ...card, textAlign: 'center', ...muted }}>
          No recipes yet. Paste a link from any recipe site, a YouTube video, a TikTok or an Instagram post, or snap a screenshot of one, and it lands here ready to cook, plan, and shop for.
        </div>
      )}
      {recipes.length > 0 && shown.length === 0 && <div style={{ ...muted, textAlign: 'center', padding: '1rem 0' }}>No recipes match.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(9.5rem, 100%), 1fr))', gap: '0.8rem' }}>
        {shown.map(r => <RecipeCard key={r.id} r={r} onOpen={() => onOpen(r.id)} />)}
      </div>
    </div>
  )
}

function RecipeCard({ r, onOpen }: { r: Recipe; onOpen: () => void }) {
  const mins = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0)
  return (
    <button onClick={onOpen} className="press" style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', padding: 0, fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ aspectRatio: '4 / 3', background: 'var(--surface2)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {r.image_url
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary recipe-site hosts
          ? <img src={r.image_url} alt="" referrerPolicy="no-referrer" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--muted)', opacity: 0.4 }}>{r.title.charAt(0).toUpperCase()}</span>}
        {r.favorite && <span style={{ position: 'absolute', top: 6, right: 8, color: 'var(--gold)' }}>★</span>}
        {r.space_id && <span style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.56rem', background: 'color-mix(in srgb, var(--surface) 85%, transparent)', color: 'var(--text)', borderRadius: 999, padding: '0.1em 0.5em' }}>shared</span>}
      </div>
      <div style={{ padding: '0.55rem 0.7rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.3 }}>{r.title}</span>
        <span style={{ ...muted, fontSize: '0.64rem' }}>
          {[mins ? minutesLabel(mins) : null, r.calories != null ? `${Math.round(r.calories)} cal` : null, r.times_cooked ? `made ${r.times_cooked}x` : null].filter(Boolean).join(' · ')}
        </span>
      </div>
    </button>
  )
}

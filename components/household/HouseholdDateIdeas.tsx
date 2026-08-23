'use client'

import { useState } from 'react'
import { useDateIdeas, type DateIdea, type DateIdeaStatus } from '@/lib/hooks/useDateIdeas'
import { usePlaces } from '@/lib/hooks/usePlaces'
import type { Energy } from '@/lib/hooks/useWorkItems'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', outline: 'none',
}

const STATUS_LABEL: Record<DateIdeaStatus, string> = { idea: 'Idea', planned: 'Planned', done: 'Done' }
const STATUS_ORDER: DateIdeaStatus[] = ['planned', 'idea', 'done']
const ENERGY_LABEL: Record<Energy, string> = { light: '🌤️ Light', medium: '⛅ Medium', deep: '🌧️ Deep' }

// Split out of the generic Lists checklist (2026-08-22) — a date idea is a
// real little plan, not just a checkbox: what stage it's at, how much
// energy it takes, and (optionally) which saved pin it's actually at. See
// useDateIdeas's own header comment for the full reasoning.
export default function HouseholdDateIdeas({ spaceId }: { spaceId: string | null }) {
  const { ideas, loading, addIdea, update, removeIdea } = useDateIdeas(spaceId)
  const { places } = usePlaces()
  const [title, setTitle] = useState('')
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({})

  const placeName = (id: string | null) => (id ? places.find(p => p.id === id)?.name ?? null : null)
  const grouped = STATUS_ORDER.map(s => ({ status: s, ideas: ideas.filter(i => i.status === s) })).filter(g => g.ideas.length > 0)

  async function addTag(idea: DateIdea) {
    const val = (tagDrafts[idea.id] ?? '').trim()
    if (!val) return
    await update(idea.id, { tags: [...idea.tags, val] })
    setTagDrafts(d => ({ ...d, [idea.id]: '' }))
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div className="t-card">Date Ideas</div>

      {ideas.length === 0 && !loading && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing yet. Add an idea — pair it with a pin or an energy level whenever you want.
        </div>
      )}

      {grouped.map(g => (
        <div key={g.status}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.35rem' }}>
            {STATUS_LABEL[g.status]} · {g.ideas.length}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {g.ideas.map(idea => (
              <div key={idea.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text)' }}>{idea.title}</span>
                  <button onClick={() => removeIdea(idea.id)} aria-label={`Remove ${idea.title}`} className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem' }}>✕</button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                  <select value={idea.status} onChange={e => update(idea.id, { status: e.target.value as DateIdeaStatus })}
                    style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>

                  <select value={idea.energy ?? ''} onChange={e => update(idea.id, { energy: (e.target.value || null) as Energy | null })}
                    style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
                    <option value="">No energy set</option>
                    {(['light', 'medium', 'deep'] as Energy[]).map(e => <option key={e} value={e}>{ENERGY_LABEL[e]}</option>)}
                  </select>

                  <select value={idea.place_id ?? ''} onChange={e => update(idea.id, { place_id: e.target.value || null })}
                    style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer', maxWidth: '160px' }}>
                    <option value="">No pin</option>
                    {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {(idea.tags.length > 0 || true) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                    {idea.tags.map((tag, i) => (
                      <span key={i} style={{
                        fontSize: '0.6rem', color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)', borderRadius: '99px', padding: '0.1em 0.5em',
                        display: 'inline-flex', alignItems: 'center', gap: '0.3em',
                      }}>
                        {tag}
                        <button onClick={() => update(idea.id, { tags: idea.tags.filter((_, ti) => ti !== i) })} aria-label={`Remove tag ${tag}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.6, fontSize: '0.55rem', padding: 0, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                    <input
                      value={tagDrafts[idea.id] ?? ''}
                      onChange={e => setTagDrafts(d => ({ ...d, [idea.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(idea) } }}
                      placeholder="+ tag"
                      style={{ ...inputStyle, width: '70px', padding: '0.15em 0.4em', fontSize: '0.6rem' }}
                    />
                  </div>
                )}

                {placeName(idea.place_id) && (
                  <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75 }}>📍 {placeName(idea.place_id)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <form
        onSubmit={async e => {
          e.preventDefault()
          if (!title.trim()) return
          await addIdea(title.trim())
          setTitle('')
        }}
        style={{ display: 'flex', gap: '0.4rem' }}
      >
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="New date idea" style={{ ...inputStyle, flex: 1, fontSize: '0.75rem' }} />
        <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
      </form>
    </section>
  )
}

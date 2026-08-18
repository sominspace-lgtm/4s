'use client'

import { useState } from 'react'
import { usePreferences, CATEGORY_LABEL, type PreferenceCategory } from '@/lib/hooks/usePreferences'
import { useNeeds } from '@/lib/hooks/useNeeds'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

const CATEGORIES: PreferenceCategory[] = ['preference', 'like', 'dislike', 'decision', 'general']

const input: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
  padding: '0.5rem 0.7rem', outline: 'none',
}

// Preferences — a taste or a past decision, distinct from a Rule (a standing
// convention someone's expected to follow) and from a freeform note. Personal
// by default: a preference doesn't need a shared space to exist. Discord's
// /remember can also write here — since a bot token is always household-
// scoped, anything captured that way lands shared with the space rather than
// staying private-only; ones added here directly default to personal-only.
export default function PreferencesHub({ userId }: { userId: string }) {
  const { preferences, loading, addPreference, removePreference } = usePreferences()
  const { needs, loading: needsLoading, addNeed, shareNeed, removeNeed } = useNeeds()
  const { spaces } = useSharedSpaces(userId)
  const [text, setText] = useState('')
  const [category, setCategory] = useState<PreferenceCategory>('preference')
  const [note, setNote] = useState('')
  const [needText, setNeedText] = useState('')

  const grouped = CATEGORIES.map(c => ({ category: c, items: preferences.filter(p => p.category === c) }))
    .filter(g => g.items.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
        <div className="t-card" style={{ marginBottom: '0.7rem' }}>What you've decided</div>

        {preferences.length === 0 && !loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
            Nothing logged yet — tastes, likes, dislikes, and decisions you don&rsquo;t want to have to re-decide later.
          </div>
        )}

        {grouped.map(({ category: c, items }) => (
          <div key={c} style={{ marginBottom: '0.8rem' }}>
            <div className="t-label" style={{ marginBottom: '0.3rem' }}>{CATEGORY_LABEL[c]}</div>
            {items.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{p.text}</div>
                  {p.note && <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.75, marginTop: '0.1rem' }}>{p.note}</div>}
                  {p.space_id && <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5, marginTop: '0.1rem' }}>shared with household</div>}
                </div>
                <button onClick={() => removePreference(p.id)} aria-label={`Remove ${p.text}`} className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
        ))}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!text.trim()) return
            await addPreference(category, text.trim(), note.trim() || null)
            setText(''); setNote('')
          }}
          style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
        >
          <select value={category} onChange={e => setCategory(e.target.value as PreferenceCategory)} style={{ ...input, cursor: 'pointer' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </select>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="e.g. fragrance-free detergent" style={{ ...input, flex: 1, minWidth: '160px' }} />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" style={{ ...input, width: '160px' }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>

      {/* Private by default — visually separated on purpose. Discord's /need
          opens a modal (not a channel message), same privacy guarantee.
          Sharing is one explicit action, never a default. */}
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
        <div className="t-card" style={{ marginBottom: '0.3rem' }}>What you need</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.7rem' }}>
          Private to you unless you choose to share one. Discord&rsquo;s <code>/need</code> works the same way.
        </div>

        {needs.length === 0 && !needsLoading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
            Nothing here. After a hard day — what would actually help, even if you don&rsquo;t say it out loud yet.
          </div>
        )}

        {needs.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', padding: '0.4rem 0', borderBottom: '1px solid var(--faint)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{n.text}</div>
              {n.space_id
                ? <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5, marginTop: '0.1rem' }}>shared with household</div>
                : spaces.length > 0 && (
                  <button onClick={() => shareNeed(n.id, spaces[0]!.id)} className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.75, fontSize: '0.62rem', padding: 0, marginTop: '0.15rem' }}>
                    share with {spaces[0]!.name}
                  </button>
                )}
            </div>
            <button onClick={() => removeNeed(n.id)} aria-label={`Remove ${n.text}`} className="press"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
          </div>
        ))}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!needText.trim()) return
            await addNeed(needText.trim())
            setNeedText('')
          }}
          style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}
        >
          <input value={needText} onChange={e => setNeedText(e.target.value)} placeholder="What do you need right now?" style={{ ...input, flex: 1 }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>
    </div>
  )
}

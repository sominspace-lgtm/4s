'use client'

import { useState } from 'react'
import { useUnderstanding, type UnderstandingEntry } from '@/lib/hooks/useUnderstanding'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.5rem 0.65rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem', outline: 'none',
}

// Fixed starting order for the areas this shipped with (2026-08-22) — any
// area not in this list (a brand new one someone adds) just sorts after,
// alphabetically, via the fallback below.
const AREA_ORDER = [
  'Care', 'Boundaries', 'Communication', 'Emotions / Mood', 'Energy / Focus',
  'Support & Encouragement', 'Self-Care / Personal Needs',
]

function areaSort(a: string, b: string): number {
  const ia = AREA_ORDER.indexOf(a), ib = AREA_ORDER.indexOf(b)
  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1
  return a.localeCompare(b)
}

// "Understanding each other" (2026-08-22) — how you each show care,
// communicate, handle conflict, recharge, etc. Private to the household
// space, meant to be read by both of you and refined over time (including
// from Discord, once a bot command writes to the same
// relationship_understanding table this reads — see its migration).
//
// Each area collapses (same <details> pattern as Lists/Check-ins next to
// it). Within an area, every topic shows both people's answers side by
// side — your own is a click-to-edit textarea, your partner's is read-only,
// same boundary the table's own RLS enforces (write your own, read both).
export default function HouseholdUnderstanding({ spaceId, userId, partnerName }: {
  spaceId: string | null
  userId: string
  /** For the read-only side's label — "Harry" instead of a raw user id. */
  partnerName: (uid: string) => string
}) {
  const { entries, loading, setAnswer, removeAnswer } = useUnderstanding(spaceId)
  const [editing, setEditing] = useState<{ area: string; topic: string } | null>(null)
  const [draft, setDraft] = useState('')
  const [newArea, setNewArea] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [addingArea, setAddingArea] = useState(false)

  const areas = [...new Set(entries.map(e => e.area))].sort(areaSort)
  const topicsFor = (area: string) => [...new Set(entries.filter(e => e.area === area).map(e => e.topic))]

  function openEditor(area: string, topic: string) {
    const mine = entries.find(e => e.area === area && e.topic === topic && e.user_id === userId)
    setDraft(mine?.answer ?? '')
    setEditing({ area, topic })
  }

  async function save() {
    if (!editing || !draft.trim()) return
    await setAnswer(editing.area, editing.topic, draft.trim())
    setEditing(null)
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div className="t-card">Understanding each other</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.6 }}>
        How you each show care, communicate, handle conflict, recharge — private to the two of you.
      </div>

      {!spaceId && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Create a space in Settings to start sharing this.
        </div>
      )}

      {spaceId && areas.length === 0 && !loading && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing yet — add the first topic below.
        </div>
      )}

      {areas.map(area => (
        <details key={area} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text)' }}>{area}</summary>
          <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {topicsFor(area).map(topic => {
              const rows = entries.filter(e => e.area === area && e.topic === topic)
              const mine = rows.find(e => e.user_id === userId)
              const theirs = rows.filter(e => e.user_id !== userId)
              return (
                <div key={topic}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.8, marginBottom: '0.3rem' }}>{topic}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                    <button
                      onClick={() => openEditor(area, topic)}
                      className="press"
                      style={{
                        textAlign: 'left', cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)',
                        borderRadius: '8px', padding: '0.5rem 0.6rem', fontFamily: 'var(--font-body)',
                      }}
                    >
                      <div style={{ fontSize: '0.62rem', color: 'var(--gold)', marginBottom: '0.2rem' }}>You</div>
                      <div style={{ fontSize: '0.72rem', color: mine ? 'var(--text)' : 'var(--muted)', lineHeight: 1.5, fontStyle: mine ? 'normal' : 'italic' }}>
                        {mine?.answer ?? 'Add your answer'}
                      </div>
                    </button>
                    {theirs.map((t: UnderstandingEntry) => (
                      <div key={t.id} style={{ background: 'var(--surface2)', borderRadius: '8px', padding: '0.5rem 0.6rem' }}>
                        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>{partnerName(t.user_id)}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text)', lineHeight: 1.5 }}>{t.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            <form
              onSubmit={async e => {
                e.preventDefault()
                if (!newTopic.trim() || !newAnswer.trim()) return
                await setAnswer(area, newTopic.trim(), newAnswer.trim())
                setNewTopic(''); setNewAnswer('')
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}
            >
              <input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="New topic in this area" style={{ ...inputStyle, fontSize: '0.7rem' }} />
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <input value={newAnswer} onChange={e => setNewAnswer(e.target.value)} placeholder="Your answer" style={{ ...inputStyle, flex: 1, fontSize: '0.7rem' }} />
                <button type="submit" className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>Add</button>
              </div>
            </form>
          </div>
        </details>
      ))}

      {addingArea ? (
        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!newArea.trim() || !newTopic.trim() || !newAnswer.trim()) return
            await setAnswer(newArea.trim(), newTopic.trim(), newAnswer.trim())
            setNewArea(''); setNewTopic(''); setNewAnswer(''); setAddingArea(false)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}
        >
          <input value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="New area (e.g. Support & Encouragement)" style={inputStyle} autoFocus />
          <input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="First topic" style={inputStyle} />
          <textarea value={newAnswer} onChange={e => setNewAnswer(e.target.value)} placeholder="Your answer" rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setAddingArea(false)} className="press" style={{ fontSize: '0.68rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>Cancel</button>
            <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Save</button>
          </div>
        </form>
      ) : (
        spaceId && <button onClick={() => setAddingArea(true)} className="btn btn-secondary press" style={{ fontSize: '0.7rem', alignSelf: 'flex-start' }}>+ New area</button>
      )}

      {editing && (
        <div onClick={() => setEditing(null)} style={{
          position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} className="organic" style={{
            width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: '1.2rem 1.3rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
          }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{editing.area}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{editing.topic}</div>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={6} autoFocus
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', borderTop: '1px solid var(--faint)', paddingTop: '0.7rem' }}>
              {entries.some(e => e.area === editing.area && e.topic === editing.topic && e.user_id === userId) && (
                <button
                  onClick={async () => {
                    const mine = entries.find(e => e.area === editing.area && e.topic === editing.topic && e.user_id === userId)
                    if (mine) await removeAnswer(mine.id)
                    setEditing(null)
                  }}
                  className="press"
                  style={{ fontSize: '0.68rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.6, marginRight: 'auto' }}
                >Delete</button>
              )}
              <button onClick={() => setEditing(null)} className="press" style={{ fontSize: '0.72rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>Cancel</button>
              <button onClick={save} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

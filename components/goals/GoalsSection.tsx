'use client'

import { useState } from 'react'
import { useGoals, daysSinceTouched, isStale, type Goal } from '@/lib/hooks/useGoals'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

// Goals as commitments, not progress trackers.
//
// There is deliberately no percentage anywhere in this file. A progress bar
// answers "how far along am I", which is rarely the question that matters —
// the one that keeps a goal honest is "am I still choosing this?". So the only
// derived signal shown is time since it was last touched, and the only thing
// the product does with it is ask.
//
// Retiring a goal is presented with exactly the same weight as achieving one.
// Both are endings. A goal you consciously put down is a good outcome, and the
// copy should never imply otherwise — no "abandoned", no "failed", no dimming
// beyond what's needed to separate past from present.
export default function GoalsSection({ userId }: { userId: string }) {
  const { spaces } = useSharedSpaces(userId)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const g = useGoals(spaceId ?? spaces[0]?.id ?? null)

  const [showEnded, setShowEnded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [shared, setShared] = useState(false)
  const [editingNext, setEditingNext] = useState<string | null>(null)
  const [nextDraft, setNextDraft] = useState('')

  const input: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
    padding: '0.5rem 0.7rem', outline: 'none', width: '100%',
  }

  async function saveNextAction(goal: Goal) {
    await g.updateGoal(goal.id, { next_action: nextDraft.trim() || null })
    setEditingNext(null)
    setNextDraft('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* The one nudge. Only shown when something has actually gone quiet —
          otherwise this whole block is absent rather than saying "all good",
          because an empty state that congratulates you is still noise. */}
      {g.stale.length > 0 && (
        <section style={{
          background: 'color-mix(in srgb, var(--gold) 6%, var(--surface))',
          border: '1px solid color-mix(in srgb, var(--gold) 25%, var(--border))',
          borderRadius: '14px', padding: '1rem 1.2rem',
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            {g.stale.length === 1 ? 'One thing has gone quiet.' : `${g.stale.length} things have gone quiet.`}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '0.7rem' }}>
            Not a problem — worth a look though. Still choosing {g.stale.length === 1 ? 'it' : 'these'}?
          </div>
          {g.stale.map(goal => (
            <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.35rem 0' }}>
              <span style={{ flex: 1, minWidth: '140px', fontSize: '0.78rem', color: 'var(--text)' }}>{goal.title}</span>
              <span style={{ fontSize: '0.64rem', color: 'var(--muted)' }}>{daysSinceTouched(goal)}d</span>
              <button onClick={() => g.updateGoal(goal.id, {})} className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>
                Still on it
              </button>
              <button onClick={() => g.endGoal(goal.id, 'retired', null)} className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>
                Put it down
              </button>
            </div>
          ))}
        </section>
      )}

      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>
            What you&rsquo;re choosing
          </div>
          <button onClick={() => setAdding(v => !v)} className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>
            {adding ? 'Cancel' : 'Add'}
          </button>
        </div>

        {g.active.length === 0 && !g.loading && !adding && (
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8, lineHeight: 1.6 }}>
            Nothing yet. A goal here is something you&rsquo;re actively choosing — one or two is plenty.
          </div>
        )}

        {adding && (
          <form
            onSubmit={async e => {
              e.preventDefault()
              if (!title.trim()) return
              await g.addGoal(title.trim(), why.trim() || null, nextAction.trim() || null, shared)
              setTitle(''); setWhy(''); setNextAction(''); setAdding(false)
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}
          >
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you choosing?" style={input} />
            <input value={why} onChange={e => setWhy(e.target.value)} placeholder="Why does it matter? (optional, but it helps later)" style={input} />
            <input value={nextAction} onChange={e => setNextAction(e.target.value)} placeholder="The one next step (optional)" style={input} />
            {spaces.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
                Share with {spaces[0]?.name ?? 'household'}
              </label>
            )}
            <button type="submit" disabled={!title.trim()} className="btn btn-primary press" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>
              Add
            </button>
          </form>
        )}

        {g.active.map(goal => (
          <div key={goal.id} style={{
            padding: '0.8rem 0', borderBottom: '1px solid var(--faint)',
            display: 'flex', flexDirection: 'column', gap: '0.35rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: '140px', fontSize: '0.86rem', color: 'var(--text)' }}>{goal.title}</span>
              {goal.space_id && (
                <span style={{ fontSize: '0.6rem', color: 'var(--emerald)', flexShrink: 0 }}>shared</span>
              )}
              {isStale(goal) && (
                <span style={{ fontSize: '0.6rem', color: 'var(--amber)', flexShrink: 0 }}>quiet {daysSinceTouched(goal)}d</span>
              )}
            </div>

            {goal.why && (
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6, fontStyle: 'italic' }}>{goal.why}</div>
            )}

            {/* The next action is the only actionable thing on a goal, so it's
                the only thing that's inline-editable. */}
            {editingNext === goal.id ? (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <input
                  autoFocus value={nextDraft} onChange={e => setNextDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNextAction(goal); if (e.key === 'Escape') setEditingNext(null) }}
                  placeholder="The one next step" style={{ ...input, flex: 1, minWidth: '160px' }}
                />
                <button onClick={() => saveNextAction(goal)} className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>Save</button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingNext(goal.id); setNextDraft(goal.next_action ?? '') }}
                className="press"
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                  fontSize: '0.76rem', color: goal.next_action ? 'var(--text)' : 'var(--muted)',
                  opacity: goal.next_action ? 0.9 : 0.6, fontFamily: 'var(--font-body)',
                }}
              >
                {goal.next_action ? `→ ${goal.next_action}` : '→ set the next step'}
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.2rem' }}>
              <button onClick={() => g.endGoal(goal.id, 'achieved', null)} className="press"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--emerald)', fontSize: '0.66rem', padding: 0 }}>
                done
              </button>
              <button onClick={() => g.endGoal(goal.id, 'retired', null)} className="press"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.66rem', padding: 0 }}>
                put it down
              </button>
            </div>
          </div>
        ))}

        {g.ended.length > 0 && (
          <div style={{ marginTop: '0.9rem' }}>
            <button onClick={() => setShowEnded(v => !v)} className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>
              {showEnded ? 'Hide' : 'Show'} {g.ended.length} finished &amp; put down
            </button>
            {showEnded && g.ended.map(goal => (
              <div key={goal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0', opacity: 0.6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.62rem', color: goal.status === 'achieved' ? 'var(--emerald)' : 'var(--muted)', flexShrink: 0 }}>
                  {goal.status === 'achieved' ? 'done' : 'put down'}
                </span>
                <span style={{ flex: 1, minWidth: '120px', fontSize: '0.74rem', color: 'var(--text)' }}>{goal.title}</span>
                <button onClick={() => g.reviveGoal(goal.id)} className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.62rem' }}>
                  pick back up
                </button>
                <button onClick={() => g.removeGoal(goal.id)} aria-label={`Delete ${goal.title}`} className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {g.error && (
          <div style={{ fontSize: '0.7rem', color: 'var(--rose)', marginTop: '0.6rem' }}>{g.error}</div>
        )}
      </section>
    </div>
  )
}

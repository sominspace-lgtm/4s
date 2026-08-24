'use client'

import { useState } from 'react'
import { useHousehold } from '@/lib/hooks/useHousehold'
import NearbyPlaces, { NEW_HOME } from './NearbyPlaces'

// The move-in hub, restored 2026-08-24. Retiring this tab in August never
// deleted a household_movein_items row, so bringing it back brought the real
// list back with it — this component is new, the data underneath it is not.
//
// Deliberately an OVERVIEW, not a replacement for the planning spreadsheet:
// that sheet is the detailed source of truth (budgets, room-by-room
// breakdowns, links), and rebuilding it here would mean maintaining the same
// numbers twice. 4S is the calm front door — what's around the new place and
// the new house rules that came with it, with one click through to the sheet
// for buy-list detail.
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1ZMKF-5-kK0lhuPWIHivmja334DXpASd6BK76tZfgN4I/edit?usp=sharing'

const input: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.45rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', outline: 'none',
}

export default function HouseholdMoveIn({ spaceId }: { spaceId: string | null }) {
  const h = useHousehold(spaceId)
  const [ruleText, setRuleText] = useState('')
  const [ruleCategory, setRuleCategory] = useState('')
  const [ruleNote, setRuleNote] = useState('')
  const [showRetiredRules, setShowRetiredRules] = useState(false)

  const activeRules = h.rules.filter(r => r.active)
  const retiredRules = h.rules.filter(r => !r.active)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Our Move-In — the overview + the door to the real spreadsheet */}
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <div>
          <div className="t-card">Our Move-In</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            {NEW_HOME.label} · {NEW_HOME.city}
          </div>
        </div>

        <a href={SPREADSHEET_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary press"
          style={{ fontSize: '0.72rem', textDecoration: 'none', alignSelf: 'flex-start' }}>
          Open the move-in spreadsheet ↗
        </a>
        <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.65, lineHeight: 1.5 }}>
          The sheet holds the buy-list detail — budgets, room-by-room, links. This page is just the glance:
          the new house rules and what&rsquo;s around the new place.
        </div>
      </section>

      {/* House rules — the new-home rules, moved in alongside everything
          else (2026-08-24). Same household_rules table Household → Reference
          already reads/writes, just surfaced here too since these came with
          the new place. */}
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div className="t-card">House rules</div>

        {activeRules.length === 0 && !h.loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            No rules yet. The first one is usually about shoes.
          </div>
        )}

        {activeRules.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.4rem 0', borderBottom: '1px solid var(--faint)' }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)' }}>{r.text}</span>
            {r.note && <span style={{ fontSize: '0.6rem', color: 'var(--gold)', flexShrink: 0 }}>{r.note}</span>}
            {r.category && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', flexShrink: 0 }}>{r.category}</span>}
            <button onClick={() => h.toggleRuleActive(r.id, false)} title="Retire this rule" className="press"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.62rem', flexShrink: 0 }}>
              retire
            </button>
            <button onClick={() => h.removeRule(r.id)} aria-label={`Delete ${r.text}`} className="press"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
          </div>
        ))}

        {retiredRules.length > 0 && (
          <div style={{ marginTop: '0.2rem' }}>
            <button onClick={() => setShowRetiredRules(v => !v)} className="btn btn-ghost press" style={{ fontSize: '0.64rem' }}>
              {showRetiredRules ? 'Hide' : 'Show'} {retiredRules.length} retired
            </button>
            {showRetiredRules && retiredRules.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.35rem 0', opacity: 0.55 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.74rem', color: 'var(--text)', textDecoration: 'line-through' }}>{r.text}</span>
                <button onClick={() => h.toggleRuleActive(r.id, true)} title="Bring this rule back" className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.6rem', flexShrink: 0 }}>
                  restore
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!ruleText.trim()) return
            await h.addRule(ruleText.trim(), ruleCategory.trim() || null, ruleNote.trim() || null)
            setRuleText(''); setRuleCategory(''); setRuleNote('')
          }}
          style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', flexWrap: 'wrap' }}
        >
          <input value={ruleText} onChange={e => setRuleText(e.target.value)} placeholder="Add a house rule" style={{ ...input, flex: 1, minWidth: '160px' }} />
          <input value={ruleCategory} onChange={e => setRuleCategory(e.target.value)} placeholder="Category (optional)" style={{ ...input, width: '120px' }} />
          <input value={ruleNote} onChange={e => setRuleNote(e.target.value)} placeholder="Note, e.g. who it's for (optional)" style={{ ...input, width: '160px' }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>

      {/* Near our new home — a view over the pins that already exist */}
      <NearbyPlaces />
    </div>
  )
}

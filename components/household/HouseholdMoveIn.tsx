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
// numbers twice. 4S is the calm front door — what still needs buying, what's
// around the new place, and one click through to the sheet for the detail.
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1ZMKF-5-kK0lhuPWIHivmja334DXpASd6BK76tZfgN4I/edit?usp=sharing'

// Loose grouping for the buy-list. Free text in the DB (category is a plain
// nullable column), so this is only the picker's suggestions — a category
// typed from Discord that isn't here still renders under its own heading.
const CATEGORIES = ['Furniture', 'Appliances', 'Kitchen', 'Bedroom', 'Bathroom', 'Living room', 'Storage', 'Other']

export default function HouseholdMoveIn({ spaceId }: { spaceId: string | null }) {
  const h = useHousehold(spaceId)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')

  const items = h.moveinItems
  const got = items.filter(i => i.got)
  const need = items.filter(i => !i.got)

  // Group the still-needed items by category; uncategorised fall under
  // "Other" rather than getting their own unlabelled bucket.
  const byCategory = new Map<string, typeof need>()
  for (const item of need) {
    const key = item.category?.trim() || 'Other'
    byCategory.set(key, [...(byCategory.get(key) ?? []), item])
  }
  const categoryNames = [...byCategory.keys()].sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))

  const input: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
    padding: '0.45rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', outline: 'none',
  }

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

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Stat label="still to get" value={need.length} tone="var(--amber)" />
          <Stat label="sorted" value={got.length} tone="var(--emerald)" />
        </div>

        <a href={SPREADSHEET_URL} target="_blank" rel="noopener noreferrer" className="btn btn-secondary press"
          style={{ fontSize: '0.72rem', textDecoration: 'none', alignSelf: 'flex-start' }}>
          Open the move-in spreadsheet ↗
        </a>
        <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.65, lineHeight: 1.5 }}>
          The sheet holds the detail — budgets, room-by-room, links. This page is just the glance:
          what&rsquo;s left to buy and what&rsquo;s around the new place.
        </div>
      </section>

      {/* What the place still needs — household_movein_items, unchanged */}
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        <div className="t-card">What we still need</div>

        {items.length === 0 && !h.loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            Nothing on the list. Furniture, appliances, the one-off things a new place needs —
            separate from the weekly shopping list on purpose.
          </div>
        )}

        {categoryNames.map(cat => (
          <div key={cat}>
            <div className="t-label" style={{ marginBottom: '0.25rem' }}>{cat}</div>
            {byCategory.get(cat)!.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
                <button
                  onClick={() => h.toggleMoveinGot(item.id, true)}
                  aria-label={`Mark ${item.name} as sorted`}
                  className="press"
                  style={{
                    width: 18, height: 18, borderRadius: '5px', flexShrink: 0, cursor: 'pointer', padding: 0,
                    border: '1px solid var(--border)', background: 'transparent',
                  }}
                />
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.76rem', color: 'var(--text)' }}>{item.name}</span>
                <button onClick={() => h.removeMoveinItem(item.id)} aria-label={`Remove ${item.name}`} className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
        ))}

        {got.length > 0 && (
          <details style={{ marginTop: '0.2rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.7rem', color: 'var(--muted)' }}>
              {got.length} already sorted
            </summary>
            <div style={{ marginTop: '0.4rem' }}>
              {got.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.25rem 0' }}>
                  <button
                    onClick={() => h.toggleMoveinGot(item.id, false)}
                    aria-label={`Move ${item.name} back to the list`}
                    className="press"
                    style={{
                      width: 18, height: 18, borderRadius: '5px', flexShrink: 0, cursor: 'pointer', padding: 0,
                      border: '1px solid var(--emerald)', background: 'color-mix(in srgb, var(--emerald) 30%, transparent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg className="tick" width={10} height={10} viewBox="0 0 12 12" aria-hidden>
                      <path d="M2.5 6.2 L4.9 8.6 L9.5 3.6" fill="none" stroke="var(--emerald)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <span style={{ flex: 1, minWidth: 0, fontSize: '0.74rem', color: 'var(--muted)', textDecoration: 'line-through', opacity: 0.6 }}>{item.name}</span>
                  <button onClick={() => h.removeMoveinItem(item.id)} aria-label={`Remove ${item.name}`} className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.35, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </details>
        )}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!name.trim()) return
            await h.addMoveinItem(name.trim(), category || null)
            setName('')
          }}
          style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}
        >
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Add something the place needs" style={{ ...input, flex: 1, minWidth: '150px' }} />
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
            <option value="">Category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>

      {/* Near our new home — a view over the pins that already exist */}
      <NearbyPlaces />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
      <span style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: tone }}>{value}</span>
      <span style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.8 }}>{label}</span>
    </div>
  )
}

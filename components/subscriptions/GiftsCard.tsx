'use client'

import { useState } from 'react'
import { usePeople, daysUntilBirthday, type Person } from '@/lib/hooks/usePeople'
import { goToPersonal } from '@/lib/utils/navigate'

// Gifts is a LENS over contacts, not a second store.
//
// It used to keep its own list in user_prefs.layout.giftEvents, so the same
// person could exist here and in People > Notes with neither copy aware of
// the other — add your sister here and she's invisible there. Now both read
// the `people` table: this view is simply "contacts with a birthday, soonest
// first, plus what you were thinking of getting them".
//
// Consequence worth knowing: adding someone here adds a real contact, and
// editing their gift idea here is the same field you'd see in Notes.

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
  fontWeight: 300, padding: '0.4rem 0.65rem', outline: 'none',
}

function urgencyColor(days: number) {
  if (days <= 3) return 'var(--rose)'
  if (days <= 14) return 'var(--amber)'
  return 'color-mix(in srgb, var(--gold) 40%, transparent)'
}

function dueLabel(days: number) {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days}d`
}

export default function GiftsCard() {
  const { people, add, update, remove } = usePeople()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [relation, setRelation] = useState('')
  const [budget, setBudget] = useState('')
  const [giftIdea, setGiftIdea] = useState('')

  // Only contacts with a birthday belong in a gifts view — someone with no
  // date has nothing to count down to.
  const upcoming = people
    .filter(p => p.birthday)
    .map(p => ({ person: p, days: daysUntilBirthday(p.birthday)! }))
    .sort((a, b) => a.days - b.days)

  async function handleAdd() {
    if (!name.trim() || !date) return
    await add({
      name: name.trim(),
      birthday: date,
      relationship: relation.trim() || null,
      gift_ideas: giftIdea.trim() || null,
      gift_budget: budget ? parseFloat(budget) : null,
      last_contact: null,
      notes: null,
    })
    setName(''); setDate(''); setRelation(''); setBudget(''); setGiftIdea('')
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        <span className="t-meta">Birthdays and what to get them.</span>
        <button onClick={() => goToPersonal('people')} className="btn btn-ghost press" style={{ fontSize: '0.64rem' }}>
          All contacts →
        </button>
      </div>

      {upcoming.length === 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.7rem' }}>
          No birthdays saved yet. Anyone you add here becomes a contact.
        </div>
      )}

      {upcoming.map(({ person, days }) => (
        <GiftRow key={person.id} person={person} days={days} onUpdate={update} onRemove={remove} />
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.4rem', marginTop: '0.7rem' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Who" style={inputStyle} />
        <input type="date" value={date} onChange={e => setDate(e.target.value)} title="Birthday" style={inputStyle} />
        <input value={relation} onChange={e => setRelation(e.target.value)} placeholder="Relationship" style={inputStyle} />
        <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Budget" style={inputStyle} />
        <input value={giftIdea} onChange={e => setGiftIdea(e.target.value)} placeholder="Gift idea" style={inputStyle} />
        <button onClick={handleAdd} className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
      </div>
    </div>
  )
}

function GiftRow({ person, days, onUpdate, onRemove }: {
  person: Person
  days: number
  onUpdate: (id: string, patch: Partial<Person>) => void
  onRemove: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid var(--faint)' }}
    >
      <span style={{
        fontSize: '0.6rem', color: urgencyColor(days), flexShrink: 0, minWidth: '52px',
        textAlign: 'center', padding: '0.12em 0.5em', borderRadius: '4px',
        background: `color-mix(in srgb, ${urgencyColor(days)} 12%, transparent)`,
      }}>{dueLabel(days)}</span>

      <span style={{ fontSize: '0.78rem', color: 'var(--text)', flexShrink: 0 }}>{person.name}</span>
      {person.relationship && (
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{person.relationship}</span>
      )}

      {/* Editable inline — same fields the contact record holds, so a gift
          idea jotted here is the one you'll see in Notes. */}
      <input
        defaultValue={person.gift_ideas ?? ''}
        onBlur={e => { if (e.target.value !== (person.gift_ideas ?? '')) onUpdate(person.id, { gift_ideas: e.target.value || null }) }}
        placeholder="gift idea"
        style={{ ...inputStyle, flex: 1, minWidth: '90px', fontSize: '0.68rem', padding: '0.25rem 0.5rem', background: 'transparent', border: 'none', borderBottom: '1px solid var(--faint)', borderRadius: 0 }}
      />
      {person.gift_budget != null && (
        <span style={{ fontSize: '0.64rem', color: 'var(--muted)', flexShrink: 0 }}>${person.gift_budget}</span>
      )}

      <button
        onClick={() => onRemove(person.id)}
        aria-label={`Remove ${person.name}`}
        title="Removes the whole contact, not just the gift"
        className="press"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.6rem', opacity: hovered ? 0.4 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}
      >✕</button>
    </div>
  )
}

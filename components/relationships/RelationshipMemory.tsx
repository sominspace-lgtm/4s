'use client'

import { useState } from 'react'
import { usePeople, daysUntilBirthday, daysSinceContact, type Person } from '@/lib/hooks/usePeople'

// A flat contact sheet (2026-09-03): one compact row per person — name,
// relationship, a birthday chip when it's close, last hello, and a note
// preview. Tap a row to expand an inline editor. The per-person
// "preferences" list was dropped in the same pass (data kept, just not
// shown); gift ideas stay, folded into the expanded editor.
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '9px',
  padding: '0.5rem 0.65rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', outline: 'none',
}

function contactText(p: Person): { text: string; nudge: boolean } {
  const since = daysSinceContact(p.last_contact)
  if (since === null) return { text: 'no hello logged', nudge: false }
  if (since === 0) return { text: 'said hello today', nudge: false }
  if (since === 1) return { text: 'hello yesterday', nudge: false }
  return { text: `hello ${since}d ago`, nudge: since >= 30 }
}

function birthdayChip(p: Person): string | null {
  const d = daysUntilBirthday(p.birthday)
  if (d === null || d > 30) return null
  return d === 0 ? '🎂 today' : `🎂 ${d}d`
}

function Row({ person, onSave, onRemove, onContacted }: {
  person: Person
  onSave: (patch: Partial<Person>) => void
  onRemove: () => void
  onContacted: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Person>(person)
  const contact = contactText(person)
  const bday = birthdayChip(person)

  function save() {
    onSave({
      relationship: draft.relationship || null,
      birthday: draft.birthday || null,
      notes: draft.notes || null,
      gift_ideas: draft.gift_ideas || null,
    })
    setOpen(false)
  }

  return (
    <div style={{ borderBottom: '1px solid var(--faint)' }}>
      <button
        onClick={() => { setDraft(person); setOpen(o => !o) }}
        className="press"
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.6rem 0', fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 500, flexShrink: 0 }}>{person.name}</span>
        {person.relationship && (
          <span style={{ fontSize: '0.56rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', background: 'var(--hover-bg)', padding: '0.1em 0.5em', borderRadius: '20px', flexShrink: 0 }}>{person.relationship}</span>
        )}
        {bday && <span style={{ fontSize: '0.62rem', color: 'var(--amber)', flexShrink: 0 }}>{bday}</span>}
        <span style={{ flex: 1, minWidth: 0, fontSize: '0.68rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {person.notes || ''}
        </span>
        <span style={{ fontSize: '0.62rem', color: contact.nudge ? 'var(--gold)' : 'var(--muted)', opacity: contact.nudge ? 1 : 0.7, flexShrink: 0 }}>{contact.text}</span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: '0.2rem 0 0.8rem' }}>
          <input style={inputStyle} placeholder="Relationship (friend, family…)" value={draft.relationship ?? ''} onChange={e => setDraft({ ...draft, relationship: e.target.value })} />
          <input style={inputStyle} type="date" value={draft.birthday ?? ''} onChange={e => setDraft({ ...draft, birthday: e.target.value })} />
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2} placeholder="Things to remember…" value={draft.notes ?? ''} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          <input style={inputStyle} placeholder="Gift ideas" value={draft.gift_ideas ?? ''} onChange={e => setDraft({ ...draft, gift_ideas: e.target.value })} />
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button onClick={save} className="btn btn-primary press" style={{ fontSize: '0.68rem' }}>Save</button>
            <button onClick={() => { onContacted(); setOpen(false) }} className="btn btn-ghost press" style={{ fontSize: '0.68rem' }}>Said hello</button>
            <button onClick={onRemove} className="btn btn-ghost press" style={{ fontSize: '0.68rem', marginLeft: 'auto', opacity: 0.6 }}>Remove</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RelationshipMemory() {
  const { people, loading, add, update, remove, markContacted } = usePeople()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState('')

  async function addPerson() {
    if (!name.trim()) return
    await add({ name: name.trim(), relationship: relationship.trim() || null })
    setName(''); setRelationship(''); setAdding(false)
  }

  const sorted = [...people].sort((a, b) => {
    const ba = daysUntilBirthday(a.birthday); const bb = daysUntilBirthday(b.birthday)
    const aBday = ba !== null && ba <= 14; const bBday = bb !== null && bb <= 14
    if (aBday !== bBday) return aBday ? -1 : 1
    const na = (daysSinceContact(a.last_contact) ?? -1) >= 30
    const nb = (daysSinceContact(b.last_contact) ?? -1) >= 30
    if (na !== nb) return na ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="card-interactive organic specimen" style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderTop: '2px solid color-mix(in srgb, var(--blush) 45%, var(--border))',
      padding: '1.3rem 1.5rem', boxShadow: 'var(--elev-2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: 'var(--text-card)', fontFamily: 'var(--font-display)', color: 'var(--text)', fontWeight: 400 }}>People</div>
        <button onClick={() => setAdding(a => !a)} className="btn btn-secondary press" style={{ fontSize: '0.72rem' }}>{adding ? 'Close' : '+ Add someone'}</button>
      </div>

      {adding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '0.9rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--hover-bg)' }}>
          <input style={inputStyle} placeholder="Name" value={name} autoFocus onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPerson() }} />
          <input style={inputStyle} placeholder="Relationship (optional)" value={relationship} onChange={e => setRelationship(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPerson() }} />
          <button onClick={addPerson} disabled={!name.trim()} className="btn btn-primary press" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>Add</button>
        </div>
      )}

      {loading ? null : people.length === 0 && !adding ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }}>
          No one here yet. Add the people you want to stay close to.
        </div>
      ) : (
        <div>
          {sorted.map(p => (
            <Row
              key={p.id}
              person={p}
              onSave={patch => update(p.id, patch)}
              onRemove={() => remove(p.id)}
              onContacted={() => markContacted(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

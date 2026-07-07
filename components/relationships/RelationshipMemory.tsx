'use client'

import { useState } from 'react'
import { usePeople, daysUntilBirthday, daysSinceContact, type Person } from '@/lib/hooks/usePeople'

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
  padding: '0.6rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none',
}

function contactLine(p: Person): { text: string; nudge: boolean } {
  const since = daysSinceContact(p.last_contact)
  if (since === null) return { text: 'No hello logged yet', nudge: false }
  if (since === 0) return { text: 'Reached out today', nudge: false }
  if (since === 1) return { text: 'Last hello yesterday', nudge: false }
  return { text: `Last hello ${since} days ago`, nudge: since >= 30 }
}

function birthdayLine(p: Person): string | null {
  const d = daysUntilBirthday(p.birthday)
  if (d === null) return null
  if (d === 0) return 'Birthday today 🎂'
  if (d <= 30) return `Birthday in ${d}d`
  return null
}

function PersonCard({ person, onSave, onRemove, onContacted }: {
  person: Person
  onSave: (patch: Partial<Person>) => void
  onRemove: () => void
  onContacted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Person>(person)
  const contact = contactLine(person)
  const bday = birthdayLine(person)

  function save() {
    onSave({
      relationship: draft.relationship || null,
      birthday: draft.birthday || null,
      notes: draft.notes || null,
      gift_ideas: draft.gift_ideas || null,
    })
    setEditing(false)
  }

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: '12px', padding: '0.9rem 1rem',
      background: contact.nudge ? 'color-mix(in srgb, var(--gold) 5%, var(--surface))' : 'var(--surface)',
      display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 500 }}>{person.name}</span>
        {person.relationship && (
          <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', background: 'var(--hover-bg)', padding: '0.1em 0.5em', borderRadius: '20px' }}>{person.relationship}</span>
        )}
        {bday && <span style={{ marginLeft: 'auto', fontSize: '0.62rem', color: 'var(--amber)' }}>{bday}</span>}
      </div>

      <div style={{ fontSize: '0.7rem', color: contact.nudge ? 'var(--gold)' : 'var(--muted)', opacity: contact.nudge ? 0.95 : 0.78 }}>
        {contact.nudge ? `${contact.text} — a hello might be nice.` : contact.text}
      </div>

      {!editing && person.notes && (
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>{person.notes}</div>
      )}
      {!editing && person.gift_ideas && (
        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.85 }}><span style={{ opacity: 0.7 }}>Gift ideas · </span>{person.gift_ideas}</div>
      )}

      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
          <input style={inputStyle} placeholder="Relationship (friend, family…)" value={draft.relationship ?? ''} onChange={e => setDraft({ ...draft, relationship: e.target.value })} />
          <input style={inputStyle} type="date" value={draft.birthday ?? ''} onChange={e => setDraft({ ...draft, birthday: e.target.value })} />
          <textarea style={{ ...inputStyle, resize: 'none' }} rows={2} placeholder="Things to remember…" value={draft.notes ?? ''} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          <input style={inputStyle} placeholder="Gift ideas" value={draft.gift_ideas ?? ''} onChange={e => setDraft({ ...draft, gift_ideas: e.target.value })} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
        {editing ? (
          <>
            <button onClick={save} className="btn btn-primary" style={{ fontSize: '0.68rem' }}>Save</button>
            <button onClick={() => { setDraft(person); setEditing(false) }} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>Cancel</button>
          </>
        ) : (
          <>
            <button onClick={onContacted} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>Reached out</button>
            <button onClick={() => setEditing(true)} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>Edit</button>
            <button onClick={onRemove} className="btn btn-ghost" style={{ fontSize: '0.68rem', marginLeft: 'auto', opacity: 0.6 }}>Remove</button>
          </>
        )}
      </div>
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

  // Surface people who may deserve a hello (longest since contact, then birthdays soon).
  const sorted = [...people].sort((a, b) => {
    const ba = daysUntilBirthday(a.birthday); const bb = daysUntilBirthday(b.birthday)
    const aBday = ba !== null && ba <= 14; const bBday = bb !== null && bb <= 14
    if (aBday !== bBday) return aBday ? -1 : 1
    return (daysSinceContact(b.last_contact) ?? -1) - (daysSinceContact(a.last_contact) ?? -1)
  })

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 400 }}>People</div>
        <button onClick={() => setAdding(a => !a)} className="btn btn-secondary" style={{ fontSize: '0.72rem' }}>{adding ? 'Close' : '+ Add someone'}</button>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
        Keep the people who matter close — birthdays, last hellos, and what you want to remember.
      </div>

      {adding && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', padding: '0.9rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--hover-bg)' }}>
          <input style={inputStyle} placeholder="Name" value={name} autoFocus onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPerson() }} />
          <input style={inputStyle} placeholder="Relationship (optional)" value={relationship} onChange={e => setRelationship(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addPerson() }} />
          <button onClick={addPerson} disabled={!name.trim()} className="btn btn-primary" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>Add</button>
        </div>
      )}

      {loading ? null : people.length === 0 && !adding ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }}>
          No one here yet. Add the people you want to stay close to.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
          {sorted.map(p => (
            <PersonCard
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

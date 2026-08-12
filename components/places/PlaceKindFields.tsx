'use client'

import { kindSpec, type KindField } from '@/lib/constants/placeKinds'
import ProvenanceBadge from '@/components/places/ProvenanceBadge'
import type { Place } from '@/lib/hooks/usePlaces'

// Renders (and edits) a place's `details` jsonb against its kind's field
// spec. Unknown keys already present in `details` but not in the spec still
// render, plainly, at the bottom — a bot or an older client writing an
// unrecognised field degrades to visible-but-unstyled, never to data loss.
export default function PlaceKindFields({ place, editing, onChange }: {
  place: Place
  editing: boolean
  onChange?: (details: Record<string, unknown>) => void
}) {
  const spec = kindSpec(place.kind)
  const details = place.details ?? {}
  const specKeys = new Set(spec.fields.map(f => f.key))
  const extraKeys = Object.keys(details).filter(k => !specKeys.has(k))

  function setField(key: string, value: unknown) {
    onChange?.({ ...details, [key]: value })
  }

  if (spec.fields.length === 0 && extraKeys.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {spec.fields.map(f => (
        <FieldRow
          key={f.key}
          field={f}
          value={details[f.key]}
          editing={editing}
          provenance={place.provenance?.[`details.${f.key}`]}
          onChange={v => setField(f.key, v)}
        />
      ))}
      {extraKeys.map(key => (
        <div key={key} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.74rem' }}>
          <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
          <span style={{ color: 'var(--text)' }}>{String(details[key])}</span>
        </div>
      ))}
    </div>
  )
}

function FieldRow({ field, value, editing, provenance, onChange }: {
  field: KindField
  value: unknown
  editing: boolean
  provenance: 'user' | 'lookup' | 'ai' | undefined
  onChange: (value: unknown) => void
}) {
  const inputStyle: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.76rem',
    padding: '0.4rem 0.6rem', outline: 'none', flex: 1,
  }

  if (!editing) {
    if (value == null || value === '') return null
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', fontSize: '0.76rem' }}>
        <span style={{ color: 'var(--muted)', minWidth: '90px' }}>{field.label}</span>
        <span style={{ color: 'var(--text)', flex: 1 }}>
          {field.type === 'bool' ? (value ? 'yes' : 'no') : field.type === 'url' ? (
            <a href={String(value)} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>link</a>
          ) : String(value)}
        </span>
        <ProvenanceBadge source={provenance} />
      </div>
    )
  }

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.76rem' }}>
      <span style={{ color: 'var(--muted)', minWidth: '90px' }}>{field.label}</span>
      {field.type === 'bool' ? (
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
      ) : field.type === 'select' ? (
        <select value={String(value ?? '')} onChange={e => onChange(e.target.value)} style={inputStyle}>
          <option value="">—</option>
          {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          value={String(value ?? '')}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          style={inputStyle}
        />
      )}
    </label>
  )
}

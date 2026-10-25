'use client'

// A small tab switch inside a page (2026-10-25), the same look everywhere:
// Tasks | Inbox, Everything | Google, Letters | Shared inbox.

export default function Segmented<T extends string>({ value, onChange, options }: {
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: '0.2rem', padding: '0.2rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, alignSelf: 'flex-start', width: 'fit-content', maxWidth: '100%', overflowX: 'auto', marginBottom: '0.9rem' }}>
      {options.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)} className="press" style={{
          minHeight: 38, padding: '0 0.9rem', borderRadius: 9, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'var(--font-body)', fontSize: '0.86rem',
          background: value === id ? 'var(--surface)' : 'transparent', color: value === id ? 'var(--text)' : 'var(--muted)',
          boxShadow: value === id ? '0 1px 4px var(--shadow)' : 'none',
        }}>{label}</button>
      ))}
    </div>
  )
}

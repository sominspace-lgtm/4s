'use client'

export type Energy = 'any' | 'low' | 'medium' | 'high'

export default function EnergyToggle({ value, onChange }: { value: Energy; onChange: (e: Energy) => void }) {
  const opts: Energy[] = ['any', 'low', 'medium', 'high']
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {opts.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '0.2em 0.55em', borderRadius: '10px', fontFamily: 'var(--font-body)',
          borderWidth: '1px', borderStyle: 'solid', cursor: 'pointer', transition: 'all 0.18s',
          background: value === o ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
          color: value === o ? 'var(--gold)' : 'var(--muted)',
          borderColor: value === o ? 'color-mix(in srgb, var(--gold) 30%, transparent)' : 'var(--border)',
        }}>
          {o === 'medium' ? 'med' : o}
        </button>
      ))}
    </div>
  )
}

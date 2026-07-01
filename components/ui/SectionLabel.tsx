interface SectionLabelProps {
  children: React.ReactNode
  style?: React.CSSProperties
  group?: string // optional group header above
}

export default function SectionLabel({ children, style, group }: SectionLabelProps) {
  return (
    <div style={{ margin: 'var(--space-large) 0 1rem', ...style }}>
      {group && (
        <div style={{
          fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--muted)', opacity: 0.35, marginBottom: '0.4rem',
          fontFamily: 'var(--font-body)',
        }}>{group}</div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <span style={{
          fontSize: 'var(--text-section)', letterSpacing: '0.01em',
          color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 400, opacity: 0.9,
        }}>{children}</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--faint)' }} />
      </div>
    </div>
  )
}

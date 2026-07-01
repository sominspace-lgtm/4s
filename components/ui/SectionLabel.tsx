interface SectionLabelProps {
  children: React.ReactNode
  style?: React.CSSProperties
  group?: string // optional group header above
}

export default function SectionLabel({ children, style, group }: SectionLabelProps) {
  return (
    <div style={{ margin: '2.2rem 0 0.85rem', ...style }}>
      {group && (
        <div style={{
          fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--muted)', opacity: 0.35, marginBottom: '0.35rem',
          fontFamily: 'var(--font-body)',
        }}>{group}</div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.6rem',
      }}>
        <span style={{
          fontSize: '0.65rem', letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--muted)', fontFamily: 'var(--font-body)', opacity: 0.8,
        }}>{children}</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--faint)' }} />
      </div>
    </div>
  )
}

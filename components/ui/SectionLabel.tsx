interface SectionLabelProps {
  children: React.ReactNode
  style?: React.CSSProperties
  group?: string // optional group header above
}

export default function SectionLabel({ children, style, group }: SectionLabelProps) {
  return (
    <div className="section-label" style={{ margin: 'var(--space-large) 0 1rem', ...style }}>
      {/* Group eyebrow — "mine", "ours", "now". Small and quiet, but with a
          leading accent tick so the eye registers it as a category marker
          rather than just more small grey text. */}
      {group && (
        <div style={{
          fontSize: '0.55rem', letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--muted)', opacity: 0.7, marginBottom: '0.45rem',
          fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <span aria-hidden style={{ width: '12px', height: '1.5px', background: 'var(--gold)', opacity: 0.6, borderRadius: '1px' }} />
          {group}
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        {/* Full opacity, not 0.9 — a section title that's slightly faded is
            competing with its own body text instead of leading it. */}
        <span style={{
          fontSize: 'var(--text-section)', letterSpacing: '-0.01em', lineHeight: 1.2,
          color: 'var(--text)', fontFamily: 'var(--font-display)', fontWeight: 400,
        }}>{children}</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--faint)' }} />
      </div>
    </div>
  )
}

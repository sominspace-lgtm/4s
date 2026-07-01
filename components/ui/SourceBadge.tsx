export default function SourceBadge({ source }: { source: 'manual' | 'synced' | 'bot' }) {
  const synced = source !== 'manual'
  return (
    <span style={{
      fontSize: '0.58rem',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
      color: synced ? 'var(--gold)' : 'var(--muted)',
      opacity: synced ? 0.7 : 0.55,
      border: `1px solid ${synced ? 'rgba(232,160,192,0.2)' : 'rgba(245,232,240,0.1)'}`,
      borderRadius: '4px',
      padding: '0.1em 0.4em',
      flexShrink: 0,
      fontFamily: 'var(--font-body)',
    }}>
      {source}
    </span>
  )
}

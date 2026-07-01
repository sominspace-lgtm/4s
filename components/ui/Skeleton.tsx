interface SkeletonProps {
  height?: number | string
  width?: number | string
  style?: React.CSSProperties
}

export function Skeleton({ height = 20, width = '100%', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: 6, ...style }}
    />
  )
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem',
    }}>
      <Skeleton height={14} width="40%" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === rows - 1 ? '65%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0' }}>
      <Skeleton height={16} width={16} style={{ borderRadius: '50%', flexShrink: 0 }} />
      <Skeleton height={13} width="70%" />
      <Skeleton height={11} width="15%" style={{ marginLeft: 'auto' }} />
    </div>
  )
}

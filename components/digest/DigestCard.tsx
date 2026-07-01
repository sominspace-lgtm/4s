// AI DIGEST — activate by connecting ANTHROPIC_API_KEY (see /api/digest/route.ts)
export default function DigestCard() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
      padding: '1.2rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
    }}>
      <div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 400 }}>Weekly AI Digest</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem', lineHeight: 1.5 }}>
          A 4-sentence summary of your week — wins, risks, patterns.
        </div>
      </div>
      <div style={{
        fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--muted)', opacity: 0.5, whiteSpace: 'nowrap',
        padding: '0.3em 0.7em', borderRadius: '6px', border: '1px solid var(--border)',
      }}>
        connect api key
      </div>
    </div>
  )
}

import Link from 'next/link'

// A link that goes nowhere: an old share link, a deleted keepsake, a typo.
export default function NotFound() {
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: '22rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Nothing here</div>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 1.4rem' }}>
          This page moved, or the link has expired.
        </p>
        <Link href="/" className="btn btn-primary press" style={{ textDecoration: 'none' }}>Go home</Link>
      </div>
    </main>
  )
}

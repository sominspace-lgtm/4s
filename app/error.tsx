'use client'

import Link from 'next/link'
import { useEffect } from 'react'

// When a screen crashes, show a calm way back instead of a blank page.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: '22rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text)', marginBottom: '0.5rem' }}>Something went wrong</div>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 1.4rem' }}>
          Nothing you saved is lost. Try again, or head back home.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
          <button onClick={reset} className="btn btn-primary press">Try again</button>
          <Link href="/" className="btn press" style={{ textDecoration: 'none' }}>Go home</Link>
        </div>
      </div>
    </main>
  )
}

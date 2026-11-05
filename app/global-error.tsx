'use client'

// The last safety net: if the whole app frame crashes (not just one screen),
// this replaces the page, so it brings its own html and plain colors.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f6f1e7', color: '#3b342b', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '22rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Something went wrong</div>
            <p style={{ fontSize: '0.95rem', color: '#7a6f60', lineHeight: 1.6, margin: '0 0 1.4rem' }}>
              Nothing you saved is lost. Try again, or reload 4S.
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
              <button onClick={reset} style={btn('#3b342b', '#fff')}>Try again</button>
              <button onClick={() => window.location.assign('/')} style={btn('transparent', '#3b342b')}>Reload</button>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}

function btn(bg: string, fg: string): React.CSSProperties {
  return { minHeight: 44, padding: '0 1.2rem', borderRadius: 10, border: '1px solid #3b342b', background: bg, color: fg, fontSize: '0.95rem', cursor: 'pointer' }
}

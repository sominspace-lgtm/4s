import { resolveKeepsake } from '@/lib/guest/keepsake'
import { format, parseISO } from 'date-fns'

export const metadata = {
  title: 'A night at the village',
  robots: { index: false, follow: false },
}

// The shared keepsake page. Public, no account — the host sends the link.
// Read-only; a warm card, not the app.
export default async function KeepsakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const k = await resolveKeepsake(token)

  if (!k) {
    return (
      <main style={SHELL}>
        <div style={CARD}>
          <div style={{ fontSize: '2.4rem', marginBottom: '0.6rem' }}>🕯️</div>
          <h1 style={H1}>This keepsake isn&rsquo;t here</h1>
          <p style={P}>The link may be wrong, or the hosts put this one away. Ask them for a fresh link.</p>
        </div>
      </main>
    )
  }

  const s = k.summary
  const when = (() => { try { return format(parseISO(k.happened_on), 'EEEE, MMMM d, yyyy') } catch { return k.happened_on } })()

  return (
    <main style={SHELL}>
      <div style={{ ...CARD, textAlign: 'left', maxWidth: '30rem' }}>
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#a8987f', textAlign: 'center' }}>
          {k.series || 'A night at the village'}
        </div>
        <h1 style={{ ...H1, textAlign: 'center', marginBottom: '0.2rem' }}>
          {k.title.replace('Tonight at the Village — ', '')}
        </h1>
        <p style={{ ...P, textAlign: 'center', marginBottom: '1.2rem' }}>{when}</p>

        {(s.guests?.length || s.fromPlaces?.length || s.photoCount) ? (
          <p style={{ ...P, marginBottom: '1rem' }}>
            {s.guests?.length ? `${s.guests.length} ${s.guests.length === 1 ? 'guest' : 'guests'}${s.guests.length ? ' — ' + s.guests.slice(0, 8).join(', ') : ''}` : 'A quiet one'}
            {s.fromPlaces?.length ? `. From ${s.fromPlaces.slice(0, 5).join(', ')}` : ''}
            {s.photoCount ? `. ${s.photoCount} ${s.photoCount === 1 ? 'photo' : 'photos'}` : ''}
          </p>
        ) : null}

        {(s.messages ?? []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
            {(s.messages ?? []).map((m, i) => (
              <div key={i} style={{ fontSize: '0.92rem', color: '#4a3f35', lineHeight: 1.6 }}>
                &ldquo;{m.text}&rdquo;{m.name && <span style={{ color: '#8a7d6f' }}> — {m.name}</span>}
              </div>
            ))}
          </div>
        )}

        {(s.songs ?? []).length > 0 && (
          <p style={{ ...P, marginBottom: '1rem' }}>♪ {(s.songs ?? []).join(' · ')}</p>
        )}

        {s.photoAlbumUrl && (
          <a href={s.photoAlbumUrl} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', background: '#c98a5b', color: '#fffdf7', textDecoration: 'none',
            padding: '0.6rem 1.1rem', borderRadius: '10px', fontSize: '0.9rem',
          }}>Open the photo album →</a>
        )}
      </div>
    </main>
  )
}

const SHELL: React.CSSProperties = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
  background: 'radial-gradient(120% 90% at 50% 0%, #f6ecd8 0%, #efe2c8 55%, #e7d6b8 100%)',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}
const CARD: React.CSSProperties = {
  background: '#fffdf7', border: '1px solid #e6d8bd', borderRadius: '20px', padding: '2rem 1.6rem',
  maxWidth: '22rem', textAlign: 'center', boxShadow: '0 14px 40px rgba(120, 96, 60, 0.18)',
}
const H1: React.CSSProperties = {
  fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 400, fontSize: '1.4rem',
  margin: '0 0 0.5rem', color: '#4a3f35',
}
const P: React.CSSProperties = { fontSize: '0.9rem', color: '#8a7d6f', lineHeight: 1.6, margin: 0 }

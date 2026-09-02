import { resolveGathering } from '@/lib/guest/portal'
import GuestPortal from './GuestPortal'

export const metadata = {
  title: 'Welcome to our village',
  robots: { index: false, follow: false },
}

// The phone portal a party guest opens from the QR on the welcome sign.
// Public, no account. Resolves the gathering with the admin client (never a
// browser session) — a dead or unknown token gets a warm screen, not a
// redirect to /login.
export default async function GuestPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const g = await resolveGathering(token)

  if (!g || !g.active) {
    return (
      <main style={SHELL}>
        <div style={CARD}>
          <div style={{ fontSize: '2.4rem', marginBottom: '0.6rem' }}>🕯️</div>
          <h1 style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 400, fontSize: '1.4rem', margin: '0 0 0.5rem', color: '#4a3f35' }}>
            {g ? 'This gathering has wrapped up' : 'This link has expired'}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#8a7d6f', lineHeight: 1.6, margin: 0 }}>
            {g
              ? 'Thank you for being here. The village will remember that you came.'
              : "We couldn't find a gathering for this link. Ask your host for a fresh QR."}
          </p>
        </div>
      </main>
    )
  }

  return <GuestPortal token={token} title={g.title} photoAlbumUrl={g.photoAlbumUrl} musicUrl={g.musicUrl} guestInfo={g.guestInfo} />
}

const SHELL: React.CSSProperties = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  background: 'radial-gradient(120% 90% at 50% 0%, #f6ecd8 0%, #efe2c8 55%, #e7d6b8 100%)',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
}
const CARD: React.CSSProperties = {
  background: '#fffdf7',
  border: '1px solid #e6d8bd',
  borderRadius: '20px',
  padding: '2rem 1.6rem',
  maxWidth: '22rem',
  textAlign: 'center',
  boxShadow: '0 14px 40px rgba(120, 96, 60, 0.18)',
}

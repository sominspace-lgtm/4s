import { resolveShare, sharedWishes } from '@/lib/wishlist/share'
import SharedWishlist from './SharedWishlist'

export const metadata = {
  title: 'A wishlist',
  robots: { index: false, follow: false },
}

// A wishlist someone shared by link (2026-10-12). Public, no account. The page
// is read-only except for "I'll get this", which tells the owner only that it
// is covered.
export default async function SharedWishlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const share = await resolveShare(token)

  if (!share) {
    return (
      <main style={SHELL}>
        <div style={{ ...CARD, textAlign: 'center' }}>
          <h1 style={H1}>This wishlist isn&rsquo;t here</h1>
          <p style={P}>The link may be wrong, or it was turned off. Ask for a fresh one.</p>
        </div>
      </main>
    )
  }

  const wishes = await sharedWishes(share)
  return (
    <main style={SHELL}>
      <div style={{ maxWidth: '44rem', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#a8987f' }}>
            {share.ownerName ? `${share.ownerName}'s wishlist` : 'A wishlist'}
          </div>
          <h1 style={{ ...H1, marginTop: '0.3rem' }}>{share.title}</h1>
          <p style={P}>Tap &ldquo;I&rsquo;ll get this&rdquo; on something so it does not get bought twice. They will only see that it is covered.</p>
        </div>
        <SharedWishlist token={token} wishes={wishes} />
      </div>
    </main>
  )
}

const SHELL: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem',
  background: '#f5efe3', fontFamily: 'var(--font-body, system-ui), sans-serif', color: '#4a3f35',
}
const CARD: React.CSSProperties = {
  background: '#fffaf0', border: '1px solid #e6dcc6', borderRadius: '18px', padding: '2rem 1.6rem', maxWidth: '26rem', width: '100%',
}
const H1: React.CSSProperties = { fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 400, fontSize: '1.6rem', margin: 0, color: '#4a3f35' }
const P: React.CSSProperties = { fontSize: '0.85rem', color: '#8a7d6f', lineHeight: 1.6, margin: '0.5rem 0 0' }

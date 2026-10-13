import { sharedRecipe } from '@/lib/recipes/share'
import { minutesLabel } from '@/lib/recipes/time'

export const metadata = { title: 'A recipe', robots: { index: false, follow: false } }

// A recipe someone sent by link (2026-10-13). Public, read-only, no account.
export default async function SharedRecipePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const r = await sharedRecipe(token)

  if (!r) {
    return (
      <main style={SHELL}>
        <div style={{ ...CARD, textAlign: 'center' }}>
          <h1 style={H1}>This recipe isn&rsquo;t here</h1>
          <p style={P}>The link may be wrong, or it was turned off. Ask for a fresh one.</p>
        </div>
      </main>
    )
  }

  const total = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0)
  const link = r.source_url && /^https?:\/\//i.test(r.source_url) ? r.source_url : null
  return (
    <main style={SHELL}>
      <div style={{ maxWidth: '40rem', width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ ...CARD, padding: 0, overflow: 'hidden', maxWidth: 'none' }}>
          {r.image_url && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary recipe-site hosts
            <img src={r.image_url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', maxHeight: '16rem', objectFit: 'cover', display: 'block' }} />
          )}
          <div style={{ padding: '1.2rem 1.4rem' }}>
            {r.ownerName && <div style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a8987f' }}>From {r.ownerName}</div>}
            <h1 style={{ ...H1, marginTop: '0.3rem' }}>{r.title}</h1>
            <p style={P}>
              {[total ? minutesLabel(total) : null, `Serves ${r.servings}`, r.calories != null ? `${Math.round(r.calories)} cal each` : null].filter(Boolean).join(' · ')}
              {link && <> · <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: '#9a7b3a' }}>{r.source_name ?? 'Original'} ↗</a></>}
            </p>
          </div>
        </div>
        <div style={{ ...CARD, maxWidth: 'none' }}>
          <h2 style={H2}>Ingredients</h2>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.8, fontSize: '0.95rem' }}>
            {r.ingredients.map(i => <li key={i.id}>{i.text}</li>)}
          </ul>
        </div>
        {r.steps.length > 0 && (
          <div style={{ ...CARD, maxWidth: 'none' }}>
            <h2 style={H2}>Method</h2>
            <ol style={{ margin: 0, paddingLeft: '1.3rem', lineHeight: 1.7, fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {r.steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        )}
        {r.notes && <div style={{ ...CARD, maxWidth: 'none', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.6 }}>{r.notes}</div>}
      </div>
    </main>
  )
}

const SHELL: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '1.5rem 1rem',
  background: '#f5efe3', fontFamily: 'var(--font-body, system-ui), sans-serif', color: '#4a3f35',
}
const CARD: React.CSSProperties = {
  background: '#fffaf0', border: '1px solid #e6dcc6', borderRadius: '18px', padding: '1.4rem 1.4rem', maxWidth: '26rem', width: '100%',
}
const H1: React.CSSProperties = { fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 400, fontSize: '1.7rem', margin: 0, color: '#4a3f35', lineHeight: 1.2 }
const H2: React.CSSProperties = { fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 400, fontSize: '1.15rem', margin: '0 0 0.6rem' }
const P: React.CSSProperties = { fontSize: '0.85rem', color: '#8a7d6f', lineHeight: 1.6, margin: '0.5rem 0 0' }

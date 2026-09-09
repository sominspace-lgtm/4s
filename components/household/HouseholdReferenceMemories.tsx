'use client'

import { useState } from 'react'
import { useMemoryLinks } from '@/lib/hooks/useMemoryLinks'
import { useGatheringMemories } from '@/lib/hooks/useGatheringMemories'
import IconButton from '@/components/ui/IconButton'

// The Reference tab's "photos & keepsakes" (2026-09-10). Two things: the
// shared album links (Google Photos / iCloud / Drive), editable here now
// instead of only in Setup; and the "Tonight at the Village" keepsakes
// saved when a gathering closes. Shows in shared mode too — Reference is
// the one open household surface.
export default function HouseholdReferenceMemories({ spaceId }: { spaceId: string | null }) {
  const links = useMemoryLinks(spaceId)
  const { memories } = useGatheringMemories(spaceId)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')

  const input: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.74rem', padding: '0.4rem 0.6rem', outline: 'none',
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div>
        <div className="t-card" style={{ marginBottom: '0.6rem' }}>Photo albums</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {links.links.map(l => (
            <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.76rem' }}>
              <a href={l.url} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 0, color: 'var(--gold)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.label || 'Album'} ↗
              </a>
              <IconButton label={`Remove ${l.label}`} onClick={() => links.removeLink(l.id)} size={10} style={{ opacity: 0.4 }}>✕</IconButton>
            </div>
          ))}
          {!links.loading && links.links.length === 0 && !adding && (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }}>
              No albums linked yet. Paste a Google Photos, iCloud, or Drive link.
            </div>
          )}
          {adding ? (
            <form onSubmit={async e => {
              e.preventDefault()
              if (!label.trim() || !url.trim()) return
              await links.addLink(label.trim(), url.trim())
              setLabel(''); setUrl(''); setAdding(false)
            }} style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label" style={{ ...input, width: '130px' }} autoFocus />
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste the link" style={{ ...input, flex: 1, minWidth: '160px' }} />
              <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.68rem' }}>Save</button>
              <button type="button" onClick={() => setAdding(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer' }}>Cancel</button>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="btn btn-secondary press" style={{ fontSize: '0.68rem', alignSelf: 'flex-start', marginTop: '0.3rem' }}>
              + Add an album link
            </button>
          )}
        </div>
      </div>

      {memories.length > 0 && (
        <div style={{ borderTop: '1px solid var(--faint)', paddingTop: '0.8rem' }}>
          <div className="t-card" style={{ marginBottom: '0.6rem' }}>Saves from our hosting</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {memories.map(m => {
              const line = m.summary?.messages?.[0]?.text
                || (m.summary?.guests?.length ? m.summary.guests.slice(0, 6).join(', ') : null)
              const keepsakeUrl = m.token && typeof window !== 'undefined' ? `${window.location.origin}/keepsake/${m.token}` : null
              return (
                <div key={m.id} style={{ fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--text)', flex: 1, minWidth: 0 }}>{m.title.replace('Tonight at the Village — ', '')}</span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--muted)', flexShrink: 0 }}>{m.happened_on}</span>
                  </div>
                  {line && <div style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.4, marginTop: '0.1rem' }}>{line}</div>}
                  <div style={{ display: 'flex', gap: '0.7rem', marginTop: '0.2rem' }}>
                    {keepsakeUrl && <a href={keepsakeUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.64rem', color: 'var(--gold)' }}>keepsake page ↗</a>}
                    {m.summary?.photoAlbumUrl && <a href={m.summary.photoAlbumUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.64rem', color: 'var(--gold)' }}>photos ↗</a>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

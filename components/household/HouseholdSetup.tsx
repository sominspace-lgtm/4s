'use client'

import { useEffect, useState } from 'react'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useMemoryLinks } from '@/lib/hooks/useMemoryLinks'
import DiscordConnect from './DiscordConnect'
import CompanionSync from '@/components/relationships/CompanionSync'

// Household setup — moved out of the Household tab into Settings (2026-08-21).
//
// These three cards are all "configure this once and forget it", which is what
// Settings is for; keeping them as a fifth Household tab meant the day-to-day
// surface (chores, meals, calendar) carried a permanent tab you'd open twice a
// year. Household is now Home · Calendar · Reference.
//
// It carries its OWN space picker rather than reading Household's: two of the
// three cards are scoped to a specific shared space (Discord pairs a space to
// a guild; memory links belong to a space, not a person), and Settings has no
// space concept of its own to inherit.
export default function HouseholdSetup({ userId, userEmail }: { userId: string; userEmail: string }) {
  const { spaces } = useSharedSpaces(userId)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  // Same auto-select as HouseholdHub — there's only ever one space in
  // practice, so making someone choose it every visit is pure friction.
  useEffect(() => {
    if (!spaceId && spaces.length > 0) setSpaceId(spaces[0].id)
  }, [spaces, spaceId])

  const memories = useMemoryLinks(spaceId)
  const [addingMemoryLink, setAddingMemoryLink] = useState(false)
  const [memoryLabel, setMemoryLabel] = useState('')
  const [memoryUrl, setMemoryUrl] = useState('')

  const input: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
    padding: '0.4rem 0.6rem', outline: 'none',
  }
  const card: React.CSSProperties = {
    background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem',
    border: '1px solid var(--border)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {spaces.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.7 }}>Household</span>
          <select value={spaceId ?? ''} onChange={e => setSpaceId(e.target.value || null)} style={{ ...input, cursor: 'pointer' }}>
            {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Moved from People → Close (2026-08-11): confirming a partner and the
          Google Photos/checkin feed that comes with it is pair-scoped
          shared-living data. */}
      <div style={card}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.8rem' }}>Partner</div>
        <CompanionSync userId={userId} userEmail={userEmail} />
      </div>

      <div style={card}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.8rem' }}>Discord</div>
        <DiscordConnect spaceId={spaceId} spaceName={spaces.find(s => s.id === spaceId)?.name} />
      </div>

      <div style={card}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.8rem' }}>Memories</div>
        {!spaceId ? (
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)', opacity: 0.75 }}>
            Create a shared space first — memories are attached to the space, not to you alone.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {/* Each source (Google Photos, iCloud, a Drive folder...) is its
                own tile — a couple usually has more than one photo home, and
                the old single-link field could only ever hold one. */}
            {memories.links.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {memories.links.map(link => (
                  <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.4rem 0.4rem 0.4rem 0.7rem' }}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--text)', textDecoration: 'none' }}>
                      📷 {link.label}
                    </a>
                    <button
                      onClick={() => memories.removeLink(link.id)}
                      aria-label={`Remove ${link.label}`}
                      className="press"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.6rem' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {addingMemoryLink ? (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  if (!memoryLabel.trim() || !memoryUrl.trim()) return
                  await memories.addLink(memoryLabel.trim(), memoryUrl.trim())
                  setMemoryLabel(''); setMemoryUrl(''); setAddingMemoryLink(false)
                }}
                style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}
              >
                <input
                  value={memoryLabel} onChange={e => setMemoryLabel(e.target.value)}
                  placeholder="Label (e.g. Google Photos, iCloud)" style={{ ...input, width: '180px' }} autoFocus
                />
                <input
                  value={memoryUrl} onChange={e => setMemoryUrl(e.target.value)}
                  placeholder="Paste the album/folder link" style={{ ...input, flex: 1, minWidth: '200px' }}
                />
                <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Save</button>
                <button type="button" onClick={() => setAddingMemoryLink(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.7rem', cursor: 'pointer' }}>Cancel</button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {memories.links.length === 0 && (
                  <div style={{ fontSize: '0.76rem', color: 'var(--muted)', opacity: 0.75 }}>
                    No albums linked yet. Paste a Google Photos, iCloud, or Drive link — opens in a new tab, no login through 4S OS required.
                  </div>
                )}
                <button
                  onClick={() => setAddingMemoryLink(true)}
                  className="btn btn-secondary press"
                  style={{ fontSize: '0.7rem', alignSelf: 'flex-start' }}
                >
                  + Add a memories link
                </button>
              </div>
            )}

            {/* Distinct from the link-outs above: photos actually uploaded
                through a Places pin live in the pin's own Photos section. */}
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.6, borderTop: '1px solid var(--faint)', paddingTop: '0.5rem' }}>
              Photos you&rsquo;ve uploaded to a specific pin live on that pin, under Places → Photos — not here.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

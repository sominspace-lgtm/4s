'use client'

import { useState } from 'react'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { mediaEmbed } from '@/lib/utils/mediaEmbed'
import Icon from '@/components/ui/Icon'

// The house playlist. A Spotify / YouTube / Apple Music link saved on the
// shared space, shown as an inline player on the Village home panel and
// reused for the guest party screen. Paste a link, it plays; anyone in the
// household can change it.

export default function MusicCard({ spaceId, compact = false, readOnly = false }: { spaceId: string | null; compact?: boolean; readOnly?: boolean }) {
  const { spaces, setMusicUrl } = useSharedSpaces('')
  const space = spaces.find(s => s.id === spaceId) ?? spaces[0] ?? null
  const url = space?.music_url ?? null
  const embed = mediaEmbed(url)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  async function save() {
    if (!space) return
    await setMusicUrl(space.id, draft)
    setEditing(false)
    setDraft('')
  }

  const showForm = !readOnly && (editing || (!url && !!space))

  return (
    <div className="organic" style={{
      background: 'color-mix(in srgb, var(--purple) 9%, var(--surface2))',
      border: '1px solid color-mix(in srgb, var(--purple) 22%, var(--border))',
      borderRadius: '14px', padding: '0.65rem 0.75rem',
      display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--purple)' }}><Icon name="mic" size={16} /></span>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>Music</span>
        {url && !readOnly && (
          <button
            onClick={() => { setDraft(url ?? ''); setEditing(e => !e) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.6rem', opacity: 0.7 }}
          >{editing ? 'cancel' : 'change'}</button>
        )}
      </div>

      {showForm ? (
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save() }}
            placeholder="Paste a Spotify / YouTube playlist link"
            autoFocus={editing}
            style={{
              flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '0.35rem 0.5rem', fontSize: '0.72rem', color: 'var(--text)',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button onClick={save} className="press" style={{
            background: 'var(--purple)', color: 'var(--bg)', border: 'none', borderRadius: 8,
            padding: '0 0.6rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600,
          }}>Save</button>
        </div>
      ) : embed ? (
        <iframe
          title="House playlist"
          src={embed.src}
          style={{ width: '100%', height: compact && embed.compact ? 80 : embed.height, border: 'none', borderRadius: 10 }}
          loading="lazy"
          allow="encrypted-media; clipboard-write; picture-in-picture"
        />
      ) : url ? (
        <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: 'var(--purple)' }}>
          Open the playlist →
        </a>
      ) : (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>No playlist set.</div>
      )}
    </div>
  )
}

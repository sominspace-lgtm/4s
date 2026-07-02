'use client'

import { useEffect, useRef, useState } from 'react'
import { useItemSharing } from '@/lib/hooks/useItemSharing'
import { useCompanions } from '@/lib/hooks/useCompanions'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

interface ShareMenuProps {
  itemType: string
  itemId: string
  userId: string
}

// "Keep private / Share with person / Share with space / Stop sharing" —
// generic share control for any item, backed by shared_item_links.
export default function ShareMenu({ itemType, itemId, userId }: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'person' | 'space' | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const { links, shareWithPerson, shareWithSpace, stopSharing } = useItemSharing(itemType, itemId)
  const { active: companions } = useCompanions(userId)
  const { spaces } = useSharedSpaces(userId)

  const isShared = links.length > 0

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setTab(null) }
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={isShared ? 'Shared — click to manage' : 'Private — click to share'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: '0.62rem', lineHeight: 1,
          color: isShared ? 'var(--gold)' : 'var(--muted)', opacity: isShared ? 0.85 : 0.5,
        }}
      >⇆</button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 120,
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
          padding: '0.5rem', width: '210px', boxShadow: '0 8px 24px var(--shadow)',
        }}>
          {tab === null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <MenuItem label="Share with person" onClick={() => setTab('person')} disabled={companions.length === 0} />
              <MenuItem label="Share with group" onClick={() => setTab('space')} disabled={spaces.length === 0} />
              {isShared && <MenuItem label="Stop sharing" danger onClick={() => { stopSharing(); setOpen(false) }} />}
              {!isShared && <div style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.68, padding: '0.35rem 0.5rem' }}>Private — only you can see this</div>}
            </div>
          )}

          {tab === 'person' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {companions.map(c => (
                <MenuItem
                  key={c.id}
                  label={c.invitee_email}
                  onClick={async () => { if (c.invitee_id) { await shareWithPerson(c.invitee_id); setOpen(false); setTab(null) } }}
                />
              ))}
              <MenuItem label="← back" onClick={() => setTab(null)} muted />
            </div>
          )}

          {tab === 'space' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {spaces.map(s => (
                <MenuItem key={s.id} label={s.name} onClick={async () => { await shareWithSpace(s.id); setOpen(false); setTab(null) }} />
              ))}
              <MenuItem label="← back" onClick={() => setTab(null)} muted />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, onClick, disabled, danger, muted }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: 'left', background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
        padding: '0.4rem 0.5rem', borderRadius: '6px', fontFamily: 'var(--font-body)', fontSize: '0.72rem',
        color: danger ? 'var(--rose)' : muted ? 'var(--muted)' : 'var(--text)',
        opacity: disabled ? 0.35 : 1,
      }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.background = 'var(--hover-bg)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >{label}</button>
  )
}

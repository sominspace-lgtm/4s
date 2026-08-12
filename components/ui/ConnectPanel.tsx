'use client'

import { useEffect, useRef } from 'react'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import DiscordConnect from '@/components/household/DiscordConnect'
import AlexaConnect from '@/components/ui/AlexaConnect'
import CompanionSync from '@/components/relationships/CompanionSync'

// One place for every external connection (2026-08-11), replacing three
// scattered ones: Discord and Alexa each had their own home (Household →
// Setup, Account respectively), and Friends had no "connect" framing at all
// even though it's the same kind of action. This doesn't move Discord or
// Alexa's actual settings — both stay reachable from their original spots
// too — it's a second, faster entry point for "I want to connect something"
// without having to remember which hub owns which integration.
//
// Same slide-in shell as CompanionPanel, so opening Connect from the header
// feels like the same gesture as opening Friends.
interface Props {
  open: boolean
  userId: string
  userEmail: string
  onClose: () => void
  onOpenCompanions: () => void
}

export default function ConnectPanel({ open, userId, userEmail, onClose, onOpenCompanions }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const { spaces } = useSharedSpaces(userId)
  const primarySpace = spaces[0]

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  const sectionStyle: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '1rem 1.1rem',
  }
  const sectionLabel: React.CSSProperties = {
    fontSize: '0.68rem', letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--muted)', opacity: 0.75, marginBottom: '0.6rem',
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s',
      }} />
      <div ref={ref} style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '340px',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 200, padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Connect</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        <div style={sectionStyle}>
          <div style={sectionLabel}>Discord</div>
          {primarySpace ? (
            <DiscordConnect spaceId={primarySpace.id} spaceName={primarySpace.name} />
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Create a household space first — Household → Setup, or Sharing → Spaces.
            </div>
          )}
        </div>

        <div style={sectionStyle}>
          <div style={sectionLabel}>Alexa</div>
          <AlexaConnect userId={userId} />
        </div>

        <div style={sectionStyle}>
          <div style={sectionLabel}>Friends</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '0.7rem' }}>
            Invite someone and choose what to share with them.
          </div>
          <button
            onClick={() => { onClose(); onOpenCompanions() }}
            className="btn btn-secondary press"
            style={{ fontSize: '0.72rem' }}
          >
            Manage Friends →
          </button>
        </div>

        <div style={sectionStyle}>
          <div style={sectionLabel}>Partner</div>
          {/* CompanionSync is the same component rendered in Household →
              Setup — this isn't a summary or a link out to it, it's the
              actual widget, so confirming/inviting/connecting Companion all
              work right here without leaving Connect. */}
          <CompanionSync userId={userId} userEmail={userEmail} />
        </div>
      </div>
    </>
  )
}

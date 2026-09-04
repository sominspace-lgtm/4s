'use client'

import type { SectionConfig } from '@/components/ui/CustomizePanel'
import HouseholdHub from './HouseholdHub'
import Icon from '@/components/ui/Icon'

// Smart Home's own transition (2026-08-25) — per the vision doc, tapping
// Home shouldn't feel like switching app tabs; the Village stays visible
// (dimmed, non-interactive) behind a sheet that rises over it, and Smart
// Home is what's inside. Reuses HouseholdHub's existing smarthome content
// unchanged (forcedTab already hides its internal tab-switcher) — only the
// PRESENTATION is new, not the Smart Home feature itself; the doc explicitly
// leaves the deeper Smart Home information architecture for later.
export default function SmartHomeOverlay({ open, onClose, userId, userEmail, homeBlocks, onChangeHomeBlocks, sharedMode, onLockedNavigate }: {
  open: boolean
  onClose: () => void
  userId: string
  userEmail: string
  homeBlocks: SectionConfig[]
  onChangeHomeBlocks: (next: SectionConfig[]) => void
  sharedMode?: boolean
  onLockedNavigate?: (reason: string) => void
}) {
  return (
    <>
      {/* Scrim — the Village is still there, just backgrounded. Tapping it
          closes the sheet, same "outside click dismisses" idiom as every
          other panel in the app. */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: 'fixed', inset: 0, zIndex: 480,
          background: 'color-mix(in srgb, var(--bg) 30%, transparent)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 260ms ease',
        }}
      />
      {/* Half-screen glass sheet (round 80, 2026-09-04) — matches Kitchen
          mode's chrome now, so the two "function overlay" surfaces read
          as one family: the village stays visible (dimmed) above it
          instead of a near-fullscreen opaque panel replacing it. */}
      <div
        role="dialog"
        aria-label="Smart Home"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, height: '50vh', minHeight: '20rem', maxHeight: '34rem',
          maxWidth: '36rem', margin: '0 auto',
          background: 'color-mix(in srgb, var(--surface) 78%, transparent)',
          borderRadius: '20px 20px 0 0',
          border: '1px solid color-mix(in srgb, var(--border) 90%, transparent)', borderBottom: 'none',
          backdropFilter: 'blur(20px) saturate(1.2)', WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          boxShadow: '0 -12px 50px color-mix(in srgb, var(--text) 25%, transparent)',
          zIndex: 481, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(.2,.8,.3,1)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', alignSelf: 'center', margin: '0.5rem 0 0', flexShrink: 0 }} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 1.2rem 0.7rem', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span aria-hidden style={{ display: 'inline-flex' }}><Icon name="controls" size={16} /></span>
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Smart Home</span>
          </div>
          <button onClick={onClose} className="press" style={{
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
            fontSize: '0.72rem', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}><Icon name="village" size={13} /> Village</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.2rem 2rem' }}>
          {open && (
            <HouseholdHub
              userId={userId} userEmail={userEmail}
              homeBlocks={homeBlocks} onChangeHomeBlocks={onChangeHomeBlocks}
              sharedMode={sharedMode} onLockedNavigate={onLockedNavigate}
              forcedTab="smarthome"
            />
          )}
        </div>
      </div>
    </>
  )
}

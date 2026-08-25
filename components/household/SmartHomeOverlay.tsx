'use client'

import type { SectionConfig } from '@/components/ui/CustomizePanel'
import HouseholdHub from './HouseholdHub'

// Smart Home's own transition (2026-08-25) — per the vision doc, tapping
// Home shouldn't feel like switching app tabs; the Village stays visible
// (dimmed, non-interactive) behind a sheet that rises over it, and Smart
// Home is what's inside. Reuses HouseholdHub's existing smarthome content
// unchanged (forcedTab already hides its internal tab-switcher) — only the
// PRESENTATION is new, not the Smart Home feature itself; the doc explicitly
// leaves the deeper Smart Home information architecture for later.
export default function SmartHomeOverlay({ open, onClose, userId, userEmail, tabs, onChangeTabs, homeBlocks, onChangeHomeBlocks, sharedMode, onLockedNavigate }: {
  open: boolean
  onClose: () => void
  userId: string
  userEmail: string
  tabs: SectionConfig[]
  onChangeTabs: (next: SectionConfig[]) => void
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
          background: 'color-mix(in srgb, var(--bg) 55%, transparent)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 260ms ease',
        }}
      />
      <div
        role="dialog"
        aria-label="Smart Home"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, top: '8vh',
          maxWidth: '900px', margin: '0 auto',
          background: 'var(--bg)', borderRadius: '20px 20px 0 0',
          border: '1px solid var(--border)', borderBottom: 'none',
          boxShadow: '0 -8px 40px color-mix(in srgb, var(--text) 18%, transparent)',
          zIndex: 481, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(.2,.8,.3,1)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.9rem 1.2rem', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span aria-hidden style={{ fontSize: '1rem' }}>💡</span>
            <span style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Smart Home</span>
          </div>
          <button onClick={onClose} className="press" style={{
            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer',
            fontSize: '0.72rem', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>🌳 Village</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.2rem 2rem' }}>
          {open && (
            <HouseholdHub
              userId={userId} userEmail={userEmail}
              tabs={tabs} onChangeTabs={onChangeTabs}
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

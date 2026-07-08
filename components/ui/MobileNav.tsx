'use client'

// The mobile floating button does exactly one thing: Quick Capture.
// Navigation lives in the bottom nav, search in the header — this button
// never asks the user to make a second decision.
export default function MobileNav({ onCapture }: { onCapture: () => void }) {
  return (
    <div className="mobile-nav" style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 490 }}>
      <button
        onClick={onCapture}
        aria-label="Quick capture"
        title="Quick capture"
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--gold)', border: 'none', color: 'var(--bg)',
          fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1,
          boxShadow: '0 4px 20px var(--shadow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>
    </div>
  )
}

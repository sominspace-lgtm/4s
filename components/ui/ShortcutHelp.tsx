'use client'

// The keyboard shortcuts, shown on `?`. Small on purpose — there are only a
// handful, and they're the same ones a command-palette app trains you on.

const SHORTCUTS: [string, string][] = [
  ['t', 'Add a task'],
  ['h', 'Add a habit'],
  ['c', 'Quick capture'],
  ['/', 'Search'],
  ['?', 'This list'],
]

export default function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 530, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1rem',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(320px, 92vw)', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: '14px',
          padding: '1.1rem 1.3rem', boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7, marginBottom: '0.8rem' }}>
          Shortcuts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {SHORTCUTS.map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{label}</span>
              <kbd style={{
                fontSize: '0.72rem', fontFamily: 'var(--font-body)', color: 'var(--muted)',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '5px', padding: '0.1em 0.5em', minWidth: '1.4em', textAlign: 'center',
              }}>{key}</kbd>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.6, marginTop: '0.9rem' }}>
          Not while you&rsquo;re typing in a field.
        </div>
      </div>
    </div>
  )
}

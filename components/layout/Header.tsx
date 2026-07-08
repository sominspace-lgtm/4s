'use client'

import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ThemeModePicker from '@/components/ui/ThemeModePicker'
import type { Mode } from '@/lib/constants/modes'
import { guideGreeting } from '@/lib/utils/guideVoice'

interface HeaderProps {
  email: string
  userId: string
  initialName: string | null
  initialTheme: string
  initialMode: Mode
  onThemeChange: (t: string) => void
  onModeChange: (m: Mode) => void
  onCustomize: () => void
  onCompanions: () => void
  onSearch: () => void
  onArchive: () => void
  onHelp: () => void
  onJarvis: () => void
  zenView: boolean
  onToggleZen: () => void
  onConfigureFocus: () => void
  simpleMode: boolean
  onToggleSimple: () => void
}

// One quiet overflow menu instead of a row of icon-only buttons — every
// action gets a label, and the header keeps a single obvious hierarchy:
// Search, Appearance, everything else behind ⋯.
function MoreMenu({ items }: { items: { icon: string; label: string; onClick?: () => void; href?: string; divider?: boolean }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', minHeight: 42,
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
    padding: '0.45rem 0.9rem', borderRadius: '8px', textDecoration: 'none',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.8rem',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} title="More" aria-label="More options" aria-expanded={open} style={{
        background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
        padding: '0.4rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
        fontSize: '0.85rem', lineHeight: 1, fontFamily: 'var(--font-body)',
      }}>⋯</button>
      {open && (
        <div className="header-menu" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 120,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '0.4rem', width: '220px',
          boxShadow: '0 8px 32px var(--shadow)',
        }}>
          {items.map((it, i) => it.divider ? (
            <div key={i} style={{ height: 1, background: 'var(--faint)', margin: '0.35rem 0.5rem' }} />
          ) : it.href ? (
            <a key={i} href={it.href} style={itemStyle}>
              <span aria-hidden style={{ width: '1.1em', textAlign: 'center', color: 'var(--muted)' }}>{it.icon}</span>{it.label}
            </a>
          ) : (
            <button key={i} onClick={() => { setOpen(false); it.onClick?.() }} style={itemStyle}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span aria-hidden style={{ width: '1.1em', textAlign: 'center', color: 'var(--muted)' }}>{it.icon}</span>{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Header({ email, userId, initialName, initialTheme, initialMode, onThemeChange, onModeChange, onCustomize, onCompanions, onSearch, onArchive, onHelp, onJarvis, zenView, onToggleZen, onConfigureFocus, simpleMode, onToggleSimple }: HeaderProps) {
  const router = useRouter()
  const fallback = email.split('@')[0]

  // Computed client-side to respect user's local timezone
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { setNow(new Date()) }, [])
  const h = now.getHours()

  const [name, setName] = useState(initialName || fallback)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [theme, setTheme] = useState(initialTheme)
  const [mode, setMode] = useState<Mode>(initialMode)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  async function saveName() {
    const trimmed = draft.trim() || fallback
    setName(trimmed)
    setEditing(false)
    const supabase = createClient()
    await supabase.from('user_prefs').upsert({ user_id: userId, display_name: trimmed })
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  function handleThemeChange(t: string) { setTheme(t); onThemeChange(t) }
  function handleModeChange(m: Mode) { setMode(m); onModeChange(m) }

  const { prefix, suffix } = guideGreeting(mode, h)
  const displayName = name

  const accentStyle: React.CSSProperties = {
    fontStyle: ['peaceful', 'monk', 'friend', 'teacher', 'therapist'].includes(mode) ? 'italic' : 'normal',
    background: 'linear-gradient(90deg, var(--gold), var(--rose))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }

  return (
    <header style={{ padding: '2.5rem 2rem 1rem', maxWidth: 'min(1080px, 94vw)', margin: '0 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-display)',
          fontWeight: 300, letterSpacing: '0.02em', lineHeight: 1.1,
          display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.2em',
        }}>
          {prefix && <span>{prefix}{' '}</span>}

          {/* Name — always clickable to edit */}
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') { setEditing(false); setDraft(name) }
              }}
              aria-label="Edit your name"
              style={{
                fontFamily: 'var(--font-display)', fontSize: 'inherit', fontWeight: 300,
                background: 'transparent', border: 'none', borderBottom: '1px solid var(--gold)',
                color: 'var(--text)', outline: 'none', width: `${Math.max(draft.length, 4)}ch`,
              }}
            />
          ) : (
            <em
              onClick={() => { setDraft(name); setEditing(true) }}
              title="Click to edit name"
              style={{ ...accentStyle, cursor: 'text' }}
            >
              {displayName}
            </em>
          )}

          {suffix && <span style={{ fontSize: '0.55em', color: 'var(--muted)', fontStyle: 'normal', letterSpacing: '0.03em' }}>{' '}{suffix}</span>}
          <span>.</span>
        </div>

        <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          {format(now, "EEEE, MMMM d · yyyy")}
          {mode !== 'peaceful' && (
            <span style={{ marginLeft: '0.6rem', opacity: 0.5 }}>· {mode} guide</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
        <button onClick={onSearch} title="Search everything" aria-label="Search" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.8rem', lineHeight: 1, fontFamily: 'var(--font-body)',
        }}>⌕</button>
        <ThemeModePicker
          userId={userId}
          currentTheme={theme}
          currentMode={mode}
          onThemeChange={handleThemeChange}
          onModeChange={handleModeChange}
        />
        <MoreMenu items={[
          { icon: '✦', label: 'Ask Jarvis', onClick: onJarvis },
          { icon: '◐', label: zenView ? 'Exit Focus view' : 'Focus view', onClick: onToggleZen },
          ...(zenView ? [{ icon: '⚙', label: 'Configure Focus view', onClick: onConfigureFocus }] : []),
          { icon: simpleMode ? '▦' : '▤', label: simpleMode ? 'Full view' : 'Simple view', onClick: onToggleSimple },
          { divider: true, icon: '', label: '' },
          { icon: '⊹', label: 'Customize layout', onClick: onCustomize },
          { icon: '⇆', label: 'Friends', onClick: onCompanions },
          { icon: '◻', label: 'Archive', onClick: onArchive },
          { divider: true, icon: '', label: '' },
          { icon: '?', label: 'Help & tutorial', onClick: onHelp },
          { icon: '↗', label: 'Guide', href: '/guide' },
          { icon: '○', label: 'Account', href: '/account' },
          { icon: '←', label: 'Sign out', onClick: signOut },
        ]} />
      </div>
    </header>
  )
}

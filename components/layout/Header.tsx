'use client'

import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ThemeModePicker from '@/components/ui/ThemeModePicker'
import type { Mode } from '@/lib/constants/modes'
import type { CustomThemeSeed } from '@/lib/constants/themes'
import { guideGreeting } from '@/lib/utils/guideVoice'
import { usePushNotifications } from '@/lib/hooks/usePushNotifications'

interface HeaderProps {
  email: string
  userId: string
  initialName: string | null
  /** From the no-PIN "Shared" login tile. Swaps the personal greeting/name
   *  editor and most of the menu for a plain "Household" label and a short
   *  menu — this session is backed by one real account under the hood, but
   *  it must never present as, or let you edit, that account's identity. */
  sharedMode?: boolean
  /** Shared mode only — opens the PIN prompt to switch to a personal session. */
  onUnlock?: () => void
  initialTheme: string
  initialMode: Mode
  customTheme: CustomThemeSeed | null
  onThemeChange: (t: string) => void
  onModeChange: (m: Mode) => void
  onCustomThemeChange: (seed: CustomThemeSeed) => void
  onCustomize: () => void
  onSearch: () => void
  onCapture: () => void
  onArchive: () => void
  onConnect: () => void
  onNotifications: () => void
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

export default function Header({ email, userId, initialName, sharedMode = false, onUnlock, initialTheme, initialMode, customTheme, onThemeChange, onModeChange, onCustomThemeChange, onCustomize, onSearch, onCapture, onArchive, onConnect, onNotifications }: HeaderProps) {
  const router = useRouter()
  // Guests have no email — greet them warmly instead of with an empty string.
  const fallback = email.split('@')[0] || 'friend'

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
    const prev = name
    setName(trimmed)
    setEditing(false)
    const supabase = createClient()
    const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, display_name: trimmed })
    if (error) {
      console.error('Failed to save name:', error.message)
      setName(prev)
    }
  }

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  function handleThemeChange(t: string) { setTheme(t); onThemeChange(t) }
  function handleModeChange(m: Mode) { setMode(m); onModeChange(m) }

  // Per-device, per-person — not shown in shared mode: it's a browser
  // permission tied to whoever's actually holding this device, and shared
  // mode is explicitly not any one person.
  const push = usePushNotifications()

  const { prefix, suffix } = guideGreeting(mode, h)
  const displayName = name

  const accentStyle: React.CSSProperties = {
    fontStyle: ['peaceful', 'friend'].includes(mode) ? 'italic' : 'normal',
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
          {/* suppressHydrationWarning (2026-08-27 fix) — prefix/suffix
              depend on the LOCAL hour (see `h` above), which genuinely and
              correctly differs between the server's render (wherever
              Vercel's region happens to be) and the browser's own
              timezone. That's not a bug to silence generally — it's the
              literal point of "Computed client-side to respect user's
              local timezone" above — but React's hydration diff doesn't
              know that, and was treating every single load as a mismatch:
              discarding the server-rendered tree and doing a full client
              re-render, which is what was actually causing "the screen
              flashes on load" (a full repaint, not just the theme swap
              fixed separately). suppressHydrationWarning is React's own
              sanctioned answer for "this text legitimately differs
              server-to-client and that's fine" — it only silences the
              warning/mismatch-recovery for THIS element's own text, not
              the rest of the tree. */}
          {prefix && <span suppressHydrationWarning>{prefix}{' '}</span>}

          {/* Shared never shows or edits the real backing account's name —
              that would both leak whose account it is and let a shared-device
              session rename someone's personal profile. */}
          {sharedMode ? (
            <em style={{ ...accentStyle, fontStyle: 'normal' }}>Household</em>
          ) : editing ? (
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

          {suffix && <span suppressHydrationWarning style={{ fontSize: '0.55em', color: 'var(--muted)', fontStyle: 'normal', letterSpacing: '0.03em' }}>{' '}{suffix}</span>}
          <span>.</span>
        </div>

        <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span>
            {/* Same reasoning as the greeting spans above — the date is
                computed from the browser's own local `now`, which can
                legitimately differ from the server's guess. */}
            <span suppressHydrationWarning>{format(now, "EEEE, MMMM d · yyyy")}</span>
            {mode !== 'peaceful' && !sharedMode && (
              <span style={{ marginLeft: '0.6rem', opacity: 0.5 }}>· {mode} guide</span>
            )}
          </span>
          {/* The one unmistakable, always-visible cue for which mode this is
              — restricting the tab bar to Household alone is the real
              boundary, but a person glancing at the screen needs to SEE
              they're in the shared view, not infer it from what's missing. */}
          {sharedMode && (
            <span style={{
              fontSize: '0.62rem', letterSpacing: '0.06em', color: 'var(--gold)',
              background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
              border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
              borderRadius: '20px', padding: '0.15em 0.7em', textTransform: 'none',
            }}>
              Shared view
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
        {/* Desktop's only visible entry to Quick Capture used to be ⌘K —
            real, but undiscoverable. This is the same trigger MobileNav's
            FAB already uses one level down. */}
        <button onClick={onCapture} title="Quick capture" aria-label="Quick capture" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.8rem', lineHeight: 1, fontFamily: 'var(--font-body)',
        }}>✎</button>
        <button onClick={onSearch} title="Search everything" aria-label="Search" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.8rem', lineHeight: 1, fontFamily: 'var(--font-body)',
        }}>⌕</button>
        {/* Theme is a personal preference stored on the backing account
            (user_prefs.theme) — changing it from a shared-device session
            would silently change that person's real profile the next time
            they sign in personally. Left out of shared mode entirely rather
            than risk that. */}
        {!sharedMode && (
          <ThemeModePicker
            userId={userId}
            currentTheme={theme}
            currentMode={mode}
            customTheme={customTheme}
            onThemeChange={handleThemeChange}
            onModeChange={handleModeChange}
            onCustomThemeChange={onCustomThemeChange}
          />
        )}
        <MoreMenu items={sharedMode ? [
          // The shared view is deliberately read-mostly; this is the way out
          // of it without signing out and back in.
          ...(onUnlock ? [{ icon: '⊙', label: 'Unlock with PIN', onClick: onUnlock }] : []),
          { icon: '↗', label: 'Guide', href: '/guide' },
          { icon: '⇄', label: 'Switch account', onClick: signOut },
          { icon: '←', label: 'Sign out', onClick: signOut },
        ] : [
          { icon: '⇄', label: 'Connect', onClick: onConnect },
          ...(push.status === 'unsupported' ? [] : [{
            icon: push.status === 'subscribed' ? '◉' : '◌',
            label: 'Notifications', onClick: onNotifications,
          }]),
          { divider: true, icon: '', label: '' },
          { icon: '⊹', label: 'Customize layout', onClick: onCustomize },
          { icon: '◻', label: 'Archive', onClick: onArchive },
          { divider: true, icon: '', label: '' },
          { icon: '↗', label: 'Guide', href: '/guide' },
          { icon: '○', label: 'Account', href: '/account' },
          // Same tiled-profile login every device uses — picking a different
          // tile there IS switching accounts, so this just clears the
          // current session and sends you back to that screen. Distinct
          // label from Sign out even though the call underneath is
          // identical (2026-08-21) — "leave the app" and "hand this device
          // to someone else" read as two different intentions even when
          // they're mechanically the same action here.
          { icon: '⇄', label: 'Switch account', onClick: signOut },
          { icon: '←', label: 'Sign out', onClick: signOut },
        ]} />
      </div>
    </header>
  )
}

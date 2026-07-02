'use client'

import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import ThemeModePicker from '@/components/ui/ThemeModePicker'
import type { Mode } from '@/lib/constants/modes'

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
  onFocus: () => void
  onArchive: () => void
  onHelp: () => void
}

// Returns text before and after the name
function getTimeOfDay(hour: number) {
  if (hour >= 5  && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function getGreeting(mode: Mode, hour: number): { prefix: string; suffix?: string } {
  const time = getTimeOfDay(hour)
  const isNight = time === 'night'

  switch (mode) {
    case 'harsh':    return { prefix: isNight ? 'Still up,' : time === 'morning' ? 'Wake up,' : time === 'afternoon' ? 'Still at it,' : 'End strong,' }
    case 'peaceful': return { prefix: isNight ? 'Rest easy,' : 'Welcome back,' }
    case 'teacher':  return { prefix: `Good ${time},`, suffix: '— ready to reflect?' }
    case 'friend':   return { prefix: time === 'morning' ? 'Morning,' : time === 'afternoon' ? 'Hey,' : time === 'evening' ? 'Evening,' : 'Still up,' }
    case 'coach':    return { prefix: time === 'morning' ? "Let's go," : time === 'afternoon' ? 'Keep pushing,' : time === 'evening' ? 'Finish strong,' : 'Rest up,' }
    case 'ceo':      return { prefix: '' }
    case 'monk':     return { prefix: isNight ? 'Rest now,' : 'Be present,' }
    case 'hype':     return { prefix: time === 'morning' ? 'RISE UP,' : time === 'afternoon' ? "LET'S GO," : time === 'evening' ? 'LAST PUSH,' : 'STILL GOING??' }
    case 'gamer':    return { prefix: time === 'morning' ? 'New day, new quests,' : time === 'afternoon' ? 'Mid-session,' : time === 'evening' ? 'Final boss hour,' : 'Night grind,' }
    default:         return { prefix: `Good ${time},` }
  }
}

export default function Header({ email, userId, initialName, initialTheme, initialMode, onThemeChange, onModeChange, onCustomize, onCompanions, onSearch, onFocus, onArchive, onHelp }: HeaderProps) {
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

  const { prefix, suffix } = getGreeting(mode, h)
  const isHype = mode === 'hype'
  const displayName = isHype ? name.toUpperCase() : name

  const accentStyle: React.CSSProperties = {
    fontStyle: ['balanced', 'peaceful', 'teacher', 'friend', 'monk'].includes(mode) ? 'italic' : 'normal',
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
          {mode !== 'balanced' && (
            <span style={{ marginLeft: '0.6rem', opacity: 0.5 }}>· {mode} mode</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {/* Help button */}
        <button onClick={onHelp} title="Help & tutorial" aria-label="Help" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.6rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.75rem', lineHeight: 1, fontFamily: 'var(--font-body)',
        }}>?</button>

        <kbd
          onClick={onSearch}
          title="Search everything (⌘/)"
          style={{
            fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.5,
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '6px', padding: '0.3em 0.55em', cursor: 'pointer',
            fontFamily: 'var(--font-body)', letterSpacing: '0.04em', userSelect: 'none',
          }}
        >⌘/</kbd>
        <button onClick={onFocus} title="Focus mode" aria-label="Focus mode" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.6rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.75rem', lineHeight: 1, fontFamily: 'var(--font-body)',
        }}>◎</button>
        <button onClick={onArchive} title="Archive" aria-label="Archive" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.6rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.75rem', lineHeight: 1, fontFamily: 'var(--font-body)',
        }}>◻</button>
        <button onClick={onCompanions} title="Friends" aria-label="Friends" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.8rem', lineHeight: 1, fontFamily: 'var(--font-body)',
        }}>⇆</button>
        <button onClick={onCustomize} title="Customize layout" aria-label="Customize layout" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.85rem', lineHeight: 1,
        }}>⊹</button>
        <ThemeModePicker
          userId={userId}
          currentTheme={theme}
          currentMode={mode}
          onThemeChange={handleThemeChange}
          onModeChange={handleModeChange}
        />
        <a href="/account" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-body)',
          fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'none', lineHeight: 1.5,
        }}>account</a>
        <button onClick={signOut} aria-label="Sign out" style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.85rem', color: 'var(--muted)', fontFamily: 'var(--font-body)',
          fontSize: '0.8rem', cursor: 'pointer',
        }}>sign out</button>
      </div>
    </header>
  )
}

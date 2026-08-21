'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { THEMES, THEME_LABELS, resolveThemeVars, buildCustomVars, FONT_PRESETS, DEFAULT_CUSTOM_SEED, type CustomThemeSeed } from './ThemeProvider'
import { MODES, type Mode } from '@/lib/constants/modes'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

const MODE_ICONS: Partial<Record<Mode, string>> = {
  peaceful: '🌿', friend: '🤝', therapist: '🫧', executive: '▲', challenger: '⚡',
}

// Read straight from the real theme tokens instead of maintaining a second
// hand-copied palette — the swatch always matches what the theme actually
// looks like, and new themes need zero extra wiring here.
function themeSwatch(id: string) {
  const v = THEMES[id]
  return { bg: v['--bg'], surface: v['--surface2'], text: v['--text'], accent: v['--gold'], accent2: v['--accent-2'] }
}

function customSwatch(seed: CustomThemeSeed) {
  const v = buildCustomVars(seed)
  return { bg: v['--bg'], surface: v['--surface2'], text: v['--text'], accent: v['--gold'], accent2: v['--accent-2'] }
}

interface ThemeModePickerProps {
  userId: string
  currentTheme: string
  currentMode: Mode
  customTheme: CustomThemeSeed | null
  onThemeChange: (t: string) => void
  onModeChange: (m: Mode) => void
  onCustomThemeChange: (seed: CustomThemeSeed) => void
}

export default function ThemeModePicker({ userId, currentTheme, currentMode, customTheme, onThemeChange, onModeChange, onCustomThemeChange }: ThemeModePickerProps) {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'theme' | 'mode'>('theme')
  const [editingCustom, setEditingCustom] = useState(false)
  const [draft, setDraft] = useState<CustomThemeSeed>(customTheme ?? DEFAULT_CUSTOM_SEED)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    function onOpenRequest(e: Event) {
      const tabRequested = (e as CustomEvent<{ tab: 'theme' | 'mode' }>).detail?.tab
      if (tabRequested) setTab(tabRequested)
      setOpen(true)
    }
    window.addEventListener('app:open-theme-picker', onOpenRequest)
    return () => window.removeEventListener('app:open-theme-picker', onOpenRequest)
  }, [])

  async function setTheme(t: string) {
    onThemeChange(t)
    const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, theme: t })
    if (error) console.error('Failed to save theme:', error.message)
  }

  // Saves and activates in one step — there's no "preview without applying"
  // state, same as picking any preset tile above.
  async function saveCustomTheme(seed: CustomThemeSeed) {
    onCustomThemeChange(seed)
    onThemeChange('custom')
    setEditingCustom(false)
    const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, theme: 'custom', custom_theme: seed })
    if (error) console.error('Failed to save custom theme:', error.message)
  }

  async function setMode(m: Mode) {
    onModeChange(m)
    const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, mode: m })
    if (error) console.error('Failed to save mode:', error.message)
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '0.35em 0.9em', borderRadius: '6px', cursor: 'pointer', border: 'none',
    fontFamily: 'var(--font-body)',
    background: active ? 'var(--hover-bg)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Appearance"
        aria-label="Appearance settings"
        style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.4rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
          fontSize: '0.85rem', lineHeight: 1,
        }}
      >◐</button>

      {open && (
        <div className="header-menu" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 100,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '1rem', width: '300px', maxHeight: '80vh', overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.9rem' }}>
            <button style={tabStyle(tab === 'theme')} onClick={() => setTab('theme')}>{t('Theme', lang)}</button>
            <button style={tabStyle(tab === 'mode')} onClick={() => setTab('mode')}>{t('Guide', lang)}</button>
          </div>

          {tab === 'theme' && !editingCustom && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {Object.keys(THEMES).map(id => {
                const p = themeSwatch(id)
                const active = currentTheme === id
                return (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    title={THEME_LABELS[id]}
                    style={{
                      borderRadius: '10px', cursor: 'pointer', padding: '0.4rem',
                      border: active ? `2px solid ${p.accent}` : '2px solid var(--border)',
                      background: p.bg, position: 'relative', overflow: 'hidden',
                      transition: 'all 0.15s', boxShadow: active ? `0 0 12px ${p.accent}40` : 'none',
                      display: 'flex', flexDirection: 'column', gap: '0.3rem',
                    }}
                  >
                    {/* Mini surface card */}
                    <div style={{
                      background: p.surface, borderRadius: '6px', padding: '0.3rem 0.4rem',
                      display: 'flex', flexDirection: 'column', gap: '0.25rem',
                    }}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.accent, boxShadow: `0 0 4px ${p.accent}` }} />
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.accent2 }} />
                      </div>
                      <div style={{ width: '70%', height: 3, borderRadius: '2px', background: p.text, opacity: 0.85 }} />
                      <div style={{ width: '45%', height: 3, borderRadius: '2px', background: p.text, opacity: 0.4 }} />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.55rem', color: p.text, letterSpacing: '0.03em', opacity: active ? 1 : 0.75 }}>
                      {THEME_LABELS[id]}
                    </div>
                  </button>
                )
              })}

              {/* Custom (2026-08-21) — a 7th tile, always last. Clicking it
                  activates whatever custom palette was last saved (or opens
                  the editor straight away if none exists yet); the pencil is
                  the only way IN to the editor, so "activate" and "edit"
                  stay two separate actions on the same tile. */}
              {(() => {
                const p = customSwatch(customTheme ?? DEFAULT_CUSTOM_SEED)
                const active = currentTheme === 'custom'
                return (
                  <button
                    onClick={() => (customTheme ? setTheme('custom') : setEditingCustom(true))}
                    title="Custom"
                    style={{
                      borderRadius: '10px', cursor: 'pointer', padding: '0.4rem',
                      border: active ? `2px solid ${p.accent}` : '2px dashed var(--border)',
                      background: p.bg, position: 'relative', overflow: 'hidden',
                      transition: 'all 0.15s', boxShadow: active ? `0 0 12px ${p.accent}40` : 'none',
                      display: 'flex', flexDirection: 'column', gap: '0.3rem',
                    }}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); setDraft(customTheme ?? DEFAULT_CUSTOM_SEED); setEditingCustom(true) }}
                      title="Edit custom theme"
                      aria-label="Edit custom theme"
                      style={{
                        position: 'absolute', top: 2, right: 2, background: 'none', border: 'none',
                        cursor: 'pointer', color: p.text, opacity: 0.6, fontSize: '0.6rem', padding: '0.15rem',
                      }}
                    >✎</button>
                    <div style={{
                      background: p.surface, borderRadius: '6px', padding: '0.3rem 0.4rem',
                      display: 'flex', flexDirection: 'column', gap: '0.25rem',
                    }}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.accent, boxShadow: `0 0 4px ${p.accent}` }} />
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.accent2 }} />
                      </div>
                      <div style={{ width: '70%', height: 3, borderRadius: '2px', background: p.text, opacity: 0.85 }} />
                      <div style={{ width: '45%', height: 3, borderRadius: '2px', background: p.text, opacity: 0.4 }} />
                    </div>
                    <div style={{ textAlign: 'center', fontSize: '0.55rem', color: p.text, letterSpacing: '0.03em', opacity: active ? 1 : 0.75 }}>
                      {customTheme ? 'Custom' : '+ Custom'}
                    </div>
                  </button>
                )
              })()}
            </div>
          )}

          {tab === 'theme' && editingCustom && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {([
                ['bg', 'Background'], ['text', 'Text'], ['accent', 'Accent'],
                ['rose', 'Rose'], ['emerald', 'Emerald'], ['amber', 'Amber'],
              ] as const).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{label}</span>
                  <input
                    type="color"
                    value={draft[key]}
                    onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                    style={{ width: 32, height: 24, padding: 0, border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer', background: 'none' }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Scheme</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {(['light', 'dark'] as const).map(s => (
                    <button key={s} onClick={() => setDraft(d => ({ ...d, scheme: s }))} style={tabStyle(draft.scheme === s)}>{s}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Font</span>
                <select
                  value={draft.fontPreset}
                  onChange={e => setDraft(d => ({ ...d, fontPreset: e.target.value }))}
                  style={{
                    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '6px',
                    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem',
                    padding: '0.3rem 0.5rem', cursor: 'pointer',
                  }}
                >
                  {Object.entries(FONT_PRESETS).map(([id, f]) => <option key={id} value={id}>{f.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                <button onClick={() => setEditingCustom(false)} className="press" style={{
                  flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
                  color: 'var(--muted)', fontSize: '0.72rem', padding: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Cancel</button>
                <button onClick={() => saveCustomTheme(draft)} className="btn btn-primary press" style={{ flex: 1, fontSize: '0.72rem' }}>
                  Apply
                </button>
              </div>
            </div>
          )}

          {tab === 'mode' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([key, cfg]) => {
                const active = currentMode === key
                return (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    style={{
                      textAlign: 'left', padding: '0.55rem 0.7rem', borderRadius: '8px',
                      cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)',
                      background: active ? 'var(--hover-bg)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: active ? 'var(--text)' : 'var(--muted)', fontWeight: active ? 500 : 300 }}>
                      {MODE_ICONS[key] ? `${MODE_ICONS[key]} ` : ''}{cfg.label}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7, marginTop: '0.1rem', lineHeight: 1.4 }}>{cfg.description}</div>
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: '0.8rem', fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.4, letterSpacing: '0.04em' }}>
            {t('theme + guide stack — mix freely', lang)}
          </div>
        </div>
      )}
    </div>
  )
}

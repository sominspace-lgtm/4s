'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  THEMES, buildCustomVars, FONT_PRESETS, DEFAULT_CUSTOM_SEED, NEUTRAL_LIGHT, NEUTRAL_DARK, DEFAULT_ACCENT,
  type CustomThemeSeed,
} from './ThemeProvider'
import { MODES, type Mode } from '@/lib/constants/modes'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

// Only three Guides now (2026-08-21), down from five — Therapist and
// Challenger felt like the same underlying voice wearing different framing
// as Friend and Executive respectively, and five options for "who's talking
// to me today" was more choosing than deciding.
const MODE_ICONS: Partial<Record<Mode, string>> = {
  peaceful: '🌿', friend: '🤝', executive: '▲',
}

function swatch(seed: CustomThemeSeed) {
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

// "Instead of themes, a light and dark mode where we can choose the accent
// color — and then make some fully customizable themes too" (2026-08-21).
// Six named presets (Bloom, Moonlight, …) are gone as a picker choice —
// nobody picks a theme by name here anymore, they pick Light or Dark and one
// accent color, which covers the actual daily decision in two taps instead
// of comparing six near-identical swatches. "Fully custom" one level down
// still exposes all six seed colors + font for anyone who wants more than
// an accent to play with. Both paths write the exact same CustomThemeSeed
// shape (theme='custom' + user_prefs.custom_theme) — simple mode just locks
// bg/text/rose/emerald/amber/font to a neutral default per scheme and only
// leaves accent open.
//
// Existing accounts still holding an old preset key (theme='bloom', etc.)
// keep rendering correctly — resolveThemeVars/normalizeTheme in
// lib/constants/themes.ts were never touched, so nothing forces a
// migration. Only this picker stopped OFFERING presets as a fresh choice.
export default function ThemeModePicker({ userId, currentTheme, currentMode, customTheme, onThemeChange, onModeChange, onCustomThemeChange }: ThemeModePickerProps) {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'theme' | 'mode'>('theme')
  const [advanced, setAdvanced] = useState(false)
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

  // Saves and activates in one step — no "preview without applying" state.
  async function saveTheme(seed: CustomThemeSeed) {
    onCustomThemeChange(seed)
    onThemeChange('custom')
    const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, theme: 'custom', custom_theme: seed })
    if (error) console.error('Failed to save theme:', error.message)
  }

  async function setMode(m: Mode) {
    onModeChange(m)
    const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, mode: m })
    if (error) console.error('Failed to save mode:', error.message)
  }

  // If there's no saved custom seed yet, derive a starting point from
  // whatever preset the account is actually still on (an old bloom/
  // moonlight/etc. value) rather than jumping to an unrelated default —
  // same scheme, same accent, so the first change from here feels
  // continuous instead of a random reset.
  const legacyPreset = currentTheme !== 'custom' ? THEMES[currentTheme] : undefined
  const active: CustomThemeSeed = customTheme ?? (legacyPreset
    ? { ...(legacyPreset['--scheme'] === 'light' ? NEUTRAL_LIGHT : NEUTRAL_DARK), accent: legacyPreset['--gold'] }
    : DEFAULT_CUSTOM_SEED)
  const p = swatch(active)

  function pickScheme(scheme: 'light' | 'dark') {
    const base = scheme === 'light' ? NEUTRAL_LIGHT : NEUTRAL_DARK
    saveTheme({ ...base, accent: active.accent })
  }

  function pickAccent(accent: string) {
    saveTheme({ ...active, accent })
  }

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '0.35em 0.9em', borderRadius: '6px', cursor: 'pointer', border: 'none',
    fontFamily: 'var(--font-body)',
    background: isActive ? 'var(--hover-bg)' : 'transparent',
    color: isActive ? 'var(--text)' : 'var(--muted)',
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

          {tab === 'theme' && !advanced && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* Live preview */}
              <div style={{
                borderRadius: '10px', padding: '0.6rem', background: p.bg, border: '1px solid var(--border)',
              }}>
                <div style={{ background: p.surface, borderRadius: '6px', padding: '0.4rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.accent, boxShadow: `0 0 4px ${p.accent}` }} />
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.accent2 }} />
                  </div>
                  <div style={{ width: '70%', height: 3, borderRadius: '2px', background: p.text, opacity: 0.85 }} />
                  <div style={{ width: '45%', height: 3, borderRadius: '2px', background: p.text, opacity: 0.4 }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t('Mode', lang)}</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {(['light', 'dark'] as const).map(s => (
                    <button key={s} onClick={() => pickScheme(s)} style={tabStyle(active.scheme === s)}>{t(s, lang)}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t('Accent color', lang)}</span>
                <input
                  type="color"
                  value={active.accent ?? DEFAULT_ACCENT}
                  onChange={e => pickAccent(e.target.value)}
                  style={{ width: 32, height: 24, padding: 0, border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer', background: 'none' }}
                />
              </div>

              <button
                onClick={() => { setDraft(active); setAdvanced(true) }}
                className="press"
                style={{
                  background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.66rem',
                  cursor: 'pointer', textAlign: 'left', padding: 0, opacity: 0.75,
                }}
              >
                ▸ {t('Fully custom theme', lang)}
              </button>
            </div>
          )}

          {tab === 'theme' && advanced && (
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
                <button onClick={() => setAdvanced(false)} className="press" style={{
                  flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
                  color: 'var(--muted)', fontSize: '0.72rem', padding: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Back</button>
                <button onClick={() => { saveTheme(draft); setAdvanced(false) }} className="btn btn-primary press" style={{ flex: 1, fontSize: '0.72rem' }}>
                  Apply
                </button>
              </div>
            </div>
          )}

          {tab === 'mode' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([key, cfg]) => {
                const isActive = currentMode === key
                return (
                  <button
                    key={key}
                    onClick={() => setMode(key)}
                    style={{
                      textAlign: 'left', padding: '0.55rem 0.7rem', borderRadius: '8px',
                      cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)',
                      background: isActive ? 'var(--hover-bg)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: isActive ? 'var(--text)' : 'var(--muted)', fontWeight: isActive ? 500 : 300 }}>
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

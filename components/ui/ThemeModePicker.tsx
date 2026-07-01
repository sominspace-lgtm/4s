'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { THEMES, THEME_LABELS } from './ThemeProvider'
import { MODES, type Mode } from '@/lib/constants/modes'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

const MODE_ICONS: Partial<Record<Mode, string>> = { gamer: '🎮', hype: '🔥', monk: '☯', peaceful: '🌿' }

const THEME_PREVIEW: Record<string, { bg: string; accent: string }> = {
  sunset:    { bg: '#1a0f18', accent: '#d45090' },
  midnight:  { bg: '#080c14', accent: '#90b8f0' },
  sage:      { bg: '#09100d', accent: '#90d8a8' },
  terracotta:{ bg: '#110c08', accent: '#e8a878' },
  ocean:     { bg: '#050d14', accent: '#60d0e8' },
  rose:      { bg: '#120810', accent: '#f090c0' },
  ash:       { bg: '#f5f0e8', accent: '#a05c20' },
  amber:     { bg: '#100e06', accent: '#e8c040' },
  forest:    { bg: '#060e08', accent: '#60c878' },
  lavender:  { bg: '#0c0812', accent: '#c0a0f0' },
  noir:      { bg: '#050505', accent: '#e0e0e0' },
  sand:      { bg: '#14120e', accent: '#d4b880' },
  ember:     { bg: '#100600', accent: '#f06030' },
  arctic:    { bg: '#040c10', accent: '#40e8b0' },
  plum:      { bg: '#0e0610', accent: '#d060e8' },
}

interface ThemeModePickerProps {
  userId: string
  currentTheme: string
  currentMode: Mode
  onThemeChange: (t: string) => void
  onModeChange: (m: Mode) => void
}

export default function ThemeModePicker({ userId, currentTheme, currentMode, onThemeChange, onModeChange }: ThemeModePickerProps) {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'theme' | 'mode'>('theme')
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function setTheme(t: string) {
    onThemeChange(t)
    await supabase.from('user_prefs').upsert({ user_id: userId, theme: t })
  }

  async function setMode(m: Mode) {
    onModeChange(m)
    await supabase.from('user_prefs').upsert({ user_id: userId, mode: m })
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase',
    padding: '0.35em 0.9em', borderRadius: '6px', cursor: 'pointer', border: 'none',
    fontFamily: 'var(--font-body)',
    background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
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
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 100,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '1rem', width: '260px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.9rem' }}>
            <button style={tabStyle(tab === 'theme')} onClick={() => setTab('theme')}>{t('Theme', lang)}</button>
            <button style={tabStyle(tab === 'mode')} onClick={() => setTab('mode')}>{t('Mode', lang)}</button>
          </div>

          {tab === 'theme' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.45rem' }}>
              {Object.keys(THEMES).map(t => {
                const p = THEME_PREVIEW[t]
                const active = currentTheme === t
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    title={THEME_LABELS[t]}
                    style={{
                      borderRadius: '10px', cursor: 'pointer', padding: '0',
                      border: active ? `2px solid ${p.accent}` : '2px solid rgba(255,255,255,0.04)',
                      background: p.bg, height: '48px', position: 'relative', overflow: 'hidden',
                      transition: 'all 0.15s', boxShadow: active ? `0 0 12px ${p.accent}40` : 'none',
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `radial-gradient(ellipse at top right, ${p.accent}35, transparent 70%)`,
                    }} />
                    <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: '0.42rem', color: p.accent, letterSpacing: '0.05em', textTransform: 'uppercase', opacity: active ? 1 : 0.7 }}>
                      {THEME_LABELS[t]}
                    </div>
                    <div style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: p.accent, boxShadow: `0 0 4px ${p.accent}` }} />
                  </button>
                )
              })}
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
                      background: active ? 'rgba(255,255,255,0.07)' : 'transparent',
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
            {t('theme + mode stack — mix freely', lang)}
          </div>
        </div>
      )}
    </div>
  )
}

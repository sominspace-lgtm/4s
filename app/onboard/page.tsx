'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STEPS = ['Welcome', 'Your style', 'First habit', 'First thought']

const DOMAIN_OPTIONS = [
  { id: 'biz-active', label: 'Active Business', icon: '◈' },
  { id: 'biz-future', label: 'Pipeline / Future', icon: '◇' },
  { id: 'money', label: 'Money', icon: '◉' },
  { id: 'health', label: 'Health', icon: '○' },
  { id: 'relationship', label: 'Relationship', icon: '♡' },
  { id: 'creative', label: 'Creative', icon: '✦' },
  { id: 'home', label: 'Home & Admin', icon: '⌂' },
  { id: 'self', label: 'Self', icon: '◎' },
]

const THEMES = [
  { id: 'sunset',     label: 'Sunset',     bg: '#0d0810', accent: '#d45090', note: 'romantic · editorial' },
  { id: 'midnight',   label: 'Midnight',   bg: '#080c14', accent: '#90b8f0', note: 'focused · technical' },
  { id: 'rose',       label: 'Rose',       bg: '#120810', accent: '#f090c0', note: 'soft · feminine' },
  { id: 'lavender',   label: 'Lavender',   bg: '#0c0812', accent: '#c0a0f0', note: 'dreamy · calm' },
  { id: 'sage',       label: 'Sage',       bg: '#09100d', accent: '#90d8a8', note: 'natural · grounded' },
  { id: 'ocean',      label: 'Ocean',      bg: '#050d14', accent: '#60d0e8', note: 'clean · flowing' },
  { id: 'amber',      label: 'Amber',      bg: '#100e06', accent: '#e8c040', note: 'warm · energetic' },
  { id: 'terracotta', label: 'Terracotta', bg: '#110c08', accent: '#e8a878', note: 'earthy · editorial' },
  { id: 'plum',       label: 'Plum',       bg: '#0e0610', accent: '#d060e8', note: 'rich · romantic' },
  { id: 'forest',     label: 'Forest',     bg: '#060e08', accent: '#60c878', note: 'deep · rooted' },
  { id: 'noir',       label: 'Noir',       bg: '#050505', accent: '#e0e0e0', note: 'stark · minimal' },
  { id: 'sand',       label: 'Sand',       bg: '#14120e', accent: '#d4b880', note: 'warm · classic' },
  { id: 'ember',      label: 'Ember',      bg: '#100600', accent: '#f06030', note: 'bold · fierce' },
  { id: 'arctic',     label: 'Arctic',     bg: '#080e14', accent: '#a0d8f0', note: 'crisp · clear' },
  { id: 'ash',        label: 'Ash',        bg: '#0c0c0e', accent: '#c0c0d0', note: 'muted · refined' },
]

const MODES = [
  { id: 'balanced', label: 'Balanced',  note: 'Calm, clear, present' },
  { id: 'coach',    label: 'Coach',     note: 'Push further, stay on track' },
  { id: 'friend',   label: 'Friend',    note: 'Warm, informal, supportive' },
  { id: 'harsh',    label: 'Harsh',     note: 'No excuses, full accountability' },
  { id: 'peaceful', label: 'Peaceful',  note: 'Gentle, restorative, kind' },
  { id: 'monk',     label: 'Monk',      note: 'Stillness, clarity, presence' },
  { id: 'hype',     label: 'Hype',      note: 'Energy, fire, momentum' },
  { id: 'teacher',  label: 'Teacher',   note: 'Reflective, growth-oriented' },
  { id: 'ceo',      label: 'CEO',       note: 'Decisive, direct, no fluff' },
  { id: 'gamer',    label: '🎮 Gamer',  note: 'Earn XP · level up your life' },
]

export default function OnboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [focusDomains, setFocusDomains] = useState<string[]>([])
  const [selectedTheme, setSelectedTheme] = useState('sunset')
  const [selectedMode, setSelectedMode] = useState('balanced')
  const [habitName, setHabitName] = useState('')
  const [habitCategory, setHabitCategory] = useState('health')
  const [captureText, setCaptureText] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleDomain(id: string) {
    setFocusDomains(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  async function finish() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (habitName.trim()) {
      await supabase.from('habits').insert({ user_id: user.id, name: habitName.trim(), category: habitCategory })
    }
    if (captureText.trim()) {
      await supabase.from('captures').insert({ user_id: user.id, text: captureText.trim() })
    }
    await supabase.from('user_prefs').upsert({
      user_id: user.id,
      onboarded: true,
      theme: selectedTheme,
      mode: selectedMode,
    })

    router.push('/dashboard')
  }

  const accent = THEMES.find(t => t.id === selectedTheme)?.accent ?? '#d45090'
  const bg = THEMES.find(t => t.id === selectedTheme)?.bg ?? '#0d0810'

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.12)', borderRadius: '10px', color: '#f0eae8',
    fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', fontWeight: 300,
    padding: '0.7rem 1rem', outline: 'none',
  }

  const nextBtn = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: disabled ? 'default' : 'pointer',
      border: `1px solid ${accent}66`, background: `${accent}1a`,
      color: '#f0eae8', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem',
      letterSpacing: '0.05em', opacity: disabled ? 0.5 : 1, transition: 'all 0.2s',
    }}>{label}</button>
  )

  const backBtn = (onClick: () => void) => (
    <button onClick={onClick} style={{
      padding: '0.7rem 1.2rem', borderRadius: '10px', cursor: 'pointer',
      border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
      color: 'rgba(240,234,232,0.4)', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem',
    }}>← Back</button>
  )

  return (
    <div style={{
      minHeight: '100vh', background: bg,
      backgroundImage: `radial-gradient(ellipse at top right, ${accent}1a 0%, transparent 55%), radial-gradient(ellipse at bottom left, ${accent}10 0%, transparent 55%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', fontFamily: 'Inter, sans-serif',
      transition: 'background 0.4s',
    }}>
      <div style={{ maxWidth: '560px', width: '100%' }}>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: '2px', flex: 1, borderRadius: '2px',
              background: i <= step ? `${accent}cc` : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Step 0 — Welcome + domains */}
        {step === 0 && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2.2rem', fontWeight: 300, color: '#f0eae8', marginBottom: '0.5rem', lineHeight: 1.2 }}>
              Welcome to <em style={{ fontStyle: 'italic', color: accent }}>4S</em>.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(240,234,232,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
              Your personal operating system. Eight domains, one place. Let&apos;s set you up in a few minutes.
            </div>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,234,232,0.35)', marginBottom: '0.8rem' }}>
              Which domains matter most right now?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '2rem' }}>
              {DOMAIN_OPTIONS.map(d => {
                const active = focusDomains.includes(d.id)
                return (
                  <button key={d.id} onClick={() => toggleDomain(d.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.7rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
                    border: active ? `1px solid ${accent}80` : '1px solid rgba(255,255,255,0.08)',
                    background: active ? `${accent}1a` : 'rgba(255,255,255,0.03)',
                    color: active ? '#f0eae8' : 'rgba(240,234,232,0.45)',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}>
                    <span style={{ fontSize: '1rem' }}>{d.icon}</span>
                    <span>{d.label}</span>
                  </button>
                )
              })}
            </div>
            {nextBtn('Continue →', () => setStep(1))}
          </div>
        )}

        {/* Step 1 — Theme + Mode */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2rem', fontWeight: 300, color: '#f0eae8', marginBottom: '0.5rem' }}>
              Make it <em style={{ fontStyle: 'italic', color: accent }}>yours</em>.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(240,234,232,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
              Pick an aesthetic and a personality for your OS. You can change these anytime.
            </div>

            {/* Theme grid */}
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,234,232,0.35)', marginBottom: '0.75rem' }}>Aesthetic</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {THEMES.map(t => {
                const active = selectedTheme === t.id
                return (
                  <button key={t.id} onClick={() => setSelectedTheme(t.id)} title={`${t.label} — ${t.note}`} style={{
                    borderRadius: '10px', cursor: 'pointer', padding: '0',
                    border: active ? `2px solid ${t.accent}` : '2px solid rgba(255,255,255,0.06)',
                    background: t.bg, height: '52px', position: 'relative', overflow: 'hidden',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `radial-gradient(ellipse at top right, ${t.accent}30, transparent 70%)`,
                    }} />
                    <div style={{ position: 'absolute', bottom: 5, left: 0, right: 0, textAlign: 'center', fontSize: '0.45rem', color: t.accent, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: active ? 1 : 0.6 }}>
                      {t.label}
                    </div>
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: t.accent }} />
                  </button>
                )
              })}
            </div>

            {/* Mode list */}
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,234,232,0.35)', marginBottom: '0.75rem' }}>Personality</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '2rem' }}>
              {MODES.map(m => {
                const active = selectedMode === m.id
                return (
                  <button key={m.id} onClick={() => setSelectedMode(m.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.6rem 0.85rem', borderRadius: '10px', cursor: 'pointer',
                    border: active ? `1px solid ${accent}66` : '1px solid rgba(255,255,255,0.06)',
                    background: active ? `${accent}15` : 'rgba(255,255,255,0.02)',
                    textAlign: 'left', fontFamily: 'Inter, sans-serif', transition: 'all 0.15s',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.78rem', color: active ? '#f0eae8' : 'rgba(240,234,232,0.6)', fontWeight: active ? 500 : 300 }}>{m.label}</div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(240,234,232,0.35)', marginTop: '0.1rem' }}>{m.note}</div>
                    </div>
                    {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {backBtn(() => setStep(0))}
              {nextBtn('Continue →', () => setStep(2))}
            </div>
          </div>
        )}

        {/* Step 2 — First habit */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2rem', fontWeight: 300, color: '#f0eae8', marginBottom: '0.5rem' }}>
              Build a <em style={{ fontStyle: 'italic', color: accent }}>habit</em>.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(240,234,232,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
              One habit to start. You can add more any time. What do you want to track every day?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              <input
                value={habitName} onChange={e => setHabitName(e.target.value)}
                placeholder="e.g. Go to the gym, Journal, Read 20 mins"
                autoFocus style={inputStyle}
              />
              <select value={habitCategory} onChange={e => setHabitCategory(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                {DOMAIN_OPTIONS.map(d => (
                  <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {backBtn(() => setStep(1))}
              {nextBtn(habitName.trim() ? 'Continue →' : 'Skip →', () => setStep(3))}
            </div>
          </div>
        )}

        {/* Step 3 — First capture */}
        {step === 3 && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2rem', fontWeight: 300, color: '#f0eae8', marginBottom: '0.5rem' }}>
              Clear your <em style={{ fontStyle: 'italic', color: accent }}>head</em>.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(240,234,232,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
              What&apos;s one thing on your mind right now? A task, idea, or worry — capture it and let it go.
            </div>
            <textarea
              value={captureText} onChange={e => setCaptureText(e.target.value)}
              placeholder="What's on your mind?" rows={3} autoFocus
              style={{ ...inputStyle, resize: 'none', marginBottom: '2rem' }}
            />
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              {backBtn(() => setStep(2))}
              <button onClick={finish} disabled={saving} style={{
                flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: saving ? 'default' : 'pointer',
                border: `1px solid ${accent}66`, background: `${accent}1a`,
                color: '#f0eae8', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem',
                letterSpacing: '0.05em', opacity: saving ? 0.6 : 1,
              }}>
                {saving ? 'Setting up…' : 'Enter your OS →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

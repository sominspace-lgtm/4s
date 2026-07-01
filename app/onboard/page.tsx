'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STEPS = ['Welcome', 'Your first habit', 'Your first capture']

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

export default function OnboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)
  const [focusDomains, setFocusDomains] = useState<string[]>([])
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
    await supabase.from('user_prefs').upsert({ user_id: user.id, onboarded: true })

    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.12)', borderRadius: '10px', color: '#f0eae8',
    fontFamily: 'var(--font-body, Inter, sans-serif)', fontSize: '0.9rem', fontWeight: 300,
    padding: '0.7rem 1rem', outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#120a10',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>

        {/* Progress */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '2.5rem' }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: '2px', flex: 1, borderRadius: '2px',
              background: i <= step ? 'rgba(212,80,144,0.8)' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Step 0 — Welcome + domains */}
        {step === 0 && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2.2rem', fontWeight: 300, color: '#f0eae8', marginBottom: '0.5rem', lineHeight: 1.2 }}>
              Welcome to <em style={{ fontStyle: 'italic', color: '#d45090' }}>4S</em>.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(240,234,232,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
              Your personal operating system. Eight domains, one place. Let&apos;s set you up in two minutes.
            </div>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(240,234,232,0.35)', marginBottom: '0.8rem' }}>
              Which domains matter most to you right now?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '2rem' }}>
              {DOMAIN_OPTIONS.map(d => {
                const active = focusDomains.includes(d.id)
                return (
                  <button key={d.id} onClick={() => toggleDomain(d.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.7rem 0.9rem', borderRadius: '10px', cursor: 'pointer',
                    border: active ? '1px solid rgba(212,80,144,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    background: active ? 'rgba(212,80,144,0.1)' : 'rgba(255,255,255,0.03)',
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
            <button onClick={() => setStep(1)} style={{
              width: '100%', padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
              border: '1px solid rgba(212,80,144,0.4)', background: 'rgba(212,80,144,0.12)',
              color: '#f0eae8', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', letterSpacing: '0.05em',
            }}>
              Continue →
            </button>
          </div>
        )}

        {/* Step 1 — First habit */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2rem', fontWeight: 300, color: '#f0eae8', marginBottom: '0.5rem' }}>
              Build a habit.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(240,234,232,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
              One habit to start. You can add more any time. What do you want to track every day?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
              <input
                value={habitName}
                onChange={e => setHabitName(e.target.value)}
                placeholder="e.g. Go to the gym, Journal, Read 20 mins"
                autoFocus
                style={inputStyle}
              />
              <select
                value={habitCategory}
                onChange={e => setHabitCategory(e.target.value)}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                {DOMAIN_OPTIONS.map(d => (
                  <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={() => setStep(0)} style={{
                padding: '0.7rem 1.2rem', borderRadius: '10px', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                color: 'rgba(240,234,232,0.4)', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem',
              }}>← Back</button>
              <button onClick={() => setStep(2)} style={{
                flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
                border: '1px solid rgba(212,80,144,0.4)', background: 'rgba(212,80,144,0.12)',
                color: '#f0eae8', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', letterSpacing: '0.05em',
              }}>
                {habitName.trim() ? 'Continue →' : 'Skip for now →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — First capture */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2rem', fontWeight: 300, color: '#f0eae8', marginBottom: '0.5rem' }}>
              Clear your head.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(240,234,232,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
              What&apos;s one thing on your mind right now? A task, an idea, a worry — capture it and let it go.
            </div>
            <textarea
              value={captureText}
              onChange={e => setCaptureText(e.target.value)}
              placeholder="What's on your mind?"
              rows={3}
              autoFocus
              style={{ ...inputStyle, resize: 'none', marginBottom: '2rem' }}
            />
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button onClick={() => setStep(1)} style={{
                padding: '0.7rem 1.2rem', borderRadius: '10px', cursor: 'pointer',
                border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
                color: 'rgba(240,234,232,0.4)', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem',
              }}>← Back</button>
              <button onClick={finish} disabled={saving} style={{
                flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: saving ? 'default' : 'pointer',
                border: '1px solid rgba(212,80,144,0.4)', background: 'rgba(212,80,144,0.12)',
                color: '#f0eae8', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', letterSpacing: '0.05em',
                opacity: saving ? 0.6 : 1,
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

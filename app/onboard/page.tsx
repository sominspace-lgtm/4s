'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeProvider, { THEMES as THEME_TOKENS, THEME_LABELS } from '@/components/ui/ThemeProvider'
import { MODES as MODE_CONFIG } from '@/lib/constants/modes'

const STEPS = ['Your name', 'Domains', 'Your style', 'First habit', 'First thought']

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

const TEMPLATES = [
  { id: 'personal', label: 'Personal', icon: '◎', domains: ['self', 'health', 'home'],          habit: { name: 'Journal',                category: 'self' } },
  { id: 'family',   label: 'Family',   icon: '⌂', domains: ['relationship', 'home', 'money'],    habit: { name: 'Family check-in',        category: 'relationship' } },
  { id: 'couple',   label: 'Couple',   icon: '♡', domains: ['relationship', 'self', 'home'],     habit: { name: 'Plan a date',             category: 'relationship' } },
  { id: 'student',  label: 'Student',  icon: '✦', domains: ['self', 'biz-future', 'money'],      habit: { name: 'Study session',          category: 'self' } },
  { id: 'creator',  label: 'Creator',  icon: '◈', domains: ['creative', 'biz-active', 'money'],  habit: { name: 'Create something',       category: 'creative' } },
  { id: 'household', label: 'Household', icon: '⌂', domains: ['home', 'money', 'relationship'],  habit: { name: 'Household check-in',     category: 'home' } },
  { id: 'trip',      label: 'Trip',      icon: '◎', domains: ['home', 'money', 'self'],          habit: { name: 'Pack / plan for trip',   category: 'home' } },
]

// Notes are the only thing hand-written here — bg/accent come straight from
// the real theme tokens so this can never drift out of sync with them again.
const THEME_NOTES: Record<string, string> = {
  sunset: 'deep indigo · premium', rose: 'soft plum · elegant', forest: 'evergreen · calm',
  ocean: 'slate blue · clean', ember: 'charcoal · warm', ash: 'warm paper · light',
  sand: 'coffee · cozy', plum: 'dark violet · creative', noir: 'near-mono · stark',
  lavender: 'purple-gray · relaxed', aurora: 'northern lights · multi-accent',
  sakura: 'soft pink · gentle', solar: 'sunlit cream · bright',
}
const THEMES = Object.keys(THEME_TOKENS).map(id => ({
  id, label: THEME_LABELS[id], bg: THEME_TOKENS[id]['--bg'], accent: THEME_TOKENS[id]['--gold'],
  note: THEME_NOTES[id] ?? '',
}))

// Reads the same personality-mode config the dashboard uses (lib/constants/modes.ts)
// instead of a second hand-copied list, so onboarding can never list a mode
// that doesn't actually exist.
const MODE_LIST = (Object.entries(MODE_CONFIG) as [string, typeof MODE_CONFIG[keyof typeof MODE_CONFIG]][])
  .map(([id, cfg]) => ({ id, label: cfg.label, note: cfg.description }))

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', borderWidth: '1px', borderStyle: 'solid',
  borderColor: 'var(--border)', borderRadius: 'var(--radius-sm, 10px)', color: 'var(--text)',
  fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 300,
  padding: '0.7rem 1rem', outline: 'none',
}

function NextBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
      {label}
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="btn btn-ghost" style={{ padding: '0.7rem 1.2rem', fontSize: '0.78rem', border: '1px solid var(--border)' }}>
      ← Back
    </button>
  )
}

function RecapChip({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: '0.68rem', color: 'var(--text)', padding: '0.25rem 0.6rem',
      borderRadius: '99px', border: '1px solid color-mix(in srgb, var(--gold) 30%, var(--border))',
      background: 'color-mix(in srgb, var(--gold) 8%, transparent)',
    }}>{label}</span>
  )
}

export default function OnboardPage() {
  const router = useRouter()
  const supabase = createClient()

  // Smart default: start pre-loaded with the most common template (Personal)
  // instead of a blank grid — most people keep the default, and it turns
  // step 1 into a quick confirm-or-adjust instead of a cold decision.
  const defaultTemplate = TEMPLATES.find(t => t.id === 'personal')!

  const [step, setStep] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [focusDomains, setFocusDomains] = useState<string[]>(defaultTemplate.domains)
  const [selectedTheme, setSelectedTheme] = useState('sunset')
  const [selectedMode, setSelectedMode] = useState('peaceful')
  const [habitName, setHabitName] = useState(defaultTemplate.habit.name)
  const [habitCategory, setHabitCategory] = useState(defaultTemplate.habit.category)
  const [captureText, setCaptureText] = useState('')
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState<string | null>(defaultTemplate.id)

  function toggleDomain(id: string) {
    setFocusDomains(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  function applyTemplate(tpl: typeof TEMPLATES[number]) {
    setTemplate(tpl.id)
    setFocusDomains(tpl.domains)
    setHabitName(tpl.habit.name)
    setHabitCategory(tpl.habit.category)
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
      ...(displayName.trim() ? { display_name: displayName.trim() } : {}),
    })

    router.push('/dashboard')
  }

  return (
    <ThemeProvider theme={selectedTheme}>
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        backgroundImage: 'radial-gradient(ellipse at top right, var(--aurora-1) 0%, transparent 55%), radial-gradient(ellipse at bottom left, var(--aurora-2) 0%, transparent 55%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', fontFamily: 'var(--font-body)', color: 'var(--text)',
        transition: 'background 0.4s',
      }}>
        <div style={{ maxWidth: '560px', width: '100%' }}>

          {/* Progress — a leading "Account" segment is always lit, since
              creating the account (to reach this page at all) already counts
              as real progress. Nobody starts onboarding at 0%. */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
            <div style={{ height: '2px', flex: 1, borderRadius: '2px', background: 'var(--gold)' }} />
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: '2px', flex: 1, borderRadius: '2px',
                background: i <= step ? 'var(--gold)' : 'var(--faint)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2.2rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.75 }}>
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </span>
            {step < STEPS.length - 1 && (
              <button onClick={finish} disabled={saving} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.8,
              }}>
                {saving ? 'Setting up…' : 'Skip setup — use recommended →'}
              </button>
            )}
          </div>

          {/* Step 0 — Name */}
          {step === 0 && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300, color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                Welcome to <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>4S</em>.
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
                Your private personal life OS. Let&apos;s set you up in a few steps.
              </div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7, marginBottom: '0.8rem' }}>
                What should we call you?
              </div>
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && displayName.trim()) setStep(1) }}
                placeholder="Your name or nickname"
                autoFocus
                style={{ ...inputStyle, marginBottom: '2rem', fontSize: '1rem' }}
              />
              <NextBtn label={displayName.trim() ? 'Continue →' : 'Skip →'} onClick={() => setStep(1)} />
              <div style={{ textAlign: 'center', marginTop: '1.1rem' }}>
                <a href="/guide" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--muted)', textDecoration: 'none', opacity: 0.85 }}>
                  New here? Take the 2-minute tour →
                </a>
              </div>
            </div>
          )}

          {/* Step 1 — Domains */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, color: 'var(--text)', marginBottom: '0.5rem', lineHeight: 1.2 }}>
                Your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>domains</em>.
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1.2rem', lineHeight: 1.7 }}>
                Eight life areas, one operating system. Which matter most right now? (Pick any.)
              </div>

              <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7, marginBottom: '0.6rem' }}>
                Or start from a template
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                {TEMPLATES.map(tpl => {
                  const active = template === tpl.id
                  return (
                    <button key={tpl.id} onClick={() => applyTemplate(tpl)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.4rem 0.8rem', borderRadius: '99px', cursor: 'pointer',
                      border: active ? '1px solid color-mix(in srgb, var(--gold) 50%, transparent)' : '1px solid var(--border)',
                      background: active ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'var(--surface2)',
                      color: active ? 'var(--text)' : 'var(--muted)',
                      fontFamily: 'var(--font-body)', fontSize: '0.75rem',
                    }}>
                      <span>{tpl.icon}</span><span>{tpl.label}</span>
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '2rem' }}>
                {DOMAIN_OPTIONS.map(d => {
                  const active = focusDomains.includes(d.id)
                  return (
                    <button key={d.id} onClick={() => toggleDomain(d.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.6rem',
                      padding: '0.7rem 0.9rem', borderRadius: 'var(--radius-sm, 10px)', cursor: 'pointer',
                      border: active ? '1px solid color-mix(in srgb, var(--gold) 50%, transparent)' : '1px solid var(--border)',
                      background: active ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'var(--surface2)',
                      color: active ? 'var(--text)' : 'var(--muted)',
                      fontFamily: 'var(--font-body)', fontSize: '0.78rem', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}>
                      <span style={{ fontSize: '1rem' }}>{d.icon}</span>
                      <span>{d.label}</span>
                    </button>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <BackBtn onClick={() => setStep(0)} />
                <NextBtn label="Continue →" onClick={() => setStep(2)} />
              </div>
            </div>
          )}

          {/* Step 2 — Theme + Mode */}
          {step === 2 && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, color: 'var(--text)', marginBottom: '0.5rem' }}>
                Make it <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>yours</em>.
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1.6rem', lineHeight: 1.7 }}>
                Pick an aesthetic and a Guide for your OS. You can change these anytime.
              </div>

              {/* Theme grid */}
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7, marginBottom: '0.35rem' }}>Aesthetic — visual only</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', opacity: 0.85, marginBottom: '0.75rem', lineHeight: 1.5 }}>
                Themes change colors, fonts, and spacing. They never change how 4S talks to you.
              </div>
              <div className="onboard-theme-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1.6rem' }}>
                {THEMES.map(t => {
                  const active = selectedTheme === t.id
                  return (
                    <button key={t.id} onClick={() => setSelectedTheme(t.id)} title={`${t.label} — ${t.note}`} style={{
                      borderRadius: 'var(--radius-sm, 10px)', cursor: 'pointer', padding: '0',
                      border: active ? `2px solid ${t.accent}` : '2px solid var(--border)',
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

              {/* Guide list */}
              <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7, marginBottom: '0.35rem' }}>Your Guide — voice &amp; proactivity</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', opacity: 0.85, marginBottom: '0.75rem', lineHeight: 1.5 }}>
                Choose the voice that guides you. It shapes tone, greetings, and how much 4S speaks up — never your data.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '2rem' }}>
                {MODE_LIST.map(m => {
                  const active = selectedMode === m.id
                  return (
                    <button key={m.id} onClick={() => setSelectedMode(m.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm, 10px)', cursor: 'pointer',
                      border: active ? '1px solid color-mix(in srgb, var(--gold) 40%, transparent)' : '1px solid var(--border)',
                      background: active ? 'color-mix(in srgb, var(--gold) 8%, transparent)' : 'var(--surface2)',
                      textAlign: 'left', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', color: active ? 'var(--text)' : 'var(--muted)', fontWeight: active ? 500 : 300 }}>{m.label}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75, marginTop: '0.1rem' }}>{m.note}</div>
                      </div>
                      {active && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <BackBtn onClick={() => setStep(1)} />
                <NextBtn label="Continue →" onClick={() => setStep(3)} />
              </div>
            </div>
          )}

          {/* Step 3 — First habit */}
          {step === 3 && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, color: 'var(--text)', marginBottom: '0.5rem' }}>
                Build a <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>habit</em>.
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
                One habit to start. You can add more — and set custom schedules — any time. What do you want to track?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <input
                  value={habitName} onChange={e => setHabitName(e.target.value)}
                  placeholder="e.g. Go to the gym, Journal, Read 20 mins"
                  autoFocus style={inputStyle}
                />
                <select value={habitCategory} onChange={e => setHabitCategory(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                  {DOMAIN_OPTIONS.map(d => (
                    <option key={d.id} value={d.id}>{d.icon} {d.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <BackBtn onClick={() => setStep(2)} />
                <NextBtn label={habitName.trim() ? 'Continue →' : 'Skip →'} onClick={() => setStep(4)} />
              </div>
            </div>
          )}

          {/* Step 4 — First capture */}
          {step === 4 && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, color: 'var(--text)', marginBottom: '0.5rem' }}>
                Clear your <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>head</em>.
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
                What&apos;s one thing on your mind right now? A task, idea, or worry — capture it and let it go.
              </div>
              <textarea
                value={captureText} onChange={e => setCaptureText(e.target.value)}
                placeholder="What's on your mind?" rows={3} autoFocus
                style={{ ...inputStyle, resize: 'none', marginBottom: '1.4rem' }}
              />

              {/* What you've built so far — a quick recap right before the
                  commit. Naming the choices back reinforces that this OS is
                  already theirs, not a blank template waiting to be theirs. */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '2rem',
                padding: '0.75rem 0.9rem', borderRadius: 'var(--radius-sm, 10px)',
                border: '1px solid var(--border)', background: 'var(--surface2)',
              }}>
                <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7, width: '100%', marginBottom: '0.15rem' }}>
                  Your OS so far
                </span>
                {displayName.trim() && <RecapChip label={displayName.trim()} />}
                {focusDomains.length > 0 && (
                  <RecapChip label={`${focusDomains.length} domain${focusDomains.length > 1 ? 's' : ''}`} />
                )}
                <RecapChip label={THEMES.find(t => t.id === selectedTheme)?.label ?? selectedTheme} />
                <RecapChip label={MODE_LIST.find(m => m.id === selectedMode)?.label ?? selectedMode} />
                {habitName.trim() && <RecapChip label={habitName.trim()} />}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <BackBtn onClick={() => setStep(3)} />
                <button onClick={finish} disabled={saving} className="btn btn-primary" style={{ flex: 1, padding: '0.75rem', fontSize: '0.82rem', letterSpacing: '0.05em' }}>
                  {saving ? 'Setting up…' : 'Enter your OS →'}
                </button>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1.1rem' }}>
                <a href="/guide" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--muted)', textDecoration: 'none', opacity: 0.85 }}>
                  Want the full tour? Open the guide →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </ThemeProvider>
  )
}

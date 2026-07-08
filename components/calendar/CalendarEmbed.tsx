'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import CalendarSummary from './CalendarSummary'
import CalendarMonth from './CalendarMonth'

// Native views (agenda + month grid) built from 4S data, with the Google
// Calendar embed below them.
function NativeCalendarCard() {
  const [view, setView] = useState<'agenda' | 'month'>('month')

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    fontSize: '0.66rem', padding: '0.3em 0.75em', borderRadius: '7px', cursor: 'pointer',
    border: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
    background: active ? 'var(--hover-bg)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
  })

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.1rem 1.3rem', marginBottom: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 400, color: 'var(--text)' }}>
            {view === 'agenda' ? 'Today & Upcoming' : 'This Month'}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.8, letterSpacing: '0.04em' }}>from your tasks, renewals, refills &amp; gifts</span>
        </div>
        <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--hover-bg)', borderRadius: '8px', padding: '0.2rem' }}>
          <button onClick={() => setView('agenda')} style={toggleBtn(view === 'agenda')}>Agenda</button>
          <button onClick={() => setView('month')} style={toggleBtn(view === 'month')}>Month</button>
        </div>
      </div>
      {view === 'agenda' ? <CalendarSummary /> : <CalendarMonth />}
    </div>
  )
}

export default function CalendarEmbed({ userId, initialUrl }: { userId: string; initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [input, setInput] = useState('')
  const [showInput, setShowInput] = useState(!initialUrl)

  async function apply() {
    if (!input.trim()) return
    const supabase = createClient()
    await supabase.from('user_prefs').upsert({ user_id: userId, calendar_url: input.trim() })
    setUrl(input.trim())
    setShowInput(false)
    setInput('')
  }

  return (
    <>
    <NativeCalendarCard />
    <div className="card-interactive" style={{ background: 'var(--surface)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
      {showInput ? (
        <div style={{ padding: '2rem 1.8rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.6rem', color: 'var(--gold)', marginBottom: '0.8rem' }}>◎</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 400, color: 'var(--text)', marginBottom: '0.6rem' }}>
            {url ? 'Google Calendar' : 'Calendar not connected yet'}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.65, marginBottom: '1.2rem', maxWidth: '480px', margin: '0 auto 1.2rem' }}>
            {!url && <>Connect Google Calendar to see today and upcoming events alongside your 4S reminders.<br /></>}
            Paste your embed URL below. Get it from Google Calendar → Settings → <em style={{ color: 'var(--text)' }}>your calendar</em> → Integrate calendar → Embed code.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '520px', margin: '0 auto' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && apply()}
              placeholder="https://calendar.google.com/calendar/embed?src=..."
              aria-label="Google Calendar embed URL"
              style={{
                flex: 1, background: 'var(--bg)', borderWidth: '1px', borderStyle: 'solid',
                borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)',
                fontFamily: 'var(--font-body)', fontSize: '0.75rem', fontWeight: 300,
                padding: '0.55rem 0.8rem', outline: 'none',
              }}
            />
            <button onClick={apply} style={{
              padding: '0.55em 1.2em', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
              background: 'color-mix(in srgb, var(--gold) 8%, transparent)', color: 'var(--gold)', fontFamily: 'var(--font-body)',
              fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>Apply</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
            padding: '0.9rem 1.25rem', borderBottom: '1px solid var(--border)',
            background: 'linear-gradient(180deg, color-mix(in srgb, var(--gold) 5%, transparent), transparent)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>◎</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 400, color: 'var(--text)' }}>Calendar</span>
            </div>
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.68, letterSpacing: '0.04em' }}>synced from Google Calendar</span>
          </div>
          <iframe src={url} style={{ width: '100%', height: '420px', display: 'block', border: 'none' }} title="Google Calendar" />
          <button onClick={() => setShowInput(true)} style={{
            display: 'block', width: '100%', padding: '0.5rem', background: 'transparent',
            border: 'none', borderTop: '1px solid var(--border)', color: 'var(--muted)',
            fontFamily: 'var(--font-body)', fontSize: '0.68rem', letterSpacing: '0.06em',
            cursor: 'pointer',
          }}>
            Change calendar URL
          </button>
        </>
      )}
    </div>
    </>
  )
}

'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { parseTaskInput } from '@/lib/utils/parseTask'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'
import { fileAction, ACTION_WORD, type CaptureAction } from '@/lib/capture/file'
import { useGoogleStatus } from '@/lib/hooks/useGoogle'
import VoiceRecorder from '@/components/notes/VoiceRecorder'

// The smart add (2026-10-25), shared by the + sheet and the box on Today
// (2026-10-27). A sentence becomes actions to confirm: a task, a note, a
// chore, shopping, a calendar event. With no AI, or nothing it can place, it
// is saved as a note, and a sentence with a day in it is a task.
//
// This is the app's single most-used entry point. Losing a thought here
// silently is the worst place for it to happen, so it only claims success on
// real success and never wipes what someone typed if it didn't save.
export default function CaptureBox({ inline = false, initialText = '', autoFocus = false, onSaved, onEscape }: {
  inline?: boolean
  initialText?: string
  autoFocus?: boolean
  onSaved?: () => void
  onEscape?: () => void
}) {
  const lang = useLang()
  const [text, setText] = useState(initialText)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actions, setActions] = useState<CaptureAction[] | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { status: g } = useGoogleStatus()
  const supabase = createClient()
  // Smart dates (2026-10-26): "call vet friday" is due Friday, no picker.
  const when = useMemo(() => {
    const p = parseTaskInput(text)
    return p?.dueDate ? p : null
  }, [text])
  const niceDay = (d: string) => { try { return format(parseISO(d), 'EEE, MMM d') } catch { return d } }

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 30)
  }, [autoFocus])

  function done() {
    setActions(null); setSaved(true); setText('')
    onSaved?.()
    // The box on Today stays put: show the tick, then it is ready again.
    if (inline) setTimeout(() => setSaved(false), 1400)
  }

  function dated(p: { title: string; dueDate: string | null }): CaptureAction {
    return { type: 'task', label: p.title, title: p.title, date: p.dueDate }
  }

  async function read() {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: 'route-capture', text: trimmed }) })
      const j = res.ok ? await res.json() as { result?: { actions?: CaptureAction[] } } : null
      const list = (j?.result?.actions ?? []).filter(a => a && a.type)
        // A task the AI left undated gets the day you typed.
        .map(a => (a.type === 'task' || a.type === 'event') && !a.date && when ? { ...a, date: when.dueDate } : a)
      if (list.length === 0 || (list.length === 1 && list[0].type === 'note')) {
        // No AI, or it saw only a note: a sentence with a day is still a task.
        if (when) { setActions([dated(when)]); setBusy(false); return }
        setBusy(false); await submit(); return
      }
      setActions(list)
    } catch {
      if (when) setActions([dated(when)])
      else await submit()
    }
    setBusy(false)
  }

  async function fileAll() {
    if (!actions) return
    setBusy(true); setError(null)
    const problems: string[] = []
    for (const a of actions) {
      const e = await fileAction(a, { googleCalendar: g.connected && !!g.calendar })
      if (e) problems.push(e)
    }
    setBusy(false)
    if (problems.length) { setError(problems.join(' ')); return }
    done()
  }

  async function submit() {
    const trimmed = text.trim()
    if (!trimmed) return
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Couldn't confirm your session. Your text is still here, try again.")
      return
    }
    const { error: insertError } = await supabase
      .from('notes')
      .insert({ user_id: user.id, space_id: null, title: '', body: trimmed })
    if (insertError) {
      setError(`Couldn't save: ${insertError.message}`)
      return
    }
    window.dispatchEvent(new CustomEvent('4s:notes-changed'))
    done()
  }

  const pad = inline ? '0.9rem' : '1.4rem'

  if (saved && !inline) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--gold)', letterSpacing: '0.08em' }}>
        {t('saved ✓', lang)}
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: inline ? `0.75rem ${pad} ${text.trim() ? '0.4rem' : '0.75rem'}` : `1.4rem ${pad} 0` }}>
        {!inline && (
          <div style={{ fontSize: '0.58rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.85rem', opacity: 0.6 }}>
            Add anything · ⌘K
          </div>
        )}
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => { setText(e.target.value); if (saved) setSaved(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (actions) void fileAll(); else void read() }
            if (e.key === 'Escape') onEscape?.()
          }}
          aria-label="Add anything"
          placeholder={inline ? 'Add a task, note, anything' : 'Say anything: dinner with Mom Friday 7pm, buy cat litter, I cleaned the litter'}
          rows={inline ? Math.min(4, text.split('\n').length + Math.floor(text.length / 36)) : 3}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: 'var(--text)', fontFamily: inline ? 'var(--font-body)' : 'var(--font-display)',
            fontSize: inline ? '0.95rem' : 'clamp(1.05rem,3vw,1.35rem)', fontWeight: inline ? 400 : 300,
            outline: 'none', letterSpacing: '0.01em', resize: 'none', lineHeight: 1.5,
            ...(inline ? { minHeight: 0, padding: 0, display: 'block' } : {}),
          }}
        />
      </div>

      {!actions && when && (
        <div style={{ padding: `0 ${pad} 0.6rem`, fontSize: '0.78rem', color: 'var(--gold)' }}>
          Due {niceDay(when.dueDate!)}
        </div>
      )}
      {actions && (
        <div style={{ padding: `0 ${pad} 0.8rem`, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Here is what I will do. Remove anything that is wrong.</div>
          {actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: 10, border: '1px solid color-mix(in srgb, var(--gold) 30%, var(--border))', background: 'color-mix(in srgb, var(--gold) 6%, transparent)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--gold)', minWidth: '4.5rem' }}>{ACTION_WORD[a.type]}{a.type === 'chore' && a.done ? ' done' : ''}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: '0.88rem', color: 'var(--text)' }}>{a.label}{a.date ? ` · ${niceDay(a.date)}` : ''}{a.time ? ` ${a.time}` : ''}</span>
              <button onClick={() => setActions(list => { const n = (list ?? []).filter((_, k) => k !== i); return n.length ? n : null })} aria-label="Remove" style={{ minWidth: 36, minHeight: 36, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer' }}>×</button>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div role="alert" style={{ fontSize: '0.72rem', color: 'var(--danger, #c0554d)', padding: `0 ${pad} 0.6rem` }}>{error}</div>
      )}
      {/* On Today the buttons only show once there is something to save. */}
      {(!inline || text.trim() || actions || saved) && (
        <div style={{ padding: `${inline ? '0.5rem' : '0.75rem'} ${pad}`, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {saved && inline && <span style={{ marginRight: 'auto', fontSize: '0.8rem', color: 'var(--gold)' }}>{t('saved ✓', lang)}</span>}
          {!actions && !(saved && inline) && (
            <span style={{ marginRight: 'auto' }}>
              <VoiceRecorder compact label="Say it" onText={said => setText(prev => (prev.trim() ? prev.trim() + ' ' : '') + said)} />
            </span>
          )}
          {actions && (
            <button onClick={() => { setActions(null); void submit() }} disabled={busy}
              style={{ marginRight: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.8rem', minHeight: 40 }}>
              Just save it as a note
            </button>
          )}
          <button
            onClick={() => { if (actions) void fileAll(); else void read() }}
            disabled={!text.trim() || busy}
            style={{
              padding: '0.55rem 1.4rem', borderRadius: '10px', cursor: text.trim() ? 'pointer' : 'not-allowed',
              background: text.trim() ? 'var(--gold)' : 'var(--hover-bg)',
              border: 'none', color: text.trim() ? 'var(--bg)' : 'var(--muted)',
              fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 500,
              transition: 'all 0.15s', whiteSpace: 'nowrap',
            }}
          >
            {busy ? 'Working…' : actions ? 'Do it' : inline ? 'Add ↵' : t('Save ↵', lang)}
          </button>
        </div>
      )}
    </>
  )
}

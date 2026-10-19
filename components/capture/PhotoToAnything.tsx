'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Photo to anything (2026-10-19): snap a receipt, a bill, a screenshot of an
// event or a bottle label. The AI says what it sees; each suggestion has its
// own Save, and nothing is saved until you tap it.

interface Suggestion {
  type: 'expense' | 'bill' | 'event' | 'shopping' | 'task'
  label: string; title: string; amount: number | null; date: string | null; time: string | null; location: string | null; items: string[]
}
type State = 'idle' | 'saving' | 'saved' | 'failed'

const WHERE: Record<Suggestion['type'], string> = {
  expense: 'Add to who paid', bill: 'Add as a shared bill', event: 'Add to the calendar', shopping: 'Add to shopping', task: 'Add to Tasks',
}

async function shrink(file: File): Promise<string> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.82)
}

const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export default function PhotoToAnything({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [found, setFound] = useState<(Suggestion & { state: State; note?: string })[] | null>(null)

  async function read(file: File | null) {
    if (!file) return
    setBusy(true); setErr(null); setFound(null)
    try {
      const image = await shrink(file)
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: 'read-photo', image, today: localToday() }) })
      const j = await res.json() as { result?: { suggestions: Suggestion[] }; error?: string }
      if (res.status === 503) { setErr('Reading photos needs the AI key on the server.'); return }
      if (!res.ok || !j.result) { setErr('Could not read that picture.'); return }
      if (j.result.suggestions.length === 0) { setErr('Nothing to save in that picture.'); return }
      setFound(j.result.suggestions.map(s => ({ ...s, state: 'idle' as State })))
    } catch { setErr('Could not open that picture.') }
    finally { setBusy(false) }
  }

  async function save(i: number) {
    const s = found![i]
    const set = (patch: Partial<{ state: State; note: string }>) => setFound(f => f!.map((x, k) => (k === i ? { ...x, ...patch } : x)))
    set({ state: 'saving' })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { set({ state: 'failed', note: 'Sign in first.' }); return }
    const { data: m } = await supabase.from('shared_space_members').select('space_id').eq('member_id', user.id).eq('status', 'accepted').limit(1).maybeSingle()
    const spaceId = (m?.space_id as string | undefined) ?? null
    let error: { message: string } | null = null
    const title = (s.title || s.label).slice(0, 200)
    if (s.type === 'expense') {
      if (!spaceId || !s.amount) { set({ state: 'failed', note: !spaceId ? 'Needs a shared space.' : 'No amount was found.' }); return }
      ;({ error } = await supabase.from('household_payments').insert({ space_id: spaceId, paid_by: user.id, label: title, amount: s.amount, kind: 'expense', paid_on: s.date ?? localToday() }))
    } else if (s.type === 'bill') {
      if (!spaceId) { set({ state: 'failed', note: 'Needs a shared space.' }); return }
      const day = s.date ? Number(s.date.slice(8, 10)) : 1
      ;({ error } = await supabase.from('household_bills').insert({ user_id: user.id, space_id: spaceId, label: title, amount: s.amount, due_day: day || 1 }))
    } else if (s.type === 'event') {
      if (!s.date) { set({ state: 'failed', note: 'No date was found.' }); return }
      ;({ error } = await supabase.from('events').insert({ user_id: user.id, title, event_date: s.date, event_time: s.time, notes: s.location, space_id: null }))
      if (!error) window.dispatchEvent(new CustomEvent('4s:events-changed'))
    } else if (s.type === 'shopping') {
      const items = (s.items.length ? s.items : [title]).slice(0, 20)
      ;({ error } = await supabase.from('household_shopping').insert(items.map(name => ({ user_id: user.id, space_id: spaceId, name: name.slice(0, 120), qty: null, category: null }))))
      if (!error) window.dispatchEvent(new CustomEvent('4s:household-changed'))
    } else {
      ;({ error } = await supabase.from('work_items').insert({ user_id: user.id, title, status: 'todo', due_date: s.date }))
      if (!error) window.dispatchEvent(new CustomEvent('4s:work-items-changed'))
    }
    set(error ? { state: 'failed', note: 'That did not save.' } : { state: 'saved' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label className="btn btn-secondary press" style={{ alignSelf: 'flex-start', minHeight: compact ? 36 : 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
        {busy ? 'Reading…' : 'Photo'}
        <input type="file" accept="image/*" disabled={busy} onChange={e => { void read(e.target.files?.[0] ?? null); e.target.value = '' }}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
      </label>
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
      {found?.map((s, i) => (
        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{s.label}{s.amount ? ` · $${s.amount}` : ''}{s.date ? ` · ${s.date}` : ''}</div>
          {s.type === 'shopping' && s.items.length > 1 && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{s.items.join(', ')}</div>}
          {s.state === 'idle' && <button onClick={() => save(i)} className="btn btn-primary press" style={{ alignSelf: 'flex-start', minHeight: 38 }}>{WHERE[s.type]}</button>}
          {s.state === 'saving' && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Saving…</div>}
          {s.state === 'saved' && <div style={{ fontSize: '0.78rem', color: 'var(--emerald)' }}>Saved.</div>}
          {s.state === 'failed' && <div style={{ fontSize: '0.78rem', color: 'var(--rose)' }}>{s.note}</div>}
        </div>
      ))}
    </div>
  )
}

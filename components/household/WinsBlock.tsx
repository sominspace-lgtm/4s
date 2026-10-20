'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { logWin } from '@/lib/household/wins'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'

// Little wins (2026-10-20): a quiet feed of what the two of you got done,
// written whenever a chore, routine or meal is finished. Add a line by hand
// for anything the app can't see ("Harry fixed the shelf").

interface Win { id: string; user_id: string; kind: string; title: string; created_at: string }

function dayLabel(iso: string): string {
  const d = differenceInCalendarDays(new Date(), parseISO(iso))
  if (d <= 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return format(parseISO(iso), 'EEEE')
}

export default function WinsBlock({ spaceId, userId, nameFor }: { spaceId: string | null; userId: string | null; nameFor: (uid: string | null) => string | null }) {
  const [wins, setWins] = useState<Win[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!spaceId) { setWins([]); return }
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { data } = await createClient().from('household_wins')
      .select('id, user_id, kind, title, created_at').eq('space_id', spaceId)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(80)
    setWins((data as Win[] | null) ?? [])
  }, [spaceId])

  useEffect(() => {
    void load()
    const h = () => { void load() }
    window.addEventListener('4s:wins-changed', h)
    return () => window.removeEventListener('4s:wins-changed', h)
  }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    const v = text.trim()
    if (!v || !userId || busy) return
    setBusy(true)
    await logWin(createClient(), spaceId, userId, 'win', v)
    setText(''); setBusy(false)
  }

  async function remove(id: string) {
    setWins(w => w.filter(x => x.id !== id))
    await createClient().from('household_wins').delete().eq('id', id)
  }

  const groups: { label: string; rows: Win[] }[] = []
  for (const w of wins) {
    const label = dayLabel(w.created_at)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.rows.push(w)
    else groups.push({ label, rows: [w] })
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div className="t-card">Little wins</div>
        {wins.length > 0 && <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{wins.length} this week</div>}
      </div>

      {!spaceId && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Wins show up once you share a household.</div>}

      {spaceId && (
        <form onSubmit={add} style={{ display: 'flex', gap: '0.4rem', marginBottom: groups.length ? '0.8rem' : 0 }}>
          <input value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder="Add a win, like Fixed the shelf"
            style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '0 0.7rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, outline: 'none' }} />
          <button type="submit" disabled={!text.trim() || busy} className="btn btn-primary press" style={{ minHeight: 44 }}>Add</button>
        </form>
      )}

      {spaceId && groups.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
          Nothing yet. Finish a chore or cook a recipe and it lands here.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {groups.map(g => (
          <div key={g.label}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.25rem' }}>{g.label}</div>
            {g.rows.map(w => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', padding: '0.25rem 0', fontSize: '0.88rem', color: 'var(--text)' }}>
                <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{nameFor(w.user_id) ?? 'Someone'}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{w.title}</span>
                {w.user_id === userId && (
                  <button onClick={() => remove(w.id)} aria-label="Remove" className="press"
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', minWidth: 32, minHeight: 32, fontSize: '1rem', opacity: 0.6 }}>×</button>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

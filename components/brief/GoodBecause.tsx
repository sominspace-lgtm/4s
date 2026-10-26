'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { logWin } from '@/lib/household/wins'

// "Today was good because…" (2026-10-26). From five in the evening, Today
// asks for one line. It is saved with the little wins (kind 'good'), and the
// weekly postcard in the village mailbox reads them back.

export default function GoodBecause({ userId }: { userId: string }) {
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const [hour, setHour] = useState<number | null>(null)
  const [mine, setMine] = useState<{ id: string; title: string } | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => { setHour(new Date().getHours()) }, [])

  const load = useCallback(async () => {
    if (!spaceId) return
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const { data } = await createClient().from('household_wins').select('id, title')
      .eq('space_id', spaceId).eq('user_id', userId).eq('kind', 'good')
      .gte('created_at', start.toISOString()).order('created_at', { ascending: false }).limit(1)
    setMine((data as { id: string; title: string }[] | null)?.[0] ?? null)
  }, [spaceId, userId])
  useEffect(() => { void load() }, [load])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const v = text.trim()
    if (!v || busy) return
    setBusy(true)
    const supabase = createClient()
    if (mine) await supabase.from('household_wins').delete().eq('id', mine.id)
    await logWin(supabase, spaceId, userId, 'good', v)
    await load()
    setText(''); setEditing(false); setBusy(false)
  }

  if (!spaceId || hour === null || (hour < 17 && !mine)) return null

  return (
    <section className="organic" style={{
      background: 'color-mix(in srgb, var(--gold) 7%, var(--surface))', border: '1px solid color-mix(in srgb, var(--gold) 22%, var(--border))',
      borderRadius: 14, padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)' }}>Today was good because…</div>
      {mine && !editing ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--text)', fontStyle: 'italic' }}>{mine.title}</span>
          <button className="btn btn-ghost press" style={{ fontSize: '0.75rem' }} onClick={() => { setText(mine.title); setEditing(true) }}>Change</button>
        </div>
      ) : (
        <form onSubmit={save} style={{ display: 'flex', gap: '0.4rem' }}>
          <input value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder="One line is plenty"
            style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '0 0.75rem', fontSize: '16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-body)' }} />
          <button type="submit" disabled={!text.trim() || busy} className="btn btn-primary press" style={{ minHeight: 44 }}>Save</button>
        </form>
      )}
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>It goes on this week&apos;s postcard in the village mailbox.</div>
    </section>
  )
}

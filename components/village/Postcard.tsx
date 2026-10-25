'use client'

import { useEffect, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

// The weekly postcard (2026-10-25). Each Sunday the mailbox holds a card for
// the week that just ended (Sunday to Saturday): your check-in photo, the
// little wins, and one line about the week. Older weeks are kept, one tap
// back. Nothing is stored for it; it is drawn from what you already have.

/** The Sunday that starts the most recent finished week. */
export function lastWeekStart(now = new Date()): string {
  const d = new Date(now); d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay() - 7)
  return format(d, 'yyyy-MM-dd')
}

interface Card { wins: { title: string; who: string | null }[]; count: number; photo: string | null }

function line(c: Card): string {
  if (c.count === 0) return 'A quiet week. Those count too.'
  if (c.count < 4) return `A gentle week, ${c.count} little win${c.count === 1 ? '' : 's'}.`
  if (c.count < 10) return `A good week. ${c.count} little wins between you.`
  return `A full week. ${c.count} little wins.`
}

export default function Postcard({ spaceId, userId, nameFor }: { spaceId: string | null; userId: string; nameFor: (id: string) => string }) {
  const [week, setWeek] = useState(lastWeekStart())
  const [card, setCard] = useState<Card | null>(null)

  useEffect(() => {
    if (!spaceId) return
    let alive = true
    ;(async () => {
      const supabase = createClient()
      const from = parseISO(week), to = addDays(from, 7)
      const [{ data: w }, { data: ck }] = await Promise.all([
        supabase.from('household_wins').select('title, user_id').eq('space_id', spaceId)
          .gte('created_at', from.toISOString()).lt('created_at', to.toISOString()).order('created_at', { ascending: false }).limit(200),
        supabase.from('checkins').select('photo_path, user_id').eq('space_id', spaceId).eq('week_of', week).not('photo_path', 'is', null),
      ])
      const rows = (w as { title: string; user_id: string }[] | null) ?? []
      const paths = ((ck as { photo_path: string; user_id: string }[] | null) ?? [])
      // Your own photo first if there is one, else your partner's (only
      // returned once the week is open to you both).
      const pick = paths.find(p => p.user_id === userId) ?? paths[0]
      let photo: string | null = null
      if (pick) {
        const { data: s } = await supabase.storage.from('checkin-photos').createSignedUrl(pick.photo_path, 3600)
        photo = s?.signedUrl ?? null
      }
      if (alive) setCard({ count: rows.length, wins: rows.slice(0, 5).map(r => ({ title: r.title, who: r.user_id === userId ? null : nameFor(r.user_id) })), photo })
    })()
    return () => { alive = false }
  }, [spaceId, week, userId, nameFor])

  const start = parseISO(week), end = addDays(start, 6)
  const latest = week >= lastWeekStart()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{
        position: 'relative', background: '#fbf6ec', color: '#4a3a28', borderRadius: 6, padding: '1rem',
        boxShadow: '0 10px 24px -12px rgba(40,25,10,0.5)', border: '1px solid #e7d7b8',
        display: 'grid', gridTemplateColumns: card?.photo ? 'minmax(0, 1fr) minmax(0, 1.1fr)' : '1fr', gap: '0.9rem',
      }}>
        <span aria-hidden style={{ position: 'absolute', top: 10, right: 10, width: 34, height: 40, border: '2px dashed #c9584f', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', background: '#f4e3cf' }}>♥</span>
        {card?.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.photo} alt="" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 3, transform: 'rotate(-1.5deg)', border: '4px solid #fff' }} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: card?.photo ? 0 : '2.6rem' }}>
          <div style={{ fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>{format(start, 'MMM d')} to {format(end, 'MMM d')}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.15rem', lineHeight: 1.35 }}>{card ? line(card) : '…'}</div>
          {card && card.wins.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.86rem', lineHeight: 1.5 }}>
              {card.wins.map((w, i) => <li key={i}>{w.title}{w.who ? <span style={{ opacity: 0.7 }}> · {w.who}</span> : null}</li>)}
            </ul>
          )}
          <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: 'auto' }}>Love, the village</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost press" onClick={() => setWeek(format(addDays(start, -7), 'yyyy-MM-dd'))}>‹ The week before</button>
        {!latest && <button className="btn btn-ghost press" onClick={() => setWeek(format(addDays(start, 7), 'yyyy-MM-dd'))}>Next week ›</button>}
      </div>
    </div>
  )
}

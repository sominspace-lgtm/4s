'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildWeeklyRecap, recapLines, type WeeklyRecap } from '@/lib/household/weeklyRecap'

// The same computation the companion bot posts on Sunday evenings — see
// lib/household/weeklyRecap.ts — so this block and that DM can never
// disagree about what happened. Household-scoped only, same reason the bot
// can only ever see one household: a token binds to one space, so there's
// nothing to compute without one.
export default function WeeklyRecapBlock({ spaceId }: { spaceId: string | null }) {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!spaceId) { setRecap(null); setLoading(false); return }
    setLoading(true)
    buildWeeklyRecap(createClient(), spaceId).then(r => { setRecap(r); setLoading(false) })
  }, [spaceId])

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div className="t-card" style={{ marginBottom: '0.3rem' }}>This week</div>

      {!spaceId && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Create a space in People → Spaces to start a shared weekly recap.
        </div>
      )}

      {spaceId && !loading && recap?.isEmpty && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Quiet week — nothing logged {recap.weekStart} to {recap.weekEnd}.
        </div>
      )}

      {spaceId && recap && !recap.isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.1rem' }}>
            {recap.weekStart} to {recap.weekEnd}
          </div>
          {recapLines(recap).map((line, i) => (
            <div key={i} style={{ fontSize: '0.76rem', color: 'var(--text)', lineHeight: 1.5 }}>{line}</div>
          ))}
        </div>
      )}
    </section>
  )
}

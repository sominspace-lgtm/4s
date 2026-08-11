'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// The other half of DailyReflection.
//
// Reflections were write-only: you answered a question every day and the app
// never mentioned it again. That's the "journaling homework" failure — effort
// in, nothing back. This reads the recent ones and reflects a single
// observation back.
//
// Deliberately quiet about it: no header, no card, no "AI insight" badge. It
// reads as the app having been paying attention, not as a feature. Renders
// nothing at all when there's no key configured, too few reflections, or no
// honest pattern — silence is the default, not an error state.
export default function ReflectionEcho() {
  const [echo, setEcho] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      // Reflections are captures written by DailyReflection with domain 'self'
      // and a "Reflection · " prefix. Filtering on both avoids picking up
      // ordinary self-domain captures the user filed by hand.
      const { data } = await supabase
        .from('captures')
        .select('text, created_at')
        .eq('domain', 'self')
        .order('created_at', { ascending: false })
        .limit(14)
      const reflections = (data ?? [])
        .map(r => (r.text as string))
        .filter(t => t.startsWith('Reflection · '))
        .map(t => t.replace('Reflection · ', ''))
      if (reflections.length < 3 || cancelled) return

      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ task: 'reflect-synthesis', reflections }),
        })
        if (!res.ok) return // 503 = no key configured; stay silent
        const { result } = await res.json()
        if (!cancelled && typeof result === 'string' && result.trim()) setEcho(result.trim())
      } catch {
        // Network failure here should never surface — this is ambient, not
        // something the user asked for.
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!echo) return null

  return (
    <div style={{
      fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.7,
      fontStyle: 'italic', padding: '0.2rem 0 0.6rem',
      borderLeft: '2px solid color-mix(in srgb, var(--gold) 30%, transparent)',
      paddingLeft: '0.9rem', margin: '0.4rem 0',
    }}>
      {echo}
    </div>
  )
}

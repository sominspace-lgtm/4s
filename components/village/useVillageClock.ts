'use client'

import { useEffect, useState } from 'react'
import { seasonOf, timeOfDayOf } from '@/lib/village/state'

/**
 * The village's sense of time, and its hydration guard.
 *
 * Returns null on the server AND on the first client render, then the real
 * date. That null is not a loading state, it's a correctness one: the dashboard
 * is an async server component, so the village is server-rendered on a box in
 * UTC and then hydrated in the user's own timezone. Anything drawn from
 * `new Date()` can therefore disagree across that boundary, which is a real
 * React hydration error, not a theoretical one. Rendering nothing time-shaped
 * until after mount makes the two passes identical by construction.
 *
 * After that it ticks every minute but the updater returns the IDENTICAL object
 * unless the derived time-of-day or season STRING actually changed, so React
 * bails out and nothing re-renders. That works out to about four renders a day,
 * which is less often than the data itself changes. The file's "renders once
 * per data change, never on a frame loop" rule is about not animating through
 * React, and this doesn't.
 *
 * The visibilitychange listener is the part that actually matters in practice:
 * background timers get throttled hard, so a laptop closed at dusk and opened
 * at midnight is caught on focus rather than by the interval.
 */
export function useVillageClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    const tick = () => setNow(prev => {
      const d = new Date()
      if (prev && timeOfDayOf(prev) === timeOfDayOf(d) && seasonOf(prev) === seasonOf(d)) return prev
      return d
    })
    tick()
    const id = setInterval(tick, 60_000)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return now
}

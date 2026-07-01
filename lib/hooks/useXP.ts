'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export const XP_PER_TASK    = 25
export const XP_PER_HABIT   = 10
export const XP_PER_CAPTURE = 5
export const XP_PER_LEVEL   = 100

export function xpToLevel(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function xpProgress(xp: number) {
  return xp % XP_PER_LEVEL
}

export function useXP(active: boolean) {
  const supabase = createClient()
  const [xp, setXp]       = useState(0)
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<number | null>(null)  // XP gained flash

  const load = useCallback(async () => {
    if (!active) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('user_prefs').select('xp').eq('user_id', user.id).single()
    setXp((data?.xp as number) ?? 0)
    setLoading(false)
  }, [active])

  useEffect(() => { load() }, [load])

  const gain = useCallback(async (amount: number) => {
    if (!active) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const next = xp + amount
    setXp(next)
    setFlash(amount)
    setTimeout(() => setFlash(null), 1800)
    await supabase.from('user_prefs').upsert({ user_id: user.id, xp: next })
  }, [active, xp])

  return { xp, loading, flash, gain, level: xpToLevel(xp), progress: xpProgress(xp) }
}

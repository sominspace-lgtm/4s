'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEVICE_EVENT, DEVICE_KEYS, readDevice, writeDevice } from '@/lib/utils/deviceSettings'

// Older-iPad mode for the village (2026-10-16). "auto" watches the first few
// seconds of drawing: if the device cannot keep near 60 frames a second, the
// decorative animations stop and the grain layer goes, so the scene is drawn
// once and sits still. "on" and "off" are a person's own choice on this
// device, kept in this browser only. The iPad settings panel changes it too
// (2026-10-19), so this listens for that.
export type LiteSetting = 'auto' | 'on' | 'off'
const KEY = DEVICE_KEYS.lite

function readSetting(): LiteSetting {
  const v = readDevice(KEY)
  return v === 'on' || v === 'off' ? v : 'auto'
}

export function useVillageLite(enabled: boolean) {
  const [setting, setSettingState] = useState<LiteSetting>('auto')
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read this device's choice once
    setSettingState(readSetting())
    const on = (e: Event) => { if ((e as CustomEvent).detail === KEY) setSettingState(readSetting()) }
    window.addEventListener(DEVICE_EVENT, on)
    return () => window.removeEventListener(DEVICE_EVENT, on)
  }, [])

  // Measure only while on "auto". Two seconds after a short settle, average
  // frame time; under ~40 fps counts as slow.
  useEffect(() => {
    if (!enabled || setting !== 'auto') return
    let raf = 0, frames = 0, start = 0
    const settle = setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t
        frames++
        if (t - start < 2000) raf = requestAnimationFrame(tick)
        else setSlow(frames / ((t - start) / 1000) < 40)
      }
      raf = requestAnimationFrame(tick)
    }, 1500)
    return () => { clearTimeout(settle); cancelAnimationFrame(raf) }
  }, [enabled, setting])

  const setSetting = useCallback((next: LiteSetting) => {
    setSettingState(next)
    writeDevice(KEY, next === 'auto' ? null : next)
  }, [])

  const lite = setting === 'on' || (setting === 'auto' && slow)
  return { lite, setting, setSetting }
}

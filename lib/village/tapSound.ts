// Tap sounds for the village (2026-11-05, "juicy taps"). Tiny square-wave
// blips made on the spot with Web Audio, so there are no sound files to load
// and they match the pixel art. Off unless you turn them on in the ⋯ menu;
// the choice is per device.

const KEY = 'village-tap-sound'

export function tapSoundOn(): boolean {
  try { return localStorage.getItem(KEY) === 'on' } catch { return false }
}

export function setTapSound(on: boolean) {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private mode */ }
}

let ctx: AudioContext | null = null

/** A short rising chirp: 'pop' for things, 'heart' for creatures. */
export function playTap(kind: 'pop' | 'heart' = 'pop') {
  if (!tapSoundOn()) return
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    const notes = kind === 'heart' ? [660, 880] : [520, 780]
    const t0 = ctx.currentTime
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      const start = t0 + i * 0.06
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.05, start + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(start)
      osc.stop(start + 0.1)
    })
  } catch { /* no audio, no problem */ }
}

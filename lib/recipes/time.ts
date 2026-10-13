// Times written inside recipe steps (2026-10-13): "simmer 10 minutes", "bake
// 20-25 min", "rest for 1 hour". Cook mode turns each into a one-tap timer.

export interface StepTimer { label: string; seconds: number }

const RE = /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi

export function detectTimers(step: string): StepTimer[] {
  const out: StepTimer[] = []
  for (const m of step.matchAll(RE)) {
    // A range ("20-25 minutes") sets the longer time; you can always stop early.
    const n = Number(m[2] ?? m[1])
    const unit = m[3].toLowerCase()
    const seconds = Math.round(n * (unit.startsWith('h') ? 3600 : unit.startsWith('m') ? 60 : 1))
    if (seconds >= 10 && seconds <= 86_400) out.push({ label: m[0].trim(), seconds })
  }
  return out
}

export function clock(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

/** 75 -> "1 hr 15 min", 20 -> "20 min". */
export function minutesLabel(min: number | null): string {
  if (!min) return ''
  const h = Math.floor(min / 60), m = min % 60
  return h ? (m ? `${h} hr ${m} min` : `${h} hr`) : `${m} min`
}

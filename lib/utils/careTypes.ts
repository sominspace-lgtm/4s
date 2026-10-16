// The preset care actions per subject (2026-09-08). `kind` is what lands in
// care_logs.kind; anything not in this list is a free-text one-off. Order
// is the order the quick-log buttons render. `detail` prompts for the
// "10mg" / "4.2 kg" / "annual checkup" bit when the action needs one.

export type CareSubject = 'somi' | 'self' | 'home'

export interface CareType {
  kind: string
  label: string
  /** Ask for a short detail string (dose, weight, reason) after tapping. */
  detail?: string
}

export const CARE_TYPES: Record<CareSubject, CareType[]> = {
  somi: [
    { kind: 'litter', label: "Clean Somi's litter" },
    { kind: 'litter_deep', label: "Deep-clean Somi's litter box" },
    { kind: 'bathe', label: 'Bathe Somi' },
    { kind: 'nails', label: "Trim Somi's nails" },
    { kind: 'flea_tick', label: 'Flea/tick treatment for Somi' },
    { kind: 'vet', label: 'Vet checkup for Somi', detail: 'Reason' },
  ],
  self: [
    { kind: 'meds', label: 'Meds', detail: 'What and how much' },
    { kind: 'moved', label: 'Moved', detail: 'What (walk, gym, yoga…)' },
    { kind: 'ate', label: 'Ate well' },
    { kind: 'water', label: 'Hydrated' },
    { kind: 'rested', label: 'Rested' },
    { kind: 'skincare', label: 'Skincare' },
    { kind: 'meditate', label: 'Meditated' },
    { kind: 'therapy', label: 'Therapy' },
    { kind: 'doctor', label: 'Doctor', detail: 'Reason' },
    { kind: 'dentist', label: 'Dentist' },
  ],
  home: [
    { kind: 'filters', label: 'HVAC filter' },
    { kind: 'smoke', label: 'Smoke detector' },
    { kind: 'water_filter', label: 'Water filter' },
    { kind: 'gutters', label: 'Gutters' },
    { kind: 'deep_clean', label: 'Deep clean', detail: 'Which room' },
    { kind: 'plants', label: 'Watered plants' },
    { kind: 'car', label: 'Car', detail: 'What (oil, wash, tires…)' },
    { kind: 'appliance', label: 'Appliance', detail: 'Which, what' },
    { kind: 'repair', label: 'Repair', detail: 'What' },
    { kind: 'pest', label: 'Pest control' },
  ],
}

export function careTypeLabel(subject: CareSubject, kind: string): string {
  return CARE_TYPES[subject].find(t => t.kind === kind)?.label ?? kind
}

const SUBJECT_NAME: Record<CareSubject, string> = { somi: 'Somi', self: 'You', home: 'The house' }
export function careSubjectName(subject: CareSubject): string {
  return SUBJECT_NAME[subject] ?? subject
}

// ── Editable care tasks (2026-10-16) ──────────────────────────────────────
// A row in care_tasks overrides the built-in task with the same kind (new
// name, a rhythm, hidden). Kinds you have logged by hand that have no row
// still show, as before. Order: saved rows by position, then built-ins not
// yet saved, then hand-logged kinds.

export interface CareTaskRow {
  id: string
  subject: string
  kind: string
  label: string
  detail: string | null
  every_days: number | null
  position: number
  hidden: boolean
}

export interface CareTask {
  /** Saved row id, or null for a built-in or hand-logged task with no row yet. */
  id: string | null
  kind: string
  label: string
  detail: string | null
  every_days: number | null
  hidden: boolean
  builtin: boolean
}

export function mergeCareTasks(subject: CareSubject, rows: CareTaskRow[], loggedKinds: string[]): CareTask[] {
  const presets = CARE_TYPES[subject]
  const builtin = new Set(presets.map(p => p.kind))
  const saved = [...rows].sort((a, b) => a.position - b.position)
  const have = new Set(saved.map(r => r.kind))
  const out: CareTask[] = saved.map(r => ({
    id: r.id, kind: r.kind, label: r.label, detail: r.detail, every_days: r.every_days, hidden: r.hidden, builtin: builtin.has(r.kind),
  }))
  for (const p of presets) {
    if (!have.has(p.kind)) out.push({ id: null, kind: p.kind, label: p.label, detail: p.detail ?? null, every_days: null, hidden: false, builtin: true })
  }
  for (const k of new Set(loggedKinds)) {
    if (!have.has(k) && !builtin.has(k)) out.push({ id: null, kind: k, label: k, detail: null, every_days: null, hidden: false, builtin: false })
  }
  return out
}

/** Days until a task with a rhythm is due (negative = overdue). null when it has no rhythm. Never done = due now. */
export function careDue(everyDays: number | null, lastIso: string | null | undefined, now: Date = new Date()): number | null {
  if (!everyDays) return null
  if (!lastIso) return 0
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const since = Math.round((startOf(now) - startOf(new Date(lastIso))) / 86_400_000)
  return everyDays - since
}


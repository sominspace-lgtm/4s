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

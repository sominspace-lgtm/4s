import { differenceInCalendarDays, parseISO } from 'date-fns'
import { daysSinceContact, daysUntilBirthday, type Person } from '@/lib/hooks/usePeople'

// Relationships as a scene, not a list (2026-08-21) — same idea as the
// Village, deliberately reusing its central law rather than inventing a
// softer version of it: a relationship's SIZE only ever reflects what's been
// built (time known, plus what you've actually learned about them), and it
// can never shrink. Going quiet doesn't undo history.
//
// This is a real design tension the Village doesn't have to resolve, because
// habits don't have feelings about being visualized. last_contact is the
// most natural signal for a relationships scene, and it's exactly the kind
// of thing that, rendered as decay, becomes a guilt mechanic — the one thing
// this product's whole design explicitly refuses to be. The resolution,
// carried over from the Village's own `dormant` precedent (state.ts): a
// quiet relationship DESATURATES — it reads as resting, not withering — and
// nothing about its earned size moves.

export type PersonStage = 'seed' | 'sprout' | 'growing' | 'established' | 'rooted'
export const PERSON_STAGE_ORDER: PersonStage[] = ['seed', 'sprout', 'growing', 'established', 'rooted']

export interface PersonTree {
  id: string
  name: string
  stage: PersonStage
  /** Contact has gone quiet for 30+ days — desaturated, never shrunk. */
  quiet: boolean
  birthdaySoon: boolean
}

// Score, not raw days known: what you've actually learned about someone
// (a logged preference) counts for more than time alone, the same way
// Village plants grow from completions rather than from a habit's age.
// Threshold shape mirrors STAGE_THRESHOLDS in lib/village/state.ts.
const STAGE_THRESHOLDS = [1, 4, 10, 20]

function stageFor(score: number): PersonStage {
  const idx = STAGE_THRESHOLDS.filter(t => score >= t).length
  return PERSON_STAGE_ORDER[idx]
}

export function treeFor(person: Person, preferenceCount: number): PersonTree {
  const daysKnown = Math.max(0, differenceInCalendarDays(new Date(), parseISO(person.created_at)))
  const score = Math.floor(daysKnown / 30) + preferenceCount * 2
  const since = daysSinceContact(person.last_contact)
  const bday = daysUntilBirthday(person.birthday)
  return {
    id: person.id,
    name: person.name,
    stage: stageFor(score),
    quiet: since !== null && since > 30,
    birthdaySoon: bday !== null && bday <= 14,
  }
}

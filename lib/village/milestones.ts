import { differenceInCalendarMonths, differenceInCalendarYears, parseISO } from 'date-fns'
import type { Plant } from '@/lib/village/state'

// Village milestones — derived from real data, never stored (matches
// state.ts's "pure function of your data" thesis). Only the *acknowledged*
// set is persisted (LayoutState.milestonesSeen), so each fires exactly once.

/** The date the monthly / yearly village anniversary counts from. */
export const ANNIVERSARY = '2026-01-17'

export type MilestoneKind = 'tree' | 'anniv-month' | 'anniv-year'

export interface Milestone {
  id: string
  kind: MilestoneKind
  label: string
}

function pad2(n: number): string { return n < 10 ? `0${n}` : `${n}` }

/**
 * All milestones true *right now*, newest-feeling first. The caller filters
 * out anything already in `seen` and shows at most one.
 */
export function detectMilestones(plants: Plant[], now: Date = new Date()): Milestone[] {
  const out: Milestone[] = []

  // A habit that has reached its final stage.
  for (const p of plants) {
    if (p.stage === 'tree') {
      out.push({ id: `tree:${p.id}`, kind: 'tree', label: `${p.name} grew into a tree` })
    }
  }

  // The anniversary of ANNIVERSARY — a small note on the 17th of any month,
  // a bigger moment on Jan 17.
  const anchor = parseISO(ANNIVERSARY)
  if (now.getDate() === 17) {
    if (now.getMonth() === anchor.getMonth()) {
      const years = differenceInCalendarYears(now, anchor)
      if (years >= 1) out.push({ id: `anniv-year:${now.getFullYear()}`, kind: 'anniv-year', label: `${years} year${years === 1 ? '' : 's'} together` })
    } else {
      const months = differenceInCalendarMonths(now, anchor)
      if (months >= 1) out.push({ id: `anniv-month:${now.getFullYear()}-${pad2(now.getMonth() + 1)}`, kind: 'anniv-month', label: `${months} months` })
    }
  }

  // Yearly outranks tree outranks monthly for the one-at-a-time pick.
  const rank: Record<MilestoneKind, number> = { 'anniv-year': 0, tree: 1, 'anniv-month': 2 }
  return out.sort((a, b) => rank[a.kind] - rank[b.kind])
}

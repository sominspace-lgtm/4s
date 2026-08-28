// The "attention" system (round 50, 2026-08-28, "The user shouldn't directly
// control Sylvia/Harry. Instead, tapping something can influence their
// attention.") — pure logic only, no React/DOM here, same split as the rest
// of this directory (state.ts stays a pure function of real data; this stays
// a pure function of "what was tapped, and when"). The actual tap handlers
// and localStorage persistence live in VillageScene.tsx, following the same
// pattern its own `visitCounts` state already uses for click history.
//
// A tap never drags a figure there directly — it only raises the odds that
// ONE of them detours toward the tapped spot for one beat of their own
// already-running wander lap, and only some of the time. `resolveNudgeThisLap`
// is what keeps that a nudge rather than a command: it reuses hashPos, the
// same deterministic string-hash every other "varied but not random" bit of
// this scene is built on (see state.ts's own comment on why Math.random() is
// avoided here), so a given nudge's outcome is stable for a given lap rather
// than flickering on every re-render.

import { hashPos } from './state'

export type NudgeKind = 'garden' | 'picnic'

export interface Nudge {
  /** id of the prop that was tapped — a flowerBed-{i} or 'pond'. */
  targetId: string
  kind: NudgeKind
  /** ms epoch. */
  expiresAt: number
}

/** How long a tap keeps influencing attention before it fades on its own. */
export const NUDGE_TTL_MS = 4 * 60 * 60 * 1000

export function isNudgeActive(nudge: Nudge | null, now: number): nudge is Nudge {
  return !!nudge && nudge.expiresAt > now
}

/** One 48s wander lap, shared by both Sylvia and Harry's own loops. */
export const WANDER_LAP_MS = 48_000

export function lapIndexAt(nowMs: number): number {
  return Math.floor(nowMs / WANDER_LAP_MS)
}

/**
 * Deterministically decides, for ONE lap, whether the nudge's detour beat
 * shows at all this time around, and which of the two it's on — reusing the
 * exact "hash the id, don't call Math.random" primitive the rest of the
 * scene already relies on for stable-but-varied placement. Roughly half the
 * laps show nothing (an active nudge is a raised likelihood, not a rule),
 * and the actor alternates the same deterministic way.
 */
export function resolveNudgeThisLap(nudge: Nudge, lapIndex: number): { actor: 'sylvia' | 'harry'; on: boolean } {
  const key = `${nudge.targetId}:${lapIndex}`
  const on = hashPos(key + ':on') < 0.5
  const actor = hashPos(key + ':who') < 0.5 ? 'sylvia' : 'harry'
  return { actor, on }
}

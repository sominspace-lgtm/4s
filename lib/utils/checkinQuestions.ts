// The weekly relationship check-in — ported verbatim from the companion
// Discord bot (companion/src/checkin/questions.ts) so 4S is now where you
// answer it, not a DM. The fixed questions mirror the columns of a Google
// Sheet with years of history; a final "reflection" question rotates weekly,
// deterministically by ISO week number (no LLM). Answers land in the
// `checkins` table, one row per (space, person, week), keyed on this week's
// Monday.

export type CheckinQuestionKind = 'text' | 'scale' | 'choice' | 'emoji'

export interface CheckinQuestion {
  key: string
  text: string
  kind: CheckinQuestionKind
  /** 1..scaleMax buttons when kind === 'scale'. */
  scaleMax?: number
  /** Chips when kind === 'choice'. */
  options?: string[]
  multiSelect?: boolean
}

/** Order matches the sheet's columns exactly. */
export const CHECKIN_QUESTIONS: CheckinQuestion[] = [
  { key: 'feeling_word', text: "One word for how you're feeling in the relationship right now", kind: 'text' },
  { key: 'week_overall', text: 'Overall, how have things been feeling this week?', kind: 'scale', scaleMax: 10 },
  { key: 'good_lately', text: "Something that's been feeling good or positive lately", kind: 'text' },
  { key: 'appreciated', text: 'Something you appreciated about me recently', kind: 'text' },
  { key: 'hard_or_on_mind', text: "Anything that's been hard, confusing, or on your mind?", kind: 'text' },
  { key: 'work_on', text: 'Something you or I need to work on', kind: 'text' },
  {
    key: 'need_more_of', text: 'What do you need more of right now?', kind: 'choice', multiSelect: true,
    options: ['Reassurance', 'Quality time', 'Affection', 'Space/Alone time', 'Patience', 'Consistency', 'Something else'],
  },
  { key: 'elaborate', text: 'If you chose "Something else" or want to elaborate, what is it?', kind: 'text' },
  { key: 'mood_stress_energy', text: 'Is there anything about your mood, stress, or energy that I should know?', kind: 'text' },
  { key: 'small_thing_together', text: 'One small thing we could do together soon', kind: 'text' },
  { key: 'anything_else', text: 'Anything else you want to say, even if it feels random', kind: 'text' },
]

const ROTATING_QUESTIONS: string[] = [
  'What made you feel closest to me this week?',
  'What is one thing I did recently that made your day better?',
  'Is there a small habit of mine you love more than I probably realize?',
  "What do you think we're doing well as a team right now?",
  'If we had one free evening this week with no obligations, what would you want to do together?',
  'What is something about us you feel more confident about than a year ago?',
  'What is a memory from this year that still makes you smile?',
  "Is there something you've wanted to try together but haven't brought up yet?",
  'What is one way I could support you better this week?',
  'What is something small I do that makes you feel loved?',
  'How do you feel about the balance between together-time and personal time lately?',
  "What is a goal, big or small, you'd like us to work toward together?",
  'When do you feel most understood by me?',
  'What is one thing about us you never want to change?',
  "Is there a conversation we've been putting off that you'd like to have?",
  'What is something you are looking forward to doing together?',
  'What did I do this week that you would want me to do more often?',
  'Where do you feel most at home with me — a place, a moment, an activity?',
  'What is a hard thing we got through together that you are glad we did?',
  'What is one thing you need from me next week that you have not asked for yet?',
  'What is a small kindness you saw from me lately?',
  'What would make next week feel like a good week for us?',
  'What is something you are proud of us for?',
  'What is a worry you have been carrying that you would rather set down together?',
  'When did you last feel really listened to by me?',
  'What is a tradition, big or small, you want us to keep?',
  'What is something you have changed your mind about since we met?',
  'What do you want more of from our ordinary days, not the special ones?',
  'What is one thing I could take off your plate this week?',
  'What does feeling like a team look like to you right now?',
]

// Deterministic-by-ISO-week (so both partners get the SAME reflection that
// week) but spread out: a stride of 7 is coprime with the list length, so
// consecutive weeks land far apart and the full list is used before any
// repeat (~7 months at this length).
const ROTATION_STRIDE = 7

/** The emoji "quick vibe" — its answer is stored under questionKey 'vibe',
 *  which HouseholdHub's VIBE_MAP knows how to badge. These four are quick
 *  picks; the field also accepts any emoji you type (2026-09-03). */
export const VIBE_OPTIONS = ['🥱', '😐', '🙂', '🥰'] as const
export const VIBE_QUESTION_KEY = 'vibe'
export const VIBE_QUESTION_TEXT = 'One emoji for how the week felt'

/** True when a string is (roughly) a single emoji — one grapheme that
 *  contains a pictographic character. Used to validate the vibe answer. */
export function isSingleEmoji(s: string): boolean {
  const t = s.trim()
  if (!t || t.length > 20) return false
  if (!/\p{Extended_Pictographic}/u.test(t)) return false
  // Reject anything with a letter/digit/space mixed in with the emoji.
  if (/[\p{L}\p{N}\s]/u.test(t)) return false
  // At most one visible grapheme cluster, when the runtime can tell us
  // (handles ZWJ sequences and skin-tone modifiers); otherwise the checks
  // above are enough.
  const Seg = (Intl as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (x: string) => Iterable<unknown> } }).Segmenter
  if (!Seg) return true
  return [...new Seg(undefined, { granularity: 'grapheme' }).segment(t)].length === 1
}

/** ISO 8601 week number (Thursday-anchored), so the same week always picks
 *  the same reflection question regardless of which day it's answered on. */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = (d.getUTCDay() + 6) % 7 // Mon=0..Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000))
}

export function rotatingQuestionForWeek(weekOf: Date): string {
  const n = ROTATING_QUESTIONS.length
  const idx = ((isoWeekNumber(weekOf) * ROTATION_STRIDE) % n + n) % n
  return ROTATING_QUESTIONS[idx]
}

/** The full question set for a given check-in week, emoji vibe first, the
 *  rotating reflection last. */
export function questionsForWeek(weekOf: Date): CheckinQuestion[] {
  return [
    { key: VIBE_QUESTION_KEY, text: VIBE_QUESTION_TEXT, kind: 'emoji', options: [...VIBE_OPTIONS] },
    ...CHECKIN_QUESTIONS,
    { key: 'weekly_reflection', text: rotatingQuestionForWeek(weekOf), kind: 'text' },
  ]
}

/** The Sunday that starts this check-in week, YYYY-MM-DD — the `week_of`
 *  key every row uses. Sunday-anchored (2026-09-03) to match how the check-in
 *  reads to people: "the week of Sept 6" runs Sun Sept 6 → Sat Sept 12, and
 *  a check-in done any day in that span counts for it. (Was Monday-anchored;
 *  the Discord bot it replaced was always Sunday-anchored, and the migrated
 *  history is stored on Sunday dates.) */
export function weekOfSunday(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - d.getUTCDay())
  return d.toISOString().slice(0, 10)
}

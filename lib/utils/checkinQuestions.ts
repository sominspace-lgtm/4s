// The weekly relationship check-in — ported verbatim from the companion
// Discord bot (companion/src/checkin/questions.ts) so 4S is now where you
// answer it, not a DM. The fixed questions mirror the columns of a Google
// Sheet with years of history; a final "reflection" question rotates weekly,
// deterministically by ISO week number (no LLM). Answers land in the
// `checkins` table, one row per (space, person, week), keyed on this week's
// Monday.

export type CheckinQuestionKind = 'text' | 'scale' | 'choice'

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
]

/** The emoji "quick vibe" — its answer is stored under questionKey 'vibe',
 *  which HouseholdHub's VIBE_MAP already knows how to badge. */
export const VIBE_OPTIONS = ['🥱', '😐', '🙂', '🥰'] as const
export const VIBE_QUESTION_KEY = 'vibe'
export const VIBE_QUESTION_TEXT = 'Quick vibe'

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
  const idx = ((isoWeekNumber(weekOf) % ROTATING_QUESTIONS.length) + ROTATING_QUESTIONS.length) % ROTATING_QUESTIONS.length
  return ROTATING_QUESTIONS[idx]
}

/** The full question set for a given check-in week, vibe first. */
export function questionsForWeek(weekOf: Date): CheckinQuestion[] {
  return [
    { key: VIBE_QUESTION_KEY, text: VIBE_QUESTION_TEXT, kind: 'choice', options: [...VIBE_OPTIONS] },
    ...CHECKIN_QUESTIONS,
    { key: 'weekly_reflection', text: rotatingQuestionForWeek(weekOf), kind: 'text' },
  ]
}

/** This week's Monday, YYYY-MM-DD — the `week_of` key every row uses. */
export function weekOfMonday(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
  return d.toISOString().slice(0, 10)
}

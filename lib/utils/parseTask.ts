import { addDays, format } from 'date-fns'

// Natural-language task parsing — "hw due today", "essay due friday",
// "p1 pay rent tomorrow", "renew passport due in 2 weeks", "dentist due 7/15".
// Pure string rules, no AI. The caller must show the result for confirmation
// before saving; this only suggests.

export interface ParsedTask {
  title: string
  dueDate: string | null // yyyy-MM-dd
  priority: number | null // 1..3
  summary: string[] // human-readable, e.g. ['due today', 'P1']
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
}

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sep: 8, sept: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd')

function nextWeekday(now: Date, target: number): Date {
  const diff = (target - now.getDay() + 7) % 7 // 0 = today
  return addDays(now, diff)
}

// If a bare month/day already passed this year, assume the user means next year.
function upcomingDate(now: Date, month: number, day: number, year?: number): Date | null {
  const y = year ?? now.getFullYear()
  const d = new Date(y, month, day)
  if (d.getMonth() !== month || d.getDate() !== day) return null // e.g. Feb 31
  if (year == null && d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return new Date(y + 1, month, day)
  }
  return d
}

interface DateRule {
  re: RegExp
  resolve: (m: RegExpMatchArray, now: Date) => Date | null
  describe: (m: RegExpMatchArray, d: Date) => string
}

const WD = Object.keys(WEEKDAYS).join('|')
const MO = Object.keys(MONTHS).join('|')

// Order matters: more specific first. All rules require a word boundary and
// most require the "due"/"by"/"on" cue so ordinary words stay in the title;
// bare "today"/"tomorrow"/"tonight" are unambiguous enough to match alone.
const DATE_RULES: DateRule[] = [
  {
    re: new RegExp(`\\b(?:due|by|on)\\s+(?:the\\s+)?(${MO})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, 'i'),
    resolve: (m, now) => upcomingDate(now, MONTHS[m[1].toLowerCase()], parseInt(m[2]), m[3] ? parseInt(m[3]) : undefined),
    describe: (_m, d) => `due ${format(d, 'MMM d')}`,
  },
  {
    re: new RegExp(`\\b(?:due|by|on)\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MO})\\b`, 'i'),
    resolve: (m, now) => upcomingDate(now, MONTHS[m[2].toLowerCase()], parseInt(m[1])),
    describe: (_m, d) => `due ${format(d, 'MMM d')}`,
  },
  {
    re: /\b(?:due|by|on)\s+(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?\b/i,
    resolve: (m, now) => {
      const year = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])) : undefined
      return upcomingDate(now, parseInt(m[1]) - 1, parseInt(m[2]), year)
    },
    describe: (_m, d) => `due ${format(d, 'MMM d')}`,
  },
  {
    re: /\b(?:due\s+)?in\s+(\d+)\s+(day|days|week|weeks|month|months)\b/i,
    resolve: (m, now) => {
      const n = parseInt(m[1])
      const unit = m[2].toLowerCase()
      return addDays(now, n * (unit.startsWith('week') ? 7 : unit.startsWith('month') ? 30 : 1))
    },
    describe: (m, d) => `due in ${m[1]} ${m[2].toLowerCase()} (${format(d, 'MMM d')})`,
  },
  {
    re: new RegExp(`\\b(?:due|by|on)\\s+(?:next\\s+)?(${WD})\\b`, 'i'),
    resolve: (m, now) => {
      const base = nextWeekday(now, WEEKDAYS[m[1].toLowerCase()])
      // "next friday" = the friday of next week, not the one coming up
      return /next\s/i.test(m[0]) ? addDays(base, 7) : base
    },
    describe: (_m, d) => `due ${format(d, 'EEEE')} (${format(d, 'MMM d')})`,
  },
  {
    re: /\b(?:due\s+)?next\s+week\b/i,
    resolve: (_m, now) => addDays(now, 7),
    describe: (_m, d) => `due next week (${format(d, 'MMM d')})`,
  },
  {
    re: /\b(?:due\s+)?(today|tonight|tod)\b/i,
    resolve: (_m, now) => now,
    describe: () => 'due today',
  },
  {
    re: /\b(?:due\s+)?(tomorrow|tmrw|tmr)\b/i,
    resolve: (_m, now) => addDays(now, 1),
    describe: (_m, d) => `due tomorrow (${format(d, 'MMM d')})`,
  },
]

const PRIORITY_RULES: { re: RegExp; priority: number; label: string }[] = [
  { re: /(?:^|\s)(p1|urgent|asap)\b/i, priority: 1, label: 'P1 urgent' },
  { re: /(?:^|\s)p2\b/i, priority: 2, label: 'P2' },
  { re: /(?:^|\s)(p3|low\s+prio(?:rity)?)\b/i, priority: 3, label: 'P3 low' },
]

export function parseTaskInput(raw: string, now = new Date()): ParsedTask | null {
  let rest = raw
  let dueDate: string | null = null
  let priority: number | null = null
  const summary: string[] = []

  for (const rule of DATE_RULES) {
    const m = rest.match(rule.re)
    if (!m) continue
    const d = rule.resolve(m, now)
    if (!d) continue
    dueDate = iso(d)
    summary.push(rule.describe(m, d))
    rest = rest.replace(rule.re, ' ')
    break
  }

  for (const rule of PRIORITY_RULES) {
    const m = rest.match(rule.re)
    if (!m) continue
    priority = rule.priority
    summary.push(rule.label)
    rest = rest.replace(rule.re, ' ')
    break
  }

  if (dueDate === null && priority === null) return null

  const title = rest
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,\-–—:]+$/g, '')
    .replace(/^[\s,\-–—:]+/g, '')
    .trim()

  if (!title) return null

  return { title, dueDate, priority, summary }
}

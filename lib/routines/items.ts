import { differenceInCalendarDays, parseISO } from 'date-fns'

// The steps inside a routine (2026-10-15). A routine's `items` column is
// jsonb, so steps can carry a section ("Wake up"), a time ("5:30 AM"), or be a
// plain line of text (a rule to remember, not a box to tick) without any new
// columns. Older routines are flat lists with none of these, and still work.

export interface RoutineItem {
  id: string
  label: string
  done: boolean
  /** The day it was ticked. A ticked step only counts as done within the routine's own cadence, so a daily routine starts fresh each morning. */
  done_on?: string | null
  /** Section heading this step sits under, e.g. "Wake up". */
  group?: string | null
  /** When the section happens, e.g. "5:30 AM" or "After dinner". */
  time?: string | null
  /** A line to read, not a step to tick. */
  note?: boolean
  /** Personal routines only: mirrored to your partner when true. */
  shared?: boolean
}

export function newItemId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Is this step done for the current period? A tick from an earlier day of a daily routine no longer counts. */
export function itemDone(i: RoutineItem, cadenceDays: number, today: Date = new Date()): boolean {
  if (!i.done || i.note) return false
  if (!i.done_on) return true
  return differenceInCalendarDays(today, parseISO(i.done_on)) < Math.max(1, cadenceDays)
}

export function countSteps(items: RoutineItem[], cadenceDays: number, today: Date = new Date()): { done: number; total: number } {
  const steps = items.filter(i => !i.note)
  return { done: steps.filter(i => itemDone(i, cadenceDays, today)).length, total: steps.length }
}

export interface RoutineSection { key: string; group: string | null; time: string | null; items: RoutineItem[] }

/** Consecutive steps that share a section become one block, in order. */
export function sectionsOf(items: RoutineItem[]): RoutineSection[] {
  const out: RoutineSection[] = []
  for (const i of items) {
    const g = i.group?.trim() || null, t = i.time?.trim() || null
    const last = out[out.length - 1]
    if (last && last.group === g && last.time === t) last.items.push(i)
    else out.push({ key: `${out.length}-${g ?? ''}-${t ?? ''}`, group: g, time: t, items: [i] })
  }
  return out
}

export interface ParsedRoutine { name: string; items: Omit<RoutineItem, 'id' | 'done'>[] }

const DASHES = /\s+[—–-]\s+/

function cleanName(s: string): string {
  const t = s.replace(/^#+\s*/, '').replace(/\*\*/g, '').replace(/[…:.]+$/, '').trim()
  if (!t) return t
  // "MORNING ROUTINE" reads better as "Morning routine".
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t
}

/**
 * Reads routines written out as plain text. A heading on its own line starts
 * a routine ("MORNING ROUTINE", "## Night routine"); a bold line starts a
 * section ("**5:30 AM — Wake up**"); a dash starts a step; a bold label with
 * text after it is a note ("**My rule:** ..."). Routines with no steps are
 * dropped, so a title line over everything does no harm.
 */
export function parseRoutineText(text: string): ParsedRoutine[] {
  const out: ParsedRoutine[] = []
  let cur: ParsedRoutine | null = null
  let group: string | null = null
  let time: string | null = null
  const start = (name: string) => { cur = { name: cleanName(name), items: [] }; out.push(cur); group = null; time = null }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || /^-{3,}$/.test(line)) continue

    const step = line.match(/^[-*•]\s+(.*)$/)
    if (step) {
      if (!cur) start('Routine')
      cur!.items.push({ label: step[1].replace(/\*\*/g, '').trim(), group, time })
      continue
    }

    const note = line.match(/^\*\*([^*]+?):?\*\*:?\s+(.+)$/)
    if (note) {
      if (!cur) start('Routine')
      cur!.items.push({ label: `${note[1].replace(/:$/, '')}: ${note[2].trim()}`, group: null, time: null, note: true })
      continue
    }

    const section = line.match(/^\*\*(.+?)\*\*$/)
    if (section) {
      if (!cur) start('Routine')
      const parts = section[1].split(DASHES)
      if (parts.length > 1) { time = parts[0].trim(); group = parts.slice(1).join(' ').trim() }
      else { time = null; group = parts[0].trim() }
      continue
    }

    // Anything else on its own line is the name of a new routine.
    start(line)
  }
  return out.filter(r => r.items.length > 0)
}

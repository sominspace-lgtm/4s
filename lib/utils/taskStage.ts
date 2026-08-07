import { differenceInCalendarDays, parseISO } from 'date-fns'

// Task stage evolution, from the 4S Village vision: a task isn't just
// todo/in-progress/done, it's something that grows. Deliberately pure and
// derived, never stored — same reasoning as habit peak_stage will use: one
// source of truth (status, dates, the landmark pin) instead of a second
// `stage` column that can drift out of sync with the data it's supposed to
// summarize.
//
// Landmark is scarce on purpose. Per the brief: if every finished errand
// became a monument, the skyline would mean nothing. Two ways in — ran 14+
// days from creation to completion (a real project, not a quick task), or
// the user pins it by hand for something that mattered regardless of how
// long it took. There is no third automatic trigger (e.g. "had subtasks")
// because 4S has no subtask model yet — better to have two honest triggers
// than a third one that's actually always false.
export type TaskStage = 'seed' | 'growing' | 'completed' | 'landmark'

export interface StageInput {
  status: 'todo' | 'in-progress' | 'done'
  due_date: string | null
  created_at: string
  completed_at?: string | null
  landmark?: boolean
}

const LANDMARK_MIN_DAYS = 14

export function taskStage(item: StageInput): TaskStage {
  if (item.status === 'done') {
    const ranLong = !!item.completed_at &&
      differenceInCalendarDays(parseISO(item.completed_at), parseISO(item.created_at)) >= LANDMARK_MIN_DAYS
    return (item.landmark || ranLong) ? 'landmark' : 'completed'
  }
  // Not done yet: growing once it has a due date or is actively being
  // worked (in-progress) — either way it's no longer just an idea sitting
  // there. Otherwise it's a seed: created, not yet taken up.
  return item.status === 'in-progress' || item.due_date ? 'growing' : 'seed'
}

export const STAGE_GLYPH: Record<TaskStage, string> = {
  seed: '·', growing: '◔', completed: '●', landmark: '◆',
}

export const STAGE_LABEL: Record<TaskStage, string> = {
  seed: 'Seed', growing: 'Growing', completed: 'Completed', landmark: 'Landmark',
}

import type { WorkItem } from '@/lib/hooks/useWorkItems'

// The notice board's four columns, from the brief's Village vision:
// 🌱 Small · 🌿 Growing · 🏗️ Projects · 🌙 Later.
export type BoardColumn = 'small' | 'growing' | 'projects' | 'later'

export const BOARD_COLUMNS: { id: BoardColumn; glyph: string; label: string }[] = [
  { id: 'small',    glyph: '🌱', label: 'Small Tasks' },
  { id: 'growing',  glyph: '🌿', label: 'Growing Tasks' },
  { id: 'projects', glyph: '🏗️', label: 'Projects' },
  { id: 'later',    glyph: '🌙', label: 'Later' },
]

// A task's column is a stored, user-set choice (board_column) once someone
// drags it or picks one by hand. Until then it's derived — same "derive
// unless overridden" shape as taskStage.ts and habit peak_stage will use —
// so every existing task lands somewhere sensible with no backfill migration
// and no "unsorted" pile nobody asked for.
//
// Energy carries most of the weight (it already answers "how much of me
// does this take", which is exactly what separates a quick task from a
// project). Later is the one exception: no due date at all reads as
// someday/maybe regardless of energy, because a light task you're not
// planning to do soon isn't meaningfully different from a heavy one you're
// not planning to do soon — neither is on your plate right now.
export function defaultColumn(item: Pick<WorkItem, 'due_date' | 'energy'>): BoardColumn {
  if (!item.due_date) return 'later'
  if (item.energy === 'deep') return 'projects'
  if (item.energy === 'medium') return 'growing'
  return 'small'
}

export function effectiveColumn(item: Pick<WorkItem, 'due_date' | 'energy' | 'board_column'>): BoardColumn {
  return item.board_column ?? defaultColumn(item)
}

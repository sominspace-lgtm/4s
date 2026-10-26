// Undo instead of "Are you sure?" (2026-10-26). A removal waits five
// seconds behind a small "Undo" bar before it really happens. UndoToast
// (mounted once on the dashboard) shows the bar and runs `commit` when the
// time is up, or straight away if another removal comes along.

export interface UndoRequest {
  label: string
  commit: () => unknown
  onUndo?: () => void
}

export const UNDO_EVENT = '4s:undo'

export function withUndo(label: string, commit: () => unknown, onUndo?: () => void) {
  if (typeof window === 'undefined') { void commit(); return }
  window.dispatchEvent(new CustomEvent<UndoRequest>(UNDO_EVENT, { detail: { label, commit, onUndo } }))
}

// What a quick spoken line means (2026-10-19), for the iPhone Shortcut:
// "add oat milk" or "oat milk, eggs" go on the shopping list; "task call the
// vet" or "remind me to call the vet" become a task; "note ..." a note.
// Commas split items; "and" does not, so "mac and cheese" stays one thing.

export type Quick =
  | { kind: 'shopping'; items: string[] }
  | { kind: 'task'; title: string }
  | { kind: 'note'; text: string }

export function parseQuick(raw: string): Quick | null {
  const text = raw.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '')
  if (!text) return null
  const task = text.match(/^(?:add\s+)?(?:a\s+)?(?:task|to-?do|todo)\s*:?\s+(?:to\s+)?(.+)$/i) ?? text.match(/^remind me to\s+(.+)$/i)
  if (task) return { kind: 'task', title: cap(task[1]) }
  const note = text.match(/^(?:add\s+)?(?:a\s+)?note\s*:?\s+(.+)$/i)
  if (note) return { kind: 'note', text: note[1] }
  const body = text
    .replace(/^(?:please\s+)?(?:add|put|get|buy)\s+/i, '')
    .replace(/\s+(?:to|on)\s+(?:the\s+)?(?:shopping|grocery|groceries)(?:\s+list)?$/i, '')
  const items = body.split(/\s*,\s*/).map(s => s.trim()).filter(Boolean).map(cap).slice(0, 20)
  return items.length ? { kind: 'shopping', items } : null
}

function cap(s: string): string {
  const t = s.trim()
  return t.charAt(0).toUpperCase() + t.slice(1, 200)
}

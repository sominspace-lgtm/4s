// Small helpers for notes that behave a bit like a Notion page (2026-10-12):
// #tags, [[links to other notes]], tickable checklists, and starter
// templates. Plain text underneath, so nothing needs a schema change and a
// note stays readable anywhere.

const TAG_RE = /(^|\s)#([A-Za-z][\w-]{1,30})/g
const LINK_RE = /\[\[([^\[\]\n]{1,80})\]\]/g

export function extractTags(body: string): string[] {
  const out = new Set<string>()
  for (const m of body.matchAll(TAG_RE)) out.add(m[2].toLowerCase())
  return [...out]
}

export function extractLinks(body: string): string[] {
  const out = new Set<string>()
  for (const m of body.matchAll(LINK_RE)) out.add(m[1].trim())
  return [...out]
}

const norm = (s: string) => s.trim().toLowerCase()

/** Notes whose body links to `title` with [[title]] (case-insensitive). */
export function backlinksFor<T extends { id: string; title: string; body: string }>(title: string, notes: T[], selfId?: string): T[] {
  if (!title.trim()) return []
  const t = norm(title)
  return notes.filter(n => n.id !== selfId && extractLinks(n.body).some(l => norm(l) === t))
}

export function findByTitle<T extends { title: string }>(title: string, notes: T[]): T | undefined {
  const t = norm(title)
  return notes.find(n => norm(n.title) === t)
}

const CHECK_RE = /^(\s*[-*]\s+)\[( |x|X)\](\s.*|)$/

/** Flip the checklist item on one line. Lines that are not checklist items are untouched. */
export function toggleCheckLine(body: string, lineIndex: number): string {
  const lines = body.split('\n')
  const m = lines[lineIndex]?.match(CHECK_RE)
  if (!m) return body
  lines[lineIndex] = `${m[1]}[${m[2] === ' ' ? 'x' : ' '}]${m[3]}`
  return lines.join('\n')
}

/** "3 of 5" style progress across a note's checklist, or null if it has none. */
export function checklistProgress(body: string): { done: number; total: number } | null {
  let done = 0, total = 0
  for (const line of body.split('\n')) {
    const m = line.match(CHECK_RE)
    if (!m) continue
    total++
    if (m[2] !== ' ') done++
  }
  return total ? { done, total } : null
}

export interface NoteTemplate { id: string; label: string; title: string; body: string }

export const NOTE_TEMPLATES: NoteTemplate[] = [
  { id: 'blank', label: 'Blank', title: '', body: '' },
  {
    id: 'meeting', label: 'Meeting notes', title: 'Meeting: ',
    body: '## Who\n\n## Notes\n- \n\n## Decisions\n- \n\n## Next steps\n- [ ] \n',
  },
  {
    id: 'weekly', label: 'Weekly review', title: 'Week of ',
    body: '## What went well\n- \n\n## What was hard\n- \n\n## Next week\n- [ ] \n- [ ] \n- [ ] \n',
  },
  {
    id: 'trip', label: 'Trip plan', title: 'Trip: ',
    body: '## Dates\n\n## Where we are staying\n\n## Packing\n- [ ] \n\n## Things to do\n- [ ] \n\n## Food\n- \n',
  },
  {
    id: 'project', label: 'Project brief', title: 'Project: ',
    body: '## Goal\n\n## Why it matters\n\n## Steps\n- [ ] \n- [ ] \n\n## Notes\n',
  },
  {
    id: 'reading', label: 'Reading list', title: 'Reading list',
    body: '## To read\n- [ ] \n\n## Reading now\n- \n\n## Finished\n- [x] \n',
  },
  {
    id: 'checklist', label: 'Checklist', title: '',
    body: '- [ ] \n- [ ] \n- [ ] \n',
  },
]

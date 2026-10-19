import { gfetch, GoogleError } from './calendar'

// Google Tasks, the default list (2026-10-18). For when the person asks for
// Google Tasks by name; ordinary tasks go to 4S's own Tasks tab.

const BASE = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks'

interface GTask { id: string; title?: string; notes?: string; due?: string; status?: string }
export interface TaskItem { id: string; title: string; notes: string | null; due: string | null; done: boolean }

const okId = (id: string) => { if (!/^[A-Za-z0-9_-]{4,200}$/.test(id)) throw new GoogleError('failed', 'That is not a Google task id.'); return id }
const dueOf = (ymd: string | null | undefined) => (ymd && /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? `${ymd}T00:00:00.000Z` : undefined)

export async function listTasks(userId: string, includeDone = false): Promise<TaskItem[]> {
  const res = await gfetch(userId, `${BASE}?${new URLSearchParams({ maxResults: '100', showCompleted: String(includeDone), showHidden: String(includeDone) })}`)
  const j = await res.json() as { items?: GTask[] }
  return (j.items ?? []).map(t => ({ id: t.id, title: t.title ?? '', notes: t.notes ?? null, due: t.due?.slice(0, 10) ?? null, done: t.status === 'completed' }))
}

export async function addTask(userId: string, t: { title: string; notes?: string | null; due?: string | null }): Promise<{ id: string }> {
  const res = await gfetch(userId, BASE, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: t.title.slice(0, 500), notes: t.notes?.slice(0, 4000) || undefined, due: dueOf(t.due) }) })
  const j = await res.json() as GTask
  if (!j.id) throw new GoogleError('failed', 'Google did not confirm the task.')
  return { id: j.id }
}

export async function updateTask(userId: string, id: string, patch: { title?: string | null; notes?: string | null; due?: string | null; done?: boolean }): Promise<{ id: string; done: boolean }> {
  const body: Record<string, unknown> = {}
  if (patch.title) body.title = patch.title.slice(0, 500)
  if (patch.notes != null) body.notes = patch.notes.slice(0, 4000)
  if (patch.due) body.due = dueOf(patch.due)
  if (patch.done !== undefined) body.status = patch.done ? 'completed' : 'needsAction'
  const res = await gfetch(userId, `${BASE}/${okId(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const j = await res.json() as GTask
  if (!j.id) throw new GoogleError('failed', 'Google did not confirm the change.')
  return { id: j.id, done: j.status === 'completed' }
}

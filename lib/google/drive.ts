import { gfetch, GoogleError } from './calendar'

// Google Drive, read only (2026-10-18): find a document and read its text.
// drive.readonly cannot change, share or delete anything.

const BASE = 'https://www.googleapis.com/drive/v3/files'

export interface DriveFile { id: string; name: string; type: string; modified: string | null; link: string | null }

const KIND: Record<string, string> = {
  'application/vnd.google-apps.document': 'Google Doc',
  'application/vnd.google-apps.spreadsheet': 'Google Sheet',
  'application/vnd.google-apps.presentation': 'Google Slides',
  'application/vnd.google-apps.folder': 'folder',
  'application/pdf': 'PDF',
}

export function driveQuery(text: string): string {
  const safe = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").slice(0, 100)
  return `(name contains '${safe}' or fullText contains '${safe}') and trashed = false`
}

export async function searchDrive(userId: string, text: string): Promise<DriveFile[]> {
  const q = new URLSearchParams({ q: driveQuery(text), pageSize: '10', orderBy: 'modifiedTime desc', fields: 'files(id,name,mimeType,modifiedTime,webViewLink)' })
  const res = await gfetch(userId, `${BASE}?${q}`)
  const j = await res.json() as { files?: { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string }[] }
  return (j.files ?? []).map(f => ({ id: f.id, name: f.name, type: KIND[f.mimeType] ?? f.mimeType, modified: f.modifiedTime?.slice(0, 10) ?? null, link: f.webViewLink ?? null }))
}

/** The most recently changed files, for a Drive list with nothing typed yet. */
export async function recentDrive(userId: string): Promise<DriveFile[]> {
  const q = new URLSearchParams({ q: "trashed = false and mimeType != 'application/vnd.google-apps.folder'", pageSize: '20', orderBy: 'modifiedTime desc', fields: 'files(id,name,mimeType,modifiedTime,webViewLink)' })
  const res = await gfetch(userId, `${BASE}?${q}`)
  const j = await res.json() as { files?: { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string }[] }
  return (j.files ?? []).map(f => ({ id: f.id, name: f.name, type: KIND[f.mimeType] ?? f.mimeType, modified: f.modifiedTime?.slice(0, 10) ?? null, link: f.webViewLink ?? null }))
}

const EXPORT: Record<string, string> = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.presentation': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv',
}

export async function readDrive(userId: string, id: string): Promise<{ name: string; text: string; link: string | null; truncated: boolean }> {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) throw new GoogleError('failed', 'That is not a Drive file id.')
  const meta = await (await gfetch(userId, `${BASE}/${id}?fields=name,mimeType,size,webViewLink`)).json() as { name: string; mimeType: string; size?: string; webViewLink?: string }
  let text: string
  if (EXPORT[meta.mimeType]) {
    text = await (await gfetch(userId, `${BASE}/${id}/export?mimeType=${encodeURIComponent(EXPORT[meta.mimeType])}`)).text()
  } else if (/^text\/|json|csv|markdown/.test(meta.mimeType)) {
    if (Number(meta.size ?? 0) > 2_000_000) throw new GoogleError('failed', 'That file is too big to read here.')
    text = await (await gfetch(userId, `${BASE}/${id}?alt=media`)).text()
  } else {
    throw new GoogleError('failed', `I can only read Docs, Sheets, Slides and text files, not a ${KIND[meta.mimeType] ?? meta.mimeType}. Open it from its link instead.`)
  }
  const limit = 12_000
  return { name: meta.name, text: text.slice(0, limit), link: meta.webViewLink ?? null, truncated: text.length > limit }
}

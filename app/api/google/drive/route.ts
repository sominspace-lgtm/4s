import { NextResponse } from 'next/server'
import { requireGoogleAccess } from '@/lib/google/server'
import { searchDrive, recentDrive } from '@/lib/google/drive'

// Google Drive, read only (2026-10-24): recent files, or a search, from your
// own Drive or the shared account's (?account=shared). The shared one also
// works on the shared screen. Files open in Google from their link.

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams
  const who = await requireGoogleAccess(sp.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const q = (sp.get('q') ?? '').trim().slice(0, 100)
  try {
    return NextResponse.json({ files: q ? await searchDrive(who.owner, q) : await recentDrive(who.owner) })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'not-connected' || (e instanceof Error && e.message === 'not-connected')) return NextResponse.json({ error: 'not-connected' }, { status: 409 })
    return NextResponse.json({ error: e instanceof Error && e.message ? e.message : 'Drive did not answer. Try again.' }, { status: 502 })
  }
}

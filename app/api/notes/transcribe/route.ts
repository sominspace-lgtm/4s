import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Voice notes (2026-10-23): a recording from the Notes page becomes text.
// Uses Groq's free speech-to-text (Whisper). Nothing is stored here; the
// audio is sent once, the words come back, and the browser saves the note.

const MAX_BYTES = 20 * 1024 * 1024

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'Voice notes need the Groq key on the server.' }, { status: 503 })

  const form = await request.formData().catch(() => null)
  const audio = form?.get('audio')
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: 'No recording came through.' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'That recording is too long.' }, { status: 413 })

  const type = audio.type || 'audio/webm'
  const ext = type.includes('mp4') || type.includes('m4a') || type.includes('aac') ? 'm4a' : type.includes('ogg') ? 'ogg' : type.includes('wav') ? 'wav' : 'webm'
  const out = new FormData()
  out.append('file', audio, `note.${ext}`)
  out.append('model', process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo')
  out.append('response_format', 'json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST', headers: { authorization: `Bearer ${key}` }, body: out,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[notes/transcribe]', res.status, detail.slice(0, 300))
    return NextResponse.json({ error: 'Could not turn that into text. Try again.' }, { status: 502 })
  }
  const j = await res.json() as { text?: string }
  return NextResponse.json({ text: (j.text ?? '').trim() })
}

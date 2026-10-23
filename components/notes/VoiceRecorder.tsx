'use client'

import { useEffect, useRef, useState } from 'react'

// Record a voice note (2026-10-23). Tap to start, tap to stop; the words come
// back as text through /api/notes/transcribe and go wherever onText puts them
// (a new note, or the end of the note you are writing).

type State = 'idle' | 'recording' | 'working'
const MAX_SECONDS = 600

function pickType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t
  }
  return undefined
}

export default function VoiceRecorder({ onText, label = 'Record', compact = false }: {
  onText: (text: string) => void | Promise<void>
  label?: string
  compact?: boolean
}) {
  const [state, setState] = useState<State>('idle')
  const [secs, setSecs] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
    recRef.current?.stream.getTracks().forEach(t => t.stop())
  }, [])

  async function start() {
    setErr(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErr('This browser cannot record. Try Safari or Chrome.'); return
    }
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { setErr('Allow the microphone to record a note.'); return }
    const type = pickType()
    const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    chunks.current = []
    rec.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
    rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); void send(new Blob(chunks.current, { type: rec.mimeType || type || 'audio/webm' })) }
    recRef.current = rec
    rec.start(1000)
    setSecs(0); setState('recording')
    timer.current = setInterval(() => setSecs(s => s + 1), 1000)
  }

  function stop() {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    setState('working')
  }

  async function send(blob: Blob) {
    try {
      const fd = new FormData()
      fd.append('audio', blob)
      const res = await fetch('/api/notes/transcribe', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({})) as { text?: string; error?: string }
      if (!res.ok) { setErr(j.error ?? 'Could not turn that into text.'); return }
      if (!j.text) { setErr('No words were heard.'); return }
      await onText(j.text)
    } catch { setErr('Could not send the recording.') }
    finally { setState('idle') }
  }

  // A long recording stops itself at ten minutes.
  useEffect(() => { if (state === 'recording' && secs >= MAX_SECONDS) stop() })

  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      {state === 'recording' ? (
        <button onClick={stop} className="btn btn-primary press" style={{ background: 'var(--rose)', borderColor: 'var(--rose)', minHeight: compact ? 36 : 44, display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <span aria-hidden style={{ width: 9, height: 9, borderRadius: 2, background: 'currentColor' }} /> Stop {mmss}
        </button>
      ) : (
        <button onClick={start} disabled={state === 'working'} className="btn btn-secondary press" style={{ minHeight: compact ? 36 : 44, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span aria-hidden style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--rose)' }} />
          {state === 'working' ? 'Writing it down…' : label}
        </button>
      )}
      {err && <span style={{ fontSize: '0.74rem', color: 'var(--rose)' }}>{err}</span>}
    </span>
  )
}

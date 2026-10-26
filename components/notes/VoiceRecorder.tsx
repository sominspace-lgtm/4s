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
  const streamRef = useRef<MediaStream | null>(null)
  const parts = useRef<Promise<{ text: string; error: string | null }>[]>([])
  const stopping = useRef(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const segTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current)
    if (segTimer.current) clearInterval(segTimer.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  // One piece of the recording to text. A long note is sent in two-minute
  // pieces (2026-10-26): the server takes about 4.5 MB per upload, and a
  // phone fills that in a few minutes. Each piece is a whole file of its own.
  async function transcribe(blob: Blob): Promise<{ text: string; error: string | null }> {
    try {
      const fd = new FormData()
      fd.append('audio', blob)
      const res = await fetch('/api/notes/transcribe', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({})) as { text?: string; error?: string }
      if (!res.ok) return { text: '', error: j.error ?? 'Could not turn that into text.' }
      // Whisper hears "Thank you." in silence; a piece that is only that is dropped.
      const t = (j.text ?? '').trim()
      return { text: /^(thank you|thanks for watching|you)[.!]?$/i.test(t) ? '' : t, error: null }
    } catch { return { text: '', error: 'Could not send the recording.' } }
  }

  function startPiece(stream: MediaStream, type: string | undefined) {
    const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 64000 })
    const bits: Blob[] = []
    rec.ondataavailable = e => { if (e.data.size > 0) bits.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(bits, { type: rec.mimeType || type || 'audio/webm' })
      if (blob.size > 2000) parts.current.push(transcribe(blob))
      if (stopping.current) void finish()
      else startPiece(stream, type)
    }
    // No timeslice: Safari's recordings come out whole this way.
    rec.start()
    recRef.current = rec
  }

  async function start() {
    setErr(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErr('This browser cannot record. Try Safari or Chrome.'); return
    }
    let stream: MediaStream
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }) }
    catch { setErr('Allow the microphone to record a note.'); return }
    streamRef.current = stream
    parts.current = []
    stopping.current = false
    try { startPiece(stream, pickType()) }
    catch { stream.getTracks().forEach(t => t.stop()); setErr('This browser cannot record. Try Safari or Chrome.'); return }
    setSecs(0); setState('recording')
    timer.current = setInterval(() => setSecs(s => s + 1), 1000)
    segTimer.current = setInterval(() => { if (recRef.current?.state === 'recording') recRef.current.stop() }, 120_000)
  }

  function stop() {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
    if (segTimer.current) { clearInterval(segTimer.current); segTimer.current = null }
    stopping.current = true
    setState('working')
    if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop()
    else void finish()
  }

  async function finish() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    const done = await Promise.all(parts.current)
    const text = done.map(d => d.text).filter(Boolean).join(' ').trim()
    const problem = done.find(d => d.error)?.error ?? null
    if (text) {
      try { await onText(text) } catch { setErr('Could not save the note.') }
      if (problem) setErr(`Part of it did not come through. ${problem}`)
    } else setErr(problem ?? 'No words were heard.')
    setState('idle')
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

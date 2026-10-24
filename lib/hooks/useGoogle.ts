'use client'

import { useCallback, useEffect, useState } from 'react'
import { addDays, format, startOfDay } from 'date-fns'

// Client side of the Google connection (2026-10-05). The browser only ever
// talks to /api/google/*; tokens never leave the server. Status and the
// calendar window are cached at module level so the several calendar views
// that mount at once share one request instead of each making their own.

export interface GoogleStatus {
  configured: boolean
  connected: boolean
  email?: string | null
  calendar?: boolean
  gmail?: boolean
  send?: boolean
  tasks?: boolean
  drive?: boolean
  drafts?: boolean
  /** Shared mode: Google is deliberately unavailable. */
  blocked?: boolean
  /** The household's shared Google account (2026-10-24). */
  household?: { available: boolean; connected: boolean; email: string | null }
}

export interface GoogleEvent {
  id: string
  title: string
  /** ISO date-time, or a plain yyyy-MM-dd for all-day events. */
  start: string
  /** Same shape as start. For all-day events Google makes this exclusive. */
  end: string
  allDay: boolean
  location: string | null
  link: string | null
}

const NONE: GoogleStatus = { configured: false, connected: false }
let statusCache: { at: number; value: GoogleStatus } | null = null
let statusInflight: Promise<GoogleStatus> | null = null

export function notifyGoogleChanged() {
  statusCache = null
  eventsCache = null
  window.dispatchEvent(new CustomEvent('4s:google-changed'))
}

export async function loadGoogleStatus(): Promise<GoogleStatus> {
  if (statusCache && Date.now() - statusCache.at < 60_000) return statusCache.value
  if (statusInflight) return statusInflight
  statusInflight = fetch('/api/google/status')
    .then(r => (r.ok ? (r.json() as Promise<GoogleStatus>) : NONE))
    .catch(() => NONE)
    .then(v => { statusCache = { at: Date.now(), value: v }; statusInflight = null; return v })
  return statusInflight
}

export function useGoogleStatus() {
  const [status, setStatus] = useState<GoogleStatus>(statusCache?.value ?? NONE)
  const [loading, setLoading] = useState(!statusCache)

  const load = useCallback(async () => {
    setStatus(await loadGoogleStatus())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const on = () => { load() }
    window.addEventListener('4s:google-changed', on)
    return () => window.removeEventListener('4s:google-changed', on)
  }, [load])

  const connect = () => { window.location.href = '/api/google/connect' }
  const disconnect = async () => {
    await fetch('/api/google/disconnect', { method: 'POST' })
    notifyGoogleChanged()
  }
  // The household's shared Google account: same sign-in, saved to the household.
  const connectShared = () => { window.location.href = '/api/google/connect?for=household' }
  const disconnectShared = async () => {
    await fetch('/api/google/disconnect?account=shared', { method: 'POST' })
    notifyGoogleChanged()
  }
  return { status, loading, connect, disconnect, connectShared, disconnectShared }
}

// --- calendar window --------------------------------------------------------
let eventsCache: { key: string; at: number; events: GoogleEvent[] } | null = null
let eventsInflight: { key: string; p: Promise<GoogleEvent[]> } | null = null

const WINDOW_BACK = 31
const WINDOW_FWD = 62

async function loadGoogleEvents(): Promise<GoogleEvent[]> {
  const from = startOfDay(addDays(new Date(), -WINDOW_BACK))
  const to = startOfDay(addDays(new Date(), WINDOW_FWD))
  const key = format(from, 'yyyy-MM-dd')
  if (eventsCache && eventsCache.key === key && Date.now() - eventsCache.at < 120_000) return eventsCache.events
  if (eventsInflight && eventsInflight.key === key) return eventsInflight.p
  const p = fetch(`/api/google/calendar?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`)
    .then(r => (r.ok ? (r.json() as Promise<{ events: GoogleEvent[] }>) : { events: [] as GoogleEvent[] }))
    .catch(() => ({ events: [] as GoogleEvent[] }))
    .then(j => { eventsCache = { key, at: Date.now(), events: j.events }; eventsInflight = null; return j.events })
  eventsInflight = { key, p }
  return p
}

/** Google Calendar events for the window the agenda views use. Empty until connected. */
export function useGoogleEvents(enabled: boolean): GoogleEvent[] {
  const [events, setEvents] = useState<GoogleEvent[]>(eventsCache?.events ?? [])

  useEffect(() => {
    if (!enabled) { setEvents([]); return }
    let alive = true
    const run = () => { loadGoogleEvents().then(e => { if (alive) setEvents(e) }) }
    run()
    window.addEventListener('4s:google-changed', run)
    return () => { alive = false; window.removeEventListener('4s:google-changed', run) }
  }, [enabled])

  return events
}

export async function createGoogleEvent(e: { title: string; date: string; time?: string | null; notes?: string | null }): Promise<string | null> {
  const res = await fetch('/api/google/calendar', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: e.title, date: e.date, time: e.time ?? undefined, notes: e.notes ?? undefined }),
  })
  if (!res.ok) return res.status === 409 ? 'Google is not connected.' : 'Google did not accept that event.'
  notifyGoogleChanged()
  return null
}

// --- gmail ------------------------------------------------------------------
export interface GmailSummary { id: string; from: string; subject: string; date: string; snippet: string; unread: boolean }
export interface GmailMessage { id: string; from: string; to: string; subject: string; date: string; body: string }

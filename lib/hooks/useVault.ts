'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  PBKDF2_ITERATIONS, newSalt, deriveKey, makeVerifier, checkVerifier, encryptJson, decryptJson,
} from '@/lib/vault/crypto'

// The password vault (2026-10-12). The decrypted key lives only in this
// module's memory while unlocked; it is never stored, logged, or sent. It
// clears on lock, on an idle timeout, and on a page reload.
//
// Two vaults share this code (2026-10-12): your own (spaceId null, locked with
// your passphrase) and the household's (a space id, locked with a passphrase
// you and your partner both know, agreed in person — the server never sees
// it). Each has its own salt, verifier and key, and entries are bound to
// their row id, so one can never be read with the other's key.

export interface VaultEntry {
  id: string
  title: string
  username: string
  password: string
  url: string
  category: string
  notes: string
  /** ISO time the password last changed, for the "it's been a while" nudge. */
  changedAt: string
  favorite: boolean
  createdAt: string
}

type Plain = Omit<VaultEntry, 'id' | 'createdAt'> & { createdAt?: string }

export type VaultStatus = 'loading' | 'none' | 'locked' | 'unlocked'

const IDLE_MS = 5 * 60_000
// One live key per vault, keyed by 'personal' or the space id.
const sessionKeys = new Map<string, CryptoKey>()

export function useVault(userId: string, spaceId: string | null = null) {
  const supabase = createClient()
  const scope = spaceId ?? 'personal'
  const keysTable = spaceId ? 'household_vault_keys' : 'vault_keys'
  const entriesTable = spaceId ? 'household_vault_entries' : 'vault_entries'
  const [status, setStatus] = useState<VaultStatus>('loading')
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const keyRow = useRef<{ salt: string; verifier: string; iterations: number } | null>(null)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const lock = useCallback(() => {
    sessionKeys.delete(scope)
    setEntries([])
    setStatus(keyRow.current ? 'locked' : 'none')
  }, [scope])

  const touch = useCallback(() => {
    if (!sessionKeys.has(scope)) return
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(lock, IDLE_MS)
  }, [lock, scope])

  // Any activity while unlocked pushes the auto-lock back.
  useEffect(() => {
    if (status !== 'unlocked') return
    touch()
    const evs = ['pointerdown', 'keydown', 'scroll'] as const
    evs.forEach(e => window.addEventListener(e, touch, { passive: true }))
    return () => {
      evs.forEach(e => window.removeEventListener(e, touch))
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [status, touch])

  const decryptAll = useCallback(async (key: CryptoKey) => {
    const base = supabase.from(entriesTable).select('id, ciphertext, created_at')
    const { data } = await (spaceId ? base.eq('space_id', spaceId) : base.eq('user_id', userId)).order('created_at')
    const out: VaultEntry[] = []
    for (const row of (data ?? []) as { id: string; ciphertext: string; created_at: string }[]) {
      const p = await decryptJson<Plain>(key, row.ciphertext, row.id)
      if (p) out.push({ ...p, id: row.id, createdAt: p.createdAt ?? row.created_at })
    }
    setEntries(out)
  }, [supabase, userId, spaceId, entriesTable])

  // First load: is there a vault, and is a key already live in this tab?
  useEffect(() => {
    let alive = true
    ;(async () => {
      const keyQuery = supabase.from(keysTable).select('salt, verifier, iterations')
      const { data, error: e } = await (spaceId ? keyQuery.eq('space_id', spaceId) : keyQuery.eq('user_id', userId)).maybeSingle()
      if (!alive) return
      if (e) { setError('The vault is not set up on the server yet.'); setStatus('none'); return }
      keyRow.current = data as typeof keyRow.current
      if (!data) { setStatus('none'); return }
      const live = sessionKeys.get(scope)
      if (live) { await decryptAll(live); if (alive) setStatus('unlocked') }
      else setStatus('locked')
    })()
    return () => { alive = false }
  }, [supabase, userId, spaceId, scope, keysTable, decryptAll])

  async function setup(passphrase: string): Promise<string | null> {
    setBusy(true); setError(null)
    try {
      const salt = newSalt()
      const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS)
      const verifier = await makeVerifier(key)
      const { error: e } = await supabase.from(keysTable).insert(
        spaceId
          ? { space_id: spaceId, created_by: userId, salt, verifier, iterations: PBKDF2_ITERATIONS }
          : { user_id: userId, salt, verifier, iterations: PBKDF2_ITERATIONS },
      )
      if (e) { setError(e.message); return e.message }
      keyRow.current = { salt, verifier, iterations: PBKDF2_ITERATIONS }
      sessionKeys.set(scope, key)
      setEntries([])
      setStatus('unlocked')
      return null
    } finally { setBusy(false) }
  }

  async function unlock(passphrase: string): Promise<boolean> {
    const row = keyRow.current
    if (!row) return false
    setBusy(true); setError(null)
    try {
      const key = await deriveKey(passphrase, row.salt, row.iterations)
      if (!(await checkVerifier(key, row.verifier))) { setError('That passphrase does not match.'); return false }
      sessionKeys.set(scope, key)
      await decryptAll(key)
      setStatus('unlocked')
      return true
    } finally { setBusy(false) }
  }

  async function save(draft: Omit<VaultEntry, 'id' | 'createdAt' | 'changedAt'> & { id?: string }): Promise<string | null> {
    const sessionKey = sessionKeys.get(scope)
    if (!sessionKey) return 'The vault is locked.'
    const existing = draft.id ? entries.find(e => e.id === draft.id) : undefined
    const id = draft.id ?? crypto.randomUUID()
    const nowIso = new Date().toISOString()
    const plain: Plain = {
      title: draft.title.trim(), username: draft.username.trim(), password: draft.password,
      url: draft.url.trim(), category: draft.category, notes: draft.notes, favorite: draft.favorite,
      changedAt: existing && existing.password === draft.password ? existing.changedAt : nowIso,
      createdAt: existing?.createdAt ?? nowIso,
    }
    const ciphertext = await encryptJson(sessionKey, plain, id)
    const { error: e } = existing
      ? await supabase.from(entriesTable).update({ ciphertext, updated_at: nowIso }).eq('id', id)
      : await supabase.from(entriesTable).insert(spaceId ? { id, space_id: spaceId, created_by: userId, ciphertext } : { id, user_id: userId, ciphertext })
    if (e) return e.message
    const entry: VaultEntry = { ...plain, id, createdAt: plain.createdAt! }
    setEntries(prev => existing ? prev.map(x => (x.id === id ? entry : x)) : [...prev, entry])
    touch()
    return null
  }

  async function remove(id: string): Promise<string | null> {
    const { error: e } = await supabase.from(entriesTable).delete().eq('id', id)
    if (e) return e.message
    setEntries(prev => prev.filter(x => x.id !== id))
    return null
  }

  return { status, entries, error, busy, setup, unlock, lock, save, remove }
}

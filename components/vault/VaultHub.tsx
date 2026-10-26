'use client'

import { withUndo } from '@/lib/ui/undo'
import { useMemo, useState } from 'react'
import { useVault, type VaultEntry } from '@/lib/hooks/useVault'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { DEFAULT_GEN, generatePassword, strengthOf, type GenOptions } from '@/lib/vault/crypto'
import IconButton from '@/components/ui/IconButton'

// Passwords (2026-10-12). Everything here is encrypted on this device before
// it is saved; 4S cannot read it and cannot reset it. See lib/vault/crypto.ts.

const CATEGORIES = ['Login', 'Email', 'Bank', 'Shopping', 'Streaming', 'Utilities', 'Home & Wi-Fi', 'Work', 'Travel', 'Other']
const YEAR_MS = 365 * 86_400_000

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '0.5rem 0.7rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
  fontSize: '0.82rem', outline: 'none',
}
const muted: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6 }
const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.2rem 1.4rem' }
const STRENGTH_COLOR = { weak: 'var(--rose)', okay: 'var(--amber)', strong: 'var(--emerald)' }

function copyClear(text: string, done: (msg: string) => void) {
  navigator.clipboard.writeText(text).then(() => {
    done('Copied. It clears from your clipboard in 20 seconds.')
    setTimeout(() => { navigator.clipboard.writeText('').catch(() => {}) }, 20_000)
  }).catch(() => done('Could not copy. Select it and copy by hand.'))
}

function StrengthBar({ pw }: { pw: string }) {
  if (!pw) return null
  const s = strengthOf(pw)
  const n = s === 'weak' ? 1 : s === 'okay' ? 2 : 3
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem' }}>
      {[1, 2, 3].map(i => <span key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i <= n ? STRENGTH_COLOR[s] : 'var(--faint)' }} />)}
      <span style={{ fontSize: '0.62rem', color: STRENGTH_COLOR[s], width: '3.2rem' }}>{s}</span>
    </div>
  )
}

// Two vaults (2026-10-12): Mine (only you, your own passphrase) and Household
// (both of you, one shared passphrase you agree on in person). Each is
// encrypted separately, so unlocking one never opens the other.
export default function VaultHub({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null
  const [scope, setScope] = useState<'mine' | 'household'>(spaceId ? 'household' : 'mine')
  const seg = (active: boolean): React.CSSProperties => ({
    fontSize: '0.7rem', padding: '0.3em 0.9em', borderRadius: '7px', cursor: 'pointer', border: 'none',
    fontFamily: 'var(--font-body)', background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--text)' : 'var(--muted)',
  })
  const active = scope === 'household' && spaceId ? 'household' : 'mine'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {spaceId && (
        <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--hover-bg)', borderRadius: '8px', padding: '0.2rem', width: 'fit-content' }}>
          <button className="press" onClick={() => setScope('household')} style={seg(active === 'household')}>Household</button>
          <button className="press" onClick={() => setScope('mine')} style={seg(active === 'mine')}>Only me</button>
        </div>
      )}
      <VaultScope key={active} userId={userId} spaceId={active === 'household' ? spaceId : null} />
    </div>
  )
}

function VaultScope({ userId, spaceId }: { userId: string; spaceId: string | null }) {
  const vault = useVault(userId, spaceId)
  const household = !!spaceId

  if (vault.status === 'loading') return <div style={muted}>Opening…</div>
  if (vault.status === 'none') return <Setup vault={vault} household={household} />
  if (vault.status === 'locked') return <Locked vault={vault} household={household} />
  return <Unlocked vault={vault} household={household} />
}

type Vault = ReturnType<typeof useVault>

function Setup({ vault, household }: { vault: Vault; household: boolean }) {
  const [pass, setPass] = useState('')
  const [again, setAgain] = useState('')
  const [ack, setAck] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ok = pass.length >= 10 && pass === again && ack

  async function go() {
    setErr(null)
    if (pass.length < 10) { setErr('Use at least 10 characters. A few random words is great.'); return }
    if (pass !== again) { setErr('The two passphrases do not match.'); return }
    const e = await vault.setup(pass)
    if (e) setErr(e)
  }

  return (
    <div style={{ ...card, maxWidth: '30rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)' }}>{household ? 'Set up the household vault' : 'Set up your password vault'}</div>
      <div style={muted}>
        {household
          ? 'Wi-Fi, streaming accounts, utilities, the things you both need. Pick one passphrase and tell your partner in person: you both type the same one to open it. '
          : 'Pick one passphrase. '}
        Everything you save is scrambled on this device with it before it reaches the server, so
        nobody else can read it, not even us. The tradeoff is that <strong style={{ color: 'var(--text)' }}>if it is forgotten, the vault cannot be recovered</strong>.
      </div>
      <input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Vault passphrase" autoComplete="new-password" style={field} />
      <StrengthBar pw={pass} />
      <input type="password" value={again} onChange={e => setAgain(e.target.value)} placeholder="Type it again" autoComplete="new-password" style={field} />
      <label style={{ ...muted, display: 'flex', gap: '0.5rem', alignItems: 'flex-start', cursor: 'pointer' }}>
        <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} style={{ marginTop: '0.2rem' }} />
        I understand there is no way to reset this passphrase.
      </label>
      {(err || vault.error) && <div style={{ ...muted, color: 'var(--rose)' }}>{err ?? vault.error}</div>}
      <div><button onClick={go} disabled={!ok || vault.busy} className="btn btn-primary press" style={{ fontSize: '0.76rem' }}>{vault.busy ? 'Setting up…' : 'Create vault'}</button></div>
    </div>
  )
}

function Locked({ vault, household }: { vault: Vault; household: boolean }) {
  const [pass, setPass] = useState('')
  return (
    <form onSubmit={e => { e.preventDefault(); vault.unlock(pass) }} style={{ ...card, maxWidth: '26rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)' }}>{household ? 'Household vault locked' : 'Vault locked'}</div>
      <input type="password" autoFocus value={pass} onChange={e => setPass(e.target.value)} placeholder={household ? 'Household passphrase' : 'Vault passphrase'} autoComplete="current-password" style={field} />
      {vault.error && <div style={{ ...muted, color: 'var(--rose)' }}>{vault.error}</div>}
      <div><button disabled={!pass || vault.busy} className="btn btn-primary press" style={{ fontSize: '0.76rem' }}>{vault.busy ? 'Unlocking…' : 'Unlock'}</button></div>
      <div style={muted}>It locks itself after 5 minutes without use.</div>
    </form>
  )
}

type Filter = 'all' | 'weak' | 'reused' | 'old' | 'favorite'

function Unlocked({ vault, household }: { vault: Vault; household: boolean }) {
  const { entries } = vault
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('All')
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<VaultEntry | 'new' | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const health = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of entries) if (e.password) counts.set(e.password, (counts.get(e.password) ?? 0) + 1)
    const weak = new Set(entries.filter(e => e.password && strengthOf(e.password) === 'weak').map(e => e.id))
    const reused = new Set(entries.filter(e => e.password && (counts.get(e.password) ?? 0) > 1).map(e => e.id))
    const old = new Set(entries.filter(e => Date.now() - new Date(e.changedAt).getTime() > YEAR_MS).map(e => e.id))
    return { weak, reused, old }
  }, [entries])

  const shown = entries.filter(e => {
    if (cat !== 'All' && e.category !== cat) return false
    if (filter === 'weak' && !health.weak.has(e.id)) return false
    if (filter === 'reused' && !health.reused.has(e.id)) return false
    if (filter === 'old' && !health.old.has(e.id)) return false
    if (filter === 'favorite' && !e.favorite) return false
    const needle = q.trim().toLowerCase()
    return !needle || [e.title, e.username, e.url, e.notes].some(f => f.toLowerCase().includes(needle))
  }).sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.title.localeCompare(b.title))

  const chip = (active: boolean): React.CSSProperties => ({
    fontSize: '0.66rem', padding: '0.25em 0.75em', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-body)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    background: active ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--muted)',
  })

  const checkups: { id: Filter; n: number; text: string }[] = [
    { id: 'weak', n: health.weak.size, text: `${health.weak.size} password${health.weak.size === 1 ? ' is' : 's are'} short or easy to guess` },
    { id: 'reused', n: health.reused.size, text: `${health.reused.size} accounts share a password with another` },
    { id: 'old', n: health.old.size, text: `${health.old.size} ${health.old.size === 1 ? 'has' : 'have'} not changed in over a year` },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search passwords" style={{ ...field, flex: 1, minWidth: '10rem' }} />
        <button onClick={() => setEditing('new')} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>Add</button>
        <button onClick={vault.lock} className="btn btn-ghost press" style={{ fontSize: '0.74rem' }}>Lock</button>
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {['All', ...CATEGORIES].map(c => <button key={c} className="press" onClick={() => setCat(c)} style={chip(cat === c)}>{c}</button>)}
        <button className="press" onClick={() => setFilter(filter === 'favorite' ? 'all' : 'favorite')} style={chip(filter === 'favorite')}>Starred</button>
      </div>

      {checkups.some(c => c.n > 0) && (
        <div style={{ ...card, padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>Checkup</div>
          {checkups.filter(c => c.n > 0).map(c => (
            <button key={c.id} onClick={() => setFilter(filter === c.id ? 'all' : c.id)} style={{
              textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)',
              fontSize: '0.76rem', color: filter === c.id ? 'var(--gold)' : 'var(--text)',
            }}>{c.text}{filter === c.id ? ' (showing)' : ''}</button>
          ))}
        </div>
      )}

      {note && <div style={muted}>{note}</div>}

      {editing && (
        <Editor
          key={editing === 'new' ? 'new' : editing.id}
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSave={async d => { const e = await vault.save(d); if (!e) setEditing(null); return e }}
        />
      )}

      {entries.length === 0 && !editing && <div style={{ ...muted, fontStyle: 'italic', textAlign: 'center', padding: '1.2rem 0' }}>{household ? 'Nothing saved yet. Start with the Wi-Fi and the streaming accounts.' : 'Nothing saved yet. Add your first one.'}</div>}
      {entries.length > 0 && shown.length === 0 && <div style={{ ...muted, textAlign: 'center', padding: '1rem 0' }}>No matches.</div>}

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {shown.map(e => (
          <Row key={e.id} e={e} flags={{ weak: health.weak.has(e.id), reused: health.reused.has(e.id), old: health.old.has(e.id) }}
            onEdit={() => setEditing(e)} onNote={setNote}
            onDelete={() => withUndo(`Deleting "${e.title}"`, () => vault.remove(e.id))}
            onStar={() => vault.save({ ...e, favorite: !e.favorite })} />
        ))}
      </div>
    </div>
  )
}

function Row({ e, flags, onEdit, onDelete, onStar, onNote }: {
  e: VaultEntry; flags: { weak: boolean; reused: boolean; old: boolean }
  onEdit: () => void; onDelete: () => void; onStar: () => void; onNote: (m: string) => void
}) {
  const [show, setShow] = useState(false)
  const tags = [flags.weak && 'weak', flags.reused && 'reused', flags.old && 'old'].filter(Boolean) as string[]
  const link = /^https?:\/\//i.test(e.url) ? e.url : e.url ? `https://${e.url}` : ''
  const btn: React.CSSProperties = { fontSize: '0.64rem', padding: '0.2em 0.6em', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }
  return (
    <div style={{ padding: '0.7rem 0.1rem', borderBottom: '1px solid var(--faint)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <IconButton label={e.favorite ? 'Unstar' : 'Star'} onClick={onStar} size={14} style={{ color: e.favorite ? 'var(--gold)' : 'var(--muted)', opacity: e.favorite ? 1 : 0.5 }}>{e.favorite ? '★' : '☆'}</IconButton>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.84rem', color: 'var(--text)' }}>
            {link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{e.title}</a> : e.title}
            <span style={{ ...muted, marginLeft: '0.5rem', fontSize: '0.62rem' }}>{e.category}</span>
          </div>
          {e.username && <div style={muted}>{e.username}</div>}
        </div>
        {tags.map(t => <span key={t} style={{ fontSize: '0.58rem', color: 'var(--amber)', border: '1px solid color-mix(in srgb, var(--amber) 40%, transparent)', borderRadius: '999px', padding: '0.1em 0.55em' }}>{t}</span>)}
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem', color: 'var(--text)', background: 'var(--surface2)', borderRadius: '6px', padding: '0.2em 0.5em', wordBreak: 'break-all' }}>
          {show ? e.password : '••••••••••'}
        </code>
        <button style={btn} onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'}</button>
        <button style={btn} onClick={() => copyClear(e.password, onNote)}>Copy password</button>
        {e.username && <button style={btn} onClick={() => copyClear(e.username, onNote)}>Copy username</button>}
        <button style={btn} onClick={onEdit}>Edit</button>
        <button style={{ ...btn, color: 'var(--rose)' }} onClick={onDelete}>Delete</button>
      </div>
      {e.notes && <div style={{ ...muted, whiteSpace: 'pre-wrap' }}>{e.notes}</div>}
    </div>
  )
}

function Editor({ initial, onSave, onCancel }: {
  initial: VaultEntry | null
  onSave: (d: Omit<VaultEntry, 'id' | 'createdAt' | 'changedAt'> & { id?: string }) => Promise<string | null>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Login')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [reveal, setReveal] = useState(!initial)
  const [gen, setGen] = useState<GenOptions>(DEFAULT_GEN)
  const [showGen, setShowGen] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function regenerate(next: GenOptions = gen) { setPassword(generatePassword(next)); setReveal(true) }

  async function save() {
    if (!title.trim()) { setErr('Give it a name.'); return }
    setSaving(true); setErr(null)
    const e = await onSave({ id: initial?.id, title, username, password, url, category, notes, favorite: initial?.favorite ?? false })
    setSaving(false)
    if (e) setErr(e)
  }

  const toggle = (k: keyof Omit<GenOptions, 'length'>) => { const next = { ...gen, [k]: !gen[k] }; setGen(next); regenerate(next) }

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{initial ? 'Edit' : 'New password'}</div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Name (Netflix, Chase, Wi-Fi at home)" style={field} autoFocus />
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username or email" autoComplete="off" style={field} />
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <input type={reveal ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" autoComplete="new-password" style={{ ...field, fontFamily: 'var(--font-mono)' }} />
        <button type="button" className="btn btn-ghost press" style={{ fontSize: '0.68rem' }} onClick={() => setReveal(r => !r)}>{reveal ? 'Hide' : 'Show'}</button>
        <button type="button" className="btn btn-secondary press" style={{ fontSize: '0.68rem' }} onClick={() => { setShowGen(true); regenerate() }}>Generate</button>
      </div>
      <StrengthBar pw={password} />
      {showGen && (
        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', alignItems: 'center', ...muted }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Length {gen.length}
            <input type="range" min={8} max={40} value={gen.length} onChange={e => { const next = { ...gen, length: Number(e.target.value) }; setGen(next); regenerate(next) }} />
          </label>
          {(['lower', 'upper', 'digits', 'symbols'] as const).map(k => (
            <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input type="checkbox" checked={gen[k]} onChange={() => toggle(k)} />{k === 'lower' ? 'a-z' : k === 'upper' ? 'A-Z' : k === 'digits' ? '0-9' : '!@#'}
            </label>
          ))}
        </div>
      )}
      <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Website (optional)" style={field} />
      <select value={category} onChange={e => setCategory(e.target.value)} style={field}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (security answers, account numbers…)" rows={3} style={{ ...field, resize: 'vertical' }} />
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={save} disabled={saving} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>{saving ? 'Saving…' : 'Save'}</button>
        <button onClick={onCancel} className="btn btn-ghost press" style={{ fontSize: '0.74rem' }}>Cancel</button>
      </div>
    </div>
  )
}

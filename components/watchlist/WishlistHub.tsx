'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useWishlist, useWishShares, atTarget, WISH_LISTS, type Wish, type WishDraft } from '@/lib/hooks/useWishlist'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

// The wishlist (2026-10-12): paste a link and the picture, name, store and
// price come along; sort things into lists; set the price you would pay and
// see when something reaches it; mark it bought and keep the history; share
// with the household, where your partner can quietly claim a gift.

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '0.45rem 0.65rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
  fontSize: '0.8rem', outline: 'none',
}
const muted: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }
const money = (n: number | null) => (n == null ? '' : `$${n % 1 === 0 ? n : n.toFixed(2)}`)
const isUrl = (s: string) => /^https?:\/\/\S+$/i.test(s.trim())

type Sort = 'new' | 'low' | 'high' | 'priority'

export default function WishlistHub({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null
  const { wishes, loading, userId: me, error, add, update, remove, claim } = useWishlist()

  const [tab, setTab] = useState<'wanted' | 'bought'>('wanted')
  const [list, setList] = useState('All')
  const [who, setWho] = useState<'all' | 'mine' | 'ours'>('all')
  const [sort, setSort] = useState<Sort>('new')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Wish | 'new' | null>(null)
  const [seed, setSeed] = useState<WishDraft | null>(null)
  const [quick, setQuick] = useState('')
  const [fetching, setFetching] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const wanted = wishes.filter(w => w.status === 'wanted')
  const bought = wishes.filter(w => w.status === 'bought')
  const lists = useMemo(() => ['All', ...Array.from(new Set([...WISH_LISTS.filter(l => wanted.some(w => w.list === l)), ...wanted.map(w => w.list)]))], [wanted])

  const shown = (tab === 'wanted' ? wanted : bought).filter(w => {
    if (list !== 'All' && w.list !== list) return false
    if (who === 'mine' && w.user_id !== me) return false
    if (who === 'ours' && !w.space_id) return false
    const n = q.trim().toLowerCase()
    return !n || [w.name, w.store ?? '', w.notes ?? '', w.for_who ?? ''].some(f => f.toLowerCase().includes(n))
  }).sort((a, b) => {
    if (tab === 'bought') return (b.bought_at ?? '').localeCompare(a.bought_at ?? '')
    if (sort === 'low') return (a.price ?? Infinity) - (b.price ?? Infinity)
    if (sort === 'high') return (b.price ?? -1) - (a.price ?? -1)
    if (sort === 'priority') return b.priority - a.priority
    return b.created_at.localeCompare(a.created_at)
  })

  const total = wanted.reduce((s, w) => s + (w.price ?? 0), 0)
  const hits = wanted.filter(atTarget).length
  const spent = bought.reduce((s, w) => s + (w.bought_price ?? w.price ?? 0), 0)

  async function quickAdd() {
    const text = quick.trim()
    if (!text) return
    if (!isUrl(text)) { setSeed({ name: text }); setEditing('new'); setQuick(''); return }
    setFetching(true); setErr(null)
    let d: WishDraft = { url: text, name: '' }
    try {
      const r = await fetch(`/api/link-preview?url=${encodeURIComponent(text)}`)
      if (r.ok) {
        const j = await r.json() as { title: string | null; image: string | null; price: number | null; siteName: string | null }
        d = { url: text, name: j.title ?? '', image_url: j.image, price: j.price, store: j.siteName ?? new URL(text).hostname.replace(/^www\./, '') }
      }
    } catch { /* the link still saves without a preview */ }
    if (!d.store) { try { d.store = new URL(text).hostname.replace(/^www\./, '') } catch { /* not a url */ } }
    setFetching(false); setSeed(d); setEditing('new'); setQuick('')
  }

  const chip = (active: boolean): React.CSSProperties => ({
    fontSize: '0.66rem', padding: '0.25em 0.75em', borderRadius: '999px', cursor: 'pointer', fontFamily: 'var(--font-body)',
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`,
    background: active ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--muted)',
  })

  if (error) return <div style={muted}>{error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {/* summary */}
      <div style={{ display: 'flex', gap: '1.4rem', flexWrap: 'wrap' }}>
        <Stat label="on the list" value={String(wanted.length)} />
        <Stat label="adds up to" value={money(total) || '$0'} />
        {hits > 0 && <Stat label="at your price" value={String(hits)} accent />}
        {bought.length > 0 && <Stat label="got so far" value={`${bought.length} · ${money(spent) || '$0'}`} />}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setSharing(s => !s)} className="btn btn-ghost press" style={{ fontSize: '0.72rem' }}>{sharing ? 'Close sharing' : 'Share this wishlist'}</button>
      </div>
      {sharing && <SharePanel lists={lists.filter(l => l !== 'All')} spaceId={spaceId} mineWanted={wanted.filter(w => w.user_id === me)} onShareAll={async () => {
        for (const w of wanted.filter(x => x.user_id === me && !x.space_id)) await update(w.id, { space_id: spaceId })
      }} />}

      {/* quick add */}
      <form onSubmit={e => { e.preventDefault(); quickAdd() }} style={{ display: 'flex', gap: '0.5rem' }}>
        <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Paste a link, or type what you want" style={field} />
        <button disabled={fetching || !quick.trim()} className="btn btn-primary press" style={{ fontSize: '0.74rem', whiteSpace: 'nowrap' }}>{fetching ? 'Looking…' : 'Add'}</button>
      </form>
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}

      {editing && (
        <Editor
          key={editing === 'new' ? `new-${seed?.url ?? seed?.name ?? ''}` : editing.id}
          initial={editing === 'new' ? null : editing} seed={seed} spaceId={spaceId}
          onCancel={() => { setEditing(null); setSeed(null) }}
          onSave={async d => {
            const e = editing === 'new' ? await add(d) : await update(editing.id, d)
            if (!e) { setEditing(null); setSeed(null) }
            return e
          }}
        />
      )}

      {/* tabs + filters */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="press" onClick={() => setTab('wanted')} style={chip(tab === 'wanted')}>Wanted</button>
        <button className="press" onClick={() => setTab('bought')} style={chip(tab === 'bought')}>Got it</button>
        <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
        {tab === 'wanted' && lists.map(l => <button key={l} className="press" onClick={() => setList(l)} style={chip(list === l)}>{l}</button>)}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" style={{ ...field, maxWidth: '14rem' }} />
        <select value={who} onChange={e => setWho(e.target.value as typeof who)} style={{ ...field, width: 'auto' }}>
          <option value="all">Everyone&apos;s</option><option value="mine">Mine</option>{spaceId && <option value="ours">Shared</option>}
        </select>
        {tab === 'wanted' && (
          <select value={sort} onChange={e => setSort(e.target.value as Sort)} style={{ ...field, width: 'auto' }}>
            <option value="new">Newest</option><option value="priority">Want most</option>
            <option value="low">Price, low to high</option><option value="high">Price, high to low</option>
          </select>
        )}
      </div>

      {loading && <div style={muted}>Loading…</div>}
      {!loading && shown.length === 0 && (
        <div style={{ ...muted, fontStyle: 'italic', textAlign: 'center', padding: '1.4rem 0' }}>
          {tab === 'wanted' ? 'Nothing here yet. What would Future You love?' : 'Nothing marked as got yet.'}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(11.5rem, 1fr))', gap: '0.8rem' }}>
        {shown.map(w => (
          <Card key={w.id} w={w} me={me}
            onEdit={() => { setSeed(null); setEditing(w) }}
            onDelete={async () => { if (window.confirm(`Remove "${w.name}"?`)) setErr(await remove(w.id)) }}
            onBought={async price => setErr(await update(w.id, { status: 'bought', bought_at: format(new Date(), 'yyyy-MM-dd'), bought_price: price ?? w.price }))}
            onBack={async () => setErr(await update(w.id, { status: 'wanted', bought_at: null, bought_price: null }))}
            onChecked={async () => setErr(await update(w.id, { last_checked: format(new Date(), 'yyyy-MM-dd') }))}
            onClaim={async on => setErr(await claim(w.id, on))} />
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: accent ? 'var(--emerald)' : 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}

function Card({ w, me, onEdit, onDelete, onBought, onBack, onChecked, onClaim }: {
  w: Wish; me: string | null
  onEdit: () => void; onDelete: () => void; onBought: (price: number | null) => void; onBack: () => void
  onChecked: () => void; onClaim: (on: boolean) => void
}) {
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(w.price != null ? String(w.price) : '')
  const mine = w.user_id === me
  const hit = atTarget(w)
  const btn: React.CSSProperties = { fontSize: '0.62rem', padding: '0.2em 0.55em', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }
  const link = w.url && /^https?:\/\//i.test(w.url) ? w.url : null
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${hit ? 'var(--emerald)' : 'var(--border)'}`, borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ aspectRatio: '4 / 3', background: 'var(--surface2)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {w.image_url
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary shop hosts, not worth allow-listing for next/image
          ? <img src={w.image_url} alt="" referrerPolicy="no-referrer" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--muted)', opacity: 0.4 }}>{w.name.charAt(0).toUpperCase()}</span>}
        {hit && <span style={{ position: 'absolute', top: 6, left: 6, fontSize: '0.6rem', background: 'var(--emerald)', color: 'var(--bg)', borderRadius: '999px', padding: '0.15em 0.6em' }}>at your price</span>}
        {w.space_id && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: '0.58rem', background: 'color-mix(in srgb, var(--surface) 85%, transparent)', color: 'var(--text)', borderRadius: '999px', padding: '0.15em 0.55em' }}>shared</span>}
      </div>
      <div style={{ padding: '0.6rem 0.7rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.3 }}>
          {link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{w.name}</a> : w.name}
        </div>
        <div style={{ ...muted, display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
          {w.status === 'bought'
            ? <span>{money(w.bought_price ?? w.price)}{w.bought_at ? ` · ${format(new Date(w.bought_at + 'T12:00:00'), 'MMM d')}` : ''}</span>
            : <span style={{ color: 'var(--text)' }}>{money(w.price) || 'no price'}{w.target_price != null ? ` · aim ${money(w.target_price)}` : ''}</span>}
          {w.store && <span>{w.store}</span>}
        </div>
        <div style={{ ...muted, display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: 'var(--gold)', letterSpacing: '0.1em' }}>{'●'.repeat(w.priority)}<span style={{ opacity: 0.25 }}>{'●'.repeat(3 - w.priority)}</span></span>
          <span>{w.list}</span>
          {w.for_who && <span>· for {w.for_who}</span>}
          {!mine && <span>· theirs</span>}
        </div>
        {w.notes && <div style={{ ...muted, whiteSpace: 'pre-wrap' }}>{w.notes}</div>}

        {/* claim: a partner marks a shared wish as theirs to buy. The wisher only sees that it is taken, not by whom. */}
        {!mine && w.status === 'wanted' && (
          w.reserved_by == null && !w.claimed_name
            ? <button style={btn} onClick={() => onClaim(true)}>I&apos;ll get this</button>
            : w.reserved_by === me
              ? <button style={{ ...btn, color: 'var(--emerald)' }} onClick={() => onClaim(false)}>You&apos;re getting this (undo)</button>
              : <span style={muted}>Someone is getting this</span>
        )}
        {mine && (w.reserved_by || w.claimed_name) && w.status === 'wanted' && <span style={{ ...muted, color: 'var(--emerald)' }}>Someone has this covered</span>}

        {mine && (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '0.3rem' }}>
            {w.status === 'wanted' && !paying && <button style={btn} onClick={() => setPaying(true)}>Got it</button>}
            {w.status === 'wanted' && <button style={btn} onClick={onChecked} title={`Last checked ${w.last_checked}`}>Checked</button>}
            {w.status === 'bought' && <button style={btn} onClick={onBack}>Move back</button>}
            <button style={btn} onClick={onEdit}>Edit</button>
            <button style={{ ...btn, color: 'var(--rose)' }} onClick={onDelete}>Remove</button>
          </div>
        )}
        {paying && (
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <input type="number" min="0" step="0.01" value={paid} onChange={e => setPaid(e.target.value)} placeholder="Paid" style={{ ...field, padding: '0.25rem 0.4rem', fontSize: '0.72rem' }} />
            <button style={btn} onClick={() => { onBought(paid ? Number(paid) : null); setPaying(false) }}>Save</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Editor({ initial, seed, spaceId, onSave, onCancel }: {
  initial: Wish | null; seed: WishDraft | null; spaceId: string | null
  onSave: (d: WishDraft) => Promise<string | null>; onCancel: () => void
}) {
  const base: WishDraft = initial ?? seed ?? {}
  const [name, setName] = useState(base.name ?? '')
  const [url, setUrl] = useState(base.url ?? '')
  const [image, setImage] = useState(base.image_url ?? '')
  const [store, setStore] = useState(base.store ?? '')
  const [price, setPrice] = useState(base.price != null ? String(base.price) : '')
  const [target, setTarget] = useState(base.target_price != null ? String(base.target_price) : '')
  const [list, setList] = useState(base.list ?? 'Someday')
  const [priority, setPriority] = useState<1 | 2 | 3>((base.priority as 1 | 2 | 3 | undefined) ?? 2)
  const [forWho, setForWho] = useState(base.for_who ?? '')
  const [notes, setNotes] = useState(base.notes ?? '')
  const [shared, setShared] = useState(initial ? !!initial.space_id : false)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const num = (s: string) => (s.trim() === '' || Number.isNaN(Number(s)) ? null : Number(s))

  async function save() {
    setSaving(true); setErr(null)
    const e = await onSave({
      name, url: url.trim() || null, image_url: image.trim() || null, store: store.trim() || null,
      price: num(price), target_price: num(target), list: list.trim() || 'Someday', priority,
      for_who: forWho.trim() || null, notes: notes.trim() || null, space_id: shared ? spaceId : null,
    })
    setSaving(false)
    if (e) setErr(e)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{initial ? 'Edit' : 'New wish'}</div>
      <div style={{ display: 'flex', gap: '0.7rem' }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" referrerPolicy="no-referrer" style={{ width: '5rem', height: '5rem', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="What is it" style={field} autoFocus />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link (optional)" style={field} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(8rem, 1fr))', gap: '0.4rem' }}>
        <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Price" style={field} />
        <input type="number" min="0" step="0.01" value={target} onChange={e => setTarget(e.target.value)} placeholder="Price you would pay" style={field} />
        <input value={store} onChange={e => setStore(e.target.value)} placeholder="Store" style={field} />
        <input value={forWho} onChange={e => setForWho(e.target.value)} placeholder="For (me, mom, us…)" style={field} />
        <input list="wish-lists" value={list} onChange={e => setList(e.target.value)} placeholder="List" style={field} />
        <select value={priority} onChange={e => setPriority(Number(e.target.value) as 1 | 2 | 3)} style={field}>
          <option value={1}>Nice to have</option><option value={2}>Want</option><option value={3}>Really want</option>
        </select>
      </div>
      <datalist id="wish-lists">{WISH_LISTS.map(l => <option key={l} value={l} />)}</datalist>
      <input value={image} onChange={e => setImage(e.target.value)} placeholder="Picture link (optional)" style={field} />
      <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Size, colour, why you want it…" rows={2} style={{ ...field, resize: 'vertical' }} />
      {spaceId && (
        <label style={{ ...muted, display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
          Share with the household (your partner can see it and claim it as a gift)
        </label>
      )}
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={save} disabled={saving} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>{saving ? 'Saving…' : 'Save'}</button>
        <button onClick={onCancel} className="btn btn-ghost press" style={{ fontSize: '0.74rem' }}>Cancel</button>
      </div>
    </div>
  )
}

// Share the list (2026-10-12): two ways. With your household, where your
// partner sees it inside 4S and can claim a gift. With anyone else, by a link
// that needs no account: they see the list (or one list), and can tell you
// something is covered. You only ever see "covered", not who.
function SharePanel({ lists, spaceId, mineWanted, onShareAll }: {
  lists: string[]; spaceId: string | null; mineWanted: Wish[]; onShareAll: () => Promise<void>
}) {
  const { shares, create, stop } = useWishShares()
  const [scope, setScope] = useState('')
  const [title, setTitle] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const urlFor = (token: string) => `${window.location.origin}/w/${token}`
  const unsharedCount = mineWanted.filter(w => !w.space_id).length

  async function make() {
    setBusy(true); setNote(null)
    const r = await create(scope || null, title)
    setBusy(false)
    if (r.error) { setNote(r.error); return }
    setTitle('')
    await copy(urlFor(r.token!))
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setNote('Link copied.') } catch { setNote(url) }
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {spaceId && (
        <div>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>With your household</div>
          <div style={{ ...muted, marginBottom: '0.4rem' }}>Your partner sees these in 4S and can quietly claim one as a gift. You can also do it one wish at a time when you edit it.</div>
          <button className="btn btn-secondary press" style={{ fontSize: '0.7rem' }} disabled={unsharedCount === 0} onClick={onShareAll}>
            {unsharedCount === 0 ? 'Everything is already shared' : `Share ${unsharedCount} wish${unsharedCount === 1 ? '' : 'es'} with the household`}
          </button>
        </div>
      )}

      <div>
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.3rem' }}>With anyone, by link</div>
        <div style={{ ...muted, marginBottom: '0.5rem' }}>No account needed. They see the picture, price, link and your notes, and can tap &ldquo;I&rsquo;ll get this&rdquo;. You only see that it is covered.</div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <select value={scope} onChange={e => setScope(e.target.value)} style={{ ...field, width: 'auto' }}>
            <option value="">Everything I want</option>
            {lists.map(l => <option key={l} value={l}>Just {l}</option>)}
          </select>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" style={{ ...field, maxWidth: '14rem' }} />
          <button className="btn btn-primary press" style={{ fontSize: '0.72rem' }} disabled={busy} onClick={make}>{busy ? '…' : 'Make a link'}</button>
        </div>
      </div>

      {note && <div style={muted}>{note}</div>}

      {shares.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {shares.map(sh => (
            <div key={sh.token} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.74rem' }}>
              <span style={{ flex: 1, minWidth: '8rem' }}>{sh.title}<span style={{ color: 'var(--muted)' }}> · {sh.list ?? 'everything'}</span></span>
              <button style={{ fontSize: '0.64rem', padding: '0.2em 0.6em', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }} onClick={() => copy(urlFor(sh.token))}>Copy link</button>
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button style={{ fontSize: '0.64rem', padding: '0.2em 0.6em', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}
                  onClick={() => navigator.share({ title: sh.title, url: urlFor(sh.token) }).catch(() => {})}>Send</button>
              )}
              <button style={{ fontSize: '0.64rem', padding: '0.2em 0.6em', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--rose)', cursor: 'pointer' }}
                onClick={async () => { if (window.confirm('Turn this link off? Anyone who has it will see a not-found page.')) setNote(await stop(sh.token)) }}>Stop sharing</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { addMonths, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import Sheet from '@/components/ui/Sheet'
import { deleteThingPhotos, getThingPhotoUrls, uploadThingPhoto } from '@/lib/storage/thingPhotos'

// Things we own (2026-10-20): what the house has, with the receipt or a photo
// and the day the warranty ends. A photo can fill in the details; nothing is
// saved until you tap Save. A heads-up goes out 30 and 7 days before a
// warranty ends (the daily cron).

interface Thing {
  id: string; name: string; brand: string | null; model: string | null; store: string | null
  purchased_on: string | null; price: number | null; warranty_until: string | null
  notes: string | null; photo_paths: string[]
}
interface Draft {
  id: string | null
  name: string; brand: string; model: string; store: string
  purchased_on: string; price: string; warranty_until: string; notes: string
  photo_paths: string[]
  pending: Blob[]
}

const EMPTY: Draft = { id: null, name: '', brand: '', model: '', store: '', purchased_on: '', price: '', warranty_until: '', notes: '', photo_paths: [], pending: [] }

async function shrink(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  const dataUrl = c.toDataURL('image/jpeg', 0.82)
  const blob = await new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('no image'))), 'image/jpeg', 0.82))
  return { blob, dataUrl }
}

function warranty(until: string | null): { text: string; color: string } | null {
  if (!until) return null
  const left = differenceInCalendarDays(parseISO(until), new Date())
  const when = format(parseISO(until), 'MMM d, yyyy')
  if (left < 0) return { text: `Warranty ended ${when}`, color: 'var(--muted)' }
  if (left <= 30) return { text: `Warranty ends ${when} (${left === 0 ? 'today' : `${left}d`})`, color: 'var(--rose)' }
  if (left <= 90) return { text: `Warranty ends ${when}`, color: 'var(--amber)' }
  return { text: `Warranty until ${when}`, color: 'var(--muted)' }
}

const field: React.CSSProperties = {
  width: '100%', minHeight: 44, padding: '0 0.7rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)',
  color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', boxSizing: 'border-box',
}
const label: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }

export default function ThingsWeOwn({ spaceId, userId }: { spaceId: string | null; userId: string | null }) {
  const [things, setThings] = useState<Thing[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<Draft | null>(null)
  const [reading, setReading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!spaceId) { setThings([]); return }
    const { data } = await createClient().from('household_things').select('*').eq('space_id', spaceId)
    const rows = (data as Thing[] | null) ?? []
    // Warranty ending soonest first; things with no warranty date go last.
    rows.sort((a, b) => (a.warranty_until ?? '9999') < (b.warranty_until ?? '9999') ? -1 : 1)
    setThings(rows)
    setUrls(await getThingPhotoUrls(rows.flatMap(t => t.photo_paths.slice(0, 1))))
  }, [spaceId])
  useEffect(() => { void load() }, [load])

  // Previews of photos not yet saved; the object URLs are freed when they change.
  const pending = draft?.pending
  const previews = useMemo(() => (pending ?? []).map(b => URL.createObjectURL(b)), [pending])
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews])

  function openThing(t: Thing) {
    setErr(null)
    setDraft({
      id: t.id, name: t.name, brand: t.brand ?? '', model: t.model ?? '', store: t.store ?? '',
      purchased_on: t.purchased_on ?? '', price: t.price === null ? '' : String(t.price),
      warranty_until: t.warranty_until ?? '', notes: t.notes ?? '', photo_paths: t.photo_paths, pending: [],
    })
    void getThingPhotoUrls(t.photo_paths).then(u => setUrls(prev => ({ ...prev, ...u })))
  }

  async function fromPhoto(file: File | null) {
    if (!file) return
    setReading(true); setErr(null)
    try {
      const { blob, dataUrl } = await shrink(file)
      const base: Draft = { ...EMPTY, pending: [blob] }
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ task: 'read-thing', image: dataUrl }) })
      if (res.ok) {
        const j = await res.json() as { result?: { name: string | null; brand: string | null; model: string | null; store: string | null; purchasedOn: string | null; price: number | null; warrantyMonths: number | null } }
        const r = j.result
        if (r) {
          base.name = r.name ?? ''; base.brand = r.brand ?? ''; base.model = r.model ?? ''; base.store = r.store ?? ''
          base.purchased_on = r.purchasedOn ?? ''; base.price = r.price === null ? '' : String(r.price)
          if (r.purchasedOn && r.warrantyMonths) base.warranty_until = format(addMonths(parseISO(r.purchasedOn), r.warrantyMonths), 'yyyy-MM-dd')
        }
      } else if (res.status === 503) {
        setErr('Reading photos needs the AI key on the server. The photo is kept; fill in the details by hand.')
      }
      setDraft(base)
    } catch { setErr('Could not open that picture.') }
    finally { setReading(false) }
  }

  async function addPhotos(files: FileList | null) {
    if (!files || !draft) return
    const blobs: Blob[] = []
    for (const f of Array.from(files).slice(0, 6)) { try { blobs.push((await shrink(f)).blob) } catch { /* skip an unreadable file */ } }
    if (blobs.length === 0) return
    if (draft.id) {
      // An existing thing: upload right away so the photo is not lost.
      setSaving(true)
      try {
        const paths = await Promise.all(blobs.map(b => uploadThingPhoto(draft.id!, b)))
        const next = [...draft.photo_paths, ...paths]
        await createClient().from('household_things').update({ photo_paths: next, updated_at: new Date().toISOString() }).eq('id', draft.id)
        setDraft({ ...draft, photo_paths: next })
        setUrls(prev => ({ ...prev }))
        void getThingPhotoUrls(next).then(u => setUrls(prev => ({ ...prev, ...u })))
        await load()
      } catch { setErr('That photo did not upload.') }
      setSaving(false)
    } else {
      setDraft({ ...draft, pending: [...draft.pending, ...blobs] })
    }
  }

  async function removePhoto(path: string) {
    if (!draft?.id) return
    const next = draft.photo_paths.filter(p => p !== path)
    setDraft({ ...draft, photo_paths: next })
    await createClient().from('household_things').update({ photo_paths: next, updated_at: new Date().toISOString() }).eq('id', draft.id)
    await deleteThingPhotos([path])
    await load()
  }

  async function save() {
    if (!draft || !spaceId || !userId) return
    if (!draft.name.trim()) { setErr('Give it a name.'); return }
    setSaving(true); setErr(null)
    const supabase = createClient()
    const price = draft.price.trim() === '' ? null : Number(draft.price)
    const row = {
      name: draft.name.trim().slice(0, 120), brand: draft.brand.trim() || null, model: draft.model.trim() || null,
      store: draft.store.trim() || null, purchased_on: draft.purchased_on || null,
      price: price !== null && Number.isFinite(price) ? price : null,
      warranty_until: draft.warranty_until || null, notes: draft.notes.trim() || null,
      updated_at: new Date().toISOString(),
    }
    try {
      if (draft.id) {
        const { error } = await supabase.from('household_things').update(row).eq('id', draft.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('household_things').insert({ ...row, space_id: spaceId, user_id: userId }).select('id').single()
        if (error || !data) throw error ?? new Error('no row')
        if (draft.pending.length) {
          const paths = await Promise.all(draft.pending.map(b => uploadThingPhoto(data.id as string, b)))
          await supabase.from('household_things').update({ photo_paths: paths }).eq('id', data.id)
        }
      }
      setDraft(null)
      await load()
    } catch { setErr('That did not save.') }
    setSaving(false)
  }

  async function remove() {
    if (!draft?.id) return
    if (!window.confirm(`Remove ${draft.name || 'this'}?`)) return
    const supabase = createClient()
    await deleteThingPhotos(draft.photo_paths)
    await supabase.from('household_things').delete().eq('id', draft.id)
    setDraft(null)
    await load()
  }

  const set = (patch: Partial<Draft>) => setDraft(d => (d ? { ...d, ...patch } : d))
  const addYears = (n: number) => {
    if (!draft?.purchased_on) { setErr('Set the purchase date first.'); return }
    set({ warranty_until: format(addMonths(parseISO(draft.purchased_on), n * 12), 'yyyy-MM-dd') })
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
        <div className="t-card">Things we own</div>
        {spaceId && (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <label className="btn btn-secondary press" style={{ minHeight: 40, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              {reading ? 'Reading…' : 'From photo'}
              <input type="file" accept="image/*" disabled={reading} onChange={e => { void fromPhoto(e.target.files?.[0] ?? null); e.target.value = '' }}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </label>
            <button onClick={() => { setErr(null); setDraft({ ...EMPTY }) }} className="btn btn-primary press" style={{ minHeight: 40 }}>Add</button>
          </div>
        )}
      </div>

      {!spaceId && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>This fills in once you share a household.</div>}
      {err && !draft && <div style={{ fontSize: '0.8rem', color: 'var(--rose)', marginBottom: '0.4rem' }}>{err}</div>}

      {spaceId && things.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Nothing here yet. Take a photo of a receipt or an appliance sticker and it fills in the details.
        </div>
      )}

      {things.map(t => {
        const w = warranty(t.warranty_until)
        const sub = [t.brand, t.model].filter(Boolean).join(' ')
        return (
          <button key={t.id} onClick={() => openThing(t)} className="press"
            style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderTop: '1px solid var(--border)', padding: '0.6rem 0', cursor: 'pointer', fontFamily: 'var(--font-body)', minHeight: 56 }}>
            <span style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: 'var(--surface2)', overflow: 'hidden', display: 'inline-flex' }}>
              {t.photo_paths[0] && urls[t.photo_paths[0]] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[t.photo_paths[0]]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '0.92rem', color: 'var(--text)' }}>{t.name}</span>
              {sub && <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)' }}>{sub}</span>}
              {w && <span style={{ display: 'block', fontSize: '0.76rem', color: w.color }}>{w.text}</span>}
            </span>
          </button>
        )
      })}

      <Sheet open={!!draft} title={draft?.id ? 'Edit' : 'Add a thing'} onClose={() => { setDraft(null); setErr(null) }}>
      {draft && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <label style={label}>Name
            <input value={draft.name} onChange={e => set({ name: e.target.value })} maxLength={120} placeholder="Dishwasher" style={field} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <label style={label}>Brand
              <input value={draft.brand} onChange={e => set({ brand: e.target.value })} style={field} />
            </label>
            <label style={label}>Model
              <input value={draft.model} onChange={e => set({ model: e.target.value })} style={field} />
            </label>
            <label style={label}>Bought at
              <input value={draft.store} onChange={e => set({ store: e.target.value })} style={field} />
            </label>
            <label style={label}>Price
              <input value={draft.price} onChange={e => set({ price: e.target.value })} inputMode="decimal" style={field} />
            </label>
            <label style={label}>Bought on
              <input type="date" value={draft.purchased_on} onChange={e => set({ purchased_on: e.target.value })} style={field} />
            </label>
            <label style={label}>Warranty ends
              <input type="date" value={draft.warranty_until} onChange={e => set({ warranty_until: e.target.value })} style={field} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Warranty lasts</span>
            {[1, 2, 3, 5].map(n => (
              <button key={n} onClick={() => addYears(n)} className="btn btn-ghost press" style={{ minHeight: 36 }}>{n} {n === 1 ? 'year' : 'years'}</button>
            ))}
          </div>
          <label style={label}>Notes
            <textarea value={draft.notes} onChange={e => set({ notes: e.target.value })} rows={2} placeholder="Where the manual is, who to call"
              style={{ ...field, minHeight: 64, padding: '0.5rem 0.7rem', resize: 'vertical' }} />
          </label>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {draft.photo_paths.map(p => urls[p] && (
              <span key={p} style={{ position: 'relative', width: 72, height: 72 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urls[p]} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} />
                <button onClick={() => removePhoto(p)} aria-label="Remove photo" className="press"
                  style={{ position: 'absolute', top: -6, right: -6, width: 26, height: 26, borderRadius: 13, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>×</button>
              </span>
            ))}
            {previews.map((u, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={u} src={u} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10 }} onClick={() => set({ pending: draft.pending.filter((_, k) => k !== i) })} />
            ))}
            <label className="btn btn-secondary press" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
              Add photo
              <input type="file" accept="image/*" multiple onChange={e => { void addPhotos(e.target.files); e.target.value = '' }}
                style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </label>
          </div>
          {draft.pending.length > 0 && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Tap a new photo to take it off.</div>}

          {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={save} disabled={saving} className="btn btn-primary press" style={{ minHeight: 44 }}>{saving ? 'Saving…' : 'Save'}</button>
            <button onClick={() => { setDraft(null); setErr(null) }} className="btn btn-ghost press" style={{ minHeight: 44 }}>Cancel</button>
            {draft.id && <button onClick={remove} className="btn btn-ghost press" style={{ minHeight: 44, marginLeft: 'auto', color: 'var(--rose)' }}>Remove</button>}
          </div>
        </div>
      )}
      </Sheet>
    </section>
  )
}

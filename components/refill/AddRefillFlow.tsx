'use client'

import { useRef, useState } from 'react'
import { extractFromLabel, extractFromLink, type ExtractedProductInfo } from '@/lib/utils/refillExtraction'
import { REFILL_CATEGORIES, CATEGORY_DEFAULTS, type RefillCategory, type TrackingMode } from '@/lib/hooks/useBuyItems'

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
  fontWeight: 300, padding: '0.4rem 0.65rem', outline: 'none',
}

type Method = 'menu' | 'scan' | 'link' | 'manual'

interface Draft {
  name: string
  category: RefillCategory
  trackingMode: TrackingMode
  cadenceDays: string
  notifyDaysBefore: string
  buyUrl: string
  quantity: string
  servingCount: string
  servingSize: string
  usagePerDay: string
  store: string
  price: string
  confidence?: ExtractedProductInfo['confidence']
}

const EMPTY_DRAFT: Draft = {
  name: '', category: 'other', trackingMode: 'simple-interval',
  cadenceDays: '30', notifyDaysBefore: '3', buyUrl: '',
  quantity: '', servingCount: '', servingSize: '', usagePerDay: '', store: '', price: '',
}

interface AddInput {
  name: string; category: RefillCategory; tracking_mode: TrackingMode
  cadence_days: number; notify_days_before: number; buy_url: string
  quantity: number | null; serving_count: number | null; serving_size: string | null
  usage_per_day: number | null; store: string | null; price: number | null
}

export default function AddRefillFlow({ onSubmit, onCancel }: { onSubmit: (input: AddInput) => void; onCancel: () => void }) {
  const [method, setMethod] = useState<Method>('menu')
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [confirming, setConfirming] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function applyExtraction(info: ExtractedProductInfo) {
    setDraft({
      ...EMPTY_DRAFT,
      name: info.name,
      category: (info.category as RefillCategory) ?? 'other',
      trackingMode: info.servingCount && info.usagePerDay ? 'smart-supply' : 'simple-interval',
      cadenceDays: String(info.estimatedDaysSupply ?? 30),
      notifyDaysBefore: String(CATEGORY_DEFAULTS[(info.category as RefillCategory) ?? 'other'].notifyDaysBefore),
      quantity: info.quantity != null ? String(info.quantity) : '',
      servingCount: info.servingCount != null ? String(info.servingCount) : '',
      servingSize: info.servingSize ?? '',
      usagePerDay: info.usagePerDay != null ? String(info.usagePerDay) : '',
      price: info.price != null ? String(info.price) : '',
      confidence: info.confidence,
    })
    setConfirming(true)
  }

  async function handleScan(file: File) {
    setExtracting(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const info = await extractFromLabel(reader.result as string)
      setExtracting(false)
      applyExtraction(info)
    }
    reader.readAsDataURL(file)
  }

  async function handleLink() {
    if (!linkInput.trim()) return
    setExtracting(true)
    const info = await extractFromLink(linkInput.trim())
    setExtracting(false)
    setDraft(d => ({ ...d, buyUrl: linkInput.trim() }))
    applyExtraction({ ...info })
  }

  function startManual() {
    setDraft(EMPTY_DRAFT)
    setMethod('manual')
  }

  function confirmAndSave() {
    onSubmit({
      name: draft.name.trim(),
      category: draft.category,
      tracking_mode: draft.trackingMode,
      cadence_days: parseInt(draft.cadenceDays) || CATEGORY_DEFAULTS[draft.category].cadenceDays,
      notify_days_before: parseInt(draft.notifyDaysBefore) || CATEGORY_DEFAULTS[draft.category].notifyDaysBefore,
      buy_url: draft.buyUrl.trim(),
      quantity: draft.quantity ? parseFloat(draft.quantity) : null,
      serving_count: draft.servingCount ? parseFloat(draft.servingCount) : null,
      serving_size: draft.servingSize.trim() || null,
      usage_per_day: draft.usagePerDay ? parseFloat(draft.usagePerDay) : null,
      store: draft.store.trim() || null,
      price: draft.price ? parseFloat(draft.price) : null,
    })
  }

  const wrap: React.CSSProperties = { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--faint)' }

  // --- Confirmation screen (shown after any extraction method) ---
  if (confirming) {
    return (
      <div style={wrap}>
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Confirm details
          {draft.confidence && (
            <span style={{
              fontSize: '0.58rem', padding: '0.1em 0.5em', borderRadius: '99px', textTransform: 'none', letterSpacing: 'normal',
              color: draft.confidence === 'high' ? 'var(--emerald)' : draft.confidence === 'medium' ? 'var(--amber)' : 'var(--muted)',
              background: 'var(--hover-bg)',
            }}>{draft.confidence} confidence</span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Item name" style={inputStyle} />
          <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value as RefillCategory }))} style={{ ...inputStyle, cursor: 'pointer' }}>
            {REFILL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input value={draft.quantity} onChange={e => setDraft(d => ({ ...d, quantity: e.target.value }))} placeholder="Detected quantity" style={inputStyle} />
          <input value={draft.servingSize} onChange={e => setDraft(d => ({ ...d, servingSize: e.target.value }))} placeholder="Detected usage (e.g. 2 capsules)" style={inputStyle} />
          <input value={draft.cadenceDays} onChange={e => setDraft(d => ({ ...d, cadenceDays: e.target.value }))} placeholder="Est. days supply" type="number" style={inputStyle} />
          <input value={draft.notifyDaysBefore} onChange={e => setDraft(d => ({ ...d, notifyDaysBefore: e.target.value }))} placeholder="Notify X days before" type="number" style={inputStyle} />
          <input value={draft.store} onChange={e => setDraft(d => ({ ...d, store: e.target.value }))} placeholder="Store (optional)" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button onClick={confirmAndSave} className="btn btn-primary">Confirm</button>
          <button onClick={() => setConfirming(false)} className="btn btn-secondary">Edit</button>
          <button onClick={() => { setConfirming(false); setMethod('menu') }} className="btn btn-ghost">Try again</button>
          <button onClick={() => { setConfirming(false); setDraft(d => ({ ...EMPTY_DRAFT, name: d.name })); setMethod('manual') }} className="btn btn-ghost">Use simple interval instead</button>
        </div>
      </div>
    )
  }

  // --- Method picker ---
  if (method === 'menu') {
    return (
      <div style={wrap}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setMethod('scan')} className="btn btn-secondary">📷 Scan / upload label</button>
          <button onClick={() => setMethod('link')} className="btn btn-secondary">🔗 Paste product link</button>
          <button onClick={startManual} className="btn btn-secondary">✎ Manual entry</button>
          <button onClick={onCancel} className="btn btn-ghost">cancel</button>
        </div>
      </div>
    )
  }

  if (method === 'scan') {
    return (
      <div style={wrap}>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>Upload a photo of the product label — 4S will try to read quantity and usage from it.</p>
        <input ref={fileRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleScan(e.target.files[0])} style={{ fontSize: '0.72rem', color: 'var(--muted)' }} />
        {extracting && <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Reading label…</p>}
        <div style={{ marginTop: '0.6rem' }}><button onClick={() => setMethod('menu')} className="btn btn-ghost">← back</button></div>
      </div>
    )
  }

  if (method === 'link') {
    return (
      <div style={wrap}>
        <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>Paste an Amazon or product link — 4S will try to pull the product name and details.</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="https://…" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={handleLink} className="btn btn-primary" disabled={extracting}>{extracting ? 'Reading…' : 'Extract'}</button>
        </div>
        <div style={{ marginTop: '0.6rem' }}><button onClick={() => setMethod('menu')} className="btn btn-ghost">← back</button></div>
      </div>
    )
  }

  // --- Manual entry (simple mode by default, advanced fields optional) ---
  const advanced = draft.trackingMode === 'smart-supply'
  const setAdvanced = (v: boolean) => setDraft(d => ({ ...d, trackingMode: v ? 'smart-supply' : 'simple-interval' }))

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Item name (e.g. Vitamin D)" style={{ ...inputStyle, flex: 2, minWidth: '140px' }} />
        <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value as RefillCategory, cadenceDays: String(CATEGORY_DEFAULTS[e.target.value as RefillCategory].cadenceDays), notifyDaysBefore: String(CATEGORY_DEFAULTS[e.target.value as RefillCategory].notifyDaysBefore) }))} style={{ ...inputStyle, flex: 1, minWidth: '130px', cursor: 'pointer' }}>
          {REFILL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input value={draft.cadenceDays} onChange={e => setDraft(d => ({ ...d, cadenceDays: e.target.value }))} type="number" placeholder="Remind every X days" style={{ ...inputStyle, width: '150px' }} />
        <input value={draft.notifyDaysBefore} onChange={e => setDraft(d => ({ ...d, notifyDaysBefore: e.target.value }))} type="number" placeholder="Notify X days before" style={{ ...inputStyle, width: '150px' }} />
        <input value={draft.buyUrl} onChange={e => setDraft(d => ({ ...d, buyUrl: e.target.value }))} placeholder="Store / product link (optional)" style={{ ...inputStyle, flex: 1, minWidth: '160px' }} />
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: 'var(--muted)', cursor: 'pointer', marginBottom: '0.5rem' }}>
        <input type="checkbox" checked={advanced} onChange={e => setAdvanced(e.target.checked)} />
        Smart Supply — I know the package/serving details
      </label>

      {advanced && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input value={draft.servingCount} onChange={e => setDraft(d => ({ ...d, servingCount: e.target.value }))} type="number" placeholder="Servings per container" style={{ ...inputStyle, width: '160px' }} />
          <input value={draft.usagePerDay} onChange={e => setDraft(d => ({ ...d, usagePerDay: e.target.value }))} type="number" placeholder="Servings used per day" style={{ ...inputStyle, width: '160px' }} />
          <input value={draft.servingSize} onChange={e => setDraft(d => ({ ...d, servingSize: e.target.value }))} placeholder="Serving size (e.g. 2 capsules)" style={{ ...inputStyle, flex: 1, minWidth: '150px' }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button onClick={confirmAndSave} className="btn btn-primary" disabled={!draft.name.trim()}>Add</button>
        <button onClick={onCancel} className="btn btn-ghost">cancel</button>
      </div>
    </div>
  )
}

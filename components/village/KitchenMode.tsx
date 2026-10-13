'use client'

import { useState } from 'react'
import { useHousehold, dinnerFor } from '@/lib/hooks/useHousehold'
import { useKitchenTimers } from '@/lib/hooks/useKitchenTimers'
import { goToSection } from '@/lib/utils/navigate'
import { KITCHEN_OPEN_KEY } from '@/components/kitchen/KitchenHub'

// A focused cooking screen you open from the village (the ⋯ menu or the
// kitchen stall in the scene). Tonight's meal, a one-tap add to the
// shopping list, and a couple of timers, with the full kitchen (recipes, the
// meal plan, groceries, calories) one tap away. The two external cheat-sheet
// apps it used to link to are gone (2026-10-13); this is all in 4S now.

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function KitchenMode({ spaceId, onClose }: { spaceId: string | null; onClose: () => void }) {
  const h = useHousehold(spaceId)
  const timers = useKitchenTimers()
  const dinner = dinnerFor(h.meals)

  const [item, setItem] = useState('')
  const [added, setAdded] = useState(false)
  const [tLabel, setTLabel] = useState('')
  const [tMin, setTMin] = useState('')

  const addItem = async () => {
    const t = item.trim()
    if (!t) return
    await h.addShopping(t, null, null)
    setItem(''); setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }
  const addTimer = () => {
    const mins = Number(tMin)
    if (!mins || mins <= 0) return
    timers.add(tLabel, Math.round(mins * 60))
    setTLabel(''); setTMin('')
  }

  return (
    <div onClick={onClose} style={S.scrim}>
      <div onClick={e => e.stopPropagation()} style={S.card}>
        <div style={S.grabber} />
        <div style={S.head}>
          <span style={S.kicker}>The kitchen</span>
          <button onClick={onClose} style={S.x}>✕</button>
        </div>

        <section style={S.block}>
          <div style={S.h}>Tonight</div>
          {dinner ? (
            <div>
              <div style={S.big}>{dinner.title}</div>
              {dinner.cook && <div style={S.sub}>{dinner.cook} is cooking</div>}
              {dinner.recipe_id ? (
                <button onClick={() => { try { sessionStorage.setItem(KITCHEN_OPEN_KEY, dinner.recipe_id!) } catch { /* private mode */ } onClose(); goToSection('kitchen') }} style={S.link}>Open the recipe</button>
              ) : dinner.recipe_url && /^https?:\/\//i.test(dinner.recipe_url) ? (
                <button onClick={() => window.open(dinner.recipe_url!, '_blank', 'noopener')} style={S.link}>Recipe ↗</button>
              ) : null}
            </div>
          ) : (
            <div style={S.sub}>No dinner planned yet.</div>
          )}
        </section>

        <section style={S.block}>
          <div style={S.h}>Add to the list</div>
          <div style={S.row}>
            <input
              value={item} onChange={e => setItem(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addItem() }}
              placeholder="we're out of…" style={S.input}
            />
            <button onClick={addItem} style={S.btn}>{added ? 'Added ✓' : 'Add'}</button>
          </div>
        </section>

        <section style={S.block}>
          <div style={S.h}>Timers</div>
          {timers.timers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {timers.timers.map(t => (
                <div key={t.id} style={{ ...S.row, alignItems: 'center' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: t.rang ? S.accent.color : '#463b30', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.label}
                  </span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontVariantNumeric: 'tabular-nums', color: t.rang ? S.accent.color : '#463b30' }}>
                    {t.rang ? 'done' : mmss(t.left)}
                  </span>
                  {!t.rang && (t.running
                    ? <button onClick={() => timers.pause(t.id)} style={S.mini}>pause</button>
                    : <button onClick={() => timers.start(t.id)} style={S.mini}>start</button>)}
                  <button onClick={() => timers.reset(t.id)} style={S.mini}>reset</button>
                  <button onClick={() => timers.remove(t.id)} style={{ ...S.mini, color: '#a8987f' }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={S.row}>
            <input value={tLabel} onChange={e => setTLabel(e.target.value)} placeholder="pasta" style={{ ...S.input, flex: 2 }} />
            <input value={tMin} onChange={e => setTMin(e.target.value)} placeholder="min" inputMode="numeric" style={{ ...S.input, flex: 1 }} />
            <button onClick={addTimer} style={S.btn}>Set</button>
          </div>
        </section>

        <button onClick={() => { onClose(); goToSection('kitchen') }} style={S.footer}>Open the kitchen</button>
      </div>
    </div>
  )
}

const ACCENT = '#b0392c'
const S: Record<string, React.CSSProperties> & { accent: React.CSSProperties } = {
  accent: { color: ACCENT },
  // Half-screen glass sheet, not a centered modal (round 80, 2026-09-04)
  // — the village stays visible (just dimmed) above it, same "function
  // overlay floats over the picture, doesn't replace it" idea the Kitchen
  // and Smart Home overlays now share.
  scrim: {
    position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'color-mix(in srgb, #2b2320 30%, transparent)',
  },
  card: {
    width: '100%', maxWidth: '36rem', height: '50vh', minHeight: '20rem', maxHeight: '34rem',
    background: 'rgba(255, 253, 248, 0.78)',
    borderTop: '1px solid rgba(230, 216, 189, 0.9)', borderRadius: '20px 20px 0 0',
    backdropFilter: 'blur(20px) saturate(1.3)', WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
    padding: '0.6rem 1.4rem 1.2rem', boxShadow: '0 -12px 50px rgba(74,33,28,0.35)',
    fontFamily: '"Manrope", system-ui, sans-serif', color: '#2b2320',
    display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto',
  },
  grabber: { width: 36, height: 4, borderRadius: 2, background: 'rgba(138,90,44,0.35)', alignSelf: 'center', flexShrink: 0 },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: '"DM Mono", ui-monospace, monospace', fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT },
  x: { background: 'none', border: 'none', cursor: 'pointer', color: '#a8987f', fontSize: '0.95rem', lineHeight: 1 },
  block: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  h: { fontFamily: '"DM Mono", ui-monospace, monospace', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7c6f69' },
  big: { fontFamily: 'Georgia, "DM Serif Display", serif', fontSize: '1.5rem', color: '#2b2320', lineHeight: 1.15 },
  sub: { fontSize: '0.85rem', color: '#7c6f69' },
  row: { display: 'flex', gap: '0.4rem' },
  input: {
    flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '0.55rem 0.7rem',
    border: '1px solid #e0d8cf', borderRadius: 10, fontSize: '0.9rem',
    background: '#f7f3ec', color: '#2b2320', outline: 'none', fontFamily: 'inherit',
  },
  btn: {
    background: ACCENT, color: '#fff', border: 'none', borderRadius: 10,
    padding: '0 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  },
  mini: { background: '#f2e7dd', border: '1px solid #e0d8cf', borderRadius: 8, padding: '0.2rem 0.45rem', fontSize: '0.68rem', color: '#6d5f4c', cursor: 'pointer', fontFamily: 'inherit' },
  link: { background: 'none', border: 'none', padding: 0, marginTop: 6, color: ACCENT, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-block' },
  footer: {
    marginTop: '0.2rem', background: 'none', border: '1px solid #e0d8cf', borderRadius: 10,
    padding: '0.6rem', fontSize: '0.8rem', color: '#6d5f4c', cursor: 'pointer', fontFamily: 'inherit',
  },
}

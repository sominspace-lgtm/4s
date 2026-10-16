'use client'

import { useState } from 'react'
import { useRecipes } from '@/lib/hooks/useRecipes'
import { EMPTY_DRAFT } from '@/lib/recipes/types'
import { goToSection } from '@/lib/utils/navigate'
import type { CollectionProp, CollectionRow } from '@/lib/hooks/useCollections'

// A "Recipes to try" collection (2026-10-16): recipes belong in the Kitchen,
// where they can be cooked, planned and shopped for. This moves each row in as
// a saved recipe tagged "to try", keeping its name and link. The collection
// itself is left alone; delete it once you are happy.
export default function RecipesToKitchen({ props, rows, spaceId }: { props: CollectionProp[]; rows: CollectionRow[]; spaceId: string | null }) {
  const book = useRecipes(spaceId)
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const [err, setErr] = useState<string | null>(null)
  const nameProp = props.find(p => p.type === 'text') ?? props[0]
  const linkProp = props.find(p => p.type === 'url')

  async function move() {
    setState('busy'); setErr(null)
    const have = new Set(book.recipes.map(r => r.title.trim().toLowerCase()))
    for (const r of rows) {
      const title = String(r.cells[nameProp?.id ?? ''] ?? '').trim()
      if (!title || have.has(title.toLowerCase())) continue
      const link = linkProp ? String(r.cells[linkProp.id] ?? '').trim() : ''
      const url = /^https?:\/\//i.test(link) ? link : null
      let host: string | null = null
      try { host = url ? new URL(url).hostname.replace(/^www\./, '') : null } catch { /* no host */ }
      const res = await book.add({ ...EMPTY_DRAFT, title, source_url: url, source_name: host, tags: ['to try'] }, { shared: !!spaceId })
      if (res.error) { setErr(res.error); setState('idle'); return }
    }
    setState('done')
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.8rem', padding: '0.7rem 0.9rem', borderRadius: 12,
      background: 'color-mix(in srgb, var(--gold) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 25%, var(--border))',
    }}>
      <span style={{ flex: 1, minWidth: '12rem', fontSize: '0.84rem', color: 'var(--text)' }}>
        {state === 'done' ? 'Moved to the Kitchen, tagged "to try". You can delete this collection now.' : 'Recipes live in the Kitchen now, where you can cook, plan and shop for them.'}
      </span>
      {state !== 'done' && rows.length > 0 && (
        <button className="btn btn-primary press" style={{ minHeight: 40 }} disabled={state === 'busy' || book.loading} onClick={move}>
          {state === 'busy' ? 'Moving…' : `Move ${rows.length} to Kitchen`}
        </button>
      )}
      <button className="btn btn-secondary press" style={{ minHeight: 40 }} onClick={() => goToSection('kitchen')}>Open Kitchen</button>
      {err && <span style={{ width: '100%', fontSize: '0.78rem', color: 'var(--rose)' }}>{err}</span>}
    </div>
  )
}

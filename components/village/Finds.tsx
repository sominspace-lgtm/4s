'use client'

import Sheet from '@/components/ui/Sheet'
import { FIND_KINDS, FIND_INFO, FINDS_PER_GROWTH, grownCount, type FindKind, type FindsState } from '@/lib/village/finds'
import { GROWTH } from './scene/sceneData'

// The finds' pixel art and the shared collection (2026-11-05). Each find is
// drawn on an 8x8 grid, one letter per pixel, so they sit right next to the
// village's own sprites.

const ART: Record<FindKind, { rows: string[]; colors: Record<string, string> }> = {
  donut: { rows: ['..dddd..', '.dpbpsd.', 'dpsppbpd', 'dpp..ppd', 'ddd..ddd', 'dddddddd', '.dddddd.', '..dddd..'],
    colors: { d: '#b9773f', p: '#f29bb5', s: '#fff6d8', b: '#7cc0d8' } },
  feather: { rows: ['......wW', '.....wwW', '....wwW.', '...wwW..', '..wwW...', '.wwW....', '.s......', 's.......'],
    colors: { w: '#f4efe6', W: '#cfc3b0', s: '#9a7a52' } },
  letter: { rows: ['........', 'eeeeeeee', 'eeppppee', 'epeppepe', 'epprrppe', 'eppppppe', 'eeeeeeee', '........'],
    colors: { e: '#d9c9a8', p: '#fbf3e2', r: '#d8483e' } },
  pebble: { rows: ['........', '.hh.hh..', 'hlhhhhh.', 'hhhhhhh.', '.hhhhH..', '..hhH...', '...H....', '........'],
    colors: { h: '#c9c2b6', H: '#a9a296', l: '#ece7de' } },
  tulip: { rows: ['..r.r.r.', '..rrrrr.', '..rRrRr.', '..rrrrr.', '...rrr..', '....g...', '..gg.gg.', '....g...'],
    colors: { r: '#e0566e', R: '#b83a52', g: '#5f9e4f' } },
  clover: { rows: ['.gg..gg.', 'gGgg.gGg', '.ggggg..', '..ggg...', '.ggggg..', 'gGg.gGg.', '.g..sgg.', '...s....'],
    colors: { g: '#5f9e4f', G: '#7cbc6a', s: '#3f6d35' } },
  shell: { rows: ['..ssss..', '.sSsSsS.', 'sSsSsSsS', 'sSsSsSsS', '.sSsSsS.', '..ssss..', '...ll...', '........'],
    colors: { s: '#f6d2b8', S: '#e3a98a', l: '#c9846a' } },
  strawberry: { rows: ['..ggg...', '.rrgrr..', 'rrsrrsr.', 'rrrrrrr.', '.rsrrs..', '.rrrrr..', '..rrr...', '...r....'],
    colors: { g: '#5f9e4f', r: '#e04a52', s: '#ffe9a8' } },
  acorn: { rows: ['...C....', '.cccccc.', 'cCcCcCcc', '.nnnnnn.', '.nnnnnN.', '.nnnnNN.', '..nnNN..', '...nN...'],
    colors: { c: '#7a5232', C: '#5e3d22', n: '#c98a4b', N: '#a86d36' } },
  leaf: { rows: ['...o....', '.o.oo.o.', '.oooooo.', 'oooOoooo', '.ooOooo.', '..oOoo..', '...s....', '...s....'],
    colors: { o: '#e0703a', O: '#c4532a', s: '#8a4a2a' } },
  mushroom: { rows: ['..rrrr..', '.rwrrwr.', 'rrrrrrrr', 'rwrrrrwr', '..tttt..', '..tttt..', '..tttt..', '........'],
    colors: { r: '#d8483e', w: '#fff3e3', t: '#efe4cf' } },
  pinecone: { rows: ['...gg...', '..bBb...', '.bBbBb..', '.BbBbB..', '.bBbBb..', '..BbB...', '...b....', '........'],
    colors: { g: '#5f9e4f', b: '#8a5a35', B: '#6b4227' } },
  mitten: { rows: ['..mmm...', '.mmmmm.m', '.mmmmmmm', '.mmmmmm.', '.mmMmm..', '.wwwww..', '.wwwww..', '........'],
    colors: { m: '#c94a5a', M: '#a83a4a', w: '#f3ece2' } },
  star: { rows: ['...y....', '..yyy...', 'yyywyyy.', '.yyyyy..', '..yyy...', '.yy.yy..', 'yy...yy.', '........'],
    colors: { y: '#f2c14e', w: '#fff6d8' } },
}

/** A find's pixel art. Inside an SVG pass `inSvg` to get a <g> instead of an <svg>. */
export function FindIcon({ kind, size = 16, dim = false, inSvg = false }: { kind: FindKind; size?: number; dim?: boolean; inSvg?: boolean }) {
  const a = ART[kind]
  const px = a.rows.flatMap((row, y) => [...row].map((c, x) => (c === '.' ? null : (
    <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={dim ? '#b9b1a3' : a.colors[c]} />
  ))))
  if (inSvg) return <g transform={`scale(${size / 8})`} shapeRendering="crispEdges">{px}</g>
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden style={{ flexShrink: 0, opacity: dim ? 0.45 : 1 }}>{px}</svg>
  )
}

/** The way into the collection: just the newest find, no number. */
export function CollectionButton({ latest, onOpen }: { latest: FindKind | null; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="press" title="Our collection" aria-label="Our collection"
      style={{
        position: 'absolute', top: '0.7rem', right: '3.1rem', zIndex: 6,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 28,
        background: 'color-mix(in srgb, var(--bg) 70%, transparent)', border: '1px solid var(--border)',
        borderRadius: 8, cursor: 'pointer', backdropFilter: 'blur(4px)',
      }}>
      <FindIcon kind={latest ?? 'feather'} size={16} />
    </button>
  )
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function CollectionSheet({ open, state, onClose }: { open: boolean; state: FindsState; onClose: () => void }) {
  const first = new Map<FindKind, string>()
  for (const k of state.kept) if (!first.has(k.kind)) first.set(k.kind, k.at)
  const grown = Math.min(GROWTH.length, grownCount(state.kept.length))
  const newest = grown > 0 ? GROWTH[grown - 1] : null
  const toNext = FINDS_PER_GROWTH - (state.kept.length % FINDS_PER_GROWTH)

  return (
    <Sheet open={open} title="Our collection" onClose={onClose}>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 1rem' }}>
        Little things turn up around the village every few hours. Tap one to keep it here.
        Doing your everyday things in SS brings them sooner.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(5.5rem, 1fr))', gap: '0.6rem' }}>
        {FIND_KINDS.map(kind => {
          const at = first.get(kind)
          const seasons = FIND_INFO[kind].seasons
          const hint = seasons === 'rare' ? 'On a good day' : seasons === 'all' ? 'Any time' : seasons.map(s => s[0].toUpperCase() + s.slice(1)).join(', ')
          return (
            <div key={kind} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', textAlign: 'center',
              padding: '0.7rem 0.3rem', borderRadius: 12, background: at ? 'var(--surface2)' : 'transparent',
              border: `1px ${at ? 'solid' : 'dashed'} var(--border)`,
            }}>
              <FindIcon kind={kind} size={32} dim={!at} />
              <div style={{ fontSize: '0.75rem', color: at ? 'var(--text)' : 'var(--muted)', lineHeight: 1.3 }}>
                {at ? FIND_INFO[kind].name.replace(/^(A|An) (.)/, (_, _a, c: string) => c.toUpperCase()) : '?'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{at ? shortDate(at) : hint}</div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '1.1rem', padding: '0.75rem 0.9rem', borderRadius: 12, background: 'color-mix(in srgb, var(--gold) 10%, var(--surface2))' }}>
        <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>
          {newest ? `Newest in the village: ${newest.title.toLowerCase()}.` : 'The village is waiting to grow.'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
          {grown >= GROWTH.length
            ? 'Everything has grown in. Keep collecting.'
            : toNext === 1 ? 'One more find and something new appears.' : 'A few more finds and something new appears.'}
        </div>
      </div>
    </Sheet>
  )
}

'use client'

import { hashPos } from '@/lib/village/state'
import { Draggable } from './shapes'
import { WelcomeTag } from './SceneSheets'
import { GROUND_Y, spellCount } from './sceneData'

// The gathering's guest layer (Phase 2, 2026-08-29; its own file 2026-10-29).
// The objects that carry a gathering: the welcome sign, the guestbook, the
// record player, the dinner table. Then every visible guest contribution,
// scattered near the object it belongs to: a flower by the well for a
// thank-you, a record by the player for a song, a folded note near Home.
// Positions come from each contribution's id (hashPos), never stored, so the
// layer is a pure function of `contributions` and needs no arranging.

export interface GuestContributionView {
  id: string; kind: string; guest_name: string | null; body: string | null
  meta: Record<string, unknown>; status: string
}

export default function GuestLayer({ home, decorPos, arranging, draggingId, startDrag, contributions, menu, guestAlbumUrl, warm, onWelcome, contribPulse }: {
  home: { x: number; y: number }
  decorPos: (id: string) => { x: number; y: number }
  arranging: boolean
  draggingId: string | null
  startDrag: (id: string) => (e: React.PointerEvent) => void
  contributions: GuestContributionView[]
  menu: { id: string; name: string; note: string }[]
  guestAlbumUrl?: string | null
  /** Lanterns are lit: the string lights glow. */
  warm: boolean
  onWelcome?: () => void
  /** ' village-changed' for a contribution that just arrived, else ''. */
  contribPulse: (id: string) => string
}) {
  const clampX = (x: number) => Math.max(24, Math.min(776, x))
  const well = decorPos('wishingWell'), gaz = decorPos('gazebo')
  const signX = clampX(home.x - 66), signY = GROUND_Y + 34
  const bookX = clampX(well.x + 30), bookY = well.y + 2
  const juke = { x: clampX(gaz.x - 34), y: gaz.y + 8 }
  const booth = { x: clampX(gaz.x + 24), y: gaz.y - 4 }
  const table = decorPos('dinnerTable')
  const openAlbum = guestAlbumUrl && !arranging ? () => window.open(guestAlbumUrl, '_blank', 'noopener') : undefined
  const visible = contributions.filter(c => c.status === 'visible')
  const near = (k: string) => visible.filter(c => c.kind === k)
  const scatter = (id: string, cx: number, cy: number, sx: number, sy: number) => ({
    x: clampX(cx + (hashPos(id + 'gx') - 0.5) * sx),
    y: cy + (hashPos(id + 'gy') - 0.5) * sy,
  })
  return (
    <g>
      {/* Dinner table — the gathering's centre, set with a cake + mugs.
          Arrangeable (round 80) via decorPos('dinnerTable'). */}
      <Draggable x={table.x} y={table.y} id="dinnerTable" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('dinnerTable')} r={16}>
        <title>The table is set</title>
        <ellipse cx={0} cy={2} rx={16} ry={3.4} fill="var(--text)" opacity={0.16} />
        <image href="/village-assets/cake-table.png" x={-15} y={-21.5} width={30} height={21.2}
          style={{ imageRendering: 'pixelated' }} />
      </Draggable>

      {/* Menu board — a little standing chalkboard by the table when
          the hosts have set a menu (2026-09-03). Passive, no tap.
          Own arrangeable position (round 80) rather than derived from
          the table, so the whole cluster can be spread out. */}
      {menu.length > 0 && (() => {
        const items = menu.filter(m => m.name.trim()).slice(0, 4)
        if (!items.length) return null
        const mb = decorPos('menuBoard')
        const h = 12 + items.length * 6
        return (
          <Draggable x={mb.x} y={mb.y} id="menuBoard" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('menuBoard')} r={14}>
            <title>{`On the menu: ${items.map(m => m.name).join(', ')}`}</title>
            <rect x={-1} y={0} width={2} height={16} rx={0.8} fill="#8a6f52" />
            <rect x={-15} y={-h} width={30} height={h} rx={2} fill="#3a4038" stroke="var(--border)" strokeWidth={0.6} />
            <text x={0} y={-h + 6} textAnchor="middle" fontSize={4} fill="#e8e0cf" fontFamily="var(--font-body)">Tonight</text>
            {items.map((m, i) => (
              <text key={m.id} x={0} y={-h + 12 + i * 6} textAnchor="middle" fontSize={3.6} fill="#cfc7b4" fontFamily="var(--font-body)">
                {m.name.length > 16 ? m.name.slice(0, 15) + '…' : m.name}
              </text>
            ))}
          </Draggable>
        )
      })()}

      {/* Party decor (round 75; round 80 2026-09-03 — bolder, and a
          string of warm lights over the path so the "people are here"
          read carries at a glance). Static, not interactive. */}
      <g transform={`translate(${table.x} ${table.y - 32})`} opacity={0.95} pointerEvents="none">
        <image href="/village-assets/flower-garland.png" x={-24} y={0} width={48} height={48 * (107 / 272)}
          style={{ imageRendering: 'pixelated' }} />
      </g>
      {/* String lights — a drooping swag between the welcome sign and
          the cottage, warm bulbs that glow after dark. */}
      {(() => {
        const x0 = signX + 6, x1 = home.x - 20, y0 = signY - 30, y1 = home.y - 22
        const bulbs = 7
        return (
          <g pointerEvents="none">
            <path d={`M ${x0} ${y0} Q ${(x0 + x1) / 2} ${Math.max(y0, y1) + 14} ${x1} ${y1}`}
              fill="none" stroke="#6b5a44" strokeWidth={0.8} />
            {Array.from({ length: bulbs }).map((_, i) => {
              const t = (i + 1) / (bulbs + 1)
              const bx = x0 + (x1 - x0) * t
              const by = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * 14
              return (
                <circle key={i} cx={bx} cy={by + 2} r={warm ? 1.7 : 1.2}
                  fill="var(--amber)" opacity={warm ? 0.95 : 0.5}
                  filter={warm ? 'url(#vglow)' : undefined}
                  className={warm ? 'village-glow' : undefined} />
              )
            })}
          </g>
        )
      })()}
      {(() => { const p = decorPos('balloonsA'); return (
        <Draggable x={p.x} y={p.y} id="balloonsA" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('balloonsA')} r={12}>
          <image href="/village-assets/balloons.png" x={-10} y={-42} width={20} height={20 * (175 / 128)}
            style={{ imageRendering: 'pixelated' }} className="village-mote village-mote-2" />
        </Draggable>
      ) })()}
      {(() => { const p = decorPos('balloonsB'); return (
        <Draggable x={p.x} y={p.y} id="balloonsB" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('balloonsB')} r={10}>
          <image href="/village-assets/balloons.png" x={-8} y={-34} width={16} height={16 * (175 / 128)}
            style={{ imageRendering: 'pixelated' }} className="village-mote village-mote-4" />
        </Draggable>
      ) })()}
      {[[home.x - 26, GROUND_Y + 40], [home.x + 32, GROUND_Y + 46]].map(([gx, gy], i) => (
        <g key={i} transform={`translate(${clampX(gx)} ${gy})`} pointerEvents="none">
          <image href="/village-assets/gift-box.png" x={-5.5} y={-11} width={11} height={11}
            style={{ imageRendering: 'pixelated' }} />
        </g>
      ))}

      {/* Photo booth — tapping opens the shared album */}
      <g transform={`translate(${booth.x} ${booth.y})`}
        onClick={openAlbum}
        className={openAlbum ? 'village-entity' : undefined}
        style={{ cursor: openAlbum ? 'pointer' : undefined }}>
        <title>{guestAlbumUrl ? 'Photo booth — open the album' : 'Photo booth'}</title>
        <ellipse cx={0} cy={1} rx={9} ry={2.4} fill="var(--text)" opacity={0.15} />
        <image href="/village-assets/photo-booth.png" x={-9} y={-27} width={18} height={27.3}
          style={{ imageRendering: 'pixelated' }} />
        {near('photo').length > 0 && (
          <image href="/village-assets/polaroid-stack.png" x={6} y={-6} width={9} height={9}
            style={{ imageRendering: 'pixelated' }} />
        )}
      </g>

      {/* Welcome sign — just the sign now; the QR lives on its own
          easel to the left (2026-09-03, was a tiny unreadable overlay
          here plus a huge floating one that collided with everything). */}
      <g transform={`translate(${signX} ${signY})`} onClick={onWelcome && !arranging ? (e => { e.stopPropagation(); onWelcome() }) : undefined} style={onWelcome ? { cursor: 'pointer' } : undefined}>
        <title>Welcome. Tap for Wi-Fi and house info.</title>
        {onWelcome && <WelcomeTag />}
        <ellipse cx={0} cy={1} rx={11} ry={2.4} fill="var(--text)" opacity={0.15} />
        <image href="/village-assets/welcome-sign.png" x={-13} y={-26} width={26} height={26.6}
          style={{ imageRendering: 'pixelated' }} />
      </g>

      {/* The join QR lives in the sky panel now (GatheringSkyBox),
          not on a sign in the scene. */}

      {/* Guestbook — a page or two thicker for every signature */}
      <g transform={`translate(${bookX} ${bookY})`}>
        <title>{`The guestbook — ${spellCount(near('guestbook').length)} ${near('guestbook').length === 1 ? 'signature' : 'signatures'}`}</title>
        <ellipse cx={0} cy={1} rx={12} ry={2.6} fill="var(--text)" opacity={0.15} />
        <image href="/village-assets/guestbook-open.png" x={-12} y={-16} width={24} height={16.3}
          style={{ imageRendering: 'pixelated' }} />
        {near('guestbook').slice(0, 6).map((c, i) => (
          <rect key={c.id} x={-9 + i * 0.5} y={-3 - i * 0.7} width={18} height={1.4} rx={0.5}
            fill="#f3ead5" stroke="var(--border)" strokeWidth={0.2} opacity={0.9} />
        ))}
      </g>

      {/* Record player + a record per song */}
      <g transform={`translate(${juke.x} ${juke.y})`}>
        <title>The record player</title>
        <ellipse cx={0} cy={1} rx={11} ry={2.6} fill="var(--text)" opacity={0.15} />
        <image href="/village-assets/jukebox.png" x={-10.5} y={-20} width={21} height={19.8}
          style={{ imageRendering: 'pixelated' }} />
      </g>
      {near('song').slice(0, 8).map((c, i) => {
        const p = scatter(c.id, juke.x + 14, juke.y - 1, 16, 7)
        return (
          <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={'village-entity' + contribPulse(c.id)}>
            <title>{`${c.guest_name || 'A guest'} added: ${(c.meta.title as string) || c.body || 'a song'}`}</title>
            <image href={`/village-assets/record-${(i % 3) + 1}.png`} x={-3} y={-6} width={6} height={6}
              style={{ imageRendering: 'pixelated' }} />
          </g>
        )
      })}

      {/* Thank-yous — a little vase of flowers gathering by the well.
          Sized/rotated/depth-sorted per vase (round 80, 2026-09-04)
          so a full well reads as flowers gathering, not one icon
          stamped out ten times. */}
      {near('thank_you').slice(0, 10)
        .map(c => ({ c, p: scatter(c.id, well.x, well.y + 8, 30, 9) }))
        .sort((a, b) => a.p.y - b.p.y)
        .map(({ c, p }) => {
          const scale = 0.82 + hashPos(c.id + 'sc') * 0.4
          const rot = (hashPos(c.id + 'rot') - 0.5) * 16
          return (
            <g key={c.id} transform={`translate(${p.x} ${p.y}) rotate(${rot}) scale(${scale})`} className={'village-entity' + contribPulse(c.id)}>
              <title>{`${c.guest_name || 'A guest'}: ${c.body || 'thank you'}`}</title>
              <image href="/village-assets/thankyou-vase.png" x={-3.5} y={-13} width={7} height={13}
                style={{ imageRendering: 'pixelated' }} />
            </g>
          )
        })}

      {/* Notes — folded papers drifting in Home's yard */}
      {near('note').slice(0, 8).map(c => {
        const p = scatter(c.id, home.x + 44, GROUND_Y + 46, 40, 14)
        return (
          <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={'village-glow' + contribPulse(c.id)}>
            <title>{`${c.guest_name || 'A guest'}: ${c.body || ''}`}</title>
            <rect x={-3} y={-4} width={6} height={5} rx={0.6} fill="#fbf3df" stroke="var(--border)" strokeWidth={0.3}
              transform={`rotate(${(hashPos(c.id + 'r') - 0.5) * 24})`} />
          </g>
        )
      })}

      {/* Fridge notes — magnets on a board near Home */}
      {near('fridge').map(c => {
        const p = scatter(c.id, home.x - 34, GROUND_Y + 12, 22, 16)
        return (
          <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={contribPulse(c.id).trim() || undefined}>
            <title>{`${c.guest_name || 'A guest'} put up: ${c.body || ''}`}</title>
            <rect x={-3.4} y={-4.2} width={6.8} height={5.6} rx={0.6} fill="#fdf6e6" stroke="var(--border)" strokeWidth={0.3} />
            <text x={0} y={0.6} textAnchor="middle" fontSize={3.4}>{(c.meta.icon as string) || '❤️'}</text>
          </g>
        )
      })}

      {/* Where guests are from — a tight cluster of pins just below the
          horizon behind the cottage (was a 520-wide smear edge to edge). */}
      {near('from').slice(0, 10).map(c => {
        const p = scatter(c.id, home.x, GROUND_Y - 6, 150, 7)
        return (
          <g key={c.id} transform={`translate(${p.x} ${p.y})`} className={'village-entity' + contribPulse(c.id)}>
            <title>{`${c.guest_name || 'A guest'} — from ${(c.meta.place as string) || c.body || 'somewhere'}`}</title>
            <path d="M 0 0 C -2.4 -4 -2.4 -6.4 0 -8 C 2.4 -6.4 2.4 -4 0 0 Z" fill="var(--blush)" stroke="var(--surface)" strokeWidth={0.4} />
            <circle cy={-5} r={1} fill="var(--surface)" />
          </g>
        )
      })}
    </g>
  )
}

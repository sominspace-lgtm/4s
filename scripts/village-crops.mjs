// Hand-measured crop rectangles for scripts/crop-village-assets.mjs.
// `sheet` is relative to SHEET_ROOT. `out` lands at public/village-assets/<out>.png.
// `trim: true` trims transparent edges after extract (tightens the box).

export const SHEET_ROOT =
  'C:/Users/harol/Documents/Codex/2026-08-27/make/outputs/village-master-visual-assets'

const GUEST = 'character/animation/interaction/sylvia-harry-guest-gathering-poses-alpha.png'

export const CROPS = [
  // ── Movie-night couple (facing the screen, under a blanket) ─────────────
  {
    sheet: 'character/animation/interaction/sylvia-harry-movie-night-interactions-elements-alpha.png',
    out: 'sh-int-movie', left: 682, top: 648, width: 214, height: 246,
  },

  // ── Party / gathering couple beats (party outfit) ──────────────────────
  { sheet: GUEST, out: 'couple-party-1', left: 652, top: 526, width: 268, height: 244 }, // close together
  { sheet: GUEST, out: 'couple-party-2', left: 22,  top: 866, width: 280, height: 250 }, // laughing
  { sheet: GUEST, out: 'couple-party-3', left: 20,  top: 138, width: 284, height: 262 }, // waving welcome
]

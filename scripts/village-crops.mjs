// Hand-measured crop rectangles for scripts/crop-village-assets.mjs.
// `sheet` is relative to SHEET_ROOT. `out` lands at public/village-assets/<out>.png.
// `trim: true` trims transparent edges after extract (tightens the box).

export const SHEET_ROOT =
  'C:/Users/harol/Documents/Codex/2026-08-27/make/outputs/village-master-visual-assets'

const GUEST = 'character/animation/interaction/sylvia-harry-guest-gathering-poses-alpha.png'
const RARE  = 'character/animation/interaction/sylvia-harry-rare-couple-moments-alpha.png'
const SLEEP = 'character/wardrobe/wardrobe-sleepwear-interactions-alpha.png'
const SOMI  = 'character/somi/somi-ambient-reactive-behaviors-corrected-alpha.png'
const STAR  = 'village/village-stargazing-workshop-props-alpha.png'
const AMBI  = 'village/village-animation-ambient-flowers-lights.png'

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

  // ── More default-outfit couple vignettes → COUPLE_INTERACT_FRAMES ───────
  { sheet: RARE, out: 'sh-int-sitting', left: 8,    top: 300, width: 320, height: 232 }, // sitting together
  { sheet: RARE, out: 'sh-int-sunset',  left: 430,  top: 300, width: 320, height: 232 }, // watching a sunset (from behind)
  { sheet: RARE, out: 'sh-int-picnic',  left: 16,   top: 586, width: 372, height: 214 }, // picnic on a mat
  { sheet: RARE, out: 'sh-int-reading', left: 500,  top: 592, width: 252, height: 208 }, // reading together
  { sheet: RARE, out: 'sh-int-selfie',  left: 836,  top: 588, width: 268, height: 214 }, // taking a photo
  { sheet: RARE, out: 'sh-int-hug',     left: 1128, top: 556, width: 190, height: 258 }, // a hug
  { sheet: RARE, out: 'sh-int-whisper', left: 496,  top: 818, width: 262, height: 202 }, // whispering

  // ── Sleepwear couple (for the Goodnight scene) ────────────────────────
  { sheet: SLEEP, out: 'couple-nightcap', left: 734, top: 588, width: 342, height: 306 }, // wrapped in a blanket, mugs

  // ── Somi the cat — ambient poses ─────────────────────────────────────
  { sheet: SOMI, out: 'somi-loaf',    left: 738,  top: 538, width: 224, height: 132 }, // curled asleep
  { sheet: SOMI, out: 'somi-lounge',  left: 1232, top: 516, width: 214, height: 162 }, // lying with a flower
  { sheet: SOMI, out: 'somi-roll',    left: 984,  top: 528, width: 202, height: 152 }, // rolling on back
  { sheet: SOMI, out: 'somi-yawn',    left: 522,  top: 496, width: 164, height: 186 },
  { sheet: SOMI, out: 'somi-sleepy',  left: 322,  top: 506, width: 148, height: 156 },
  { sheet: SOMI, out: 'somi-watch',   left: 198,  top: 726, width: 214, height: 184 }, // watching a bird
  { sheet: SOMI, out: 'somi-stalk',   left: 732,  top: 796, width: 234, height: 126 }, // crouched, stalking

  // ── Placeable props → ASSET_LIBRARY ─────────────────────────────────
  { sheet: STAR, out: 'fire-pit',      left: 60,   top: 130, width: 320, height: 200 },
  { sheet: STAR, out: 'fire-pit-lit',  left: 420,  top: 118, width: 320, height: 214 },
  { sheet: STAR, out: 'tree-stump',    left: 812,  top: 150, width: 156, height: 180 },
  { sheet: STAR, out: 'camp-blanket',  left: 1200, top: 176, width: 244, height: 150 },
  { sheet: STAR, out: 'thermos',       left: 62,   top: 390, width: 118, height: 220 },
  { sheet: STAR, out: 'telescope',     left: 196,  top: 356, width: 262, height: 262 },
  { sheet: STAR, out: 'star-chart',    left: 468,  top: 486, width: 156, height: 118 },
  { sheet: STAR, out: 'camp-lantern',  left: 646,  top: 430, width: 132, height: 184 },
  { sheet: STAR, out: 'potted-plant',  left: 812,  top: 452, width: 178, height: 168 },
  { sheet: STAR, out: 'tool-pegboard', left: 48,   top: 678, width: 340, height: 232 },
  { sheet: STAR, out: 'toolbox',       left: 418,  top: 750, width: 200, height: 150 },
  { sheet: STAR, out: 'plank-stack',   left: 884,  top: 770, width: 274, height: 140 },
  { sheet: STAR, out: 'wheelbarrow-tools', left: 1192, top: 740, width: 290, height: 176 },

  // ── Harry's pyjama walk (Sylvia's were already cropped) — for the
  //    Goodnight scene walk-in ─────────────────────────────────────────
  { sheet: SLEEP, out: 'harry-pajama-walk-1', left: 906,  top: 28, width: 152, height: 288 },
  { sheet: SLEEP, out: 'harry-pajama-walk-2', left: 1072, top: 28, width: 162, height: 288 },
  { sheet: SLEEP, out: 'harry-pajama-walk-3', left: 1248, top: 28, width: 160, height: 288 },

  // ── Ambient 2-frame animations ──────────────────────────────────────
  { sheet: AMBI, out: 'ambient-flower-1', left: 200, top: 190, width: 240, height: 240 },
  { sheet: AMBI, out: 'ambient-flower-2', left: 200, top: 650, width: 240, height: 240 },
  { sheet: AMBI, out: 'hang-lantern-1',   left: 690, top: 90,  width: 160, height: 360 },
  { sheet: AMBI, out: 'hang-lantern-2',   left: 690, top: 560, width: 160, height: 360 },
]

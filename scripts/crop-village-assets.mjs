// Crop sprites out of the master visual-asset sheets into
// public/village-assets/. The sheets live OUTSIDE the repo
// (C:/Users/harol/Documents/Codex/2026-08-27/make/outputs/village-master-visual-assets)
// and carry no coordinate metadata, so the manifest in ./village-crops.mjs
// holds hand-measured extract rectangles. This is a run-once-per-asset
// tool, not a build step — the committed PNGs are the app's source of truth.
//
//   node scripts/crop-village-assets.mjs            # write every crop
//   node scripts/crop-village-assets.mjs slice <sheet> <l> <t> <w> <h> [out]
//        # one-off: cut a region for visual inspection (writes to
//        # .crop-tmp/ by default, which is gitignored)

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SHEET_ROOT, CROPS } from './village-crops.mjs'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(REPO, 'public', 'village-assets')

async function slice() {
  const [sheet, l, t, w, h, out] = process.argv.slice(3)
  if (!sheet || !w) {
    console.error('usage: node scripts/crop-village-assets.mjs slice <sheet-rel-path> <left> <top> <width> <height> [outName]')
    process.exit(1)
  }
  const dst = join(REPO, '.crop-tmp', (out || 'slice') + '.png')
  await mkdir(dirname(dst), { recursive: true })
  await sharp(join(SHEET_ROOT, sheet))
    .extract({ left: +l, top: +t, width: +w, height: +h })
    .png()
    .toFile(dst)
  console.log('wrote', dst)
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true })
  let ok = 0
  for (const c of CROPS) {
    const src = join(SHEET_ROOT, c.sheet)
    if (!existsSync(src)) { console.error('MISSING SHEET', c.sheet); continue }
    const dst = join(OUT_DIR, c.out + '.png')
    let img = sharp(src).extract({ left: c.left, top: c.top, width: c.width, height: c.height })
    if (c.resizeH) img = img.resize({ height: c.resizeH })
    if (c.trim) img = img.trim()
    await img.png().toFile(dst)
    const meta = await sharp(dst).metadata()
    console.log(`  ${c.out}.png  ${meta.width}x${meta.height}`)
    ok++
  }
  console.log(`\n${ok}/${CROPS.length} crops written to public/village-assets/`)
}

if (process.argv[2] === 'slice') slice()
else run()

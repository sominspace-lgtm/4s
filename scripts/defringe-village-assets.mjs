import sharp from 'sharp'
import { join } from 'path'

// The master sprite exports carry a magenta/pink chroma-key halo along many
// edges (2026-09-08). It can't be cleaned by a blanket rule — the cosy
// palette has real pink in it (the habit flowers, party balloons, Sylvia's
// tennis kit, the flower planters) and those pixels look identical to the
// halo. So this runs an explicit ALLOWLIST of sprites known to contain no
// real pink / rose / coral, and on those it neutralises every
// magenta-leaning pixel outright.
//
// Add a sprite here once you've checked it has no legitimate pink.

const DIR = 'public/village-assets'
const ALLOW = [
  'kitchen.png', 'market-stall.png', 'gazebo.png', 'well.png', 'water-pump.png',
  'foot-bridge.png', 'notice-board.png', 'postcard-rack.png', 'wood-signpost.png',
  'blank-sign.png', 'street-lamp.png', 'lamppost.png', 'lantern-post.png',
  'garden-lantern.png', 'clock-tower-dawn.png', 'clock-tower-day.png',
  'clock-tower-dusk.png', 'clock-tower-night.png', 'cottage-dark.png', 'cottage-lit.png',
  'arbor.png', 'arbor-bench.png', 'bench.png', 'fence-rail.png', 'picket-fence.png',
  'firewood.png', 'firewood-bundle.png', 'boulder-cluster.png', 'rock-cluster.png',
  'grassy-knoll.png', 'foot-bridge.png',
  'tree-round-spring.png', 'tree-round-summer.png', 'tree-round-autumn.png', 'tree-round-winter.png',
  'tree-pine-spring.png', 'tree-pine-summer.png', 'tree-pine-autumn.png', 'tree-pine-winter.png',
  'round-tree-sway-1.png', 'round-tree-sway-2.png', 'round-tree-sway-3.png', 'round-tree-sway-4.png',
  'pine-tree.png', 'life-tree.png', 'people-tree.png', 'bush-mound.png', 'snow-mound.png',
  'leaf-pile.png', 'leaves-scatter.png', 'acorns.png',
]

let touched = 0
for (const name of ALLOW) {
  const path = join(DIR, name)
  let buf
  try { buf = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true }) }
  catch { console.warn(`skip (missing): ${name}`); continue }
  const { data, info } = buf
  const out = Buffer.from(data)
  let changed = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a === 0 || !(r > g + 4 && b > g + 2)) continue
    if (a < 110) out[i + 3] = 0
    else { out[i] = g + Math.round((r - g) * 0.22); out[i + 2] = g + Math.round((b - g) * 0.22) }
    changed++
  }
  if (changed > 0) {
    await sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toFile(path)
    console.log(`${name}: ${changed} px`)
    touched++
  }
}
console.log(`\n${touched} files cleaned`)

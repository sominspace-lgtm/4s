import sharp from 'sharp'

// One-off crop for the koi swim sprite + the pond base (2026-09-08). Masters
// live outside the repo; cropped PNGs land in public/village-assets/.
const SRC = 'C:/Users/harol/Documents/Codex/2026-08-27/make/outputs/village-master-visual-assets/nature'
const OUT = 'public/village-assets'

await sharp(`${SRC}/village-lake-pond-base-alpha.png`)
  .trim({ threshold: 10 })
  .toFile(`${OUT}/pond-base.png`)
const pm = await sharp(`${OUT}/pond-base.png`).metadata()
console.log('pond-base.png', pm.width + 'x' + pm.height)

// Koi swim — 3 frames of 724x724. A fixed centred window keeps every frame
// the same size so the swim cycle doesn't jitter; the koi sits mid-frame
// and the tail wag stays inside this box.
const FW = 724
const win = { left: 250, top: 232, width: 224, height: 340 }
for (let i = 0; i < 3; i++) {
  await sharp(`${SRC}/koi-swim-animation-alpha.png`)
    .extract({ left: i * FW + win.left, top: win.top, width: win.width, height: win.height })
    .toFile(`${OUT}/koi-${i}.png`)
}
console.log('koi-0..2.png', win.width + 'x' + win.height)

// Kill the magenta chroma-key halo the masters carry. Neither the koi
// (orange / cream / navy) nor the pond (blue water, tan bank, green reeds,
// brown cattail tips) has any real pink, so any pixel where R and B both
// sit clearly above G is fringe — pull it down toward grey, drop it if faint.
for (const name of ['pond-base.png', 'koi-0.png', 'koi-1.png', 'koi-2.png']) {
  const p = `${OUT}/${name}`
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const out = Buffer.from(data)
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
    if (a === 0 || !(r > g + 4 && b > g + 2)) continue
    if (a < 110) out[i + 3] = 0
    else { out[i] = g + Math.round((r - g) * 0.22); out[i + 2] = g + Math.round((b - g) * 0.22) }
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toFile(p)
}
console.log('defringed pond + koi')

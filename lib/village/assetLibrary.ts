// The Inventory — a curated list of real village-assets sprites a user can
// drop into the scene themselves (round 31, 2026-08-27, "make a inventory
// tab in arrange where we can place anything from asset library").
//
// Deliberately NOT every file in public/village-assets/: excluded are
// animation frames that only make sense as part of a specific cycle (every
// somi-*.png pose, round-tree-sway-2/3/4.png, flower-cluster-2.png,
// flower-0..4.png/flower-dormant-*.png — tied to real plant-growth data,
// not placeable decor), the district-building sprites (shop/greenhouse/
// workshop — those ARE a district, not decor to scatter), the two house
// states (cottage-dark/lit — Home's own sprite, not a prop), Sylvia/Harry's
// sprites (the cast, not an item), moment-effect/outfit sprites (no
// standalone-decor meaning), and the functional nav props (mailbox2.png,
// signpost2.png — real click targets already wired elsewhere; mailbox-alt
// IS in this list since it's purely decorative, a second one down the lane).
//
// Each entry's `aspect` is its real source width/height so a placed item is
// never stretched — same "derive width from height × aspect" rule every
// other sprite in this scene already follows.
export interface AssetLibraryItem {
  key: string
  label: string
  href: string
  aspect: number
  /** Display height in scene units when freshly placed — small props read
   *  small, trees/structures read taller, matching this scene's own
   *  established relative scale (see shapes.tsx's various round 24-25
   *  size comments). */
  h: number
}

export const ASSET_LIBRARY: AssetLibraryItem[] = [
  { key: 'gate', label: 'Gate', href: 'gate.png', aspect: 380 / 212, h: 18 },
  { key: 'car', label: 'Car', href: 'car.png', aspect: 256 / 204, h: 24 },
  { key: 'busStop', label: 'Bus stop', href: 'bus-stop.png', aspect: 434 / 274, h: 18 },
  // well/clothesline/mailboxAlt/birdbath/benchArbor/bikeFlowerpot/vegCrate
  // removed (round 32, 2026-08-27, "delete any elements that are not from
  // my folder and currently not in my folder right now") — their source
  // sheet is no longer in the folder. Any layout the user already saved
  // with one of these placed just stops rendering it (VillageScene skips
  // an unknown asset key silently); the stale position entry is harmless.
  { key: 'bushMound', label: 'Bush', href: 'bush-mound.png', aspect: 218 / 129, h: 12 },
  { key: 'floweringBush', label: 'Flowering bush', href: 'flowering-bush.png', aspect: 276 / 209, h: 13 },
  { key: 'tallGrass', label: 'Tall grass', href: 'tall-grass.png', aspect: 222 / 209, h: 13 },
  { key: 'rockCluster', label: 'Rocks', href: 'rock-cluster.png', aspect: 288 / 196, h: 12.5 },
  { key: 'pineTree', label: 'Pine tree', href: 'pine-tree.png', aspect: 178 / 341, h: 28 },
  { key: 'roundTree', label: 'Round tree', href: 'round-tree-sway-1.png', aspect: 331 / 459, h: 26 },
  { key: 'paperLantern', label: 'Paper lantern', href: 'paper-lantern-lit.png', aspect: 141 / 345, h: 14 },
  // 'flowerCluster' removed (round 33, 2026-08-27, "make it so we cannot
  // add plants/flower. we can only grow them using habits") — even though
  // this was decorative ground cover, not a real habit-driven plant, it
  // read too close to "adding a flower" for comfort. Real plants only ever
  // come from PlantShape/plantSlots (real habit data); the Inventory
  // should never be a second way to add anything flower-shaped. Same
  // reasoning kept 'flowerVase' (a real crop, round 40) off this list too
  // — cropped and sitting in public/village-assets/ but not listed here.
  // Round 40 (2026-08-27, "put other elements in") — five more real
  // sprites from village-decor-lanterns-alpha.png.
  { key: 'bunting', label: 'Bunting', href: 'bunting.png', aspect: 287 / 109, h: 8 },
  { key: 'clothesline', label: 'Clothesline', href: 'clothesline.png', aspect: 347 / 185, h: 13 },
  { key: 'blankSign', label: 'Blank sign', href: 'blank-sign.png', aspect: 162 / 188, h: 13 },
  { key: 'garland', label: 'Garland', href: 'garland.png', aspect: 356 / 117, h: 6 },
  { key: 'breadCrate', label: 'Bread crate', href: 'bread-crate.png', aspect: 193 / 141, h: 9 },
  // Round 45 (2026-08-28, "update the village with these elements") — two
  // more from village-civic-landmarks-alpha.png. 'flowerPatch' (a real
  // crop, soc-3 from village-social-town-spaces-alpha.png — a flower bed
  // set into round cobblestone) stayed off this list for the same
  // "nothing flower-shaped" reasoning as flowerVase/flowerCluster above.
  { key: 'well', label: 'Well', href: 'well.png', aspect: 330 / 322, h: 16 },
  { key: 'noticeBoard', label: 'Notice board', href: 'notice-board.png', aspect: 330 / 308, h: 14 },

  // Round 54 (2026-08-28, "yes import all") — the placeable single props
  // from the master folder's decor sheets (village-essential-connectors /
  // -new-decor-elements / -seasonal-decor / -nature-resting-spaces). Outfit,
  // postcard, path-tile and merged-multi-item crops are left out, same rule
  // as the header note. Heights tuned to this scene's own relative scale.
  { key: 'barrel', label: 'Barrel', href: 'barrel.png', aspect: 166 / 200, h: 12 },
  { key: 'footBridge', label: 'Foot bridge', href: 'foot-bridge.png', aspect: 269 / 179, h: 11 },
  { key: 'scarecrow', label: 'Scarecrow', href: 'scarecrow.png', aspect: 234 / 284, h: 18 },
  { key: 'planterBox', label: 'Planter box', href: 'planter-box.png', aspect: 237 / 211, h: 10 },
  { key: 'seedSack', label: 'Seed sack', href: 'seed-sack.png', aspect: 172 / 203, h: 10 },
  { key: 'woodSignpost', label: 'Wooden signpost', href: 'wood-signpost.png', aspect: 177 / 210, h: 13 },
  { key: 'birdhouse', label: 'Birdhouse', href: 'birdhouse.png', aspect: 163 / 270, h: 18 },
  { key: 'waterPump', label: 'Water pump', href: 'water-pump.png', aspect: 180 / 332, h: 17 },
  { key: 'picketFence', label: 'Picket fence', href: 'picket-fence.png', aspect: 253 / 300, h: 12 },
  { key: 'bicycle', label: 'Bicycle', href: 'bicycle.png', aspect: 299 / 285, h: 13 },
  { key: 'produceBasket', label: 'Produce basket', href: 'produce-basket.png', aspect: 300 / 318, h: 11 },
  { key: 'windowBox', label: 'Window box', href: 'window-box.png', aspect: 227 / 256, h: 9 },
  { key: 'cornStalk', label: 'Corn stalk', href: 'corn-stalk.png', aspect: 99 / 150, h: 13 },
  { key: 'cherryBlossom', label: 'Cherry blossom', href: 'cherry-blossom.png', aspect: 241 / 321, h: 20 },
  { key: 'beachUmbrella', label: 'Beach umbrella', href: 'beach-umbrella.png', aspect: 342 / 351, h: 18 },
  { key: 'leafPile', label: 'Leaf pile', href: 'leaf-pile.png', aspect: 238 / 120, h: 6 },
  { key: 'sled', label: 'Sled', href: 'sled.png', aspect: 300 / 354, h: 10 },
  { key: 'gazebo', label: 'Gazebo', href: 'gazebo.png', aspect: 249 / 259, h: 26 },
  { key: 'wildflowerStrip', label: 'Wildflowers', href: 'wildflower-strip.png', aspect: 512 / 341, h: 9 },
  // Round 54 batch 2 — arbor (village-structures-decor-paths), firewood
  // (village-left-behind-objects). The village clock tower from
  // village-civic-landmarks is drawn directly in VillageScene instead (its
  // face tracks the time of day), not placed from here.
  { key: 'arbor', label: 'Flowered arbor', href: 'arbor.png', aspect: 363 / 225, h: 16 },
  { key: 'firewood', label: 'Firewood', href: 'firewood.png', aspect: 255 / 160, h: 8 },
]

export function findAsset(key: string): AssetLibraryItem | undefined {
  return ASSET_LIBRARY.find(a => a.key === key)
}

// Custom-placed items live in the same VillageLayout JSON blob every other
// draggable position already uses (no schema change needed) — their id is
// just namespaced `custom:<assetKey>:<uid>` so decorPos/startDrag/
// onMoveLandmark all work completely unchanged, and VillageScene can tell a
// custom item apart from a landmark/decor id by the prefix alone.
export const CUSTOM_ITEM_PREFIX = 'custom:'
export function makeCustomItemId(assetKey: string): string {
  const uid = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${CUSTOM_ITEM_PREFIX}${assetKey}:${uid}`
}
export function parseCustomItemId(id: string): string | null {
  if (!id.startsWith(CUSTOM_ITEM_PREFIX)) return null
  const rest = id.slice(CUSTOM_ITEM_PREFIX.length)
  const sep = rest.indexOf(':')
  return sep === -1 ? rest : rest.slice(0, sep)
}

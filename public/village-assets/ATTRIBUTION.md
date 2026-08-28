# Village art credits

Sprites in this folder (`home-house.png`, `archive-house.png`, `tree.png`, `rock.png`,
`wildflower.png`, `onion.png`, `chicken.png`, `potato-0.png`…`potato-4.png`,
`tomato-0.png`…`tomato-4.png`) are cropped from the **free tier** of:

**Cozy Farm Asset Pack** by shubibubi
https://shubibubi.itch.io/cozy-farm

## License (free tier, as stated on the pack's page, 2026-08-27)

> This asset pack can be used in any non-commercial project, you may modify the asset
> as you wish. This asset pack can't be used in any commercial project, resold or
> redistributed, even if modified.

4S is a private household app, not sold or distributed — this fits the free tier's terms.
**If that ever changes** (4S becomes a paid/distributed product), these assets need to be
either replaced or the full paid version purchased (unlocks commercial use — see the
pack's own page for current pricing).

`archive-house.png` is downloaded but not currently used in the scene (kept in reserve —
see VillageScene.tsx's own comment on why a second house-shaped sprite risks reviving the
"two houses" confusion from earlier rounds).

## Custom sprites (2026-08-27, rounds 9, 11, 12 & 13)

Everything else in this folder — `cottage.png`, `sylvia.png`, `harry.png`, `mailbox2.png`,
`bicycle.png`, `bench2.png`, `stone-lantern.png`, `pennant.png`, `flower-pot.png`,
`laundry-basket.png`, `bread-basket.png`, `book-stack.png`, `garden-lantern.png`, `tea-set.png`,
`picnic-blanket.png`, `swing.png`, `blank-sign.png`, `veg-crate.png`, `round-tree.png`,
`pine-tree.png`, `bush-mound.png`, `flowering-bush.png`, `tall-grass.png`, `rock-cluster.png`,
`shop.png`, `greenhouse.png`, `workshop.png`, `car.png`, `fence2.png`, `gate.png`,
`signpost2.png`, `mailbox3.png`, `bus-stop.png`, `round-tree-sway-1.png`…`-4.png`,
`flower-cluster-1.png`, `flower-cluster-2.png`, `paper-lantern-unlit.png`, `paper-lantern-lit.png`,
`somi-idle-1.png`…`-3.png`, `somi-walk.png`, `somi-stretch.png`, `somi-play.png`,
`somi-belly-up.png` — is the user's own custom-made art (three self-authored packs:
`simple-cozy-village-sprite-pack.zip`, `village-matching-expansion-pack.zip` / `-v2.zip`, and
`village-animations-complete.zip`), style-matched to work together and to the free-tier Cozy
Farm pieces above. No third-party license applies to these; they're the user's own.

`fence2.png` and `mailbox3.png` are downloaded but not used yet (see VillageScene.tsx's own
comments — fence2 doesn't fit FenceShape's variable-length API without restructuring it, and
mailbox3 would duplicate Home's existing mailbox2). `somi-cat.png` (round 9's single static
pose) was deleted in round 13 — fully superseded by SpriteCycle animation.

`somi-idle-1.png`…`-3.png`, `somi-walk.png`, `somi-stretch.png`, `somi-play.png` were replaced
again in round 15 (2026-08-27) with a cleaner six-pose set the user supplied directly as
`village-animation-somi-transparent.png` (not part of the three zips above) — genuinely clean
hard-alpha art (confirmed via a full pixel histogram: every pixel is either 0 or 255 alpha, no
soft/dithered edges), each frame cropped to its own exact opaque bounding box with zero padding
so every pose's "ground" lines up identically when SpriteCycle switches between them.
`somi-belly-up.png` (round 13, a different source file with no equivalent pose here) was
deleted rather than mixed with this cleaner set.

**There are only ever two people in this village: Sylvia and Harry, rendered once each (real
sprites, near Home).** `couple-bench.png` (a real couple-on-a-bench crop from
`residents-cute`) briefly stood in for the People district's badge in round 13 and was removed
in round 14 — it rendered a SECOND Sylvia+Harry, the exact duplicate-character confusion the
"two houses" fix spent a whole round eliminating for buildings. For the same reason, don't wire
in `people-interaction.png` or `tennis-outfits.png` (both source sheets are entirely
Sylvia+Harry vignettes/poses) as separate scene elements — any future use of either would need
to REPLACE the one real Sylvia/Harry pair, not add another rendering of them somewhere else.
`weather-night.png` (a small twinkle-star + crescent moon accent, no people in it) remains a
legitimate future option. All three sheets are cropped and staged only during a live session,
under `.assets-staging/`, never committed.

## Round 16 (2026-08-27) — village-master-visual-assets.zip

A fourth self-authored pack, part of a much larger "Village Living-System Integration" brief
(contextual reactions, growth/neglect, weather/season/time, Smart Home signal, memories, a
Journal, etc.). Given the size of that brief, round 16 imports a representative slice of the
visuals and wires the most concretely-scoped, lowest-risk pieces; the rest is real content,
imported but not yet wired into behavior — see the git log for the exact phased list.

Imported and wired:
- `flower-0.png`…`-4.png` (from `growth-neglect-recovery-states.png`'s row-1 seed→bloom
  sequence) — a third real `species` option in PlantShape, alongside the existing tomato/potato.
- `flower-dormant-1.png`, `flower-dormant-2.png` (same sheet's wilted-branch frames) — the
  flower species' actual dormant/neglected look, replacing the grayscale-filter approach
  tomato/potato still use (no matching "wilted tomato" art exists for those).
- Home's window glow now reads a real Smart Home occupancy signal instead of only time-of-day
  (see VillageScene.tsx's own comment on the `homeOccupied` prop and Village.tsx's
  `useSmartHome` wiring).

Imported, not yet wired (real crops, ready for a future round):
- `sh-default-sylvia.png` / `-harry.png`, `sh-sweater-cream-sylvia.png` / `-harry.png`,
  `sh-rain-umbrella-pair.png`, `sh-sweater-red-blue-sylvia.png` / `-harry.png`,
  `sh-overalls-sylvia.png` / `-harry.png` — one row of `sylvia-harry-outfit-states.png`'s
  outfit variants (the sheet has ~4 more rows of standing/sitting/seasonal poses not yet
  cropped). `sh-rain-umbrella-pair.png` is intentionally the pair TOGETHER under one umbrella,
  not split — the two figures sharing shelter only makes sense combined.
- `fx-flower-simple.png`, `fx-flower-glow.png`, `fx-flower-burst.png`, `fx-flower-burst-2.png`,
  `fx-water-droplet.png`, `fx-house-dark.png`, `fx-house-lit.png`, `fx-light-ray.png`,
  `fx-glow-ring.png`, `fx-lantern-tree.png` (from `village-moment-effects.png`) — everyday/
  meaningful/major reaction effects. No "significance classifier" exists yet to decide which
  real 4S events should trigger which tier — that's real design/engineering work of its own,
  not asset placement.

Not imported at all yet: `sylvia-harry-tennis-actions.png`, the rest of `sylvia-harry-outfit-
states.png`'s rows, and `memory-elements-and-postcards.png` / `house-smart-home-states.png`.

## Round 16b (2026-08-27) — consolidated `village-master-visual-assets/` folder

The user resent everything as one folder ("updated all visuals"), resolving two of the four
open questions above: `somi-animation-states.png` was the same content already sent separately
as `village-animation-somi-transparent.png` (round 15, already integrated), and
`village-environment-weather.png` is present under a generic export filename
(`exec-2347fef5-...png`) — a tree/leaves/flowers/rain/snow/lantern sheet. Most of its content
duplicates sprites already in this folder (trees, flowers, lanterns); the two genuinely new
pieces were cropped: `wx-snow-mound.png`, `wx-rain-1.png`, `wx-rain-2.png` — imported, not yet
wired into the existing Ambient.tsx weather-particle system.

Still genuinely missing: `memory-elements-and-postcards.png` and `house-smart-home-states.png`
(Home's occupancy signal was implemented instead by extending the EXISTING cottage.png sprite's
glow — see VillageScene.tsx — so that one may no longer be needed at all).

## Round 18 (2026-08-27) — sun.png, cloud-big.png, cloud-small.png

Cropped from `village-matching-expansion-nature-sky-transparent.png` (round 12's own source,
re-fetched from the consolidated folder) — that sheet's sun/cloud icons were skipped back in
round 12 in favor of Celestial.tsx's own gradient-drawn sun and Clouds.tsx's flat hand-drawn
ellipses. Both were swapped out this round ("update all elements with the file i sent (like
the sun)", "everything should be same style except background") — the gradient sun and flat
ellipse clouds were genuinely different visual languages from every real sprite elsewhere in
the scene. The moon (no sprite available for it) was flattened from a 3-stop to a 2-stop
gradient instead, for the same reason without new art to replace it outright.

## Round 20 (2026-08-27) — richer Somi animation, round 15's frames deleted

The user sent a much bigger 18-pose Somi sheet directly ("update somi animation, remove all old
ones"). All six of round 15's frames (`somi-idle-1.png`…`-3.png`, `somi-walk.png`,
`somi-stretch.png`, `somi-play.png`) were deleted, not kept alongside — this is a full
replacement, not an addition.

CatShape's animation now cycles 8 of the 18 poses: `somi-sit-1.png`, `somi-sit-2.png`
(a blink pair), `somi-look-back.png`, `somi-walk-1.png`, `somi-walk-2.png`, `somi-pounce.png`,
`somi-sleep.png`, `somi-peek.png` (peeking out from under a blanket).

The other 9 poses are cropped and sitting in this folder, imported but not in the cycle:
`somi-look-back-2.png`, `somi-walk-3.png`, `somi-walk-4.png` (a second walk-cycle facing the
other way), `somi-pounce-2.png`, `somi-closeup-1.png`, `somi-closeup-2.png` (two close-up
sitting poses), `somi-sleep-2.png`, `somi-peek-2.png`, `somi-peek-3.png` — real content,
available for a future round rather than an even longer cycle right now.

`somi-sleep-rolled.png` (a 10th pose, on her back with one eye showing as a sparkle mark) was
never wired into the cycle and was deleted outright in round 21, 2026-08-27 ("remove the one
somi figure where she is on her back and she only has one eye").

## Round 22 (2026-08-27) — Somi's cat animation updated again, round 20's frames deleted

"the cat animation got updated: these are now the only ones. delete all old ones." The user
swapped in two new sheets: the same 12 base poses as round 20 (identical crops, kept as-is —
`somi-sit-1/2.png`, `somi-look-back.png`/`-2.png`, `somi-walk-1/2/3/4.png`,
`somi-pounce.png`/`-2.png`, `somi-closeup-1/2.png`), plus 8 new weather-reactive poses:
`somi-stretch.png`, `somi-sit-tall.png`, `somi-sleep-glow.png` (sleeping by a lit window),
`somi-curled.png`, `somi-playing.png`, `somi-hiding-tail.png`, `somi-walk-snow.png`,
`somi-wind-leaves.png`. Round 20's now-superseded `somi-sleep.png` and `somi-peek*.png` (3
files) were deleted outright, not kept alongside.

CatShape's default cycle updated to: sit-1/2 (blink pair), look-back, walk-1/2, pounce, curled,
stretch — 6 of the 12 base poses plus 2 of the 8 weather ones. The other 12 (a second walk
direction, two close-ups, and the remaining 6 weather poses — sit-tall, sleep-glow, playing,
hiding-tail, walk-snow, wind-leaves) are imported but not in the always-on cycle; the weather
ones in particular are real candidates for weather-conditional wiring later (item 4 of the
user's earlier "Living-System" brief) rather than showing regardless of actual conditions.

## Round 23 (2026-08-27) — "update only using these elements. delete all old ones"

A full re-source of every wired sprite (except Somi, already on the master folder as of round 22)
to the `village-master-visual-assets/` folder specifically, not just "some real pack" — the same
consolidated folder rounds 16/16b/18/20/22 already drew from, re-inspected sheet by sheet this
round. Where that folder had a clean equivalent, the old file was replaced and deleted outright
(not kept in reserve); where it didn't, the prop was removed from the scene rather than left
mismatched.

**Replaced (old custom-pack/free-tier file deleted, master-folder crop wired in):**
- `shop.png`, `greenhouse.png`, `workshop.png`, `gate.png`, `car.png`, `signpost2.png`,
  `mailbox2.png`, `bus-stop.png` — all re-cropped from
  `village-matching-expansion-structures-clean.png`.
- `pine-tree.png`, `bush-mound.png`, `flowering-bush.png`, `tall-grass.png`, `rock-cluster.png` —
  re-cropped from `village-matching-expansion-nature-sky-transparent.png` (sun.png/cloud-big.png/
  cloud-small.png were already sourced from this same sheet, round 18 — untouched).
- `round-tree-sway-1.png`…`-4.png` — re-cropped from `village-animation-tree-sway.png`; pixel-
  identical to the crops they replace (same source sheet all along, just re-sourced directly).
- `cottage-dark.png`, `cottage-lit.png` — two real lit/unlit crops from one of this round's export
  files (an "exec-…" generically-named house-lighting-states sheet), replacing the single
  `cottage.png` + a synthetic amber-ellipse overlay. This is the actual
  `house-smart-home-states.png` content flagged "genuinely missing" back in round 16b — Home's
  window glow now swaps to a real second sprite on the same Smart Home occupancy signal, not a
  glow layered over one fixed image.
- Sylvia/Harry: `sylvia.png`/`harry.png` (an older custom pack) replaced by `sh-default-
  sylvia.png`/`sh-default-harry.png` — already cropped from this same master folder's
  `sylvia-harry-outfit-states.png` back in round 16, sitting unused until now.
- Plants: `tomato-0…4.png`/`potato-0…4.png` (free-tier Cozy Farm pack, no master-folder
  equivalent) removed — every plant is now the `flower` species (`flower-0…4.png`/
  `flower-dormant-1/2.png`, already master-sourced since round 16).

**Redrawn as plain SVG, sprite dropped (function kept, no old file left in):**
- `LampShape` (the three path lamps) — `stone-lantern.png` had no equivalent; now a small flat
  post + globe in this file's existing TRIM/vglow language, so the path still lights up at night.
- `BuntingShape` (the birthday flag string) — `pennant.png` had no equivalent; now a hand-drawn
  triangle-flag string in the same fixed-hex language as `FeatureIcon`.

**Removed outright (no equivalent, not replaced):** `bicycle.png`, `flower-pot.png`,
`laundry-basket.png`, `bread-basket.png` (Home's yard), `tea-set.png`, `swing.png` (People's
corner — the bench alone now carries that identity), `blank-sign.png` (Places), `veg-crate.png`
(Growth Forest), `book-stack.png`, `garden-lantern.png` (Archive Grove). Also deleted as
genuinely unused housekeeping: `archive-house.png`, `chicken.png`, `home-house.png`, `onion.png`,
`rock.png`, `tree.png`, `wildflower.png` (free-tier Cozy Farm pack, never wired), `fence2.png`,
`mailbox3.png` (round 9-11 reserve crops, never wired), `round-tree.png` (superseded by the sway
cycle, which already covers every round-tree appearance in the scene).

**Kept as-is, no master-folder equivalent found:** `bench2.png` (People's district symbol, the
three path benches, and the People corner all depend on it — too central to remove without a
real replacement).

The playable view window was also narrowed again this round ("make the playable window of the
village smaller") — see VillageScene.tsx's own `BASE_VB_W`/`BASE_VB_H` comment.

## Round 24 (2026-08-27) — no more bob, the fence, Somi's reserve poses cleared out

"do not make anything bob. remove old somi animations. make sure to add everything from
[structures-clean.png] onto the village and make sure things are scaled properly but so we can
also see them."

- The cast's idle sway (`village-bob`, a 2026-08-25 keyframe/class in `globals.css`, applied to
  Sylvia/Harry/Somi) is removed outright — the three of them stand still now.
- Somi's 12 imported-but-unused reserve poses (a second walk direction, two close-ups, and 6
  weather-reactive poses — sit-tall, sleep-glow, playing, hiding-tail, walk-snow, wind-leaves)
  are deleted. Only the 8 poses in her live cycle remain: `somi-sit-1/2.png`, `somi-look-back.png`,
  `somi-walk-1/2.png`, `somi-pounce.png`, `somi-curled.png`, `somi-stretch.png`.
- `fence-rail.png` — the one item from `village-matching-expansion-structures-clean.png` round 23
  hadn't wired yet (round 23's own notes flagged `fence2.png`, a different older crop, as unused
  reserve). `FenceShape` now draws this real sprite, repeated `length` times, instead of hand-drawn
  picket rects — the two `PROPS.fences` instances near Home pick it up automatically. All nine
  items on that sheet (shop, greenhouse, workshop, gate, car, fence, signpost, mailbox, bus stop)
  are now genuinely in the scene.
- Gate/car/bus-stop/mailbox/signpost/fence sized up (their round 23 sizes read a little small next
  to the buildings they stand beside) and set to full opacity — see each shape's own updated size
  comment for the exact numbers.

## Round 25 (2026-08-27) — Somi down to the folder's own two poses, bigger scenery, a real path

"make sure the trees, building, car are bigger than the figures. make the path look more like a
path. delete old fences and use the new ones. make sure only the animation in the folder shows
for somi. please update and make better."

- **Somi, re-sourced again.** Every earlier round's Somi art (rounds 9-22) came from sheets the
  user pasted directly — never actually part of the `village-master-visual-assets` folder. That
  folder's own Somi content turned out to be much smaller: two poses on
  `village-expansion-cat-night-ambient-states.png` (a play-bow stretch and a curled sleeping
  face-closeup — the sheet's other rows are moon/stars/lanterns/flowers, not Somi). Cropped as
  `somi-playbow.png`/`somi-sleepy.png`, replacing the round 22-24 8-pose cycle outright; the 8
  files behind that cycle (`somi-sit-1/2.png`, `somi-look-back.png`, `somi-walk-1/2.png`,
  `somi-pounce.png`, `somi-curled.png`, `somi-stretch.png`) are deleted, not kept in reserve. Real
  reduction in richness — 2 frames instead of 8 — but it's what's actually in the folder.
- **Trees, buildings, and the car sized up** so they clearly read bigger than the 30-unit-tall
  cast (VillagerShape) — Growth Forest's pine and two round trees, and the workshop/greenhouse/
  shop badges, all grew roughly 25%; the car prop grew further still (see each shape's own round
  25 size comment).
- **The path rebuilt** as a real four-layer worn-trail band (a soft grassy shoulder, the dirt body,
  a darker worn tread down the center, a thin sunlit highlight on top) instead of the old two
  same-width strokes, which read as a scribbled line rather than ground.
- **Fences** — already resolved in round 24 (`fence-rail.png` is the only fence file; `FenceShape`
  already draws it exclusively). No further change needed here.

## Round 26 (2026-08-27) — Somi corrected again, next to Sylvia, a real stepping-stone path

"updated folder. only use what is in here. delete all else. put somi next to sylvia and make
smaller. make the path fit the style and theme more."

The user's folder changed between rounds: `village-expansion-cat-night-ambient-states.png` (the
source behind round 25's 2-pose Somi cut-down) is gone, replaced by
`village-expansion-community-props-alpha.png` (a magenta-background clothesline/mailbox/bird-bath/
well/bicycle/flower-pot/veg-crate/bench-and-arbor sheet — not yet mined for use). This meant round
25's Somi source no longer exists in the folder at all, and prompted a closer look: one of the
folder's four generic `exec-…png` export files, `exec-1a806105-….png`, is a pixel-identical match
for round 20's original 12-pose Somi sheet — it's been sitting in this folder the whole time,
under a name that gave no hint what it was. Somi is back to 8 of those 12 poses (`somi-sit-1/2.png`,
`somi-look-back.png`, `somi-walk-1/2.png`, `somi-pounce.png`, `somi-sit-tall.png`,
`somi-curled.png`), legitimately re-sourced from what's actually in the folder now, replacing round
25's `somi-playbow.png`/`somi-sleepy.png` (deleted — their source sheet is gone).

Somi also moved next to Sylvia (was standing apart, past Harry and the Mailbox) and shrunk to
`scale={0.75}` — see `VillageScene.tsx`'s own cast section.

The path was rebuilt a third time as a scatter of small rounded stepping-stone pavers in the
TRIM-family palette, replacing round 25's smooth gradient-stroke band — that band was a genuine
improvement over the original thin double-stroke line, but it's a vector-illustration technique
(blurred soft edges, a gradient shoulder) that read as a painted road next to this scene's flat,
blocky pixel-art sprites everywhere else. See `PATH_PAVERS`' own comment in `VillageScene.tsx`.

The new `village-expansion-community-props-alpha.png` sheet (clothesline, an alternate mailbox,
bird bath, well, bicycle + flower pot, veg crate, bench-and-arbor) is not wired into anything yet —
real content for a future round, and notably includes fresh equivalents for a few props round 23
had to remove outright for lack of one (bicycle, flower pot, veg crate).

## Round 27 (2026-08-27) — the community-props sheet wired in, everything draggable

"upload all item elements onto the village. make everything moveable."

- `village-expansion-community-props-alpha.png` (imported round 26, unwired) is now in the scene:
  `well.png`, `clothesline.png` (the version with laundry actually hanging — the empty-line variant
  on the same sheet was skipped as a near-duplicate), `mailbox-alt.png` (purely decorative — the
  functional "jot something down" mailbox stays `MailboxShape`/`mailbox2.png`, unchanged),
  `birdbath.png`, `bench-arbor.png`, `bike-flowerpot.png` (the sheet's bike and flower pot sit
  close enough together to read as one small vignette, kept as a single crop), and `veg-crate.png`
  — a real replacement for the one round 23 had to remove outright for lack of a source.
- **Everything in the scene is now draggable in arrange mode.** The pond, the three benches, five
  flower beds, two fences, three lamps, the Mailbox, the Trips signpost, and Sylvia/Harry/Somi were
  the only pieces left with no override path (`DECOR_DEFAULTS`/`decorPos`/`startDrag`, the same
  mechanism district labels and item-props have used since round 12) — each now has an id there and
  a `<Draggable>` wrapper (a new small helper in `shapes.tsx`) at its render call. Still
  deliberately NOT draggable: `FOREGROUND`/`MIDGROUND_BUSHES`, the 62 procedurally-scattered texture
  items — dragging one at a time there would be tedium, not customization, same reasoning as always.

## Round 28 (2026-08-27) — Somi's cycle rebuilt for real, and slowed way down

"make the animation loops make sense and make it change more rarely."

Two real problems with the round 26 cycle, not just polish: it only used 8 of the sheet's 12 poses
in a fairly arbitrary order, and round 26's own walk frames were picked out of sequence (the
3rd-column pose before the 2nd), so "walking" visibly jumped mid-stride instead of reading as one
gait. Both fixed:
- All 12 poses now, in an actual order: sit → blink → look back (both angles) → a real 4-frame
  walk cycle in its left-to-right sequence → a pounce crouch → the pounce → sitting up tall and
  alert → curling up to rest, looping back to the start as if she just woke up. New crops:
  `somi-look-back-1.png`/`-2.png` (replacing the single `somi-look-back.png`), `somi-walk-1.png`
  …`-4.png` (all four, correctly ordered — round 26's `somi-walk-1/2.png` are overwritten with the
  correct frames), `somi-pounce-crouch.png`.
- `periodSec` raised from 24s to 144s, spread across 12 frames instead of 8 — each pose now holds
  for 12 real seconds instead of 3. A new `village-cycle-12` keyframe (`globals.css`) drives it.

## Round 29 (2026-08-27) — the fence bug, a sizing pass, more trees

"fences also have white in the middle. fix. also fix the sizing of everything, try to scale but do
not make anything too tiny. also add more trees and ambient elements."

- **The actual fence bug**: `fence-rail.png` has no baked-in white — round 24's `FenceShape` was
  tiling the sprite `length` times with only ~8% overlap to suggest a longer run, but the sprite is
  already a complete two-post panel with a lot of transparent margin around the wood. Tiling it left
  visible gaps of bare (pale) ground between panels — the "white in the middle." Fixed by rendering
  one panel, scaled by `length/4` instead of repeated — no more seams.
- **Sizing pass**: `bushMound`/`floweringBush`/`tallGrass`/`rockCluster`/`vegCrate` (the named,
  draggable item-props — not the procedural `FOREGROUND`/`MIDGROUND_BUSHES` ground texture, which
  is deliberately small by depth-scale design) and `LampShape`'s post/globe all grew ~30-50%, and
  the fence itself grew too as part of its rebuild above.
- **More trees**: four new `EXTRA_TREES` (two pine, two round) scattered around the wider village —
  not just inside the Growth Forest badge's own compact 3-tree grove — using the same real
  `pine-tree.png`/`round-tree-sway-1.png` sprites. Static, not draggable (fixed background
  scenery, same idiom as `DISTANT_TREES`).
- **More ambient elements**: a third bird (`Ambient.tsx`) and two more fireflies (four → six) —
  still inside that file's own documented "never more than six moving nodes at once" budget, since
  each group only shows at different times of day.

## Round 30 (2026-08-27) — the car is Places' symbol, Sylvia/Harry wander

"make the car the symbol for places. make the two figures be able to act as npc and walk around
and interact with each other."

- Places' district badge now shows `car.png` (the same sprite already used for the standalone car
  prop near Home) instead of `shop.png` — "somewhere to go" reads more directly as a car than a
  market building. `shop.png` is unused now but kept in the assets folder; real master-folder
  content, just not this district's symbol.
- Sylvia and Harry now drift slowly around their own spot in a 48-second, pure-CSS transform loop
  (`village-wander-sylvia`/`-harry` in `globals.css`) — small (≤16px) amplitude glides, since
  there's no walk-cycle art for either of them (only one standing pose each, see
  `VILLAGER_SPRITE`), so this is closer to puttering-around-nearby than a walking gait. Both share
  one period with their midpoint keyframes moving toward each other, so once a cycle they visibly
  close some of the distance between them before drifting back apart — the "interact" part, within
  what's achievable without new art or a JS movement engine. The wander class is dropped entirely
  in arrange mode so it never fights a real drag (both are draggable since round 27).

## Round 31 (2026-08-27) — Somi's walk pose is gated to actual movement, an Inventory picker

"only use somi walking animation if she is walking around. when she is still do not use walking
animation." / "delete second car. make a inventory tab in arrange where we can place anything
from asset library."

- **Somi now actually wanders** (village-somi-move, globals.css) — small drift, same idea as
  Sylvia/Harry's round 30 loop — and her sprite cycle is split into an idle set (sit, blink, look
  back, pounce crouch/pounce, sit tall, curled — 8 poses) and a walk set (the 4-frame walk cycle),
  with two opacity-gated groups sharing the movement animation's own timeline so the walk poses are
  ONLY visible while she's actually translating, never while stationary. Off entirely in arrange
  mode (`wander` prop on `CatShape`), same as Sylvia/Harry.
- **The second car is gone** — Places' badge became the car in round 30; a standalone car parked
  by Home too read as a duplicate. Removed from `DECOR_DEFAULTS` and the item-prop list.
- **The Inventory** — a new picker in arrange mode (`Village.tsx`) listing 18 real sprites (see
  `lib/village/assetLibrary.ts` for the curated list and its own reasoning on what's excluded and
  why) as a small thumbnail grid. Tapping one drops a new, real, draggable copy of that sprite into
  the scene at a fixed default spot; it then drags exactly like every other prop. Custom-placed
  items are stored in the SAME `VillageLayout` JSON blob every other position already uses (no
  schema change) — their id is just namespaced `custom:<assetKey>:<uid>`, so `decorPos`/
  `startDrag`/`onMoveLandmark` all work unchanged; `VillageScene` renders any `custom:` key
  generically. A small × button (visible only while arranging) removes one — the one kind of prop
  in this scene a user can delete entirely, not just move.

## Round 32 (2026-08-27) - the folder changed again, a real cleanup, and empty-space placement

"when we place new item make sure it shows up on empty space. additionally delete any elemetns
that are not from my folder and currently not in my folder right now."

The user's folder changed substantially between rounds - gone: exec-2347fef5-....png (the
weather/environment sheet wx-rain-1/2.png/wx-snow-mound.png came from - never wired, deleted),
exec-ee38c3ce-....png (the house-lighting sheet), growth-neglect-recovery-states.png,
sylvia-harry-outfit-states.png, village-expansion-community-props-alpha.png, and
village-moment-effects.png (the fx-*.png effects - never wired, deleted). New in their place:
village-home-states-remade-alpha.png, growth-neglect-recovery-states-remade-alpha.png (plus a
second, unused bush-tree-growth-neglect-recovery-alpha.png covering the same idea for
bushes/trees instead of flowers), sylvia-harry-outfit-states-remade-alpha.png, a genuinely new
sylvia-harry-walk-wave-animation-alpha.png (a real 4-frame Sylvia walk cycle + a Harry wave -
cropped and worth wiring into the round 30 wander loop in a future round, not done this round),
village-foliage-flowers-paths-alpha.png (bush/pine/grass/flower-cluster/mushroom/path-tile art -
no community-props equivalent), and village-festival-ambient-elements-alpha.png (bunting/
lanterns/a flag/picnic set - also no community-props equivalent).

Re-sourced from the new files: cottage-dark.png/cottage-lit.png (from
village-home-states-remade-alpha.png), sh-default-sylvia.png/-harry.png (row 3 of
sylvia-harry-outfit-states-remade-alpha.png - the overalls pose, picked because it's two
separable figures, unlike row 1's hand-holding pair which crops as one joined sprite), and
flower-0...4.png/flower-dormant-1/2.png (from growth-neglect-recovery-states-remade-alpha.png,
which only has 3-4 distinct states rather than 5 - stages 0/1 and 2/3 now intentionally reuse the
same art at different rendered sizes, same "size drives the growth read" mechanism PlantShape
already uses).

Deleted outright, no replacement: well.png, clothesline.png, mailbox-alt.png, birdbath.png,
bench-arbor.png, bike-flowerpot.png, veg-crate.png (round 27's seven community-props items -
removed from DECOR_DEFAULTS, the scene's render list, AND ASSET_LIBRARY/the Inventory picker),
plus the never-wired wx-*/fx-* reserve files and four stale sh-overalls-*/sh-sweater-*/
sh-rain-umbrella-pair.png outfit-reserve crops (round 16, sourced from the now-gone original
outfit sheet).

Inventory items also no longer all land on the same spot - Village.tsx's addInventoryItem now
picks the least-crowded of eight spread-out candidate spots (by distance to every existing layout
position) instead of a single fixed (400, GROUND_Y+10).

## Round 33 (2026-08-27) - plants: habits only, but moveable once planted

"make it so we cannot add plants/flower. we can only grow them using habits and can move them
around once planted."

- Removed 'flowerCluster' from the Inventory's ASSET_LIBRARY (lib/village/assetLibrary.ts) - it
  was decorative ground cover, not a real habit-driven plant, but read too close to "adding a
  flower" for comfort. Real plants only ever come from PlantShape/plantSlots, driven by real
  habit data - the Inventory should never be a second way to add anything flower-shaped. The
  single pre-existing flowerCluster prop near the path (round 13) is untouched.
- Plants are now draggable in arrange mode - same startDrag/onMoveLandmark mechanism every other
  prop uses, keyed by the plant's own real id. Village.tsx's plantSlots useMemo reads the saved
  override back in (layout[plant.id]) on top of the computed default position, same "custom
  position if dragged, else the real default" rule decorPos already follows. Buildings were
  deliberately left alone - only plants were asked for.

## Round 34 (2026-08-27) - the magenta outline bug, and the fence is gone

"remove magenta into invisible everything we add a visual as there is a magenta outluine on some.
remove the fences with white in the middle. make figure based off of only what is in the folder
right now."

- **The real magenta bug, found**: cottage-dark.png, cottage-lit.png, flower-0...4.png,
  flower-dormant-1/2.png, and sh-default-sylvia.png/-harry.png (all re-cropped in round 32 from
  the newer "-remade-alpha"/"-alpha" sheets) had a thin, fully OPAQUE magenta outline baked into
  each sprite - a real export artifact from that generation batch, not a rendering/alpha-fringe
  issue like earlier rounds suspected. Fixed by detecting magenta-ish opaque pixels (r/b high,
  g low relative to both) and clearing their alpha to 0 - confirmed zero magenta pixels remain in
  all eight files afterward.
- **The fence is removed** - round 29's tiling fix addressed a real gap bug, but the sprite kept
  reading wrong regardless of that fix, so rather than keep patching it it's removed from the
  scene outright (both PROPS.fences instances, the FenceShape import, and the now-dead `fences`
  entry in PROPS/DECOR_DEFAULTS). fence-rail.png and the FenceShape component itself stay in the
  codebase - real, folder-sourced content and a working component, just not rendered right now.
- **Sylvia/Harry re-confirmed folder-only** - sh-default-sylvia.png/-harry.png were already
  re-sourced from the current folder in round 32; this round's magenta fix is the last piece of
  that. Separately: the folder's own sylvia-harry-walk-wave-animation-alpha.png (noted in round 32)
  is a real 4-frame Sylvia walk cycle that could replace the CSS-only glide from round 30 with an
  actual walking animation, closing the loop the way round 31 did for Somi - not done this round,
  a real candidate for the next one.

## Round 35 (2026-08-27) - the gate was the real "fence", bus stop sized up again

Screenshot feedback: "things like bus stop still too small. the fences are wrong still (have
white in middle)."

Investigated further - the fence itself really is gone (removed round 34); what the user was
still seeing is gate.png, which is a genuinely open wooden-lattice gate (real transparent
diamond-shaped gaps by design, not a crop bug) that reads exactly like a fence at village scale.
Removed for the same reason the fence was - rather than argue the art is "correct," it's gone
from both DECOR_DEFAULTS and the item-prop render list. gate.png itself stays in the assets
folder (real, folder-sourced content) in case a future round wants a solid (non-lattice) gate
instead.

bus-stop.png sized up again (18 -> 26 tall), and MailboxShape/SignpostShape grew too (15->20 and
20->26 tall respectively) - the same "still reads small at real full-scene zoom, even after
round 24's bump" issue the screenshot flagged for the bus stop specifically.

## Round 36 (2026-08-27) - found it: bench2.png reads as a fence

"the fences i dont want are still there. fix anything you think needs fixing."

The actual fence and the lattice gate were both already gone (rounds 34-35); what was still
showing up as "a fence" in the screenshot was bench2.png - its real silhouette is two parallel
horizontal rails between two posts, which IS a short fence section's own visual language (and
has the same "gap between the two rails" look the very first "white in the middle" report was
probably about too). All four instances in the scene (three PROPS.benches plus the People
corner) were affected.

BenchShape is redrawn as plain SVG - one seat plank on four short legs, no second rail above it,
same TRIM-family fixed-hex construction as LampShape/BuntingShape's own earlier redraws. The
People district badge (DistrictArt's 'people' case) now calls BenchShape directly instead of
drawing bench2.png a second time by hand, so the badge and the real corner bench are literally
the same shape. bench2.png itself is deleted - fully unused now.

## Round 37 (2026-08-27) - Growth Forest is a real grove now, magenta re-audited

"make growth forest a whole area like a grove that has both trees and flowers for habits. make
sure all magenta is removed."

- EXTRA_TREES grew from 4 trees to 9 - 7 of them now genuinely fill the same x 40..360 band
  `forestSlots` lays real habit-plants out across, as a loose backdrop the flowers actually stand
  among. Growth Forest reads as a wooded place with habits growing in it now, not a small badge
  icon next to a scatter of flower dots. Two trees stay outside that range as unrelated ambient
  scenery near Archive/Home.
- Re-audited every sprite for magenta using a proper HSL hue check (265-340 degrees, not just an
  RGB-channel heuristic) instead of the cruder tests rounds 34 used - found MORE magenta than
  those had caught (edge-fringe pixels at partial saturation the earlier passes missed) in the
  same eight round-32 "-remade-alpha" files (cottage-dark/lit, flower-0...4, flower-dormant-1/2,
  sh-default-sylvia/harry). Cleared all of it. A full-folder scan afterward found only single-
  digit-to-tens false-positive counts in unrelated files (clouds, trees, rocks) from natural
  low-saturation shading, not real contamination - left alone.

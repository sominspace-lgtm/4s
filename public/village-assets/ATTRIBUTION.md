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

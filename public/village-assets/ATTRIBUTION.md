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
pose) was deleted in round 13 — fully superseded by the seven-pose SpriteCycle animation.

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

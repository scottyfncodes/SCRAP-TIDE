# The Rustfang Toll: Jury-Rigged proof of concept

*The apocalypse is real. The absurdity is how humanity adapted.*

Beautiful Ruin stays the art direction; **Jury-Rigged** is its new design language for characters, factions,
settlements, vessels and environmental storytelling (`docs/art-direction/STYLE-GUIDE.md` §5a and §10). This pass
proves it on one encounter outside Driftholm, behind **`?look=jury`**. Without the parameter the game is unchanged.

**Try it:** `/?look=jury` (your save, in memory only) or `/?look=jury&fresh=1` (a new game). Sail out of Driftholm
and east past the harbour mouth. Like `?ship=` and `?exp=`, a look visit is a sandbox: nothing is saved.

## What's in it

| Piece | Faction logic | What it was before the flood |
|---|---|---|
| **Captain** (5.6 heads) | Driftholm: round, layered, lashed | wide sun hat cut from a sail (blue patch, goggles on the band); a life jacket worn as armour; rope-wrapped forearm; tin mug on a climbing carabiner. Same face, hair, scar and red scarf. **The tricorn, duster and bandolier are gone.** |
| **Rustfang raider** (5.7 heads) | Rustfang: welded, sharpened, forward-leaning | a circular saw blade bolted upright on one shoulder, a road sign with spikes on the other, a car-bonnet chest plate, two exhaust pipes standing up from the back, and a saw blade on a scaffold pole instead of a cutlass |
| **Jawboat** (raider boat) | Rustfang | a 1.9 m circular saw blade as the bow, rebar teeth along the jaw, road-sign warning triangles as shields, an outboard twice the size it needs, four exhaust stacks, a cage outrigger on one side only, tyre fenders, a horn cluster of three car klaxons, and a trophy rack of other crews' nameplates |
| **Signal Stack** (Driftholm landmark, 22 m) | Driftholm | drums under a deck, two containers stacked crosswise, a white plastic water tank, a scaffold lattice, a satellite dish turned up into a crow's nest, a traffic light re-glazed red/amber/bottle-white (its green lens is gone: green means alive here), an airport windsock, four guy lines with laundry bunting and festoon bulbs |
| **Pier** | Driftholm | a clawfoot bath hung from a pipe davit as the lifeboat; supermarket trolleys as lobster pots, one let down on its rope with a jerrycan marker |
| **The Toll** | Rustfang | a striped car-park barrier across the approach with saw teeth welded on top, a plate toll booth with a lit hatch and a STOP sign, two drum rafts, a red rag; two Jawboats patrol it |

The 5.5-head cast is built by the existing MeshCraft script (`creative/3d-characters/scripts/survivors.py`): a
**proportion pass** (`JURY`, `jury_warp`) scales each bone's own vertices and its children's offsets, so the same 22-bone
rig, skin weights and clips carry over. The walk is the same procedural gait, retuned to the new legs (`retune()` in
`src/player/gait.ts`): shorter stride, quicker cadence, livelier arms. Everything else is plain vertex-coloured
geometry from `src/world/jury.ts`, merged into the existing batches.

Sun-faded plastic (five approved accents) is tagged as plastic, so the weathering shader keeps more of its colour
and never rusts it; everything untagged is graded exactly as before.

## Results against the criteria

The criteria were committed before implementation (`CRITERIA.md`, commit d9e9391). Numbers are from
`scripts/jury-measure.mjs` (`measure.json`), `scripts/jury-shots.mjs` (`perf.json`) and `tests/jury.test.ts`.
Captures: iPhone 17 viewport (402×874, DPR 2) and desktop 1280×720, headless Chromium with SwiftShader.

| # | Criterion | Result | Verdict |
|---|---|---|---|
| C1 | 5.5 ± 0.3 heads | captain **5.63**, raider **5.71** (today: 7.61 and 7.61, same method) | **Pass** |
| C2 | silhouettes at 40 px: IoU ≤ 0.70 and lower than today | captain vs raider **0.642** (today 0.738): pass. Skiff vs Jawboat **0.340** (today 0.334): under 0.70, but **not lower than today** | **Partial**: characters pass; boats miss the "lower than today" clause by 0.006 |
| C3 | Signal Stack tallest on screen, ≥ 40 px, lit at night | **157 CSS px** tall, its top 39 px above anything else in Driftholm, in all four keys; the lamps and festoon bulbs render at night | **Pass** |
| C4 | accents ≤ 10 % of every frame; none green or gold | max **3.0 %** (on foot by the Stack), 0.2–0.8 % at sea; palette test passes | **Pass** |
| C5 | ≤ +10 % triangles, ≤ +2 draw calls; feet slip ≤ 1 cm; default fetches nothing | triangles at most **+9.5 %** in any frame (phone and desktop): pass. Draw calls: see below. Flat-foot slip **0.01 cm** walking, **0.07 cm** running; toe-off **1.72 / 2.76 cm**. A default visit fetched **no** Jury-Rigged file (the code, about 8 KB gzipped, ships dormant inside the existing game bundle), and all **480** tests pass | **Partial**: draw calls and toe-off slip miss |

### Where it misses, and why

- **C2, boats.** The old raider skiff was already a very different shape from the player's sailing skiff (no mast,
  low box), so the overlap was already low (0.334). The Jawboat's overlap is the same (0.340) while its silhouette is
  far more specific: the saw-blade bow and the exhaust stacks (see `silhouettes_40px.png`). The criterion was written
  without measuring that baseline first. I did not reshape the boat to move the number.
- **C5, draw calls.** In the like-for-like frames (the Rustfang Graveyard, on foot) the change is −2 to +3 calls,
  which is within the frame-to-frame noise of FX sprites (±2 between keys of the same look). The **Driftholm** and
  **Toll** frames add **+3 to +8**, because the toll's patrol is new content near the harbour: two Jawboats (one call
  each) and four raider crew, whom the existing character code never frustum-culls. That is the cost of the
  encounter, not of the look, but by the criterion's letter it is a miss.
- **C5, isolation.** The first full run caught a default visit fetching a small `jury-*.js` chunk (the code split out
  only because the measurement hooks imported it dynamically). The hooks moved into the game module; the re-check
  shows a default visit fetching no Jury-Rigged file. The code itself still ships, dormant, in the game bundle.
- **C5, toe-off slip.** The flat foot is planted to 0.01 cm. At toe-off the solver rocks the foot over the ground
  contact under the ball, so the toe *joint*, which sits a few cm above the sole, travels with the roll. Today's
  captain measures 1.72 / 2.77 cm by the same method, so the 1 cm bar was stricter than the current rig. The larger
  boots would have made it worse (2.30 / 3.88 cm); the retune now scales the roll by foot size, so the new captain
  matches today's rig exactly.

### Performance (phone, matched frames)

| Frame | Draw calls (default → jury) | Triangles | Accent share |
|---|---|---|---|
| The Toll (noon/dusk/night/storm) | 107→114, 96→103, 96→104, 99→103 | +8.1 to +8.2 % | 0.25–0.41 % |
| Driftholm approach | 73→77, 67→70, 66→71, 68→71 | +8.7 % | 0.17 % |
| Rustfang Graveyard (raiders) | 73→76, 71→71, 72→72, 73→71 | +9.0 to +9.5 % | 0.22–0.76 % |
| On foot by the Stack | 108→111, 93→92, 94→94, 98→98 | −0.5 to −0.3 % | 3.0 % |

Desktop, noon: Toll 145→150 (+8.0 % tris), Driftholm 102→105 (+8.1 %; Stack 167 px tall, 42 px clear of the
town), Graveyard 84→86 (+9.0 %), on foot 159→162 (+6.7 %); accents 0.07–0.98 %.

Software-GL frame times are noisy and only relative; they are in `perf.json`. Real-device GPU timing is not
measured here. New downloads on a look visit only: `tb_jury_captain.glb` 356 KB, `tb_jury_raider.glb` 303 KB.

## Captures

`screens/`: for each frame, `<viewport>-<frame>_4-keys_before-after.jpg` (noon, dusk, night and storm as rows; default
left, `?look=jury` right) and `<viewport>-<frame>_noon_before-after.jpg`. Desktop is captured at noon only.
`silhouettes_40px.png`: today's captain, today's raider, the new captain, the new raider; then the Patchwork Skiff,
today's raider skiff, the Jawboat (all solid, 40 px tall, enlarged 4×). `characters/`: MeshCraft previews.

Reproduce: `npm run build`, then `node scripts/jury-shots.mjs dist <out>`, `node scripts/jury-measure.mjs dist <out>`
and `node scripts/jury-compose.mjs <out> docs/jury-rigged/screens`.

## Rollback

- **Visit level:** remove `?look=jury` from the URL. Nothing is saved on a look visit, so nothing persists.
- **Code level:** revert this PR. Every new code path is behind `jury()` (`src/state/look.ts`); the default look loads
  none of the new models and its batches have no `accent` attribute (`tests/jury.test.ts`). The shared changes are
  additive: `merge()` only keeps an `accent` attribute if a part has one, `weather()` grades untagged geometry with
  identical maths, `vcMat()` and `retune()` are opt-in.
- **Files to delete for a manual rollback:** `src/state/look.ts`, `src/world/jury.ts`, `public/models/tb_jury_*.glb`,
  `creative/3d-characters/jury_*`, `scripts/jury-*.mjs`, `tests/jury.test.ts`, `docs/jury-rigged/`.

## Not done, and next steps if this direction is adopted

- The crew, the townsfolk and the other settlements are unchanged; only the captain and the raiders were rebuilt.
- Exaggerated character busts for dialogue and crew cards, and faction dock-board headers, were proposed for UI but
  are not in this pass (the HUD layout was to stay unchanged).
- Raider crew are never frustum-culled (existing behaviour in `assets.ts`); culling them would recover most of the
  toll's extra draw calls.
- Accent coverage is low at sea (under 1 %). If the frames should feel more colourful, the next lever is patched sail
  panels on the player's boats.
- A real-iPhone performance check is still needed before any rollout.

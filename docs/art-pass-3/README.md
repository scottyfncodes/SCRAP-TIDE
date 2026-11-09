# Art direction pass 3: world identity (charts, helm) + CI time budget

Target: a coherent scavenger world. Survivors navigate on old-world survey charts they've marked up themselves, and
steer with whatever they bolted together. Gameplay, controls, collision, animation, saves and reward mechanics are
unchanged.

## 0. CI timeout

`.github/workflows/checks.yml`: `timeout-minutes` raised from **30 to 45**. No test was weakened, skipped or removed.

Where the time goes (main run #111, ubuntu-latest):

| Step | Time |
|---|---|
| checkout, setup-node, `npm ci`, unit tests, build | ~20 s |
| Playwright + Chromium install | 57 s |
| End-to-end gameplay (`tests/e2e/play.cjs`, 60 checks) | **16 min** |
| Wake visual check (4 vessels × views × noon/dusk/night) | **8.5 min** |
| Turn check | 1.5 min |
| **Total** | **27.5 min** (PR #65 attempt 2: e2e alone took 20.6 min, and the run hit the 30-min cap) |

The time is real gameplay simulation rendered in software WebGL (SwiftShader: CI runners have no GPU). The fixed
waits in the scripts are short (≤1.5 s). The visual check waits for 3 game-seconds per view, which the wake test
needs. There was no obvious waste to remove without changing what the tests measure, so this pass only raises the
budget. A possible later speed-up, not done here: split the e2e and the visual/turn checks into parallel jobs.

## 1. Treasure maps and the world chart: salvaged survey charts

`src/ui/mapArt.ts` (canvas renderer) and the map CSS in `src/ui/styles.css`. Coastlines, landmarks, the label
collision logic, zoom, pan and pinch are unchanged; only the paper, ink, type and furniture changed.

| Before (pirate parchment) | After (salvaged survey chart) |
|---|---|
| Sepia parchment gradient, brown speckle and brown age blots | Bleached chart paper with fibres, **fold creases**, faint **water rings** and **strips of tape** |
| Brown quill ink, Georgia italic | **Navy print ink**, Barlow Condensed caps for names, Share Tech Mono for figures |
| Green/khaki land, dotted shallows | Chart-convention **buff land** (darker on high ground) and a **blue shoal tint** |
| No grid | A printed **survey grid with coordinate ticks** on the frame (metres E/W, N/S of the old harbour datum; 20 m on treasure sheets, 100–500 m on the world chart depending on zoom) |
| Ornate compass rose | A printed **compass card** (degree ring, plain north arrow) |
| Red-brown dotted trail and red X | **Grease pencil** (the deckhand's chinagraph): a waxy dashed route, an X **circled**, and "DIG" written under it |
| Script title "The Turtle's Belly" | A printed **title block**: sheet name, plus `SURVEY SHEET <ISLAND> · <coords>` |
| "~ THE STORMWALL ~" in italics | `STORMWALL · NO SAFE PASSAGE`; raider waters marked `⚠ RUSTFANG …` in grease pencil |
| Rumour pins drawn as brass map pins | Grease-pencil rings |
| Worn brown border | A printed **neat line** (heavy outer rule, thin inner rule) |
| CSS sepia filters on the chart canvases | Removed |

Torn edges on unfinished treasure maps stay: they're scraps of paper, which still fits. Skull Rock's glyph is
unchanged (see the pass-2 audit).

Screens: `chart-before.png` / `chart-after.png` (iPhone 17: the Turtle's Belly sheet and the world chart);
`chart-320.png` (the treasure sheet on a 320 px phone).

## 2. Ship's wheel: the Salvaged Helm (Trimaran `rudder_ash` upgrade)

The wooden ship's wheel (pale timber, turned handles, brass hub) is replaced by a new MeshCraft model built in the
Trimaran upgrade pipeline: `creative/3d-sloop/upgrades/build_wheel_rudder.py` (folder `wheel_rudder/`: `.blend`,
previews, logs). It keeps the classic helm silhouette, built from salvage:
- an oxidised copper pipe rim, worn back to bare copper where hands go;
- six steel spokes running out into rope-whipped grips, the top grip hazard yellow;
- a truck steering-wheel boss with a horn pad, on a car steering column in a rubber gaiter;
- a gearbox on a square steel post with a faded hazard band and a rust bloom, bolted to a flange plate;
- a cable drum sending the steering cables down through deck sheaves to the rudder.

It matches the Trimaran's HUD helm from pass 1.

| | Before (GITCRAFT package) | After (MeshCraft) |
|---|---|---|
| File | `public/models/tb_upg_wheel_rudder.glb` | same path |
| Triangles | 1,016 | 1,064 (+4.7%) |
| Size (Meshopt) | 29.0 KB | 35.6 KB (+6.5 KB) |
| Footprint (socket frame) | x ±0.675, y 0–1.775, z −0.12…0.20 | x ±0.58, y 0–1.77, z −0.20…0.18 |
| Materials | 4 (3 wood, 1 brass) | 9 vertex-coloured GC roles; none of the names the game culls or tints on the sloop (cabin, tiller, sail, lantern, paint) |
| Root node | `upgrade_ship_s_wheel_ash_rudder` | same, so the game and `tests/models.test.ts` find it |

What stays the same:
- the wheel never animated (it is a static mesh), so no animation was lost;
- the hub height and wheel plane, so the captain's seat at the helm (`SLOOP_WHEEL_HELM`) is unchanged;
- the tiller and lantern culls.

Validation:
- MeshCraft `validate_asset`: 14 pass, 0 warn, 0 fail.
- MeshCraft three.js `engine_check`: pass, 1,064 triangles, vertex colours on 9/9 meshes, no console errors.
- **Overlap audit** (`audit_spec.py` + MeshCraft `audit_overlaps` on the compressed file that ships): `full` 24 parts /
  288 poses / 269 pairs, and `early` 24 / 288 / 268. Both have **0 overlaps**, including the captain at the helm.

Screens: `helm-before-after.png` (in game, Trimaran with the upgrade, noon) and `helm-model.png` (MeshCraft previews).

## 3. Proposals awaiting approval (not implemented)

The brief allows these only if clearly cosmetic and low-risk. None of the three is purely cosmetic: each touches names
players already know, story text or the dig animation. So they're documented here for a decision.

### 3a. Currency

How it works today:
- The wallet currency is **gold** (`store.data.gold`, the coin chip on the HUD, every price in the shops).
- `doubloon` ("Gold Doubloon", value 12) and `silver_piece` ("Silver Piece-of-Eight", value 6) are not currency. They
  are common **valuables** that drop from chests, caches and the flotsam loot table (`src/data/world.ts`,
  `src/data/loot.ts`) and are sold for gold.
- They belong to the **Jeweller's Tray** salvage set (`set_jewel`).

Proposal (display text only; every id, value, drop weight and set membership unchanged, so saves and balance are untouched):

| Now | Proposed | Why |
|---|---|---|
| Gold (wallet) | **Keep "gold"**: gold is what the old world's metal is worth by weight, which fits a scavenger economy. Optionally relabel the HUD chip "scrip". | Renaming the wallet touches every shop string; the gain is small |
| Gold Doubloon | **Pre-Flood Gold Coin** ("a bullion coin from a bank vault; worth its weight") | Old-world gold, not Spanish-Main loot |
| Silver Piece-of-Eight | **Bottle-Cap Scrip** or **Ration Chit** ("Rig Helios takes them at the pump") | A survivor-made token, so the world has its own money |
| Jeweller's Tray set | Keep the name; contents relabelled as above | |

Decision needed: approve the two item renames (and pick between scrip and chit), and whether to relabel the wallet.

### 3b. Treasure chests → sealed salvage containers

How it works today:
- Buried treasure-map chests and sea chests come from the finds kit (`tb_finds_kit.glb`: `chest_small`, `chest_grand`,
  `chest_sea`, each with a body and a lid).
- The dig sequence (`game.ts`) raises the chest and opens the lid on a fixed hinge (`lid.position (0, 0.8s, −0.45s)`,
  rotation.x to −1.9).
- A story beat reads the letters "R.F." **scratched into the lid**.
- `chestsOpened` counts toward renown.

Proposal:
- Rebuild the three chest models in MeshCraft as **sealed salvage cases**, on the same footprint and hinge:
  - `small`: a dented steel ammo can with a latch;
  - `sea`: a waterproof hard case (orange, foam-lined);
  - `grand`: a stenciled cargo locker with a hazard band.
- Keep the lid nodes, so the opening animation is unchanged. "Scratched into the lid" still reads.
- Optionally change the reveal kicker "Buried treasure!" to "Sealed cache!".
- Risk: low to medium. It's an asset swap with the same node names and hinge, plus one overlap check in the dig camera
  shot. Estimated triangles at or below the current kit's.

Decision needed: approve the rebuild, and the reveal-text change.

### 3c. Navigation instruments

How they work today:
- **Brass Compass** (`compass_brass`, a Trimaran upgrade, `tb_upg_brass_compass.glb` on the bow; "Your Brass Compass
  will point the way" in the map hint).
- **Brass Spyglass**: a rare wreck find in the Navigator's Kit set.
- Mara, the navigator, carries a brass spyglass in her character model.

Proposal:

| Now | Proposed |
|---|---|
| Brass Compass upgrade | **Salvaged Binnacle Compass**: a liquid compass in a cut-down pipe housing with a hand-painted card. MeshCraft rebuild on the same socket; display name and hint text updated; id `compass_brass` unchanged (saves) |
| Brass Spyglass find | **Scavenged Rangefinder Scope**: a rifle or survey scope with tape on the barrel. Name, description and icon colours only |
| Mara's spyglass prop | A taped steel scope (a colour and shape tweak in `survivors.py`, then rebuild one character) |

Decision needed: approve the renames and the two model rebuilds.

## Validation

- Unit tests, build, e2e, visual check, turn check: see the PR.
- Maps panel (treasure sheet and world chart) at iPhone 17, iPhone 13, narrow 320, tall, landscape and desktop:
  opens, stays in the viewport, no horizontal scroll, no undersized buttons.

All of the above ran in **headless Chromium (SwiftShader) on Linux**. None of it was tested on a physical iPhone, so
Safari canvas text rendering and touch feel on a device are untested.

## Remaining

- The three proposals above (currency, containers, instruments) wait for approval.
- On a 320 px phone the treasure sheet's grid labels (9 px mono) are small. They're secondary; the title, landmarks,
  route and dig mark read clearly.
- CI still takes about 25–28 min. The new 45-min budget gives headroom; splitting the job is a possible later
  improvement.

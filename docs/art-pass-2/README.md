# Art direction pass 2: cast silhouettes, salvaged-steel panels, world audit

Target: Waterworld meets Mad Max, a post-apocalyptic maritime scavenger civilisation, not a pirate game.
This pass changes visuals only. Gameplay, controls, progression, the save schema and interactions are unchanged, and
the helm, lighting and camera from pass 1 were not touched.

## 1. Character silhouettes

Audit of every rigged character (`creative/3d-characters/scripts/survivors.py`, 11 characters):

| Character | Pirate-coded element | Action |
|---|---|---|
| Captain (the player) | Cocked **tricorn** with brass goggles | **Replaced**: a dented steel salvage helmet cut down from a hard hat, with a welded ridge, a short peak against glare, rim rivets, welding goggles and a sailcloth neck flap |
| Ines (defender) | **Eyepatch** | **Replaced**: welding goggles pushed up on the forehead, and a scarred cheek |
| Rustfang raider | **Cutlass** with a round guard | **Replaced**: a straight leaf-spring machete with a taped pipe grip, a rust ferrule, bolt holes and a squared tip |
| Tomas (fisher) | Sou'wester | Kept: it's a working fisherman's hat, not a pirate one |
| Captain | Long duster, bandolier, red scarf | Kept: these read as Mad Max wasteland, and now sit under scrap armour and a helmet |
| Everyone else | (headwraps, hoods, beanies, goggles, respirators, tyre and road-sign armour) | Already scavenger-coded; unchanged |

How the characters were rebuilt: `creative/3d-characters/scripts/rebuild.sh <asset>` (MeshCraft / Blender 5.2.3
`run_script`, then `export_asset`, then the mobile pass, then `validate_asset` on the shipped file).

| Asset | Validation | Triangles before → after | Shipped size before → after |
|---|---|---|---|
| `tb_captain.glb` | 0 failures, 0 warnings | 7,052 → 7,308 | 358 KB → 373 KB |
| `tb_crew_defender.glb` | 0 failures, 1 warning (`origin_centered`, from the harpoon; same as before) | 5,536 → 5,584 | 269 KB → 273 KB |
| `tb_raider.glb` | 0 failures, 1 warning (`origin_centered`, from the blade; same as before) | 6,248 → 6,248 | 290 KB → 290 KB |

What stays the same:
- the 22-bone skeleton;
- every clip;
- one skinned primitive, so still one draw call per character;
- the bodies, so collision is unaffected.

The vitest cast checks and the end-to-end run, which loads the rigged captain, townsfolk and raiders, both pass.

Screens: `cast-before-after.png` (top row before, bottom row after; for each character a full-body view and a head
close-up), rendered from the shipped GLBs in three.js. `captain-ingame.png`: the captain on foot in the game. Left: the old tricorn at noon. Middle and right: the helmet at noon and at dusk, from the normal play camera.

## 2. Full-screen panels

Before, every panel (Harbour, Shipwright, Cargo, Ship, Salvage Log, Crew Board, Workbench, Settings, Maps, and the
find-reveal card) was a warm parchment journal page with brown stains under a blue header. All of them share one set
of tokens and rules in `src/ui/styles.css`, so changing that one system restyles every panel:

- **Panel face:** sun-bleached sheet aluminium (`--paper` #dddcd2 → #c6c6bb). It has fine scratches, grey oil stains
  and a faint rust stain. Text stays dark ink on a light face for readability.
- **Header:** a riveted, scratched steel plate, matching the HUD, with a faded **hazard-stripe seam** welded under it.
  The close button is a riveted steel button.
- **Tabs:** sit on a dark steel rail; the active tab is a stamped aluminium tab with an oxide top edge.
- **Section titles:** stencil type with a small hazard tick.
- **Rows, cells and detail cards:** neutral steel-edged plates instead of warm paper wells. The existing rivet bullets
  on rows are kept.
- **Buttons:** squared stamped plates (4 px corners, down from 10 px), matching the HUD action plates.
- **Treasure-map clue:** set in the body font instead of Georgia italic. The map zoom buttons are now steel plates,
  replacing the parchment-coloured Georgia buttons.
- **Reveal card:** neutral oil stains with no sepia filter, under a steel top edge.

Layout, spacing, touch targets, scrolling and safe-area padding are unchanged.

One pre-existing defect is fixed. On 320 px phones the two-column service buttons (Repair hull / Crew board in the
Harbour, Pour fuel cans / Patch hull on the Ship panel) ran past the screen edge because their labels couldn't wrap.
The labels now wrap inside the button. This was measured identically on the pre-pass build.

Screens: `panels-before.png` and `panels-after.png` (iPhone 17: Harbour, Shipwright, Cargo, Ship, Salvage Log,
Crew Board, Workbench, Settings).

## 3. World consistency audit (documented only; not changed in this pass)

Ranked by how strongly each reads as "pirate" and how often players see it:

| Priority | Element | Where | Suggested replacement |
|---|---|---|---|
| P1 | **Treasure maps and the world chart drawn as parchment** (stained paper, sepia, "X marks the spot") | `src/ui/mapArt.ts` (`parchment`, `parchmentPattern`), `.zmap` / `.map-canvas` sepia filters | A salvaged chart: a laminated or tarp-printed survey sheet, or a sonar plot on a cracked tablet. Keep the real-coastline renderer and only reskin the substrate and ink |
| P1 | **Ship's wheel upgrade model** (`tb_upg_wheel_rudder`, "ship's wheel + ash rudder") | `public/models/tb_upg_wheel_rudder.glb`, `src/ship/shipModel.ts` | Rebuild the 3D model to match the salvaged HUD helm wheel (pipe rim, taped grips) |
| P2 | **Gold Doubloon**, **Silver Piece-of-Eight** loot, and the "treasure" category | `src/data/items.ts`, `src/data/world.ts`, `src/data/loot.ts` | Pre-flood coins, bottle-cap or ration-chit scrip. Display names only, keeping the ids so saves stay valid. The category already shows as "Valuables" |
| P2 | **Treasure chests** dug up with an X on a map | `src/game/game.ts` (dig), `src/world/props.ts` | A sealed ammo can, Pelican case or cooler buried in the sand |
| P2 | **Brass Compass** upgrade and **Brass Spyglass** find | `src/data/ship.ts`, `src/data/items.ts`, `tb_upg_brass_compass.glb` | A salvaged car compass or handheld GPS; scavenged binoculars |
| P3 | **Skull Rock** landmark ("the grinning skull" treasure clue) | `src/data/world.ts`, `src/world/props.ts` `skullRock` | A natural rock formation, so it's acceptable. Could become a half-sunk billboard face or a statue head |
| P3 | **Salt Brig** vessel name and its timber-and-sail look | `src/data/ship.ts` | The name is period-maritime rather than pirate. Revisit the hull's wood-heavy materials for more steel |
| P3 | "Colors of the Wren" and "Tidebreaker Colours" flags, "Gilded Hunter" paint | `src/data/ship.ts` cosmetics | Acceptable: rag pennants and painted hull colours, not skull-and-crossbones |
| P3 | Raider deck crew comment still said "cutlass"; the README described a "tricorn" cast | `src/game/raiders.ts`, `README.md`, `creative/3d-characters/README.md` | **Fixed in this pass** (text only) |

The settlements (shanty, drowned towers, the oil rig, containers, the tanker graveyard), the props (flotsam, debris,
fittings), the HUD, the panels and the boats' refit stages read as post-apocalyptic salvage and need no change.

## Validation

- `npm test`: 468/468 pass, including the cast checks (one skinned primitive, all clips, smooth normals).
- `npm run build`: passes.
- `tests/e2e/play.cjs` (mobile Chromium, built game): 60/60 pass.
- `npm run check:visual` and `npm run check:turn`: pass.
- HUD layout check (`scripts/hud-shots.mjs`) at iPhone 17, iPhone 13, narrow, tall, landscape and desktop: no overlaps, nothing off-screen, no horizontal scroll, no undersized touch targets.
- Panel check (8 panels × the same 6 sizes): every panel opens and stays inside the viewport, with no horizontal
  scroll and no button under 30 px. On 320 px, after the wrap fix, nothing runs past the right edge (the horizontally
  scrolling tab rails are excluded).

All of this ran in **headless Chromium with SwiftShader on Linux**. None of it was tested on a physical iPhone, so
Safari font rendering, real safe-area insets and GPU performance on a device are untested.

## Tradeoffs

- The captain's helmet adds 256 triangles (+3.6%) and about 15 KB to the captain GLB.
- The panels keep a light content surface rather than going dark. Dark ink on bleached metal reads better in
  sunlight and needed no rework of the dozens of ink colours used inside panel content.
- The world chart and treasure maps keep their parchment look for now (see the audit, P1).

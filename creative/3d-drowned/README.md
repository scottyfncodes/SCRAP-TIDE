# Drowned World 3D kit (GITCRAFT MeshCraft + ForgeCraft)

Everything here was produced by GITCRAFT's 3D Department, headless and sandboxed to this repo, from the palette `creative/branding/palette/tidebreakers-drowned-palette.json`.

| Asset | Made with | Game nodes | Tris | GLB |
|---|---|---|---|---|
| `tower_glass` drowned office tower (broken crown, water tank, antenna, beacon) | MeshCraft `run_script` | `tower_glass_body` | 1.4k | 110 KB |
| `tower_brick` apartment block (balconies, fire escape, rooftop shack, solar) | MeshCraft `run_script` | `tower_brick_body` | 1.5k | 112 KB |
| `tower_spire` broadcast spire (also the 2.4× Meridian Spire) | MeshCraft `run_script` | `tower_spire_body` | 1.4k | 105 KB |
| `tower_stump` collapsed, leaning tower (first salvage site) | MeshCraft `run_script` | `tower_stump_body` | 0.4k | 35 KB |
| `oil_rig` Rig Helios: legs, decks, derrick, crane, flare, helipad, market | MeshCraft `run_script` | `oil_rig_body`, `socket_dock`, `light_flare` | 2.2k | 161 KB |
| `containers` four shipping containers | MeshCraft `run_script` | `container_red/blue/yellow/teal` | 1.3k | 98 KB |
| `tanker_wreck` the Meridian Star, bow rearing from the sea | MeshCraft `run_script` | `tanker_body` | 0.5k | 44 KB |
| `settlement_kit` raft-town modules (shack, market, turbine + rotor, water still, walkway) | MeshCraft `run_script` | `mod_*` | 3.0k | 229 KB |
| `boat_kit` 16 boat upgrades + turbine rotor, each at its mount point | MeshCraft `run_script` | `engine_outboard`, `engine_twin`, `radar_mast`, `salvage_crane`, `harpoon_turret`, `deck_turbine(_rotor)`, `solar_array`, `cabin_container`, `fuel_drums`, `spotlight`, `fishing_rig`, `outrigger`, `water_still`, `deck_lights`, `armor_plate`, `nav_console` | 3.3k | 274 KB |
| `raider_skiff` Rustfang raider | MeshCraft `run_script` | `raider_body` | 0.4k | 36 KB |
| `debris_kit` floating cache, beacon buoy, debris patch, oil drum, castaway raft | MeshCraft `run_script` | `cache_crate`, `buoy`, `debris_patch`, `oil_drum`, `castaway_raft` | 0.9k | 78 KB |
| `trawler_wreck` fishing trawler down by the stern, listing, nets on the A-frame (grimy pass) | MeshCraft `run_script` | `trawler_body` | 1.2k | 95 KB |
| `port_crane` buckled harbour gantry crane, snapped boom trailing in the sea (grimy pass) | MeshCraft `run_script` | `crane_body` | 2.0k | 146 KB |
| `flotsam_kit` barrel raft, ghost net, bell buoy, capsized hull (grimy pass) | MeshCraft `run_script` | `barrel_raft`, `net_tangle`, `bell_buoy`, `hull_shard` | 1.1k | 94 KB |
| `crew_{mechanic,navigator,salvager,fisher,lookout,defender}` | ForgeCraft `generate` → MeshCraft `deckhand` template | 22-bone Mixamo-named rig; clips `Idle`, `Walk`, `Interact`, `Attack` | ~4k each | 227–242 KB |

## Weathering pass (grimy art-direction revamp)

Every MeshCraft kit above (all except the crew) went through `scripts/weather_pass.py`, run by MeshCraft `run_script` against its
source `.blend` and saved back. It bakes crevice grime (vertex concavity, like Blender's Dirty Vertex Colors), edge wear,
rust chips and downward rust bleed into the `Color` corner attribute (glTF COLOR_0), leaving emissive faces alone. The pass is
idempotent (scene flag `tb_weather_pass`). Each kit was then re-exported (`export_asset`, three-web-toon + LODs + collision),
validated (`validate_asset`, Khronos included: 0 failures on all 14) and engine-checked in three@0.170 with the game toon
material (`engine_check`). Logs: `<asset>/logs/{weather_pass,export,validate,engine_check}.json`.

```bash
run_script {"path": ".../scripts/weather_pass.py", "blend": ".../<asset>/source/tb_<asset>.blend", "save": true, "args": {}}
```

## Per asset

`<asset>/source/*.blend` (editable), `<asset>/exports/*.three-web-toon.glb` (+ `lod50`, `lod25`, `collision`), `<asset>/previews/*.png` (Cycles), `<asset>/engine/*_three.png` (three@0.170 with the game's toon material), `<asset>/logs/*.json` (raw MCP results for run_script, render_preview, export, validate, engine_check). Crew folders are ForgeCraft hand-offs (`tb_crew_<role>_v1/` with `asset.json`: routing, licence, provenance, every file's SHA-256).

## Rebuild

```bash
# one asset, through MeshCraft (any MCP client; this is what the logs record)
run_script     {"path": ".../scripts/drowned_assets.py", "args": {"asset": "oil_rig", "out_dir": ".../creative/3d-drowned/oil_rig", "palette": ".../tidebreakers-drowned-palette.json"}}
render_preview {"blend": ".../oil_rig/source/tb_oil_rig.blend", "out_dir": ".../oil_rig/previews", "size": 512}
export_asset   {"blend": ".../oil_rig/source/tb_oil_rig.blend", "profiles": ["three-web-toon"]}
validate_asset {"blend": "...", "exports": [".../exports/tb_oil_rig.three-web-toon.glb"], "profiles": ["three-web-toon"]}
engine_check   {"glb": ".../exports/tb_oil_rig.three-web-toon.glb", "material": "game-toon"}
# crew, through ForgeCraft
generate {"brief": "...", "template": "deckhand", "template_params": {"colors": {...}}, "profiles": ["three-web-toon"], "handoff_dir": ".../crew_<role>"}
```

Validation summary: all 11 MeshCraft assets pass with 0 failures (Khronos validator 0 errors). The only warnings are footprint-centre warnings on the multi-node kits, which is expected because their nodes sit side by side, and on the deliberately leaning `tower_stump`. All 6 ForgeCraft crew are `done`, with no fallbacks.

Gaps worth fixing in GITCRAFT: ForgeCraft's free-text router sent "crew member … for a boat game" to the **boat** template, matching the keyword "boat". An explicit `template` was needed. `run_script` assets don't enter the 3D library; only template and import builds do.

# Trimaran upgrade models (MeshCraft)

The Scrap Trimaran's code-built upgrade visuals, remodelled in GITCRAFT **MeshCraft** (Blender 5.2.3, headless and
sandboxed, through its one-shot `--call` mode). Each `build_<name>.py` is a `run_script` that uses the sloop's own
builder kit through [`_sloopkit.py`](_sloopkit.py):
- the procedural helpers and hull loft of MeshCraft's `boat` template (`engine/procedural/geo.py`, `builders.py`);
- the same GC palette-role materials;
- the same per-face vertex-colour bake (jitter 0.04).

The result matches `tb_coastal_sloop.glb` and the GITCRAFT upgrade models in style, palette and detail.

Every model is built in **the sloop's own frame** (metres, y = 0 at the waterline, bow +Z), so it drops onto the boat
at the origin. That is why validation reports `origin_centered` as a warning: by design, the origin is the boat's,
not the part's. Moving parts are child nodes whose origin is their pivot.

| Model | Upgrade | Folder (script, `.blend`, previews, logs) | Tris | MeshCraft pass / warn / fail | three.js engine check | Where | Cosmetic tint |
|---|---|---|---|---|---|---|---|
| Container Cabin | `cabin_container` | [`container_cabin/`](container_cabin/) | 896 | 13 / 1 / 0 | pass | replaces the sloop's cabin on its footprint (x ±1.0, z -3.7…-1.5); roof 2.28 m, 9 cm under the boom | paint colour 1 (steel), paint colour 2 (posts, rails) |
| Solar Array | `solar_array` | [`solar_array/`](solar_array/) | 400 | 13 / 1 / 0 | pass | two wings on the cabin roof either side of the boom (lifted 0.22 m onto the Container Cabin) | — |
| Salvage Radar | `radar_mast` | [`radar_mast/`](radar_mast/) | 384 | 13 / 1 / 0 | pass | roof, forward port corner, clear of the mainsail (which bellies to starboard); `radar_scanner` sweeps | — |
| Deck Wind Turbine | `deck_turbine` | [`deck_turbine/`](deck_turbine/) | 228 | 13 / 1 / 0 | pass | pole on the starboard quarter behind the cabin; `deck_turbine_rotor` spins (disk 3.6–5.1 m up) | — |
| Trolling Rods | `fishing_rig` | [`fishing_rig/`](fishing_rig/) | 752 | 13 / 1 / 0 | pass | holders on both transom corners, rods raked outboard and aft, away from the helm | — |
| Salvaged Outboard | `engine_outboard` | [`outboard/`](outboard/) | 236 | 13 / 1 / 0 | pass | clamped on the transom, starboard of the rudder | — |
| Twin Diesel Drive | `engine_twin` | [`twin_diesel/`](twin_diesel/) | 488 | 13 / 1 / 0 | pass | stern pod on a bracket aft of the transom, so the helm keeps its room | — |
| Harpoon Turret | `harpoon_turret` | [`harpoon/`](harpoon/) | 538 | 13 / 1 / 0 | pass | platform lashed on the starboard forward outrigger beam; `harpoon_mount` aims (on the foredeck it would cut the jib) | — |
| Salvage Crane & Winch | `salvage_crane` | [`salvage_crane/`](salvage_crane/) | 352 | 13 / 1 / 0 | pass | port side deck amidships; the node `salvage_crane` slews to port and swings while hauling | — |
| Fuel Drum Rack | `tank_drums` | [`fuel_drums/`](fuel_drums/) | 848 | 13 / 1 / 0 | pass | four drums in a rack on the port side deck beside the cabin | — |
| Rope Cargo Nets | `cargo_net` | [`cargo_nets/`](cargo_nets/) | 3,200 | 14 / 0 / 0 | pass | nets slung over both sides between the outrigger beams, tied off on gunwale cleats | — |
| Riveted Armour Plating | `hull_armor` | [`armour_plating/`](armour_plating/) | 1,728 | 14 / 0 / 0 | pass | plates above the copper band in a forward and an aft belt, leaving amidships for the nets | — |
| String Lights & Spotlight | `deck_lights` | [`deck_lights/`](deck_lights/) | 2,728 | 14 / 0 / 0 | pass | bulb strings swagged along both rails (glow at night), spotlight on the roof's forward starboard corner | — |

The Cutter Rig + Jib needs no model: the sloop's own jib is hidden until it is owned, and takes the sail cosmetic.

## Fit: nothing overlaps

The fit is checked with GITCRAFT MeshCraft's **`audit_overlaps`** tool (MeshCraft README, "Overlap audit").
[`audit_spec.py`](audit_spec.py) writes the specs (`logs/audit_full.json`, `logs/audit_early.json`); each assembles the
boat the way `src/ship/shipModel.ts` does:
- **Parts:** every upgrade, the wheel, the boom, mast and jib, the relocated lantern, the outrigger beams, and a
  0.24 m × 1.85 m captain at the helm.
- **Moving parts:** swept through their range: harpoon aim every 30°, crane slewed to port ±0.6 rad, turbine rotor and
  radar scanner at several angles.
- **Pairs:** every pair is tested for intersecting triangles, and for one part buried inside another.
- **Not tested:** hull, deck and rails, on purpose; parts sit on, clamp to and hang from them by design.

It runs on the **compressed files that ship** (the tool decodes Meshopt for Blender).

| Configuration | Parts | Poses | Pairs | Overlaps | Result |
|---|---|---|---|---|---|
| `full`: every upgrade (Twin Diesel, Container Cabin, Canvas Mainsail) | 24 | 288 | 269 | 0 | [`logs/audit_full.result.json`](logs/audit_full.result.json) |
| `early`: Salvaged Outboard, the sloop's own cabin, its base mainsail | 24 | 288 | 268 | 0 | [`logs/audit_early.result.json`](logs/audit_early.result.json) |
| negative control: the captain and crates back where they clashed | 24 | 288 | 269 | 2 (boom x crates, captain x wheel) | [`logs/audit_negative_control.result.json`](logs/audit_negative_control.result.json) |

The audit caught five clashes, all fixed:
- the Lashed Cargo Crates' rope hoop (2.48 m) ran through the boom, so the crates sit 0.5 m to starboard;
- `socket_navigation` was inside the cabin wall, so the compass stands 0.42 m forward;
- the sloop's stern lantern hung in front of the wheel hub, so it moves to the starboard rail when the wheel is
  fitted;
- the string lights sagged onto the outrigger beams where they cross the rail (the beams pass at rail height), so the
  strings now hop over each beam. My first, one-off audit script missed this one: Blender renames a second import's
  materials (`GC_Wood_9a5a2e.001`), so its beams part was empty and silently untested. The GITCRAFT tool matches
  across those suffixes and reports empty parts.
- the fuel drums pierced the hull side and grazed the cabin's porthole, so they are now slimmer and further inboard.

## Rebuild

```
./run_meshcraft.sh                 # every model: build, export three-web-toon, validate (+Khronos), previews, engine check
./run_meshcraft.sh harpoon         # one model
```
Then compress into `public/models` (`node ../compress_models.mjs <export> public/models/<asset>.glb`, see
[`../compression/README.md`](../compression/README.md)) and re-run the audit: `python3 audit_spec.py`, then MeshCraft
`audit_overlaps` with `logs/audit_full.json` and `logs/audit_early.json`. If a model's file fails to load, the game
draws that upgrade's old code-built part.


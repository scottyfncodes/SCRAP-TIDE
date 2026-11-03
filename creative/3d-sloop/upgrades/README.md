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
| String Lights & Spotlight | `deck_lights` | [`deck_lights/`](deck_lights/) | 2,392 | 14 / 0 / 0 | pass | bulb strings swagged along both rails (glow at night), spotlight on the roof's forward starboard corner | — |

The Cutter Rig + Jib needs no model: the sloop's own jib is hidden until it is owned, and takes the sail cosmetic.

## Fit: nothing overlaps

[`audit_overlaps.py`](audit_overlaps.py) assembles the boat the way the game does and tests every pair of parts for
intersecting triangles (Blender BVH):
- **Parts:** every upgrade, the wheel, the boom, mast and jib, the relocated lantern, the outrigger beams, and a
  0.24 m × 1.85 m captain at the helm.
- **Moving parts:** swept through their range: harpoon aim every 30°, crane slewed to port ±0.6 rad, turbine rotor
  and radar scanner at several angles.
- **Not tested:** hull, deck and rails, on purpose; parts sit on, clamp to and hang from them by design.

| Configuration | Poses | Pairs | Overlaps |
|---|---|---|---|
| `full`: every upgrade (Twin Diesel, Container Cabin, Canvas Mainsail) | 288 | 210 | 0 |
| `early`: Salvaged Outboard, the sloop's own cabin, its base mainsail | 288 | 210 | 0 |

The audit also caught three clashes between existing pieces, which the game now fits around:
- the Lashed Cargo Crates' rope hoop (2.48 m) ran through the boom, so the crates sit 0.5 m to starboard;
- `socket_navigation` was inside the cabin wall, so the compass stands 0.42 m forward;
- the sloop's stern lantern hung in front of the wheel hub, so it moves to the starboard rail when the wheel is fitted.

## Rebuild

```
./run_meshcraft.sh                 # every model: build, export three-web-toon, validate (+Khronos), previews, engine check
./run_meshcraft.sh harpoon         # one model
```
Then copy `<name>/exports/<asset>.three-web-toon.glb` to `public/models/<asset>.glb` and re-run the audit
(`logs/args_audit.json`, `logs/args_audit_early.json`). If a model's file fails to load, the game draws that
upgrade's old code-built part.


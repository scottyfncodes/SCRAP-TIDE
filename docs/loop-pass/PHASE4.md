# Loop pass · Phase 4: the Wave Runner and the Hot Air Balloon

Screenshots: [`phase4/`](phase4/) (desktop 1280×800, phone 393×852). Previews, no unlock needed:
`?vehicle=waverunner`, `?vehicle=balloon`, `?vehicle=all` (sandboxed like `?ship=`; combine with `&upgrades=all`).

## Wave Runner
- **Buy it** from Marlo (Wave Runner 240g + scrap, engine parts, wire). Add-ons: **Long-Range Tank** (range 260 → 480 m),
  **Tow Sled** (2 loads), **Nitro Boost** (Rig Helios; hold BOOST: 1.6× for 2.5 s, 7 s cooldown). Each shows its effect
  in the shop.
- **Docked:** moored alongside the Trimaran's port float (alongside on the other hulls). On the boat it is always
  visible.
- **One button:** 🚤 LAUNCH RUNNER drops it in the water and the wheel steers it at once; the boat holds position.
  ↩ RETURN beside the boat unloads and re-docks instantly; further out, it heads home on its own (steer to cancel).
- **Feel:** top speed 21 m/s (faster than any hull under engine), sharp turning, jumps off wave crests at speed with a
  splash, haptic and camera kick on landing; spray wake; a two-stroke whine that climbs with speed.
- **Cargo:** 1 load (2 with the sled). It picks up caches it rides over, and **GRAB**s the best of a wreck in one
  pull. Loads only count once unloaded onto the boat (RETURN), then bank at a dock like everything else.
- **Fragile:** a hard crash into land or a wreck, or a rogue wave, throws you off. The load floats where you fell (ride
  over it to get it back); you swim back to the runner in ~3 s, or tap ↩ RESPAWN AT BOAT.
- **What it's for:** surfacing wrecks before they sink, beating rival scavengers, and the shallows: caches wash into
  water too thin for any hull, and only the runner reaches them.

## Raider event (added to the sea-event pool)
Three Rustfang riders on rust-red wave runners circle the boat (lit lamps, raider blips on the radar) and dart in to
snatch one item from the hold (never a Legendary). Ram them with your runner at speed, harpoon them (the turret ring
targets riders), or outrun them under engine. Beaten if they're all down, outrun, or leave with nothing.

## Hot Air Balloon
- **Late-game unlock:** needs the Salvage Radar; 520g + canvas, rope, crude (Rig Helios or Driftholm). Patched
  gores in the tarp/canvas/rust palette over a cut-down drum basket. Stowed rolled up on the starboard float.
- **🎈 GO UP** inflates it on a tether. **One input:** HOLD 🔥 BURN to climb, let go to sink. The wind drifts you
  downwind of the boat, more the higher you go; the wheel nudges you along the tether.
- **High view:** above ~30 m the camera pulls far overhead. Everything in sight is **marked** with a ping:
  wrecks (Rare/Legendary in colour if the Salvage Radar is fitted, plain otherwise), the storm edge, rogue waves,
  rivals and raiders. **Marks stay on the radar after you land** (and survive a reload until the trip ends).
- **Tension:** the squall clock and storms keep running while you're up.
- **Winch** (Rig Helios, 300g + parts): heavy wrecks wedge in the shallows where no hull or crane reaches. Hover low
  over one, 🪝 WINCH LIFT, fly it back to the boat: it lands on deck as a clean haul with a heavy-lift bonus roll.

## Assets (GITCRAFT)
| Asset | Tool | Result |
|---|---|---|
| `tb_waverunner.glb` | MeshCraft `run_script` with the Trimaran's own builder kit (`creative/3d-sloop/upgrades/_sloopkit.py`): GC palette roles, helpers, vertex-colour bake. Hull in the sloop's paint roles (takes the equipped paint). Nodes `waverunner_bars` (steers), `waverunner_sled` | 819 tris; validate 13 pass / 1 warn (origin by design) / 0 fail; three.js engine check pass; 73 KB → **44.5 KB** Meshopt |
| `tb_balloon.glb` | same kit. Nodes `balloon_envelope`, `balloon_burner` (flame is the glow role), `balloon_winch`, `balloon_stowed` | 1,556 tris; validate 14 / 0 / 0; engine check pass; 127 KB → **65 KB** Meshopt |
| Burner and high-wind loops, runner splash and boost | StudioCraft AudioCraft (`ambience fire/wind`, `sfx splash/whoosh`): seamless loops verified, no clipping; OGG + AAC for iPhone | 7–82 KB each |

- **Fallbacks:** if a model file fails to load, a code-built runner/balloon stands in; until a sound loads (or if it
  fails), the procedural WebAudio engine/burner plays.
- **Lazy-loaded:** both models load only when owned or previewed (`VEHICLE_MODEL_FILES`, `vehicleFiles()`), never at
  boot; the sounds load on first use.
- Sources, previews, logs and provenance: [`creative/3d-vehicles/`](../../creative/3d-vehicles/).

## Overlap audit (MeshCraft `audit_overlaps`, on the shipped compressed files)
The Trimaran's full and early assemblies plus the runner moored alongside the port float and the stowed balloon
(basket + rolled envelope, at the game's 0.8 scale) on the starboard float, with every moving part swept:

| Configuration | Parts | Poses | Pairs | Overlaps |
|---|---|---|---|---|
| full (every upgrade + both vehicles) | 28 | 288 | 369 | **0** |
| early (base setup + both vehicles) | 28 | 288 | 368 | **0** |

## Saves
v8 → v9 adds the trip's balloon marks. Everything owned carries over.

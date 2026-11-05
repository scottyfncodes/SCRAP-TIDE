# TIDEBREAKERS · PLAYCRAFT evidence pack

Generated 2026-11-05T17:27:28.172Z from commit `719bce1` (simulations) / `719bce1` (playtest bot). Game source unchanged by this pack.

**Where this was measured:** headless Chromium with software WebGL (SwiftShader) in a Linux container. Nothing here was observed on a real phone.

## Evidence classes

| Class | Meaning | Here |
|---|---|---|
| **runtime-observed** | The production build played through its real UI by a bot; state read from the running game | playtest bot |
| **simulation-measured** | The game’s own code (economy, salvage, fuel, hull, the frame loop) driven by a script with seeded randomness; travel, combat and human skill are modelled, not played | all of tests/sim |
| **source-only** | Read from code or data, not executed | only where a row says so |
| **real-device** | Seen on a physical iPhone | none: see "Needs a human or an iPhone" |

## Playtest bot (runtime-observed)

Production build (`dist/`), iPhone-sized viewport, seed 1105, 3 run(s). Reproducible: **yes (identical fingerprints)**. Wall time per run: 46.3s, 42.8s, 41.1s.

| Check | Result | Detail |
|---|---|---|
| voyage starts docked at Driftholm on the first-voyage quest | PASS | quest=steer, gold=15 |
| steered from the dock to the Sunken Tower beacon with the wheel | PASS | game 32.83s, at (64.9, 135.5) |
| SALVAGE opens the winch | PASS |  |
| the winch was played to the end and the haul came aboard | PASS | 3/3 pulls in the green; cargo transistor_radio×1, scrap_metal×6, wire×4 |
| sailed back to the Driftholm pier | PASS | game 58.2s |
| docking unloads the hold into the vault | PASS | vault transistor_radio×1, scrap_metal×6, wire×4 |
| selling turns the haul into gold | PASS | 15g → 99g |
| the shipwright offers an affordable upgrade | PASS | affordable: Canvas Mainsail, Brass Compass |
| the upgrade is installed through the shipwright | PASS | Canvas Mainsail → sail_canvas; gold 39 |
| the upgrade is visible on the boat | PASS | sail 2.4 m → 3.16 m tall (top 2.97 → 3.72); parts none |
| the save in localStorage has the upgrade | PASS | saved upgrades: sail_canvas |
| after a reload the save loads with the upgrade installed | PASS | title button "Continue Voyage"; upgrades sail_canvas; gold 39 |
| after a reload the boat is still rebuilt with it | PASS | sail 3.1 m after reload (3.16 m after install, 2.4 m stock) |
| the upgrade changes how the boat sails | PASS | top speed on the same leg 6.10 → 8.30 (sail speed stat now 9.10) |
| no page errors | PASS |  |

| Event | Game time (s) | Position | Gold |
|---|---|---|---|
| title → SET SAIL → welcome dismissed; harness takes the clock | 0 | 6, 168 | 15 |
| cast off (first drag on the wheel) | 0.3 | 6, 167.8 | 15 |
| beacon in reach: SALVAGE offered | 32.8 | 64.9, 135.5 | 15 |
| winch opened | 32.9 | 64.9, 135.5 | 15 |
| winch done; haul in the hold | 36.6 | 65.2, 135.6 | 15 |
| cast off (first drag on the wheel) | 37.4 | 65.2, 135.6 | 15 |
| DOCK offered at the Driftholm pier | 58.2 | 10.5, 159.7 | 15 |
| docked; hold unloaded to the vault | 59.5 | 6, 168 | 15 |
| sold the haul to Pip | 60.6 | 6, 168 | 99 |
| upgrade installed | 61.6 | 6, 168 | 39 |
| cast off (first drag on the wheel) | 0.3 | 6, 167.8 | 39 |
| sailed the outbound leg again | 42.7 | 73.2, 137.9 | 39 |

Screenshots: [bot_run1_1_start.png](playtest/bot_run1_1_start.png), [bot_run1_2_beacon.png](playtest/bot_run1_2_beacon.png), [bot_run1_3_upgraded.png](playtest/bot_run1_3_upgraded.png), [bot_run1_4_reloaded.png](playtest/bot_run1_4_reloaded.png)

## Simulations (simulation-measured)

Seeded runs of the real game code; see `tests/sim/sims.page.js` for exactly which function each number comes from. Storage was untouched and the page logged 0 errors.

### Salvage yield per haul (winch 2/3, no Salvager, empty hold of the boat that can reach the site)

| Site | Region | Boat (slots) | Gold/haul mean | p10–p90 | Items/haul | Gold per respawn-minute | Perfect hauls overflowing |
|---|---|---|---|---|---|---|---|
| The Sunken Tower | shallows | dinghy (6) | 22.6 | 16–29 | 5.0 | 5.6 | 0% |
| The Box Yard | shallows | dinghy (6) | 37.2 | 19–83 | 5.8 | 7.4 | 0% |
| Hollow Underfloors | shallows | dinghy (6) | 42.1 | 19–75 | 6.1 | 7.0 | 0% |
| Meridian Plaza | emerald | sloop (14) | 81.2 | 41–135 | 8.0 | 11.6 | 0% |
| Broadcast Spire | emerald | sloop (14) | 118.3 | 68–197 | 8.1 | 14.8 | 0% |
| The Leaning Block | emerald | sloop (14) | 62.5 | 23–142 | 6.3 | 8.9 | 0% |
| Helios Lower Deck | emerald | sloop (14) | 42.5 | 24–62 | 5.2 | 7.1 | 0% |
| Hull of the Meridian Star | emerald | sloop (14) | 187.3 | 86–354 | 13.2 | 18.7 | 0% |
| Graveyard Boxes | emerald | sloop (14) | 66.1 | 38–109 | 8.9 | 9.4 | 0% |
| The Meridian Spire | stormwall | ironwake (22) | 354.4 | 218–490 | 8.3 | 23.6 | 0% |

Winch skill matters: the Sunken Tower pays 0/3 → 7.6g, 1/3 → 15.5g, 2/3 → 22.6g, 3/3 → 30.6g. A Salvager adds about 23.7g a haul on average.

| Site | Difficulty | No gear | Crane | Crane + Salvager |
|---|---|---|---|---|
| sv_stump | 1 | 0.25 | 0.32 | 0.37 |
| sv_boxyard | 1 | 0.25 | 0.32 | 0.37 |
| sv_hollow_sub | 2 | 0.2 | 0.27 | 0.32 |
| sv_meridian_a | 2 | 0.2 | 0.27 | 0.32 |
| sv_meridian_b | 3 | refused (heavy) | 0.22 | 0.27 |
| sv_meridian_c | 2 | 0.2 | 0.27 | 0.32 |
| sv_rig | 2 | refused (heavy) | 0.27 | 0.32 |
| sv_tanker | 3 | refused (heavy) | 0.22 | 0.27 |
| sv_graveyard | 2 | 0.2 | 0.27 | 0.32 |
| sv_spire | 3 | refused (heavy) | 0.22 | 0.27 |

### Sourcing actions needed to afford each upgrade

From the state a player could first buy it in (prerequisites only, 15 gold), 10 seeds each. "Actions" = salvage hauls + drifting caches + flotsam. Respawn wait is the in-game time spent waiting for a salvage site to refill. Travel time is not included.

| Target | Cost | Hauls (winch 1/3) | Hauls (2/3) | Hauls (3/3) | All actions (2/3) mean / p90 | Respawn wait (2/3) | Affordable |
|---|---|---|---|---|---|---|---|
| Canvas Mainsail | 60g | 1.7 | 1.5 (p90 2) | 1.4 | 1.5 / 2 | 0 min | 10/10 |
| Cutter Rig + Jib | 150g +3 canvas +2 rope | 3.5 | 2.8 (p90 4) | 2.6 | 6 / 9 | 2.8 min | 10/10 |
| Salvaged Outboard | 90g +4 scrap_metal +2 wire | 2.9 | 2.8 (p90 3) | 2.5 | 2.8 / 3 | 0 min | 10/10 |
| Twin Diesel Drive | 380g +3 engine_parts +6 scrap_metal +3 wire | 7.2 | 6.1 (p90 9) | 5.1 | 12.6 / 24 | 1.1 min | 10/10 |
| Copper-Banded Hull | 130g +4 driftwood | 2.8 | 2.4 (p90 3) | 1.9 | 6.8 / 11 | 6 min | 10/10 |
| Riveted Armour Plating | 260g +4 alloy_plate +6 iron_nails | 7.4 | 5.9 (p90 7) | 4.9 | 14.6 / 18 | 12.1 min | 10/10 |
| Lashed Cargo Crate | 40g +3 driftwood | 0.7 | 0.7 (p90 1) | 0.6 | 3.9 / 5 | 3.6 min | 10/10 |
| Rope Cargo Nets | 85g +3 rope | 1.6 | 1.4 (p90 2) | 1.7 | 5.4 / 7 | 4.8 min | 10/10 |
| Fuel Drum Rack | 70g +2 scrap_metal +2 rope | 1.6 | 1.7 (p90 2) | 1.4 | 5.3 / 7 | 4 min | 10/10 |
| Ash-Wood Rudder | 45g +2 driftwood | 1.1 | 1.1 (p90 2) | 0.9 | 3.6 / 6 | 2 min | 10/10 |
| Brass Compass | 90g | 2.3 | 2 (p90 3) | 1.6 | 2 / 3 | 0 min | 10/10 |
| Salvage Radar | 240g +4 electronics +3 wire +2 scrap_metal | 5.3 | 4.7 (p90 6) | 3.9 | 4.7 / 6 | 0 min | 10/10 |
| Salvage Crane & Winch | 160g +6 scrap_metal +3 rope +2 wire | 4.8 | 3.1 (p90 5) | 2.7 | 7.1 / 13 | 6.5 min | 10/10 |
| Harpoon Turret | 220g +5 scrap_metal +1 engine_parts +4 rope | 4.2 | 3.1 (p90 4) | 2.6 | 8.7 / 14 | 0 min | 10/10 |
| Solar Array | 120g +3 electronics +2 wire +3 plastic | 7.5 | 6.5 (p90 14) | 4 | 6.7 / 14 | 10.0 min | 10/10 |
| Deck Wind Turbine | 180g +1 engine_parts +3 wire +2 plastic | 7 | 5.2 (p90 6) | 4.2 | 5.5 / 7 | 6.0 min | 10/10 |
| Container Cabin | 200g +6 scrap_metal +4 driftwood +2 plastic | 5.4 | 4.5 (p90 6) | 3 | 8.9 / 13 | 5.7 min | 10/10 |
| String Lights & Spotlight | 50g +2 wire +1 electronics | 2.8 | 2.6 (p90 3) | 2.6 | 2.6 / 3 | 0 min | 10/10 |
| Trolling Rods | 60g +2 rope +2 driftwood | 1.1 | 0.8 (p90 2) | 0.9 | 6 / 8 | 4 min | 10/10 |
| Scrap Trimaran | 420g +8 driftwood +6 scrap_metal +3 canvas +4 iron_nails | 12.4 | 9.9 (p90 11) | 8.1 | 18.4 / 22 | 24.5 min | 10/10 |
| Ironwake Expedition Cat | 1400g +8 alloy_plate +4 engine_parts +6 electronics +6 canvas | 23 | 18.6 (p90 31) | 17 | 62.2 / 71 | 12.8 min | 10/10 |

### Campaign: the whole game’s purchases in Captain’s Log order

| Winch | Seed | Actions | Hauls | Caches | Flotsam | Crafted | Respawn wait | Upgrades | Vessels | Log reached |
|---|---|---|---|---|---|---|---|---|---|---|
| 1/3 | 1 | 251 | 64 | 85 | 102 | 17 | 1.35 h | 19/19 | 3 | g_raiders |
| 1/3 | 2 | 257 | 61 | 87 | 109 | 22 | 1.47 h | 19/19 | 3 | g_raiders |
| 1/3 | 3 | 281 | 47 | 127 | 107 | 23 | 1.09 h | 19/19 | 3 | g_raiders |
| 2/3 | 1 | 221 | 38 | 82 | 101 | 22 | 1.02 h | 19/19 | 3 | g_raiders |
| 2/3 | 2 | 206 | 37 | 60 | 109 | 24 | 1 h | 19/19 | 3 | g_raiders |
| 2/3 | 3 | 198 | 38 | 54 | 106 | 19 | 0.95 h | 19/19 | 3 | g_raiders |
| 3/3 | 1 | 195 | 31 | 77 | 87 | 21 | 0.73 h | 19/19 | 3 | g_raiders |
| 3/3 | 2 | 193 | 32 | 76 | 85 | 23 | 0.78 h | 19/19 | 3 | g_raiders |
| 3/3 | 3 | 179 | 32 | 51 | 96 | 20 | 0.81 h | 19/19 | 3 | g_raiders |

Steps (winch 2/3, seed 1):

| Step | Actions | Hauls | Caches | Flotsam | Respawn wait (min) | Gold after | Cumulative actions |
|---|---|---|---|---|---|---|---|
| buy Canvas Mainsail | 2 | 2 | 0 | 0 | 0 | 53 | 2 |
| salvage the Sunken Tower | 0 | 0 | 0 | 0 | 0 | 118 | 3 |
| buy Salvaged Outboard | 7 | 3 | 0 | 4 | 8 | 194 | 10 |
| rescue Kai (castaway) | 0 | 0 | 0 | 0 | 0 | 234 | 10 |
| buy Lashed Cargo Crate | 4 | 0 | 0 | 4 | 4 | 211 | 14 |
| buy Copper-Banded Hull | 3 | 0 | 0 | 3 | 8 | 98 | 17 |
| buy Ash-Wood Rudder | 5 | 0 | 0 | 5 | 8 | 70 | 22 |
| buy Salvage Crane & Winch | 7 | 4 | 0 | 3 | 4 | 82 | 29 |
| commission Scrap Trimaran | 19 | 9 | 0 | 10 | 26.0 | 86 | 48 |
| dock at Rig Helios | 0 | 0 | 0 | 0 | 0 | 206 | 48 |
| salvage Old Meridian | 0 | 0 | 0 | 0 | 0 | 489 | 49 |
| buy Harpoon Turret | 6 | 1 | 0 | 5 | 0 | 700 | 55 |
| buy Riveted Armour Plating | 15 | 2 | 0 | 13 | 0 | 590 | 70 |
| buy Twin Diesel Drive | 19 | 2 | 14 | 3 | 0 | 715 | 89 |
| buy Brass Compass | 0 | 0 | 0 | 0 | 0 | 625 | 89 |
| buy Salvage Radar | 31 | 2 | 29 | 0 | 0 | 957 | 120 |
| drive off a Rustfang raider _(NOT SIMULATED: raider combat is real-time; the Captain’s Log waits here. Purchases are not gated by it.)_ | 0 | 0 | 0 | 0 | 0 | 957 | 120 |
| commission Ironwake Expedition Cat | 51 | 8 | 27 | 16 | 1.5 | 491 | 171 |
| buy Cutter Rig + Jib | 4 | 0 | 0 | 4 | 0 | 369 | 175 |
| buy Rope Cargo Nets | 3 | 0 | 0 | 3 | 0 | 310 | 178 |
| buy Fuel Drum Rack | 4 | 0 | 0 | 4 | 0 | 270 | 182 |
| buy Solar Array | 3 | 1 | 0 | 2 | 0 | 1191 | 185 |
| buy Deck Wind Turbine | 14 | 0 | 10 | 4 | 0 | 1145 | 199 |
| buy Container Cabin | 15 | 0 | 1 | 14 | 1.5 | 1027 | 214 |
| buy String Lights & Spotlight | 3 | 2 | 1 | 0 | 0 | 1035 | 217 |
| buy Trolling Rods | 4 | 0 | 0 | 4 | 0 | 1027 | 221 |

### Fuel and range (engine, full throttle, into the wind)

| Boat | Engine | Drum rack | Mechanic | Tank | Fuel/min | Minutes to empty | Range (m) | m per fuel |
|---|---|---|---|---|---|---|---|---|
| dinghy | outboard |  |  | 40 | 13.2 | 3.0 | 1624 | 40.6 |
| dinghy | outboard |  | yes | 40 | 8.6 | 4.7 | 2505 | 62.6 |
| dinghy | outboard | yes |  | 100 | 13.2 | 7.6 | 4078 | 40.8 |
| dinghy | outboard | yes | yes | 100 | 8.6 | 11.7 | 6281 | 62.8 |
| dinghy | twin |  |  | 40 | 18 | 2.2 | 1847 | 46.2 |
| dinghy | twin |  | yes | 40 | 11.7 | 3.4 | 2852 | 71.3 |
| dinghy | twin | yes |  | 100 | 18 | 5.6 | 4647 | 46.5 |
| dinghy | twin | yes | yes | 100 | 11.7 | 8.5 | 7160 | 71.6 |
| sloop | outboard |  |  | 40 | 13.2 | 3.0 | 1624 | 40.6 |
| sloop | outboard |  | yes | 40 | 8.6 | 4.7 | 2505 | 62.6 |
| sloop | outboard | yes |  | 100 | 13.2 | 7.6 | 4078 | 40.8 |
| sloop | outboard | yes | yes | 100 | 8.6 | 11.7 | 6281 | 62.8 |
| sloop | twin |  |  | 40 | 18 | 2.2 | 1847 | 46.2 |
| sloop | twin |  | yes | 40 | 11.7 | 3.4 | 2852 | 71.3 |
| sloop | twin | yes |  | 100 | 18 | 5.6 | 4647 | 46.5 |
| sloop | twin | yes | yes | 100 | 11.7 | 8.5 | 7160 | 71.6 |
| ironwake | outboard |  |  | 40 | 13.2 | 3.0 | 1624 | 40.6 |
| ironwake | outboard |  | yes | 40 | 8.6 | 4.7 | 2505 | 62.6 |
| ironwake | outboard | yes |  | 100 | 13.2 | 7.6 | 4078 | 40.8 |
| ironwake | outboard | yes | yes | 100 | 8.6 | 11.7 | 6281 | 62.8 |
| ironwake | twin |  |  | 40 | 18 | 2.2 | 1847 | 46.2 |
| ironwake | twin |  | yes | 40 | 11.7 | 3.4 | 2852 | 71.3 |
| ironwake | twin | yes |  | 100 | 18 | 5.6 | 4647 | 46.5 |
| ironwake | twin | yes | yes | 100 | 11.7 | 8.5 | 7160 | 71.6 |

Half throttle: dinghy/outboard 40.6 m per fuel, dinghy/twin 46.3 m per fuel, sloop/outboard 40.6 m per fuel, sloop/twin 46.3 m per fuel, ironwake/outboard 40.6 m per fuel, ironwake/twin 46.3 m per fuel.

| Power | Time | Storm | Fuel gained / min |
|---|---|---|---|
| solar array | noon | 0 | 2.5 |
| solar array | noon | 0.8 | 3.5 |
| solar array | night | 0 | 1 |
| solar array | night | 0.8 | 2 |
| solar + deck turbine | noon | 0 | 6 |
| solar + deck turbine | noon | 0.8 | 8.4 |
| solar + deck turbine | night | 0 | 2.4 |
| solar + deck turbine | night | 0.8 | 4.8 |

### Sailing: steady speed by heading off the wind (m/s), and turning

| Boat | Sail | Downwind | 45° | 90° (beam) | 135° | Into the wind |
|---|---|---|---|---|---|---|
| dinghy | stock | 5.8 | 6.0 | 6.5 | 4.0 | 2.9 |
| dinghy | Canvas Mainsail | 8.2 | 8.5 | 9.1 | 5.6 | 4.1 |
| dinghy | Cutter Rig | 9.9 | 10.3 | 11.1 | 6.8 | 5.0 |
| sloop | stock | 9.4 | 9.8 | 10.5 | 6.4 | 4.7 |
| sloop | Canvas Mainsail | 13.2 | 13.7 | 14.7 | 9.0 | 6.6 |
| sloop | Cutter Rig | 16.1 | 16.6 | 17.9 | 10.9 | 8.0 |
| ironwake | stock | 11.3 | 11.6 | 12.5 | 7.6 | 5.6 |
| ironwake | Canvas Mainsail | 15.8 | 16.3 | 17.5 | 10.7 | 7.9 |
| ironwake | Cutter Rig | 19.1 | 19.8 | 21.3 | 13.0 | 9.6 |

| Boat | Rudder | Seconds to turn 180° |
|---|---|---|
| dinghy | stock rudder | 2.7 |
| dinghy | Ash-Wood Rudder | 1.9 |
| sloop | stock rudder | 3.3 |
| sloop | Ash-Wood Rudder | 2.3 |
| ironwake | stock rudder | 3.8 |
| ironwake | Ash-Wood Rudder | 2.5 |

### Hull: storms, the Stormwall, collisions

| Boat | Plating | Hull | Storm 0.5 | Storm 0.7 | Storm 1.0 | Stormwall (storm 1.0) | Minutes to swamp in a full storm |
|---|---|---|---|---|---|---|---|
| dinghy | no plating | 60 | 9.6 | 28.8 | 57.6 | 115.2 | 1.0 |
| dinghy | Copper-Banded Hull | 80 | 9.6 | 28.8 | 57.6 | 115.2 | 1.4 |
| dinghy | Riveted Armour | 120 | 5.3 | 15.8 | 31.7 | 63.4 | 3.8 |
| sloop | no plating | 100 | 9.6 | 28.8 | 57.6 | 115.2 | 1.7 |
| sloop | Copper-Banded Hull | 120 | 9.6 | 28.8 | 57.6 | 115.2 | 2.1 |
| sloop | Riveted Armour | 160 | 5.3 | 15.8 | 31.7 | 63.4 | 5.0 |
| ironwake | no plating | 160 | 9.6 | 28.8 | 57.6 | 86.4 | 2.8 |
| ironwake | Copper-Banded Hull | 180 | 9.6 | 28.8 | 57.6 | 86.4 | 3.1 |
| ironwake | Riveted Armour | 220 | 5.3 | 15.8 | 31.7 | 47.5 | 6.9 |

Values are hull lost per minute. Wreck strikes (Game.damage at speed × 1.4): no plating at 4 m/s −5.6, no plating at 8 m/s −11.2, no plating at 12 m/s −16.8, no plating at 16 m/s −22.4, Riveted Armour at 4 m/s −3.1, Riveted Armour at 8 m/s −6.2, Riveted Armour at 12 m/s −9.2, Riveted Armour at 16 m/s −12.3. A Mechanic repairs 21 hull/min in calm water.

### Voyages under the real frame loop

| Voyage | Seed | Arrived | Minutes | Distance (m) | Hull lost | Storm s | Stormwall s | Flags |
|---|---|---|---|---|---|---|---|---|
| Driftholm → Rig Helios | 1 | yes | 0.6 | 480 | 0 / 100 | 0 | 0 |  |
| Driftholm → Rig Helios (Skiff: should be turned back by the swell) | 1 | no (1/3) | 5 | 741 | 0 / 60 | 0 | 0 |  |
| Driftholm → Meridian Spire (Ironwake, Cutter Rig) | 1 | yes | 1.1 | 1141 | 26.5 / 160 | 25.4 | 16.9 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, Cutter Rig, Riveted Armour) | 1 | yes | 1.1 | 1141 | 14.6 / 220 | 25.4 | 16.9 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, Canvas Mainsail) | 1 | yes | 1.3 | 1141 | 33.1 / 160 | 31.1 | 20.7 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, stock sail) | 1 | yes | 1.9 | 1141 | 47.5 / 160 | 43.6 | 29.3 | reached_spire |
| Driftholm → Meridian Spire (Trimaran: should be turned back by the Stormwall) | 1 | no (2/3) | 4.5 | 1407 | 100 / 100 | 211.2 | 199.0 |  |
| Driftholm → Rig Helios | 2 | yes | 0.6 | 480 | 0 / 100 | 0 | 0 |  |
| Driftholm → Rig Helios (Skiff: should be turned back by the swell) | 2 | no (1/3) | 5 | 741 | 0 / 60 | 0 | 0 |  |
| Driftholm → Meridian Spire (Ironwake, Cutter Rig) | 2 | yes | 1.1 | 1141 | 26.5 / 160 | 25.4 | 16.9 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, Cutter Rig, Riveted Armour) | 2 | yes | 1.1 | 1141 | 14.6 / 220 | 25.4 | 16.9 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, Canvas Mainsail) | 2 | yes | 1.3 | 1141 | 33.1 / 160 | 31.1 | 20.7 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, stock sail) | 2 | yes | 1.9 | 1141 | 47.5 / 160 | 43.6 | 29.3 | reached_spire |
| Driftholm → Meridian Spire (Trimaran: should be turned back by the Stormwall) | 2 | no (2/3) | 4.5 | 1407 | 100 / 100 | 211.2 | 199.0 |  |
| Driftholm → Rig Helios | 3 | yes | 0.6 | 480 | 0 / 100 | 0 | 0 |  |
| Driftholm → Rig Helios (Skiff: should be turned back by the swell) | 3 | no (1/3) | 5 | 741 | 0 / 60 | 0 | 0 |  |
| Driftholm → Meridian Spire (Ironwake, Cutter Rig) | 3 | yes | 1.1 | 1141 | 26.5 / 160 | 25.4 | 16.9 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, Cutter Rig, Riveted Armour) | 3 | yes | 1.1 | 1141 | 14.6 / 220 | 25.4 | 16.9 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, Canvas Mainsail) | 3 | yes | 1.3 | 1141 | 33.1 / 160 | 31.1 | 20.7 | reached_spire |
| Driftholm → Meridian Spire (Ironwake, stock sail) | 3 | yes | 1.9 | 1141 | 47.5 / 160 | 43.6 | 29.3 | reached_spire |
| Driftholm → Meridian Spire (Trimaran: should be turned back by the Stormwall) | 3 | no (2/3) | 4.5 | 1407 | 100 / 100 | 211.2 | 199.0 |  |

Every seed produced the same voyage: storm cells start from fixed positions and nothing on these routes is random, so the seeds confirm determinism rather than add samples.

The Skiff was stopped by the open swell in 3/3 runs and the Trimaran by the Stormwall in 3/3, as designed. The Trimaran reached Rig Helios in 3/3.

### Exploit checks

| Check | Result | Detail |
|---|---|---|
| craft Refine Fuel then sell | ok | input_value 12, output_value 10, gain_per_craft -2, margin_pct -17 |
| craft Hull Patch Kit then sell | ok | small positive margin (a few gold); not worth farming |
| craft Alloy Plate then sell | ok | small positive margin (a few gold); not worth farming |
| craft Engine Parts then sell | ok | small positive margin (a few gold); not worth farming |
| craft Stitch Sailcloth then sell | ok | input_value 9, output_value 8, gain_per_craft -1, margin_pct -11 |
| craft Strip Wire then sell | ok | small positive margin (a few gold); not worth farming |
| buy fuel at driftholm | ok | cans cannot be bought back from fuel, so this is only an exploit if fuel can be turned into cans (it cannot) |
| buy fuel at hollow | ok | cans cannot be bought back from fuel, so this is only an exploit if fuel can be turned into cans (it cannot) |
| buy fuel at helios | ok | cans cannot be bought back from fuel, so this is only an exploit if fuel can be turned into cans (it cannot) |
| repair 35 hull at a dock vs a patch kit | ok | a kit also works at sea |
| salvage respawn: clock set forward a day mid-session | ok | respawn follows the sea clock (monotonic in a session): the clock change did nothing |
| salvage respawn: clock set back, then one respawn of real time | ok | the site refilled after its respawn of real time |
| salvage respawn: relaunch after the clock was set forward a day | ok | between sessions the device clock is the only clock; the credit is capped at 2 h (with 4-15 min respawns that equals having been away that long) |

## Findings (computed from the data above)

| Severity | Finding | Evidence | Class |
|---|---|---|---|
| medium | Difficulty/pacing spike: commission Scrap Trimaran | 19 sourcing actions for this step vs at most 7 for any earlier step (campaign, winch 2/3). | simulation-measured |
| info | No progression dead ends found | Every one of the 21 upgrades and vessels became affordable and was bought through the game in every seed at every winch skill (hits_1, hits_2, hits_3). | simulation-measured |
| info | Captain's Log in the campaign stops at g_raiders | Completed: g_salvage → g_engine → g_crew → g_trimaran → g_helios → g_meridian. The raider goal needs real-time combat, which the simulation does not play; nothing after it can complete here (purchases are not gated by goals). | simulation-measured |
| info | Stormwall crossing | Driftholm → Meridian Spire under the real loop: Ironwake arrived in 12/12 runs, 21.0 s inside the wall on average, losing 6.6-29.7% hull (best fit to stock sail). The Trimaran was swamped trying in 3/3 runs. | simulation-measured |
| info | Storm damage | A full storm (storm 1.0) costs the stock Skiff 57.6 hull/min (swamped from full in 1.0 min); the Trimaran 57.6 hull/min (1.7 min). Riveted Armour cuts it by 45.0%. Below storm 0.4 there is no damage. | simulation-measured |
| info | Crafting margins are small | Hull Patch Kit: +2g (20%); Alloy Plate: +2g (11%); Engine Parts: +3g (14%); Strip Wire: +1g (11%). Not worth farming. | simulation-measured |
| info | Sailing never needs tacking | Stock Skiff: 6.5 m/s on a beam reach, 5.8 downwind, 2.9 dead into the wind (45%). Every boat can sail straight upwind at under half speed; wind shapes speed, not routes. | simulation-measured |

No gameplay, balance or content was changed to produce any of this. Findings are for the designer to weigh.

## PLAYCRAFT evidence items

`playcraft-evidence.json` lists these for `playcraft_assess` / `playcraft_verify` (`evidence`). PLAYCRAFT records any project evidence file as **verified**; the titles say which class each really is.

| Category | Status | Item |
|---|---|---|
| core_gameplay | pass | Playtest bot: the core loop runs end to end on the production build (runtime-observed) |
| controls | pass | Playtest bot: steering by dragging the wheel and the winch timing reach their targets (runtime-observed) |
| technical | pass | Playtest bot: save → reload → load keeps the upgrade; no page errors (runtime-observed) |
| technical | pass | Playtest bot: deterministic and reproducible (same seed → identical run fingerprint) |
| presentation | pass | Playtest bot: the installed upgrade is visible on the boat and survives a reload (runtime-observed) |
| progression | pass | Simulation: every upgrade and vessel is reachable; the campaign completes (simulation-measured) |
| progression | pass | Simulation: upgrades measurably change play (sail speed, turning, range) |
| difficulty | pass | Balance is measured: headless simulations of economy, fuel, storms and voyages on the real game systems |
| difficulty | partial | Simulation: pacing between purchases (difficulty spikes) |
| difficulty | pass | Simulation: the Stormwall as the final barrier |
| difficulty | pass | Simulation: no economy exploits through crafting, fuel or repair |
| player_experience | pass | Playtest bot: time from casting off to the first upgrade (game time) |

## PLAYCRAFT before / after this evidence

Before: gitcraft-out/playcraft/verify (PLAYCRAFT pass on 546d5f3, no project evidence). After: playcraft_assess with docs/playcraft-evidence/playcraft-evidence.json + the same play report. Same game, same probe: only the evidence changed.

| Category | Score before | Score after | Evidence before (v/o/i/n) | Evidence after (v/o/i/n) |
|---|---|---|---|---|
| core_gameplay | 83 | 85 | 2/0/4/0 | 3/0/4/0 |
| game_feel | 80 | 80 | 0/1/8/0 | 0/1/8/0 |
| controls | 76 | 80 | 2/0/3/0 | 3/0/3/0 |
| progression | 70 | 81 | 0/0/7/0 | 2/0/7/0 |
| difficulty | 70 | 75 | 0/0/5/0 | 4/0/5/0 |
| player_experience | 71 | 74 | 2/1/7/1 | 3/1/9/1 |
| replayability | 70 | 70 | 0/0/7/0 | 0/0/7/0 |
| technical | 92 | 92 | 3/0/2/1 | 5/0/3/1 |
| presentation | 81 | 83 | 1/1/6/0 | 2/1/6/0 |
| mobile | 95 | 95 | 6/0/3/1 | 6/0/3/1 |
| **overall** | 78 (low) | 81 (medium) | strong 0.29 | strong 0.39 |

v = verified, o = observed, i = inferred (source only), n = not tested. Categories with only inferred evidence are capped at 70; that cap is what lifted for progression and difficulty. Game feel, replayability and mobile got no new evidence from this pack.

## Not covered: needs a human or an iPhone

- Frame rate, heat and battery on a real iPhone (headless software WebGL runs at 1-2 fps; all timing here is game time).
- Touch feel: the bot drags the wheel with pointer events in an iPhone-sized viewport, not with a finger on glass.
- Whether the winch is fun and fair for a person: the bot reads the needle position exactly; simulations fix winch results at 1, 2 or 3 of 3.
- Raider combat (the Captain’s Log goal "Drive off a Rustfang raider"): not simulated.
- Travel time between places in the economy simulations (sites are teleported to); beach finds and treasure digs are not used as income.
- The first-voyage tutorial (Turtle Atoll, anchor, dig) beyond the money loop; tests/e2e/play.cjs covers it with teleports.
- Audio, music, readability and whether it is fun: judgements a player has to record.

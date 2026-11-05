# Gameplay feel and rendering polish (PR #25)

Two reports against the asset-modernization branch:

1. Boat turning felt choppy, glitchy or unnatural.
2. Strange white, glossy or washed-out surfaces appeared across the new models.

Both are fixed at the cause, without making steering sluggish, adding smoothing, or turning lighting, reflections or specular down globally. Before/after screenshots from identical cameras are in `screens/polish/`.

## 1. Choppy turning

### How it was investigated

`scripts/turn-check.mjs` (new; `npm run check:turn`, also in CI) drives the game's own `Game.update(dt)` with scripted stick input. It covers every vessel, with every upgrade fitted on the Ironwake, and five manoeuvres:

- a sharp turn and then the opposite turn;
- rapid left/right reversals;
- a sustained circle;
- a turn-around (stick pulled back);
- turning from a standstill under engine.

Each run uses three clocks: a steady 60 Hz, a steady 120 Hz (ProMotion iPhones), and an uneven phone-like clock (frame times of 11–33 ms). It records the heading, pitch, roll, camera yaw and camera position every frame. The same harness ran on `main` and on this branch.

### Findings

- **The new models are not the cause.** `main` and the branch produced identical trajectories, so the PR did not change steering. The issue is in the existing turning code and shows on all three boats.
- **No per-frame model work.** The ship is rebuilt only when an upgrade, cosmetic or crew change happens, or a lazy model arrives. Nothing is rebuilt or re-tinted per frame. Pivots, transforms, buoyancy, colliders and wake all key off the same `HULLS` and `waterline` values as before.
- **Draw calls while circling:** the same on both branches (skiff 126 vs 124, Ironwake 92 vs 92).
- **Shader compiles:** none mid-turn; no shader programs are created during a turn on either branch.
- **`update()` cost:** about 2 ms per frame on both branches.
- **Render-time spikes:** software GL (SwiftShader) spiked on both branches alike, so those spikes are rasterization noise, not an asset regression.

### Root cause 1: the boat was slaved to the camera's yaw one frame late

Steering is camera-relative: the stick is read against `camYaw`, and the heading is rate-limited toward that target. The follow camera swings `camYaw` round behind the boat, but that update ran inside `updateCamera()`, which comes after `updateSail()` in the frame.

While the stick is held, the heading lands on its target every frame (the target sits within the rate limit). So each frame the boat rotated by the previous frame's camera swing while the clock advanced by this frame's `dt`. On a steady clock that's invisible. On real frame times the boat's angular velocity zig-zagged against a smoothly turning camera.

Measured on the uneven clock during a steady circle: the camera turned at −0.58 rad/s while the boat stepped between −0.29 and −1.16 rad/s.

| Heading jerk, uneven clock (rad/s² per s) | `main` | fixed |
|---|---|---|
| Sharp turn: skiff / trimaran / Ironwake | 7.02 / 1.09 / 0.56 | 0.78 / 0.62 / 0.56 |
| Circle: skiff / trimaran / Ironwake | 17.1 / 16.7 / 16.4 | 0.39 / 0.33 / 0.30 |
| Turning under engine: skiff / trimaran / Ironwake | 25.6 / 24.3 / 21.0 | 0.30 / 0.27 / 0.25 |

**Fix:** `Game.followYaw(dt)` runs at the start of each frame, before steering, with the same follow rates and conditions as before. The steering and the camera now agree on the yaw for that frame. This adds no smoothing and no input latency. At a steady 60 Hz the heading trajectory is identical to `main` to three decimals, through hard turns and turn-arounds, on every boat.

### Root cause 2: pitch, roll and sail swing eased per frame, not per second

`rotation.x` and `rotation.z` (wave slope, plus the heel into a turn) moved 10 % of the way each frame, and the sails moved 5 % each frame. A dropped frame therefore moved them as little as a short one, so they stepped unevenly. On 120 Hz screens they ran twice as stiff, because 120 Hz roll jerk was about double the 60 Hz value.

**Fix:** time-based easing. The new rates are 6.32/s (exactly 10 %/frame at 60 fps) and 3.08/s (exactly 5 %/frame at 60 fps), so the 60 Hz feel is unchanged.

| Roll jerk: 60 Hz / 120 Hz / uneven | `main` | fixed |
|---|---|---|
| Skiff, rapid reversals | 2.17 / 4.73 / 5.14 | 2.16 / 2.40 / 2.29 |
| Trimaran, sharp turn | 0.33 / 0.71 / 1.59 | 0.33 / 0.44 / 0.45 |
| Ironwake, sharp turn | 0.37 / 0.74 / 1.12 | 0.36 / 0.43 / 0.46 |

On foot, the captain's walk had the same camera ordering, and `followYaw` fixes it too.

**Preserved:**

- turn rates, top speeds, acceleration and the turn-speed curve;
- buoyancy (wave sampling and slope), colliders and docking;
- wake and spray (they key off the boat's position and speed, which are unchanged);
- camera distance, pitch and position follow.

## 2. White, glossy surfaces

### How it was investigated

- **Material audit:** all five new GLBs. Base colours, roughness and metalness (0 / 0.75; lamps 0.3), emissive values, transparency, textures (none), and normals.
- **Area-weighted brightness:** of every model's vertex colours (`COLOR_0`), compared with the GITCRAFT kits already in the game.
- **In-game isolation:** the same Ironwake frame rendered with the rim light off, with the weathering pass off, and with both off.

### What it was not

- **Exporter PBR defaults:** the game never renders a GLB's own material. `sceneModel()`, `part()` and `model()` swap every mesh to the shared vertex-colour toon material (`vcMat`, `MeshToonMaterial`, no specular term) or, for emissive lamp faces only, to the unlit glow material. Roughness, metalness and specular in the files have no effect.
- **Environment maps:** none are used.
- **Normal maps:** there are none, and normals are rebuilt flat on merge, exactly like the code-built props.
- **Textures:** none are missing; these models are vertex-coloured.
- **Glow materials:** none are misclassified. Only the `Lamp` and `Red_glow` roles are emissive.
- **The hero rim light:** switching it off barely changes the frame.

### Root cause: pale palette roles on large surfaces, pushed white by the weathering pass

The models were built from the Waterworld palette's pale highlight roles, used on whole surfaces:

- Bleached Timber `#C9A97A`: palm trunks, pier planks, wood.
- Fog Grey `#9AA9B4`: a cold blue-white on driftwood, palms and planks.
- Concrete `#A7A196`: rocks, the arch, the pillars.
- Barnacle `#CFC6B0`: tide crusts.
- Steel `#7F8A94` and Corrugated `#8E918C`: the Ironwake's deck plates and wheelhouse.
- Faded Paint and Sailcloth.

Three things in the existing pipeline lift exactly those values:

- the toon ramp's top band (255);
- the world-space weathering shader's salt crust, which covers everything 0.5–2.6 m above the sea (the pier deck, the Ironwake's deck, rock feet);
- its sun-bleached tops (+0.11 on upward faces).

The result read as a white, plastic sheen. Turning weathering off in-game removed it, which confirmed the interaction. The code-built props they replaced, and the terrain, sit in the world's mid-tones: palm `#a39a88`/`#8c8373`, rock `#5d5650`, pier planks `#a2927a`/`#7d6a52`, sand `#9a8f78`.

Two pieces of geometry made it worse:

- **The tide-crust band on every rock:** a flattened Barnacle ellipsoid 2 % wider than the rock, lying on the sand. It read as a white puddle and z-fought the terrain.
- **Skull Rock:** it had a 3.4 m crust disc at ground level.

Share of model surface brighter than 0.6 luma (area-weighted):

| Model | Before | After | For reference |
|---|---|---|---|
| `tb_coast_kit` | 43.2 % | 1.8 % | atoll kit 15.9 % |
| `tb_landmark_kit` | 30.9 % | 8.3 % | outpost kit 14.0 % |
| `tb_finds_kit` | 16.0 % | 10.4 % | |
| `tb_ironwake` | 16.1 % | 15.3 % (hull and trim are recoloured by the paint cosmetic in-game; the deck plates darkened) | |
| `tb_fittings_kit` | 43.6 % | 37.0 % (mostly the `__a`/`__b` parts the game recolours per item) | |

### Fix (per role, per model; nothing global)

Each build script (`creative/3d-coast`, `creative/3d-finds`, `creative/3d-ironwake`) now carries a `WEATHERED` table. It overrides the pale roles with the drowned world's own mid-tones:

| Role | Was | Now | Used on |
|---|---|---|---|
| `wood` | `#C9A97A` | `#9A8466` aged, salt-worn timber | planks, palms, hut, wreck, crates, paddle, shovel |
| `fog` | `#9AA9B4` | `#8C8373` bleached driftwood | palm trunks, scrub, driftwood, pillars, gull wing edge |
| `concrete` | `#A7A196` | `#7E786C` | rocks, rubble, arch, pillars, Skull Rock jaw |
| `concrete_dk` | `#6E6A62` | `#5D5850` | rocks, plinths, slipway blocks |
| `barnacle` | `#CFC6B0` | `#A49A86` | Skull Rock, tide crusts, barnacles |
| `steel` | `#7F8A94` | `#66707A` weathered steel | Ironwake deck plates, fittings, rails, lamp heads |
| `corr` | `#8E918C` | `#737670` | corrugated sheet |
| `paint` | `#B9A882` | `#94876A` | faded paint, fronds, stencils |
| `cloth` | `#EFE2C4` | `#C9BB9C` yellowed sailcloth and paper | Skull Rock teeth, wreck sail rags, the bottle's letter |
| `sand` | (Faded Paint) | `#9A8F78` the terrain's sand | dig mound |
| `plaster` (new) | — | `#A39A86` | the lighthouse's pale bands, matching the code-built `#a8a08c`, so it still reads as a striped light |

Geometry changes:

- **Rocks:** the modelled crust band is removed. Even tucked inside to 0.97× the radius, it stood proud of each rock's narrower base as a pale shelf; the screenshots of the spring showed this. The weathering pass already paints the tide line, an algae stain below and salt above, on every surface in world space.
- **Skull Rock:** the ground-level crust disc is removed.

Left alone on purpose:

- **Saturated roles** (rust, oxide, tarp, hazard, signal red, bronze, kelp, the living greens) keep their colours.
- **Painted ship surfaces** stay rich: the paint cosmetic still recolours `TBI_Paint` and `TBI_Trim`.
- **Lighting:** the lamp and glow roles are unchanged, so pier lamps, the lighthouse lamp and the Ironwake's nav lights still glow at night.
- **Other surfaces:** water reflections, the ocean shaders, underwater fog, the weathering shader, the toon ramp, the rim light and the outlines are all untouched.

## Affected models (all re-exported, re-validated, re-registered)

| Model | Materials changed (TB* = `<prefix>_<Role>`) |
|---|---|
| `tb_coast_kit` | `TBC_Wood`, `TBC_Fog`, `TBC_Concrete`, `TBC_Concrete_dk`, `TBC_Barnacle`, `TBC_Steel`, `TBC_Corr`, `TBC_Paint`, `TBC_Cloth`; crust band removed from `rock_a`, `rock_b`, `rock_d` |
| `tb_landmark_kit` | the same, plus `TBC_Plaster` (lighthouse bands); Skull Rock's ground disc and the crust bands on the spring, arch and lighthouse-plinth stones removed (8,856 → 8,676 tris) |
| `tb_finds_kit` | `TBF_Wood`, `TBF_Fog`, `TBF_Concrete_dk`, `TBF_Barnacle`, `TBF_Steel`, `TBF_Paint`, `TBF_Cloth`, `TBF_Sand` |
| `tb_fittings_kit` | `TBF_Wood`, `TBF_Steel`, `TBF_Concrete_dk` |
| `tb_ironwake` | `TBI_Steel`, `TBI_Corr`, `TBI_Wood` (`TBI_Paint` and `TBI_Trim` stay cosmetic-tinted) |

Code changes: `src/game/game.ts` (`followYaw`; time-based pitch, roll and sail easing). There are no asset-loading changes. The 31-step e2e run, the model tests and the Ironwake tint-material test still apply unchanged.

## Validation (this round)

| Check | Result |
|---|---|
| `npm test` | 298/298 pass |
| `npm run build` | pass |
| e2e `tests/e2e/play.cjs` (mobile Chromium, built game) | 31/31 pass. One earlier run failed "SALVAGE appears beside the Sunken Tower" while a Blender export ran on the same 4 CPUs: that step waits 1.2 s of wall time for the action bar, and the software renderer was starved. On an idle machine it passes. |
| Wake visual check `npm run check:visual` | PASS: 0–1.3 % of wake puffs over the hull (limit 8 %), every vessel, from behind and the side |
| Turn check `npm run check:turn` (new, also in CI) | PASS on this branch. The same script on `main` FAILS 29 checks across all three boats: heading jerk up to 25.6 on the uneven clock, and roll that depends on the frame rate. |
| MeshCraft `validate_asset`, Khronos glTF-Validator, `engine_check` | 0 failures, 0 errors, ok, on all 5 re-exported models |
| Rendering cost (`renderer.info`, Chromium iPhone 13 profile, circling) | draw calls skiff 126 vs 124, Ironwake 92 vs 92 (`main` vs branch); no shader programs compiled mid-turn; `update()` about 2 ms per frame on both |
| Before/after | `screens/polish/*.jpg`: 23 identical cameras, each as `main` (code-built) / PR #25 v1 / polished. Covers every boat, the Ironwake with all upgrades at noon, dusk, night, side, top, deck and under sail; the eight landmarks; Driftholm by day and night; the pier close-up; the finds stage. |

**Device performance:** these numbers come from headless Chromium with software GL, which renders at about 2 fps, so render times are not meaningful. No physical iPhone was available to this session. The fresh preview link on the PR is the place to feel the turning and check frame rate on a real phone.

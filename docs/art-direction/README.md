# Art-direction refinement: stylized, not cartoon-outlined

The rules for future assets are in **[STYLE-GUIDE.md](STYLE-GUIDE.md)**. The numbers the renderer reads are in
**`src/world/style.ts`**.

## What was on screen before

There was no screen-space outline shader. The heavy-line look came from three places:

| Source | Where | Effect |
|---|---|---|
| Inverted-hull ink outline, `#0e2233`, 1.2–3.5 cm | `src/world/hero.ts`, applied in `game.ts` to the player's boat, every crew member and the captain | A navy line around every mast, rope, gunwale, crate and limb: the "sticker" look |
| Hard 4-band light ramp, shadow step at 23 % of the sun | `toonGradient()` in `src/world/materials.ts` (every toon surface) | Every terminator on buildings and props became a dark contour band |
| Near-black colours | the tide-line algae in `weather()` (0.09, 0.12, 0.09); kit windows and trims `TBD_Navy`/`TBW_Navy #06182e` | A black line along every waterline; window holes reading as black stickers |

### Merged with PR #56 (visual cohesion)

PR #56 landed on `main` while this pass was in review. It added **world ink**: the same navy inverted-hull line on
every settlement batch, drowned structure and the harbour (`inkWorld` in `hero.ts`, distance-scaled to ~1 px). That
is a universal outline, which this direction rules out, so it is now **off** (`OUTLINE.world = 0`; the function stays,
gated, if a specific case ever earns it). Everything else from #56 is kept: the salvage-architecture dwellings
(`shanty.ts`), the shared sun/shade light grade, and the painted sea. The shanty dwellings now replace the kit shacks
in Driftholm, so they are form-shaded too, each house as one unit from its water or ground line up.

## What changed

1. **Style spec as code**, `src/world/style.ts`: outline policy (`OUTLINE`, all 0), the light ramp, wear limits, a
   world palette, and form-shading parameters plus a rollout list (`FORM_SHADED`, `FORM_SHADED_CHARACTERS`).
2. **No ink on heroes** (`hero.ts`). The boat, crew and captain keep the sunward rim light, whose noon base is now a
   little stronger, and gain a soft shadow-side edge falloff (≤ 12 %, a few pixels wide), so they turn away from the
   light instead of ending in a line. The outline code stays as an opt-in last resort, capped at 1.2 cm and a sea tone.
3. **Soft, lifted light ramp** (6 steps, linear, floor 31 %, was 4 hard bands with a 23 % floor). Flat-shaded
   low-poly faces still read as facets, but shading falls off like sun.
4. **Matte wear, never black.** Grime floor 0.42 → 0.58, and the tide-line algae is a dark sea-green.
5. **Baked form shading** (`formShade()` in `src/world/assets.ts`): ambient occlusion written into vertex colours once
   at load. Contact shadow at the base, darker under overhangs, a light lift on top faces, and near-black openings
   raised to a desaturated navy. It adds no draw calls, vertices or shader cost. Applied as the representative set:
   - **Character:** the captain, with the gentler `CHARACTER_FORM` (grounded boots, lighter head and shoulders). The
     six crew and Driftholm's three shopkeeper models share the code path.
   - **Building:** Driftholm's salvage dwellings (`shanty.ts`: shops, stilt houses, hillside homes) and the kit
     buildings still in use (`mod_shack`, `mod_market`, `container_home`, `water_tank`).
   - **Props:** barrel, cargo crate, bollard, pier lamp, pier section, fence panel, market stall, rain catcher.

**Untouched:** gameplay, interactions, camera, HUD and controls, and every model file (no asset was replaced). The
change is cheaper to render, not dearer: each hero mesh used to carry a second outline mesh, and those are gone.

## Verification

- Before = `main` after #56 (hero ink plus world ink); after = this branch. Before/after at actual mobile gameplay scale: iPhone 13 portrait (390×844 @2x), headless Chromium with SwiftShader
  (software GL, not a real device). The same camera poses were used for both. Screens are in `screens/`
  (left = before, right = after):
  - `1-harbor-noon`: sailing out of Driftholm, default gameplay camera
  - `2-boat-close`: the skiff and its captain, close
  - `3-harbor-dusk`: same as 1 at sunset
  - `4-town-onfoot`: the captain on foot by the shops, default on-foot camera
  - `5-captain-close`: the captain, close
  - `6-town-dusk`: same as 4 at sunset
- `tests/style.test.ts` enforces the policy: hero outline widths are 0, any opt-in line is ≤ 1.2 cm and not black,
  the ramp floor is ≥ 70/255 and monotonic, wear is off black, and `formShade` darkens the base, keeps the vertex
  count and lifts black.
- `npm test`, `npm run build`, and CI's end-to-end, wake visual and turn checks.

## Assets that still deviate (next passes, in priority order)

1. **The raider character and raider skiff** (`tb_raider`, `tb_raider_skiff`): not form-shaded yet. Add them to the
   lists next. They are the main non-player characters out at sea.
2. **Loud primaries in the kits:** `TBD_Tarp #2f6fb0`, `TBD_Red #c8352a`, `TBD_Hazard #f2b825` (settlement, atoll and
   outpost kits). They are still saturated after `weather()`. Retint them toward `WORLD_PALETTE` (weatheredCoral,
   dustyTeal, agedBrass) with `tintModel` or a MeshCraft re-export.
3. **Near-black trims across the other kits** (`*_Navy`, `*_Gun`, `TBW_Net #2c3430`): towers, oil rig, wrecks and
   raiders. Add their nodes to `FORM_SHADED`, starting with landmarks and points of interest.
4. **Gulls** (`sky.ts`, `#2c2a27`/`#3a3732`): near-black silhouettes against the sky. Use a warm grey with a lighter
   underside.
5. **Procedural fallbacks** (`props.ts`: box people, crates, barrels, huts) are only drawn if a kit fails to load. They
   follow the ramp and wear rules automatically. Leave them as they are.

# TIDEBREAKERS: Drowned World. Production report

**What changed:** TIDEBREAKERS was a sunny pirate treasure hunt across five islands. It is now a 3D survival adventure on a drowned Earth. The architecture is unchanged: the same Vite + three.js engine, toon pipeline and heightfield, and the same data-driven design. On top of it sit a new ocean, sky and weather; drowned cities, an oil-rig market and a tanker graveyard; a boat that grows from a patchwork skiff into a twin-hull expedition cat; salvage, survival, crafting, settlements, crew and raiders. Everything from the first release still works.

## 1. Pull requests (stacked, review in order)

| PR | Branch | Contents |
|---|---|---|
| 1 · P0 | `claude/drowned-world-p0-gitcraft` | Audit and plan, palette, MeshCraft/ForgeCraft 3D kit, VectorCraft icons. `creative/` and `docs/` only. |
| 2 · P1–P5 | `claude/drowned-world-p1-p5-game` | The game: world, ocean, weather, boat, salvage, survival, settlements, crew, UI, audio, save v2, tests. |
| 3 · P6 | `claude/drowned-world-p6-review` | This report, gallery, before/after, reel, review pack, perf data, GITCRAFT audit log. |

Rollback: each PR is a separate merge, and `main` stays deployable. Saves migrate forward (v1 → v2) under the same localStorage key. If `main` is restored, a v2 save still loads (its loader shallow-merges and ignores unknown fields), **with one exception:** a save that is currently aboard the Ironwake. `main` doesn't know that vessel id and would fail to build the boat. Re-deploying this branch fixes that, as does Settings → "Start a new voyage".

## 2. Completed by milestone

**P1 · World.**
- **Ocean:** Gerstner ocean (4 waves, CPU/GPU parity for floating), depth colour from turquoise shelf to abyss, sky and sun reflection, near-camera glitter, subsurface glow on crests, crest/storm foam, a live V-wake trail, and surf around every drowned structure (baked, zero extra draw calls).
- **Day and weather:** an 8-minute day/night cycle with golden-hour and coral sunsets, moon and stars. Three drifting storm cells bring rain, lightning bolts and thunder. The permanent **Stormwall** cloud ring marks the edge of the world.
- **Horizon and scale:** drowned-city skylines replace the old mountains. The world grew from 1300 m to 2400 m across 3 regions.
- **Places:**
  - Old Meridian: 8 towers.
  - Rig Helios.
  - Rustfang Graveyard: the tanker plus containers.
  - The Box Yard.
  - The Sunken Tower.
  - Rooftop Hollow: raft modules on an apartment roof.
  - Driftholm raft districts.
  - The 160 m Meridian Spire.
- Floating debris, and beacon buoys on every salvage site.

**P2 · Boat.**
- **Vessels:** 3 classes: Patchwork Skiff, Scrap Trimaran with outrigger floats, and the Ironwake twin-hull cat.
- **Upgrades:** 13 slots, 19 upgrades. Each one is a visible MeshCraft model on a socket that scales with the vessel: outboard / twin diesel, radar mast, salvage crane, harpoon turret, solar array, deck turbine (spinning), container cabin with roof garden, fuel drums, spotlight and string lights (a real point light at night), trolling rods, armour plates and nav console.
- **Hull and cosmetics:** scrap-patchwork plating; new paints (Hazard, Rust, Stormbreaker), sails (Tarp Patchwork, Old Billboard) and a flag (Helios). Crew ride on deck.

**P3 · Exploration and salvage.**
- **Salvage sites:** 10 sites with difficulty, heavy-lift gating, respawn timers, loot tables and first-haul story finds. Hauling is a **winch mini-game**: tap when the needle is in the green, 3 pulls, and gear plus crew widen the window.
- **Discovery:** drifting supply caches, 2 castaways, a radar minimap (lookout or radar), a world chart with every feature, and named-place arrival banners.
- **Catalog:** 13 new old-world relics (36 entries in total) and 10 materials.

**P4 · Survival and progression.**
- **Engine and fuel:** a wind-independent engine that burns fuel. Fuel cans and refining, solar/turbine regen, and per-settlement fuel prices.
- **Hull:** integrity with collision, storm and Stormwall damage, armour reduction, patch kits and repairs. Swamping tows you home and costs half your common cargo.
- **Crafting:** 6 workbench recipes.
- **Raiders:** Rustfang skiffs patrol 2 zones, chase, ram and steal. The harpoon drives them off.
- **Captain's Log:** a 10-goal chain after the first voyage that always names the next unlock, plus 4 new milestones.

**P5 · Settlements and crew.**
- **Settlements:** Driftholm (home and vault), Rooftop Hollow and Rig Helios, each with its own traders, shipwright stock (some upgrades are only sold at Helios or Hollow), fuel price, repairs, workbench and crew board.
- **Crew:** six recruitable survivors with always-on perks:
  - Mechanic: −35% fuel use and repairs at sea.
  - Navigator: +10% sail and a waypoint to the next site.
  - Salvager: +1 roll and a wider window.
  - Fisher: passive Silverfin catch.
  - Lookout: storm and raider warnings, plus more caches.
  - Defender: shorter raider chase range and faster harpoon reloads.

**P6 · Polish.**
- **Audio (procedural):** engine drone, rain, thunder, wind in the rigging, hull slaps, winch, harpoon, raider horn, and new music modes per region.
- **Look:** salvage/stencil UI re-theme, the captain restyled as a survivor, and loading, title and onboarding copy rewritten.

## 3. GITCRAFT usage (what actually ran)

There are **827 logged calls** in `creative/drowned-review/gitcraft_audit.jsonl`, GITCRAFT's own audit log with the hashes of every file touched.

| Tool | Calls | Used for | Output in repo |
|---|---|---|---|
| **MeshCraft** | 73 | `run_script` with a project modelling script → `render_preview` → `export_asset` (three-web-toon + LODs + collision) → `validate_asset` (incl. Khronos) → `engine_check` (three@0.170 with the game toon material), for 11 assets | `creative/3d-drowned/*` → `public/models/*.glb` |
| **ForgeCraft** | 7 | `route` + `generate` ×6: crew characters via the MeshCraft `deckhand` template (Mixamo-named rig, 4 clips), library versions with licence/provenance, hash-verified hand-off | `creative/3d-drowned/crew_*` → `public/models/tb_crew_*.glb` |
| **VectorCraft** | 206 | 23 item icons (`draw_path`, `draw_shape`, native save, SVG/PNG export) | `creative/ui-drowned` → `src/ui/iconsDrowned.ts` (generated) |
| **PhotoCraft** | 111 | 6 labelled before/after composites (layered PSD + PNG) | `creative/drowned-review/before-after` |
| **DesignCraft** | 260 | 3-page review board (gallery, boat progression, before/after) | `creative/drowned-review/board` |
| **FilmCraft** | 166 | 31 s portrait gallery reel with Ken Burns and dissolves (H.264) | `creative/drowned-review/reel` |
| **PdfCraft** | 4 | Review pack: board + before/after + asset previews (17 pages) | `creative/drowned-review/TIDEBREAKERS_Drowned_World_review_pack.pdf` |
| LightCraft, EffectCraft | 0 | Not needed: the look is real-time in-engine; no photo batch or motion graphics | n/a |
| TripoSR, Hunyuan3D, Meshroom | 0 | **Unavailable here** (no GPU, huggingface.co blocked, Meshroom not installed); not needed, since every model is procedural from the palette | n/a |

**Failures logged:**
- 6 `run_pipeline` calls failed because my client sent the brief unwrapped. I re-ran them through ForgeCraft `generate`, which succeeded.
- One chain failed on a script bug (complex number in the tanker hull taper). It was fixed and re-run.

**GITCRAFT gaps found (not fixed here; GITCRAFT is a separate repo):**
1. ForgeCraft's free-text router sends "crew member … for a boat game" to the **boat** template because of the keyword "boat". An explicit `template` was required.
2. `run_script` builds don't enter the 3D library or job store; only template, import and Blockbench builds do.
3. In a multi-repo cloud session, the user-scope MCP registration only takes effect after a reconnect. I drove the servers over the same stdio protocol the Control Room uses (`~/.gitcraft/runtime/scripts/mcp.sh`), so the guard, sandbox and audit applied unchanged.

## 4. Generated and integrated assets

| Asset | Source | Integrated as | Size |
|---|---|---|---|
| Drowned office tower, apartment block, broadcast spire (also the Meridian Spire ×2.4), collapsed tower | MeshCraft | `src/world/drowned.ts` structures | 35–112 KB each |
| Rig Helios oil platform (flare flickers, dock socket) | MeshCraft | structure + settlement | 161 KB |
| Shipping containers ×4 colours (bob and roll) | MeshCraft | Box Yard, graveyard | 98 KB |
| Tanker wreck *Meridian Star* | MeshCraft | graveyard landmark + salvage | 44 KB |
| Raft-town kit: shack, market, turbine (spinning rotor), water still, walkway | MeshCraft | Driftholm, Rooftop Hollow, Helios dock | 229 KB |
| Boat kit: 16 upgrade parts | MeshCraft | `src/ship/shipModel.ts` sockets (static parts merged) | 274 KB |
| Rustfang raider skiff | MeshCraft | `src/game/raiders.ts` | 36 KB |
| Debris kit: cache crate, beacon buoy, debris patch, oil drum, castaway raft | MeshCraft | caches, site markers, flotsam, castaways | 78 KB |
| Crew ×6 (rigged, Idle/Walk/Interact/Attack) | ForgeCraft → MeshCraft | on deck, Idle playing (streamed after the title screen) | 227–242 KB each |
| 23 item icons | VectorCraft | `src/ui/iconsDrowned.ts` | inline SVG |

Total models: 2.6 MB uncompressed, 1.3 MB of it crew (lazy-loaded). Every model has a procedural fallback.

## 5. Gallery and before/after

In-game captures at the iPhone viewport (390×844), from the real build:
- `creative/drowned-review/screens/after/*.png`
- `creative/drowned-review/board/board_p{1,2,3}.png`: world, boat progression, before/after
- `creative/drowned-review/before-after/*.png`: title, Driftholm, first landmark, Rooftop Hollow, full boat, golden hour
- `creative/drowned-review/reel/drowned_world_reel_1080x2340.mp4`
- `creative/drowned-review/TIDEBREAKERS_Drowned_World_review_pack.pdf`
- MeshCraft Cycles previews and three.js engine renders: `creative/3d-drowned/*/previews`, `*/engine`

## 6. Tests

| Suite | Result |
|---|---|
| `npm run build` (tsc strict + vite) | pass |
| `npm test` (Vitest): data integrity (every loot/recipe/upgrade/crew/goal reference, world layout, icons), save migration v1 → v2, derived stats, Captain's Log, models (every GLB is glTF 2.0, has COLOR_0 and every node the code asks for; crew rigged with Idle) | **207/207** |
| `tests/e2e/play.cjs` (real build, mobile Chromium): boot with all models; first-voyage steering; salvage haul via the winch; Captain's Log advance; engine burns fuel; dock at Rig Helios; Helios-only stock; milestone flag; rescue a castaway; crew rendered on deck; storm damage; raiders vs harpoon; workbench; save survives reload; no runtime errors | **17/17** |
| MeshCraft validation (11 assets) | 0 failures; Khronos glTF-Validator clean; engine check ok with the game toon material |

## 7. Performance findings

Measured in headless Chromium (SwiftShader software GL at the iPhone viewport, so FPS there is not meaningful). Draw calls and triangles are the device-independent proxies.

| View | main | Drowned World |
|---|---|---|
| Start at the harbour | 52 calls · 365k tris | 82 calls · 336k tris |
| Open sea / sunset | n/a | 27 calls · 274k tris |
| Old Meridian (8 towers) | n/a | 55 calls · 151k tris |
| Rooftop Hollow | n/a | 40 calls · 393k tris |
| Fully upgraded Ironwake + 6 crew | n/a | **91 calls** (was 158 before merging the boat kit and skinned crew primitives) |
| JS bundle (gzip) | 188 KB | 249 KB |
| Load to title (local) | n/a | ~3.2 s with all world models |

Optimisations:
- Every GLB node is flattened to one vertex-coloured geometry on load.
- The boat kit's static parts merge into one mesh plus one glow mesh.
- Each crew character's 8 skinned primitives merge into one.
- Structure surf is baked into the ocean depth texture.
- Crew models load after the title screen.
- The ocean grid is denser near the camera and stretched toward the horizon.

**Not yet measured on a physical iPhone.** That is the first item below.

## 8. Remaining work, prioritized

1. **On-device profiling (iPhone Safari).** Measure FPS in Old Meridian, in a storm and at night. If needed: drop ocean segments to 180 on low-end GPUs, cap DPR at 1.5, and add an LOD switch using MeshCraft's `lod50`/`lod25` exports (already in `creative/3d-drowned/*/exports`).
2. **Compress models.** Meshopt/Draco would roughly halve the 2.6 MB. Needs a decoder; deferred to keep zero new runtime dependencies.
3. **Crew interactions:** walk/interact clips during salvage (clips are already exported), crew chatter, and dismissed crew waiting on the board (they currently return via the home board only).
4. **Diving / underwater salvage view:** the depth texture and `audio.setUnderwater` are ready.
5. **More settlements and traveling merchants:** a moving trader raft using the settlement kit.
6. **Raider escalation:** boarding events, raider bases and a bounty board. Defender crew could man the turret visibly.
7. **The Last Summit:** the endgame region beyond the chart, plus the `summit_chart` payoff.
8. **Integrate the v1 pilot assets** (GLB chests, lantern, Biscuit): the HANDOFF in `creative/3d` still applies.
9. **GITCRAFT fixes:** the router keyword bug, and library records for `run_script` builds.

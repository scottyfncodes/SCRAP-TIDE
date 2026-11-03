# TIDEBREAKERS: grimy post-apocalyptic art-direction pass

**North star:** surviving at the ragged edge of a drowned civilization. Every object has a history, every structure has been
repaired ten times, and the ocean is beautiful but threatening.

## 1. Audit: what I found before changing anything

The game loop was already rich (salvage winch, fuel, hull, storms, raiders, crew, settlements, Captain's Log), so this pass
keeps every system and changes how the world looks, sounds and reads.

| Area | Finding |
|---|---|
| Look | Sunny storybook: turquoise water, bright green palms, white foam, pastel houses, a straw-hatted captain in a striped shirt, Nunito type and glossy yellow pill buttons. The direction promised in the brief was missing. |
| Materials | Everything was flat vertex colour through one 4-band toon ramp. No grime, rust, tide lines or variation, so the world read as plastic. |
| **Defect** | Title wordmark clipped off both edges at 390 px wide (iPhone 12–15). |
| **Defect** | Portrait: long action labels ("SALVAGE THE SUNKEN TOWER") ran under the steering wheel and ENGINE button. |
| **Defect** | Landscape: the radar sat on top of the wind readout, and the wheel overlapped both. |
| **Defect** | The speed readout was labelled "WIND", so the number read as wind speed. |
| Feedback | Hull strikes gave only a toast, with no flash, shake or impact sound. |
| Audio | Procedural and decent, but gulls every 6–18 s made it cheerful. Nothing said "ruined world": no groaning steel, no bells, no low wind. |
| Perf | 75 pre-existing debris patches and drums were animated and drawn at any distance. |

## 2. What changed

### Art direction and rendering (`src/world/*`)
- **Weathering shader** (`materials.ts` `weather()`): one world-space pass on every toon material (world, boat, props,
  sails, flags, crew at reduced strength). It grades colours toward a sun-bleached, warm-grey base and adds blotchy oily
  grime, vertical rust streaks on neutral (metal) surfaces, an algae-black tide line with a bone-white salt crust just
  above it, and bleached tops. It costs three value-noise samples per fragment, with no textures and no extra draw calls.
- **Contrast ramp:** a deeper shadow band (58/118/196/255) for harder, weathered light.
- **Sky and light** (`atmosphere.ts`, `sky.ts`):
  - Days are storm-grey overcast over a dirty-teal haze, dawns are sour amber, sunsets rust and burnt sienna, and nights
    oil-black under a cold moon.
  - Permanent sea haze (fog 150–860 m, tighter in storms).
  - A low, heavy cloud ceiling with sooty bellies.
  - Soot-dark scavenger birds.
  - The horizon became a ruined industrial skyline: drowned towers (some snapped and leaning), offshore rigs, listing cargo
    hulls under gantry cranes, smokestacks, and **gas flares still burning** that flicker brighter at night.
- **Ocean** (`ocean.ts`):
  - Depth runs from silted shallows through dirty teal to oil-black abyss, with churned silt in the shallows.
  - **Drifting oil slicks** flatten the chop and shimmer with a muted thin-film sheen.
  - Foam is bone-coloured salt scum, never white.
  - **Spindrift streaks** are blown along the wind and thicken in a blow.
  - Caustics are dimmed and the sky reflection is pulled back, so the water reads deep rather than milky.
- **Islands and dressing:** oily grey sand, tar smears at the tide line, dead khaki scrub, sickly olive palms, scorched
  rust-bleed patches over buried junk, and faded industrial house and awning colours.
- **Captain:** an oilskin-and-canvas survivor in a battered dark hat with brass goggles.
- **Sails:** every sail texture gets mildew blotches, dried tide rings, rust drips from the grommets and a soot-dark foot.

### GITCRAFT 3D (MeshCraft): see `creative/3d-drowned/README.md`
- **New assets** (MeshCraft `run_script` → `render_preview` → `export_asset` → `validate_asset` → `engine_check`):
  - `tb_trawler_wreck`: a fishing trawler down by the stern, listing, nets hanging from the A-frame.
  - `tb_port_crane`: a buckled harbour gantry crane, its snapped boom trailing into the sea.
  - `tb_flotsam_kit`: barrel raft, ghost net, bell buoy and capsized hull.
- **Weathering pass on 14 kits** (`scripts/weather_pass.py`): crevice grime, edge wear, rust chips and downward rust bleed
  are baked into each model's vertex colours. The pass runs in MeshCraft against each source `.blend` and is saved back.
  Lit windows, lamps and flares are left untouched.
- **Results:** all 14 exports pass validation with **0 failures**, Khronos included, and all 14 load in three@0.170 with
  the game's toon material. The engine check's `engine_base_on_ground` item is red on 13 of the 14. That is expected:
  these assets are built around a waterline origin, sit below y=0 by design, and have contracts that say
  `ground: false`. The previous pass's raider skiff log shows the same result.
- **Placement** (`data/world.ts`, `world/drowned.ts`): 5 trawler wrecks and 3 cranes as navigation landmarks between
  regions, 46 pieces of flotsam in open water, and 7 bell buoys marking the way into each region.

### Interface (`src/ui/styles.css`, `ui.ts`, `index.html`)
- **Type system:** stencil (Saira Stencil One) for names, condensed grotesk (Barlow Condensed) for labels, Barlow for body
  text, and mono (Share Tech Mono) for instrument readouts.
- **HUD:** matte gunmetal plates with a coloured edge, segmented fuel and hull gauges, a phosphor radar with scanlines and
  crosshairs, a scrap-steel wheel with a rust-scabbed rim and a brass hub, and a speed/wind instrument with a labelled
  state (good / fair / into the wind / under power).
- **Actions:** stamped hazard-yellow plates with chamfered corners and a hazard-stripe edge, plus press-down feedback.
  Secondary actions are steel.
- **Panels:** salt-stained manifest paper under a steel header strip with a hazard rule. Rows, cells and NPC cards are
  flattened into ledger entries.
- **Lens grime:** a static vignette and grain over the scene, with no blend modes, which keeps it cheap on iOS.
- **Title and loading:** a bone stencil wordmark that fits every width, a hazard rule, and a "Year 61 · After the Water"
  kicker.
- **Fixed defects:** the title no longer overflows; the actions column is width-capped so it can't run under the wheel; and
  the landscape layout moves the radar to the right, puts the menu in one row and resizes the wheel and actions. Checked at
  375×667, 390×844, 430×932 and 844×390.

### Gameplay
- **Flotsam scavenging:** ease through a barrel raft, ghost net or capsized hull below 4.5 kn to pick it over for rope,
  scrap, crude, wood, nails, canvas or fish. Go too fast and the crew can't hook anything. Each piece refills after
  4 minutes. This makes the stretches between landmarks worth steering through, without adding a new system.
- **Hull-strike feedback:** a red edge flash, camera shake that scales with the damage, a steel-on-steel crunch and haptics.
  The HUD pulses red while the hull is critical.
- **Readability:** the speed readout is now labelled correctly as speed.

### Audio (`src/audio/audio.ts`)
- **Low howl:** a gusting moan of wind over open water, never quite silent.
- **Groaning steel:** distant drowned structures settle with long resonant groans, panned and more frequent among the
  wrecks.
- **Bell buoys:** they toll in the swell when you're within 160 m, faster in a storm.
- **Hull strikes:** a crunch and a clang, followed by the hull creaking.
- **Gulls:** now every 18–42 s and lower pitched, so they sound lonely rather than cheerful.

## 3. Verification

| Check | Result |
|---|---|
| `npm run build` (tsc strict + vite) | pass |
| `npm test` (Vitest: data, save migration, models incl. the 3 new GLBs and their nodes) | **210/210** |
| `tests/e2e/play.cjs` on the production build, mobile Chromium (390×844, touch). 3 new checks: salvage-pass landmarks placed; slow sailing through flotsam picks it over; a hull strike costs hull and flashes the HUD | **20/20**, no runtime errors |
| MeshCraft `validate_asset` (14 kits) | 0 failures |
| MeshCraft `engine_check` (14 kits, three@0.170, game toon material) | loads, vertex colours present; `engine_base_on_ground` is expected (waterline origin) |
| Viewports: 375×667 (SE), 390×844 (15), 430×932 (Pro Max), 844×390 (landscape) | no HUD collisions or overflow; screenshots in `screens/` |

### Performance (headless Chromium, SwiftShader, same script on `main` and this branch)

Draw calls (triangles barely changed):

| View | main portrait | this branch portrait | main landscape | this branch landscape |
|---|---|---|---|---|
| Harbour | 25 | 28 | 47 | 57 |
| Open sea | 25 | 42 | 79 | ~104 |
| Old Meridian | 34 | 46 | 80 | 75 |
| Rustfang graveyard | 47 | 44 | 52 | 58 |

The increase comes from the added wrecks, cranes, flotsam and buoys. To keep it down:
- Flotsam casts no shadows.
- Flotsam, bell buoys and the pre-existing debris (previously drawn at any distance) hide and stop animating beyond
  340–520 m, where the haze swallows them anyway.
- The cloud count dropped back to 20.

Model payload rose by about 335 KB (3 new GLBs); total JS gzip is about 256 KB.

GITCRAFT audit trail: `gitcraft_audit.jsonl` (82 MeshCraft calls, each with the hashes of every file it touched).
- 79 calls succeeded.
- 3 were sandbox refusals at the start: the palette path sat outside the root, and setting the root to the repo fixed it.

## 4. Remaining limitations (honest)
1. **No physical iPhone measurement.** FPS can't be measured in headless SwiftShader. The weathering shader adds about
   three noise lookups per toon fragment. If an older iPhone drops frames, the first levers are a DPR cap of 1.5 and a
   `weather(…, 0)` low-quality path.
2. **Crew GLBs weren't re-baked.** They are ForgeCraft hand-offs, so they get only the runtime weathering, at reduced
   strength.
3. **The crane silhouette** reads well at distance, but up close its buckled legs look simple.
4. **GITCRAFT gaps:**
   - The MCP servers registered mid-session don't attach until `/mcp`. I drove them over the same stdio protocol through
     `~/.gitcraft/runtime/scripts/mcp.sh`, so the guard, sandbox and audit log all applied.
   - `run_script` builds still don't enter the 3D library.
5. **Not used:** TripoSR, Hunyuan3D and Meshroom (no GPU, and huggingface.co isn't reachable). PhotoCraft, DesignCraft and
   FilmCraft weren't needed, because every look change in this pass is real-time and in-engine; the before/after
   composites are plain image montages.
6. **Production deployment is not verified here.** Vercel deploys after merge; check https://tidebreakers.vercel.app/
   once it's live.

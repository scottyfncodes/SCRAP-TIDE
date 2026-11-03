# TIDEBREAKERS: Drowned World. P0 audit, GITCRAFT tool map and plan

## 1. Architecture audit (main @ 9db1f3f)

| Area | What exists | Decision |
|---|---|---|
| Engine | Vite + TypeScript + three@0.170, static build, Vercel. One `Game` class drives a fixed-dt loop (`src/game/game.ts`). | **Keep.** All new systems plug into the same loop. |
| Rendering | Vertex-coloured `MeshToonMaterial` (4-band gradient), merged geometry per prop group, one directional light with a 40 m shadow box following the player, hemisphere fill, linear fog. | **Keep the toon pipeline.** GITCRAFT models are exported with `COLOR_0` so they render with the same material. |
| Water | Custom shader on a 1500 m grid: 3 sine waves, depth texture (384²) from the heightfield, shore and reef foam. CPU `sample()` mirrors the GPU waves for floating. | **Rebuild** as Gerstner swell (CPU parity kept), plus storm, night, wake trail and reflections. |
| World | Heightfield (`terrain.ts`) is the single source of truth for land, depth, collision and walking. Five islands, data-driven (`data/world.ts`). | **Keep and extend.** Islands stay (the last high ground); drowned structures, settlements, salvage sites and hazards are added as data. |
| Boat | Procedural lofted hull, modular parts per upgrade (`ship/shipModel.ts`), 2 vessels, 5 upgrade slots, cosmetics, trophies. | **Keep the builder;** add a third vessel (catamaran), 13 slots, MeshCraft kit parts on sockets, crew on deck. |
| Gameplay | First-voyage tutorial (12 steps), anchoring, going ashore, digging, treasure maps, catalog (23 entries), milestones, harbour merchants. | **Preserve everything.** New loop is layered on top: salvage → craft → upgrade → explore further. |
| Save | localStorage v1 + backup slot + shallow-merge migration. | **Bump to v2** with forward migration (tested). |
| Audio | Procedural WebAudio (no files). | **Extend:** engine, rain, thunder, rigging, winch, harpoon, hull slaps, new music modes. |
| UI | DOM HUD + bottom sheets, touch wheel joystick, iPhone safe areas. | **Keep;** re-theme and add gauges, radar, winch mini-game, settlement hubs, workbench, crew board. |

**Gaps found:** no automated tests; the v1 GITCRAFT pilot assets (chests, lantern, crab, etc.) were never integrated; the "world" ended at 1300 m with mountain silhouettes.

## 2. GITCRAFT audit (scottyfncodes/GITCRAFT @ e8835f3)

Installed with `scripts/install.sh`. This session holds several repos, so the SessionStart hook did not run. Every tool runs behind the guard and Landlock sandbox, rooted at `/home/user`. The servers were registered at user scope, but this live session could not attach them without a restart. So every call here went through the same stdio MCP protocol the GITCRAFT Control Room uses (`~/.gitcraft/runtime/scripts/mcp.sh <tool>`), and each one is recorded in `~/.gitcraft/logs/audit.jsonl` with file hashes.

| Tool | Available here | Applied to TIDEBREAKERS |
|---|---|---|
| **MeshCraft** (Blender 5.2.3 headless) | yes | `run_script` with a project modelling script (`creative/3d-drowned/scripts/drowned_assets.py`) for 11 environment and boat-kit assets; `render_preview`, `validate_asset` (incl. Khronos glTF-Validator), `export_asset` (`three-web-toon`), `engine_check` (three@0.170 + game toon material) for each |
| **ForgeCraft** (orchestrator) | yes (template / Blockbench routes) | `route` + `generate` for the 6 crew characters (MeshCraft `deckhand` template: Mixamo-named rig, Idle/Walk/Interact/Attack), library versions, licence/provenance, hash-verified hand-off |
| TripoSR / Hunyuan3D / Meshroom | **no**: no GPU, huggingface.co blocked, Meshroom not installed | not used (no photo/concept-to-3D needed; everything is procedural from the palette) |
| **VectorCraft** | yes | 23 new item icons (relics + materials) as native `.vectorcraft` + SVG, generated into `src/ui/iconsDrowned.ts` |
| **PhotoCraft** | yes | before/after composites (P6) |
| **DesignCraft** | yes | review gallery board (P6) |
| **FilmCraft** | yes | gallery reel MP4 (P6) |
| **PdfCraft** | yes | review pack assembly (P6) |
| LightCraft, EffectCraft | yes | not needed: the game's look is real-time; no photo batches or motion graphics required |

## 3. Plan and acceptance criteria

| Milestone | Deliverable | Acceptance (measured) |
|---|---|---|
| **P0** | This audit; Drowned World palette; MeshCraft/ForgeCraft asset kit; VectorCraft icons | every GLB: MeshCraft validation 0 fail, Khronos 0 errors, engine check ok with the game toon material, ≤ 400 KB |
| **P1** | Waterworld world: Gerstner ocean, day/night, storms + Stormwall, drowned cities, rig, graveyard, skylines | all structures load from GLB with procedural fallback; no structure on land (test); world 2400 m |
| **P2** | Boat: 3 vessels, 13 upgrade slots, every upgrade visible (MeshCraft boat kit) | fully built boat ≤ 100 draw calls; each upgrade changes the model |
| **P3** | Exploration and salvage: 10 sites, winch mini-game, drifting caches, castaways | e2e: salvage haul lands loot and advances the Captain's Log |
| **P4** | Survival and crafting: fuel, hull, storms, workbench recipes, raiders | e2e: engine burns fuel; storm damages hull; harpoon repels raiders; crafting works |
| **P5** | Settlements and crew: Driftholm, Rooftop Hollow, Rig Helios; 6 crew roles with real perks | e2e: dock at Helios, rescue a castaway, crew rendered on deck |
| **P6** | Audio, perf, tests, before/after, gallery, reports | `npm test` green; e2e green; no console errors; save v1 → v2 migration test |

Guard rails: existing features stay (first voyage, digging, maps, catalog, cosmetics, trophies). Saves migrate. Each model falls back to procedural geometry if it fails to load. No backend or new runtime dependency (Vitest is dev-only).

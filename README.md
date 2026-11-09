# SCRAP TIDE

*The world drowned. You didn't.*

Art direction: **BEAUTIFUL RUIN**: beautiful water, broken civilization, built from scraps. Palette, wordmark and
rules in `docs/brand/SCRAP-TIDE-brand.md`.

(Formerly TIDEBREAKERS. Older reports, asset logs and the GITCRAFT creative package in `creative/` and `docs/` keep the old name as history.)

A mobile-first, stylized 3D survival adventure on a flooded Earth, built for iPhone Safari and Home Screen install.
The look is Waterworld-inspired ocean survival: everything salvaged, patched and fought over, scrap atolls and outposts
in an immense dark sea, and **green means alive**: living plants are the rarest, most valuable thing in the world
(see `docs/waterworld-pass/`, and `docs/grimy-pass/` for the weathering foundation).
Civilization is under the sea. You start in a patchwork skiff at Driftholm, a raft-town lashed to the last hill of the old
harbour, and build it, upgrade by upgrade, into an expedition boat that can pierce the Stormwall.

## The loop

**Explore → discover → salvage → collect → craft → upgrade → explore further.**

- **The Drift** (start): silted, oil-streaked shallows over a drowned county. The Sunken Tower, the Box Yard, Rooftop Hollow (a fishing
  community on a drowned apartment roof), Turtle Atoll, Lantern Rock, Gull Shoal and the wreck of the *Wren*.
- **The Sunken Reach** (needs the Scrap Trimaran to cross the open swell): Old Meridian's drowned towers, Rig Helios (an oil
  platform turned market), Canopy Rise, and the Rustfang tanker graveyard, where raiders hunt.
- **The Stormwall** (needs the Ironwake Expedition Cat): a storm that never ends, and the Meridian Spire inside it.

**The boat is the game.** 3 vessels (Patchwork Skiff → Scrap Trimaran → Ironwake twin-hull) and 13 upgrade slots: sails,
engine, hull/armour, storage, fuel tank, steering, navigation/radar, salvage crane, harpoon, power (solar, turbine),
container-cabin quarters, lighting, fishing. **Every upgrade is a model you can see on the boat.** Paint, sails, flags and
trophies too. Crew members ride on deck.

**Flotsam:** ease through drifting barrel rafts, ghost nets and capsized hulls to pick them over for rope, scrap, oil and wood.

**Salvage:** slow down beside a beacon buoy and SALVAGE: a winch mini-game where better gear and a Salvager widen the window.
Drifting caches, castaways to rescue, 10 salvage sites with respawn timers and first-haul story finds.

**Survival:** fuel (engine burns it; solar/turbine trickle it back; refine crude on a workbench), hull integrity (storms,
collisions and raider rams; armour, patch kits, a Mechanic), a day/night cycle and roaming storm cells.

**Living green:** nothing grows on open ground. Algae and sea-lettuce drift and wash up; a seedling in a tin, live moss,
potted greens, flowers under glass, a fruiting tomato vine and a sapling from the last tree wait as glowing finds, the
rarest behind the scrap walls of Canopy Rise. Each comes aboard with a green ALIVE card and can ride on deck as a trophy.

**Settlements:** outposts on drum pontoons, trading posts (Rooftop Hollow, Rig Helios), Driftholm's fortified scrap
atoll with its salvaged propeller and freshwater tower, the raiders' Rustfang Hold, and Canopy Rise, the last garden.

**People:** the captain, crew, townsfolk and Rustfang raiders are rigged post-apocalyptic scavengers (patched dusters,
salvage helmets and welding goggles, road-sign armour, salvaged blades), with idle, walk, dig, sit, cheer and attack animation
(`creative/3d-characters`, `docs/characters-pass/`); the crew on deck cheer after a good haul, an upgrade or a new hand (`docs/gitcraft-pass/`).

**Crew:** six survivors, six roles with real perks: Mechanic, Navigator, Salvager, Fisher, Lookout, Defender.
**Captain's Log:** a 10-step goal chain after the first voyage that always points at the next big unlock.

Everything from the first release still works: the guided first voyage, anchoring and going ashore, digging, treasure maps,
the Discovery Catalog (now 36 entries), milestones and cosmetics. Saves from v1 migrate automatically.

## Systems

| System | Where |
|---|---|
| Items, materials and relics | `src/data/items.ts` |
| World: islands, drowned structures, settlements, salvage sites, caches, castaways, raider zones | `src/data/world.ts` |
| Vessels, 13 upgrade slots, cosmetics | `src/data/ship.ts` |
| Workbench recipes / crew roles / Captain's Log goals and milestones | `src/data/crafting.ts`, `src/data/crew.ts`, `src/data/progress.ts` |
| Save/load (localStorage, v2, backup slot, migration from v1) | `src/state/store.ts` |
| GITCRAFT model loader (GLB → toon vertex-colour meshes, skinned crew) | `src/world/assets.ts` |
| Shared toon materials + world-space weathering shader (grime, rust streaks, tide line, salt) | `src/world/materials.ts` |
| Time of day, storms, Stormwall | `src/world/atmosphere.ts` |
| Gerstner ocean with GITCRAFT WorldCraft FFT wind chop (`creative/ocean/`), wake, storm swell, reflections | `src/world/ocean.ts` |
| Sky, clouds, storm decks, rain, lightning, skylines | `src/world/sky.ts` |
| Drowned structures and raft-towns | `src/world/drowned.ts` |
| Boat builder (GITCRAFT hulls for all three vessels, MeshCraft boat kit + fittings, crew) | `src/ship/shipModel.ts` |
| Salvage and raiders | `src/game/salvage.ts`, `src/game/raiders.ts` |
| Game loop | `src/game/game.ts` |
| UI: HUD, radar, winch, settlements, workbench, crew | `src/ui/ui.ts` |
| Procedural WebAudio (howling wind, groaning steel, bell buoys, hull strikes, engine, rain, thunder, rigging, winch…) | `src/audio/audio.ts` |
| Voice lines, adaptive drowned-world theme, stingers, impact layers (GITCRAFT AudioCraft; lazy-loaded OGG / AAC, 0.9–1.2 MB) | `src/audio/pack.ts`, `public/audio/`, `creative/audio/` |
| Captain's procedural Walk/Run: IK-planted feet, pendulum/flight pelvis, counter-rotation, phase-locked to ground speed; momentum, lean, footsteps (`docs/expedition-pass/`) | `src/player/gait.ts`, `src/player/captain.ts` |
| Pinch-to-zoom world chart and treasure maps (real coastlines from the heightfield, collision-free labels, scale bar) | `src/ui/mapView.ts`, `src/ui/mapArt.ts` |
| Flipbook effects: salvage/harpoon splashes, sparks, lightning, engine smoke, bow-slam spray, storm rain sheets (GITCRAFT FXCraft; `?fx=low` / `?fx=high`) | `src/game/flipfx.ts`, `public/fx/` |

3D models in `public/models` come from GITCRAFT MeshCraft/ForgeCraft (`creative/3d-drowned`, and the Waterworld atoll,
outpost and flora kits in `creative/3d-waterworld`, the rigged cast in `creative/3d-characters`, the Scrap Trimaran's Coastal Sloop body from GITCRAFT's TIDEBREAKERS 3D
package, see `creative/3d-sloop`, and the asset-modernization pass: the Ironwake (`creative/3d-ironwake`), island scatter,
landmarks and the pier (`creative/3d-coast`), finds, wildlife and ship fittings (`creative/3d-finds`); inventory, replacement
manifest and before/after in `docs/asset-modernization/`, history in `creative/asset-history/`); item icons from VectorCraft (`creative/ui-drowned`) plus the living-plant
icons in `src/ui/iconsLiving.ts`.

## Tech

- Vite + TypeScript + Three.js. Static output, no backend.
- Persistence: `localStorage` (`tidebreakers.save.v1`) with a backup slot and forward migration. The key keeps the game's former name on purpose so existing saves still load.
- Deployed on Vercel (`vercel.json`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
npm test         # data, save-migration and model tests (Vitest)
# end-to-end gameplay check in mobile Chromium (Playwright):
npx vite preview --port 4173 & node tests/e2e/play.cjs http://localhost:4173/
```

Desktop controls: WASD/arrows to steer or walk, Space/E for the main action, drag to orbit the camera, mouse wheel to zoom. Q (or the ENGINE button) toggles the engine.
Maps: pinch (or the mouse wheel) to zoom, drag to pan, double-tap to zoom in, ⌖ to find your boat.

Animation lab (dev only): `npm run dev`, then open `/tools/gait-lab.html?mode=old|walk|run|blend&v=3&view=side|three|front`.

## Roadmap

See `docs/drowned-world/` for the production report and the prioritized list of remaining work.

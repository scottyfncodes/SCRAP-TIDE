# TIDEBREAKERS

*The world drowned. You didn't.*

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

**People:** the captain, crew, townsfolk and Rustfang raiders are rigged apocalyptic-pirate survivors (patched dusters,
tricorns and goggles, road-sign armour, salvaged blades), with idle, walk, dig, sit, cheer and attack animation
(`creative/3d-characters`, `docs/characters-pass/`).

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
| Gerstner ocean with wake, storm swell, reflections | `src/world/ocean.ts` |
| Sky, clouds, storm decks, rain, lightning, skylines | `src/world/sky.ts` |
| Drowned structures and raft-towns | `src/world/drowned.ts` |
| Boat builder (procedural hulls + MeshCraft boat kit + crew) | `src/ship/shipModel.ts` |
| Salvage and raiders | `src/game/salvage.ts`, `src/game/raiders.ts` |
| Game loop | `src/game/game.ts` |
| UI: HUD, radar, winch, settlements, workbench, crew | `src/ui/ui.ts` |
| Procedural WebAudio (howling wind, groaning steel, bell buoys, hull strikes, engine, rain, thunder, rigging, winch…) | `src/audio/audio.ts` |

3D models in `public/models` come from GITCRAFT MeshCraft/ForgeCraft (`creative/3d-drowned`, and the Waterworld atoll,
outpost and flora kits in `creative/3d-waterworld`, the rigged cast in `creative/3d-characters`, and the Scrap Trimaran's Coastal Sloop body from GITCRAFT's TIDEBREAKERS 3D
package, see `creative/3d-sloop`); item icons from VectorCraft (`creative/ui-drowned`) plus the living-plant
icons in `src/ui/iconsLiving.ts`.

## Tech

- Vite + TypeScript + Three.js. Static output, no backend.
- Persistence: `localStorage` (`tidebreakers.save.v1`) with a backup slot and forward migration.
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

## Roadmap

See `docs/drowned-world/` for the production report and the prioritized list of remaining work.

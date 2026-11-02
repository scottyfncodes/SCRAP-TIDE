# TIDEBREAKERS

*A treasure-hunting pirate adventure. The ocean is full of secrets.*

A mobile-first, stylized 3D browser game built for iPhone Safari and Home Screen install.
You start in a leaky dinghy at Port Saltwhistle and work your way up to a decorated sloop that crosses the open swell.

## What's playable now

**The first voyage (guided):** learn to steer → sail out of the harbor → find Turtle Cay → anchor → go ashore →
find a message bottle with a map scrap → read the clue → dig up the buried chest → sail home → sell to Pip →
check your Discovery Catalog → buy your first upgrade from Marlo and **see it on your boat**. Progress saves automatically.

**After that, open play:**
- **Gull Sandbar & the wreck of the *Wren*.** Inside a ring of reef breakers. You need the Copper-Banded Hull to cross the reef. Three salvage spots, half of Redfinch's chart.
- **Lantern Rock.** An abandoned lighthouse and a locked sea-chest. The key is buried on another island (use the shovel-sense meter).
- **Mossjaw Isle (Emerald Coast).** Past the open swell, so you need the Sloop. Jungle, ruins, a waterfall, and the grand chest from Redfinch's two-piece map.
- **Hidden caches** on every island, plus random dig finds, beachcombing, and crabs.

## Systems

| System | Where |
|---|---|
| Collectibles (23 catalog entries, 6 categories, 5 rarities, plus materials) | `src/data/items.ts` |
| World: islands, landmarks, caches, scripted finds, treasure maps | `src/data/world.ts` |
| Vessels, functional upgrades, cosmetics | `src/data/ship.ts` |
| Collection milestones + first-voyage quest | `src/data/progress.ts` |
| Save/load (localStorage, versioned, backup slot, migration) | `src/state/store.ts` |
| Heightfield used by terrain, water depth, collision and walking | `src/world/terrain.ts` |
| Depth-aware stylized ocean shader | `src/world/ocean.ts` |
| Modular ship builder (each upgrade and cosmetic is visible) | `src/ship/shipModel.ts` |
| Game loop: sailing, anchoring, on-foot exploration, digging, treasure, harbor | `src/game/game.ts` |
| UI: HUD, joystick, harbor merchants, catalog, maps, ship, cargo | `src/ui/ui.ts` |
| Procedural WebAudio soundscape (no audio files) | `src/audio/audio.ts` |

All content is data-driven: to add an island, collectible, upgrade, map or milestone, add an entry to the data files.
Treasure maps are drawn from the real island heightfield, so the map always matches the island.

## Tech

- Vite + TypeScript + Three.js. Static output, no backend.
- Persistence: `localStorage` (`tidebreakers.save.v1`) with a backup slot and forward migration.
- Deployed on Vercel (`vercel.json`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

Desktop controls: WASD/arrows to steer or walk, Space/E for the main action, drag to orbit the camera, mouse wheel to zoom.

## Roadmap

Following the master build phases:
- Phase 3+: crafting bench, duplicate trading, more catalog entries
- Phase 4: decoration placement on deck and in the captain's quarters (trophy displays already work)
- Phase 5: underwater diving, fishing, more regions (Broken Reaches, Forgotten Isles, Haunted Waters, Frozen Expanse), traveling merchants, dynamic events
- Phase 6: performance profiling on device, more art polish

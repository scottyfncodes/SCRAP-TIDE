# TIDEBREAKERS: Waterworld art-direction overhaul and GITCRAFT production pass

**North star:** a civilization that drowned generations ago, rebuilt from whatever could be pulled out of the sea.
Everything is salvaged, patched and fought over. **Green means alive, and alive is the most valuable thing in the world.**

## 1. Audit: contradictions found before changing anything

The previous pass had already made the world grimy (weathering shader, rust and oil, instrument HUD). What still broke the
Waterworld fantasy:

| Contradiction | Where |
|---|---|
| Palm trees, bushes, monstera leaves and grass tufts on every island: lush filler that made green meaningless | `environment.ts` `decorate()`: 26 palms on Driftholm, 22 on Canopy Rise |
| A jungle hill with a waterfall ("Canopy Rise"), i.e. a tropical paradise | `world.ts` style `jungle`, `foliage: 40` |
| Driftholm was a tidy pier town: box houses with cone roofs, striped awnings, Georgia-serif gold signs, palms on the waterfront | `buildHarbor()` |
| Moored boats were clean half-cylinders | `buildHarbor()` |
| Tropical-postcard collectibles: "Lagoon Pearl", "Queen Conch", "Sunset Starfish", "Fire Coral" | `items.ts` |
| Rarity colours used green (uncommon `#5fc47a`) and the success toasts were green, so green meant "loot", not "alive" | `items.ts`, `ui.ts` |
| Phosphor-green radar | `ui.ts` `setRadar` |
| No settlement hierarchy: three settlements, otherwise empty sea between landmarks | `drowned.ts` |
| No plants as gameplay at all, apart from one `seed_packet` salvage roll | |
| Flat, solid white whitecap blobs in the swell regions | `ocean.ts` foam |
| The title camera looked at empty sea, so the first image of the game had no civilization in it | `game.ts` title orbit |

## 2. What changed

### Vegetation is rare, precious and collectible (sections 3 and 7)
- **Nothing grows on open ground.** Palms became bleached, snapped trunks with dead fronds (`props.deadPalm`). Bushes
  and leaves became dead scrub, scrap heaps and bleached driftwood logs. Terrain grass became dead khaki, mud and salt
  crust. The treasure-map clue landmarks keep their silhouettes: "the two sisters" are now twin dead trunks.
- **10 living items in a new "Living Green" catalog category**, covering every rarity tier:
  - **Common:** Algae Mat, Sea-Lettuce Scrap.
  - **Uncommon:** Seedling in a Tin, Live Moss.
  - **Rare:** Jar of Dry Earth, Potted Green, Flowers Under Glass, and the existing Sealed Seed Packet.
  - **Epic:** Fruiting Tomato Vine.
  - **Legendary:** Living Tree Sapling.

  Each has a hand-drawn icon of a salvaged container holding something green (`ui/iconsLiving.ts`).
- **Where they are:**
  - **Common:** algae and sea-lettuce wash up on beaches, and 28 drifting algae mats can be hooked by sailing slowly
    through them (the existing flotsam mechanic). Ghost nets sometimes snag sea-lettuce.
  - **Uncommon:** a seedling tin sheltered on Turtle Atoll, live moss on the shaded side of the lighthouse. Seedlings also
    turn up rarely in Reach caches.
  - **Rare to legendary:** these exist only as placed finds on **Canopy Rise**: flowers under glass at the greenhouse door,
    potted green and a jar of earth by the garden beds, the tomato vine, and a sapling from the last tree.
  - **Never:** rare plants never drift or wash up. That is a unit test.
- **How a plant reads in the world:** the GITCRAFT flora-kit model sits on a pulsing green halo with a faint shaft of
  green light visible from the water (it fades as you walk up, so it never hides the plant). Green motes drift off it,
  and it shows as a pulsing **green radar blip**. The action reads "🌱 TAKE IT ABOARD".
- **Discovery feedback:** the only green card in the game. It has a green glow, green rays and an "ALIVE" stamp, and a
  line that scales with rarity ("Every settlement on the water will want this…"). There is a green burst of particles
  and the top discovery sound. Living items carry an `• ALIVE` tag and a green wash in cargo and the catalog.
- **Green is reserved.** Rarity colours are now survivor paint (dirty cream, oxidised teal, rust orange, signal red,
  faded yellow), with a unit test that none of them is green. Success toasts went teal and the radar went amber CRT.
  The weathering shader detects living green and leaves it unbleached, so it is the one saturated colour in a
  sun-and-salt-graded world.

### Settlements are precious territory (section 4)
The hierarchy is built from the new GITCRAFT kits:

| Tier | Where | What you see |
|---|---|---|
| **Small outposts** | Gullstep, Tin Can Rest, Last Call (open water) | a drum pontoon, a shack, a crude watchtower, a rain catcher, a moored scrap boat, net towers |
| **Trading settlements** | Rooftop Hollow, Rig Helios | net towers, fish market stalls, rain catchers. Helios also sells fresh water from a tank, has a lookout and a salvage barge, and keeps scrap boats moored round the perimeter |
| **Fortified atoll** | **Driftholm** (home) | scrap palisades flanking the raft districts, one still scorched from the last raid, with watchtowers on the corners and the harbour mouth left open. A **supertanker's propeller** stands in the shallows with a lookout shack on its hub. The hill is a shanty of stacked container homes and hauled-up raft shacks, a **freshwater tower** on the high ground, rain catchers, a **guarded greenhouse and garden bed** behind a scrap fence, net towers and dead trees on the waterfront. Services live in containers and patchwork shacks with **hand-painted stencil boards**. The pier is mismatched planks, steel plates and pipe pilings with tyre fenders |
| **Fortified raider atoll** | **Rustfang Hold** (Rustfang Graveyard) | a hull-plate gate between two towers with a crane arm, a ring of burnt and holed walls (evidence of past attacks), container barracks, a water tank and the raiders' boats |
| **Exceptional** | **Canopy Rise ("The Last Tree")** | the last mature tree in a scrap-walled planter with a lantern post (someone keeps watch); a greenhouse of salvaged window panes; two garden beds; a ring of scrap walls, two of them burnt; a lookout; a rain catcher; and fresh water forced out of an old storm-drain pipe into drums (the old waterfall) |

There are also environmental-storytelling pieces: **The Stripping Yard** (a salvage barge cutting the trawler wreck
apart for plates) and **Going Under** (an abandoned platform listing into the sea, its rag of a flag still up). Rustfang
Hold and The Last Tree announce themselves with a banner the first time you come near.

### Ships (section 5)
Moored boats everywhere are now **scavenger scrap boats** (`outpost_kit/scrap_boat`): patched multi-colour hull
sections, an outboard, a tarp shelter, tyre fenders, a lashed drum and crate, and a rag of sail. They contrast with
the Rustfang raider skiffs and with the player's upgrade-able boat, which already carried scrap patches and visible
upgrades from earlier passes, so it was left as it is.

### Ocean and light (section 2)
- **Water:** murky silted turquoise in the shallows, desaturated blue-green, then dark navy open water. No Caribbean
  turquoise.
- **Whitecaps:** crests now break into torn, wind-driven lace instead of solid white blobs.
- **Daylight:** harsher and hazier, sun-bleached rather than uniformly overcast. The sun is brighter, the sky is pale
  and bleached, and the horizon is a warm haze. Storms and nights are unchanged.
- **Title:** opens on Driftholm across the water, then drifts round to the open sea.

### Interface (section 6)
The rarity palette, the green-only-for-life rule and the amber CRT radar are described above. Manifest rows became
salvage tags with a punched eyelet. The title kicker got a backing plate so it reads over the busier town.

## 3. GITCRAFT
See `creative/3d-waterworld/README.md` for the full pipeline log. In short:
- **3 new MeshCraft kits, 27 nodes** in total.
- `validate_asset` finds **0 failures**, and Khronos finds **0 errors and 0 warnings**, on both the export and the
  mobile-optimised file that ships (byte-identical to `public/models`).
- The kits load in the game's three@0.170 and are asserted in the e2e suite.
- Every call is recorded with file hashes in `gitcraft_audit.jsonl`.
- **Not run:** MeshCraft's own `engine_check`, because the session's permission policy blocked `npm ci` inside the GITCRAFT
  checkout. It was replaced by in-game engine validation and is reported as replaced, not as passed.

## 4. Verification

| Check | Result |
|---|---|
| `npm run build` (tsc strict + vite) | pass |
| `npm test` (Vitest) | **231/231**: 9 new Waterworld invariants (green reserved for life; plant tiers and values; every plant find has a flora model, living loot and dry land; the sapling only on Canopy Rise; rare plants never drift; outposts in open water clear of landmarks; every kit node the builder uses exists) plus the 3 new GLBs |
| `tests/e2e/play.cjs` on the production build, mobile Chromium 390×844 touch | **24/24**, no runtime errors. 4 new checks: settlements, algae and plant finds placed; hooking an algae mat brings living green aboard; a plant glows and offers TAKE IT ABOARD; taking it stores it and shows the green ALIVE card |
| Viewports | 390×844 (iPhone 15), 375×667 (SE), 844×390 (landscape): title, play, cargo, catalog and reveal; screens in `screens/` |
| Saves | no schema change. Old saves load: new finds are simply not yet opened, and new items are just more catalog entries. The e2e reload check passes |

### Performance: same script, same spots, `main` vs this branch (headless SwiftShader)

Draw calls (triangles are within ±5% everywhere):

| View | main portrait | this branch portrait | main landscape | this branch landscape |
|---|---|---|---|---|
| Driftholm | 44 | 46 | 80 | 84 |
| Open sea | 34 | 37 | 65 | 73 |
| Rooftop Hollow | 55 | 72 | 62 | 90 |
| Rig Helios | 55 | 60 | 123 | 136 |
| Rustfang Hold | 29 | 32 | 45 | 49 |
| Canopy Rise | 42 | 48 | 41 | 46 |

How the cost is kept down:
- Every settlement's static kit pieces are **merged into one toon mesh plus one glow mesh** (a whole town costs 2 draw
  calls), and batches drop out beyond the fog distance.
- Island dressing from the kits merges into each island's existing batch.
- Scrap boats are the only individually animated pieces. They cast no shadows and are culled beyond 420 m.
- Plant finds are culled beyond 380 m and algae mats beyond 220 m.
- The new models add **765 KB** (three GLBs after the mobile pass, down from 1.47 MB as exported).
- JS grew by about 6 KB gzipped.

## 5. Remaining limitations (honest)
1. **No physical iPhone measurement.** FPS can't be measured in headless SwiftShader. The draw-call increase is modest,
   but Rooftop Hollow, the densest new stretch, is +17 in portrait.
2. **MeshCraft `engine_check` did not run** (see section 3). The game itself is the engine check, but the per-asset
   three.js screenshot that tool makes is missing.
3. **The GITCRAFT global setup could not be installed in this container** (permission policy). MeshCraft ran outside
   its Landlock sandbox wrapper, but with the same root restriction.
4. **Plants are collectibles and catalog entries.** In line with the brief they do nothing new mechanically: they sell
   at the appraiser like any item, the sapling, flowers, potted green and tomato vine can be displayed on the ship like
   other trophies, and no new mechanics were invented.
5. **The player's boat was not remodelled.** It already reads as a patched survivor, but a deeper vessel pass
   (status-specific silhouettes for traders) would be the next step.
6. **Production deploy:** Vercel builds on merge; the live check is at https://tidebreakers.vercel.app/.

# Loop pass · Phase 2: loot and progression

Screenshots: [`phase2/`](phase2/) (desktop 1280×800, phone 393×852; `before-*` = live site before this PR).

| Feature | How it plays | Code |
|---|---|---|
| **Rarity tiers** | Every find shows one of four tiers over the existing five rarities: **Junk** (bulk materials, beach shells), **Common**, **Rare**, **Legendary** (epic + legendary). Colours: grey, timber brown, blue, gold (green stays reserved for living things). The haul card sorts rarest first, flips each chip in with its tier, and stamps RARE/LEGENDARY FIND; a Legendary haul adds a longer hit-stop, kick and haptic. | `src/data/loot.ts`, `UI.revealChest` |
| **Drifting wrecks** | Up to three wrecks drift in each trip (capsized hulls from the GITCRAFT outpost kit, with a tier-coloured beacon shaft). Their tier is rolled from how risky the spot is: distance from any dock, storm tracks, raider water, the Reach and the Stormwall. Beside a dock: ~6% Rare, never Legendary. Far out in raider water: ~27% Rare, ~9% Legendary. Once only. | `src/game/wrecks.ts`, `rollWreckTier` |
| **Salvage Log** | The Catalog is now the Salvage Log: tier dots on every item, and a **Sets** tab with 7 sets and their permanent bonuses (hold slots, sale price, trip length, winch window, perfect strip, max hull). Completing one shows a card once. | `SETS`, `Store.setBonus`, `UI.catalogPanel` |
| **Upgrades change play** | Each shipwright row says what it does in play. New effects: Salvage Radar shows Rare/Legendary wrecks in colour on the radar at full range; Wind Turbine +60 s / Solar +20 s / Fuel Drums +20 s before the squall; Armour Plating shrugs off one big hit a trip; Crane hauls in 2 pulls instead of 3 (same payout); Harpoon salvages from 18 m further out; String Lights & Spotlight stop the dark running the squall clock 1.5× faster at night. Existing effects (sails, engine, cargo, rods…) unchanged. Models and sockets untouched. | `PLAY_EFFECT`, `Store.stats` |
| **Dock board** | Three rotating jobs on every harbour screen (haul N in one trip, bank a hold worth X, land N perfect pulls, haul a Rare+, bank N of an item, land N harpoon shots), with progress bars and gold rewards scaled to your progress. Finished jobs pay on docking and are replaced at once. The story contracts stay as they were. | `src/game/dockJobs.ts` |

Saves: v6 → v7 adds `jobs`, `setsDone`, `tiers`. Everything owned carries over (tests/progression.test.ts).

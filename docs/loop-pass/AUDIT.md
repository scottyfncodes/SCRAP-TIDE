# Phase 0 · Core loop audit (Scrap Tide, main @ 14c452a)

Source-read and measured against the existing PLAYCRAFT evidence (`docs/playcraft-evidence/EVIDENCE.md`, bot on the
production build). Nothing here changes the game.

## How a trip starts and ends
- **Start:** there is no trip object. You "cast off" by pushing the wheel at a pier (`leave_dock` quest step).
  `stats.trips` is only a counter.
- **End:** docking at the **Driftholm pier** (`Game.dock()`) unloads the hold into the harbour vault and opens the
  harbour. Docking at **Rooftop Hollow / Rig Helios** (`dockAt`) opens their traders but does **not** unload the hold.
- **No clock.** Nothing presses you to come home: storms are roaming cells you can sail round, and the day/night cycle
  (8 min) is cosmetic apart from solar charging. A trip lasts as long as fuel and hull allow.

## Loot and money
- Loot comes from salvage sites (winch mini-game, 3 taps, 1–4+ loot rolls), drifting caches (sail over), flotsam
  (ease through), beach finds and digs, fishing (rods/Fisher) and contracts.
- Cargo sits in the hold (`cargo`), capped by slots. Money is **only** made by selling to an appraiser while docked
  (`sell` reads vault then hold), plus contract, Captain's Log and milestone rewards.
- **Sinking** (hull 0): half of every non-epic/legendary stack is lost, you are towed to Driftholm at 40% hull.
- **Raiders:** a ram costs 14 hull and 1–3 of one item.
- There is no hold-value readout and no "how far is home" readout (only the quest waypoint).

## What upgrades actually do
| Upgrade | Gameplay effect today |
|---|---|
| Canvas Mainsail / Cutter Rig | real: ×1.4 / ×1.7 sail speed |
| Outboard / Twin Diesel | real: motor at 9 / 14 u/s, burns fuel |
| Copper Hull / Armour Plating | real: reef-safe, +20/+60 hull, 45% less damage |
| Cargo Crate / Rope Cargo Nets | real: +4 / +8 slots |
| Fuel Drum Rack | real: +60 fuel |
| Ash-Wood Rudder | real: turns 45% sharper |
| Brass Compass | real: needle to the active treasure X |
| Salvage Radar | real: radar range 160 → 420 m, shows caches and raiders on the scope |
| Salvage Crane | real: heavy sites, +0.07 winch window |
| Harpoon Turret | real: auto-fires at raiders within 32 m |
| Solar / Wind Turbine | real: 2.5 / 6 fuel a minute |
| Container Cabin | real: +2 crew berths |
| **String Lights & Spotlight** | **cosmetic only**: `light` stat is never read (its "caches glint" text is not implemented) |
| Trolling Rods | real: a Silverfin every ~40 s under way |

## The Stormwall
A permanent storm ring 900 m from the Shallows centre. Without the Ironwake it does ×2 storm damage (you are swamped);
the Ironwake takes reduced damage, more in the Spire's lee. It gates the late game; it never moves and never closes in.

## Time to first haul / first purchase (new save)
- **Bot (perfect play):** first haul 33–37 s game time, docked 58 s, first purchase 62 s.
- **A human following the First Voyage** is sent to Turtle Atoll first (sail, anchor, go ashore, search, read the map,
  dig) and only salvages the Sunken Tower on the way home. Source estimate: first haul ≈ 4–6 min, first purchase ≈ 5–7 min.

## Cosmetic-only or dead ends
- String Lights & Spotlight (above).
- Night is cosmetic: no reason to fear it or prepare for it.
- Hold value is invisible; docking at Hollow/Helios does not bank the hold.
- Sinking only halves the hold, so there is little tension in staying out.
- The winch has no "perfect" reward beyond a 3/3 count; misses still pay ≥1 roll (good).

## How the phases adapt to this code
- **Trips** wrap the existing cast-off/dock flow (no new map). Docking at any settlement banks the hold. The "rising
  storm" is a trip squall fed into the existing storm system (rain, swell, damage), and the Stormwall itself stays.
- **Hauling** extends the existing winch (adds a perfect zone and bonus roll) and adds a harpoon ring for caches.
- **Rarity** maps the five existing item rarities onto four display tiers; the **Salvage Log** is a sets tab on the
  existing Catalog; **dock contracts** sit beside the existing story contracts; upgrades keep their models and sockets.

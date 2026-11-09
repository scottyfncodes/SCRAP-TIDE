# Loop pass · Phase 1: core loop and feel

Audit first: [`AUDIT.md`](AUDIT.md). Screenshots: [`phase1/`](phase1/) (`before-*` = the live site before this PR,
`after-*` = this build; desktop 1280×800 and phone 393×852), made with `node scripts/loop-shots.mjs <dist|url> <out>`.

## What changed
| Feature | How it plays | Code |
|---|---|---|
| **Push-your-luck trips** | Casting off starts a squall clock (3:30 base; +20 s Solar, +60 s Wind Turbine, +20 s Fuel Drums). 45 s before it runs out: a warning. Then the squall builds on you (rain, swell, damage that grows every second). Dock at **any** settlement to bank. | `src/game/trip.ts`, `Game.updateTrip` |
| **The hold** | Loot sits in the hold until you dock. Swamped: the hold goes over the side (one-of-a-kind epic/legendary story finds stay so no arc can break); gold, vault, ships and upgrades are never touched. | `Store.loseHold`, `Game.swamped` |
| **Trip strip (HUD)** | Hold value (bumps on every find), distance + arrow to the nearest dock, squall bar and clock (amber in the warning, red in the squall). | `UI.setTrip` |
| **Winch** | A gold perfect strip in the middle of the green: +1 bonus roll for one perfect pull, +2 for two or more. Misses still pay at least one roll. Crane variant reads LIFT. | `haul.ts perfectBonus/pullGrade`, `UI.openWinch` |
| **Harpoon** | With the Harpoon Turret, a HARPOON action fires a closing timing ring at a chasing raider or a cache out of hook reach. Hit = repel / reel in; perfect = loot torn off the raider, +1 find from the cache; a miss just means try again. Auto-fire stays as a slower fallback. | `UI.harpoonRing`, `Raiders.shoot`, `Game.harpoonShot` |
| **Juice** | Hit-stop (110 ms, 220 ms on legendary) and a camera kick on big hauls; rust-flake debris; guarded `navigator.vibrate` on catches, perfects, hits, banking and the squall; procedural sounds for the haul (chain + splash + thud), perfect ping, banking (bell + coins scaled to value) and the squall warning. All skipped/softened with Calm effects. | `game.ts hitStop/kick/haptic`, `audio.ts` |
| **Onboarding** | The First Voyage now starts with the Sunken Tower (in sight of the pier), then "Bank it: dock at the pier", then Marlo's welcome-price part, then Turtle Atoll. No new text walls: two short contextual toasts. The squall clock only starts after the First Voyage. | `data/progress.ts`, `Game.updateQuest/updateGuidance` |

## Measured
- Playtest bot (production build, seeded, through the real UI): first haul in the hold at **~33 s** game time, docked
  ~58 s, first upgrade bought at **~62 s** (gold 15 → 99 → 69 with the welcome price). Target: first haul ≤ 30 s, first
  purchase ≤ 3 min. The tower's SALVAGE now also offers from 14 m further out during the first two steps, which takes a few
  seconds off for a human.
- Console: no errors or page errors at either width (`report.json`).

## Saves
v5 → v6 adds `trip` and `loop` (stats). An older save that was at sea gets a fresh trip clock; everything owned carries
over (tests/trip.test.ts, tests/compat.test.ts).

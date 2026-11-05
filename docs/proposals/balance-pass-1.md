# Balance pass 1: proposal (not implemented)

Status: **proposal for review.** Nothing here is in the game. Each item ships as its own PR, is measured with
`npm run sim` / `npm run bot` / `node tests/sim/whatif.mjs`, and is played on a real iPhone (Vercel preview of
the PR branch) **before** it merges to `main`. Merging to `main` deploys production.

Baseline numbers come from the evidence pack at `bed002d` ([EVIDENCE.md](../playcraft-evidence/EVIDENCE.md)):
simulation-measured unless marked otherwise. The PLAYCRAFT score is not a goal here. A change is good if it makes
the game better to play, which the criteria below try to pin down.

## Order

| # | Change | Why this order | Risk |
|---|---|---|---|
| 1 | Salvage respawn on a tamper-proof clock | No balance impact; fixes a loophole | Low |
| 2 | Every winch hit pays | Raises Drift income, which changes #3's numbers, so it goes first | Medium (economy) |
| 3 | Smooth the Scrap Trimaran step | Re-measure *after* #2; it may already shrink the spike | Medium |
| 4 | A Stormwall worth fearing | Endgame only; independent of 1–3 | Medium (late-game) |
| 5 | Upwind sailing | Design decision first; it touches the tutorial | High (onboarding) |

After each PR: `npm test`, `npm run build`, `npm run sim`, `npm run bot -- --runs 3` (must stay reproducible and
15/15), then iPhone play on the preview URL.

---

## 1. Salvage respawn can be skipped by changing the phone's clock

**Measured:** `Salvage.ready` compares `Date.now()` with the saved haul time (`src/game/salvage.ts`), so moving the
device clock forward refreshes every site (`exploits.json`: ready right after a haul = false, after a clock jump =
true).

**Intended effect:** Sites refill as play goes on, and while the phone is away for a sensible time, but not because
the clock was changed. Coming back the next morning should still feel rewarding.

**Proposal:** Keep a monotonic "sea clock" in the save: it advances by real elapsed time between sessions but each
gap is clamped to `[0, OFFLINE_CAP]` (e.g. 2 h), plus game time while playing. Haul timestamps and `ready()` use
the sea clock. A backwards clock change does nothing; a forward jump credits at most the cap. Migrate old saves by
converting the stored `salvaged` timestamps to sea-clock values on load.

**Metrics:** `exploits.json` "salvage respawn follows the device clock"; a new sim check that jumps the device
clock +24 h with no play; the campaign's respawn wait.

**Success criteria**

| Metric | Before | Target |
|---|---|---|
| Clock +24 h with no play refreshes a 4-min site | yes (any jump) | only via the offline cap (≤ 2 h credited) |
| Clock moved backwards breaks timers | not tested | site still refills after its respawn of play time |
| Campaign actions / respawn wait (winch 2/3) | 238–269 actions / 1.3 h | unchanged (±5 %): ordinary play is unaffected |
| Bot | 15/15, reproducible | unchanged |
| iPhone | — | close the app 10 min, reopen: sites that were due are ready |

---

## 2. A second winch hit pays nothing on 3-roll sites

**Measured:** `Salvage.finish` rolls `max(1, round(rolls × (0.35 + 0.22 × hits))) + (hits === 3 ? 1 : 0)`. On a
3-roll site 1 and 2 hits both round to 2 rolls. Sunken Tower: 0/3 7.6g, 1/3 15.6g, **2/3 15.4g**, 3/3 30.5g; same
at the Box Yard and Hollow Underfloors, and at the two 3-roll Reach sites (the Leaning Block, Helios Lower Deck).

**Intended effect:** Every pull you land in the green is worth something, so the winch stays a skill moment rather
than "nail all three or don't bother".

**Proposal:** `rolls = max(1, round(site.rolls × (0.2 + 0.35 × hits)))`, dropping the separate perfect bonus. Rolls
per hit count (0/1/2/3), computed from the formula:

| Site rolls | Now | Proposed |
|---|---|---|
| 3 (Drift sites, Leaning Block, Helios deck) | 1 / 2 / **2** / 4 | 1 / 2 / **3** / 4 |
| 4 (Meridian Plaza, Broadcast Spire, Graveyard) | 1 / 2 / 3 / 5 | 1 / 2 / 4 / 5 |
| 5 (tanker, Meridian Spire) | 2 / 3 / 4 / 6 | 1 / 3 / 5 / 6 |

Perfect hauls are unchanged everywhere; 2-hit hauls gain a roll; 0-hit hauls on the two biggest sites lose one.
Predicted gold (measured gold per roll × proposed rolls): Sunken Tower 2/3 15.4g → ~23g, Box Yard 24.8 → ~35,
Hollow 25.8 → ~41.

**Metrics:** `salvage_yield.json` gold per haul by hits; `affordability.json`; `campaign.json` totals.

**Success criteria**

| Metric | Before | Target |
|---|---|---|
| Each extra hit raises mean gold, every site | fails at 5 sites (1→2 hits) | +15 % or more per hit at every site |
| Perfect-haul gold | 30.5g at the Sunken Tower | unchanged ±10 % |
| Whole campaign, winch 2/3 | 238–269 actions | 200–270 (more income is fine; the late game must not collapse) |
| Ironwake step, winch 2/3 | ~73 actions | ≥ 50 (it should still feel like a big build) |
| iPhone | — | the result card's haul visibly differs between 1, 2 and 3 hits |

---

## 3. The Scrap Trimaran is a pacing spike

**Measured:** campaign at winch 2/3: the Trimaran takes 34 sourcing actions against at most 11 for any earlier step,
with ~42 min of respawn waiting. It is **gold-limited**: 420g at ~15–25g a Drift haul, three Drift sites on 4–6 min
respawns.

What-if runs (`node tests/sim/whatif.mjs`, data patched in a throwaway page; 5 seeds, winch 2/3):

| Variant | Trimaran actions | × largest earlier step | Respawn wait | Whole campaign |
|---|---|---|---|---|
| current game | 29.6 | 3.44 | 36.7 min | 237 |
| 420g → **320g** | **20.8** | **2.12** | 24.0 min | 239 |
| driftwood 8 → 5 | 27.0 | 2.81 | 35.3 min | 249 |
| driftwood in two Drift sites | 28.2 | 2.71 | 34.9 min | 237 |
| 340g + driftwood source | 24.4 | 2.54 | 28.9 min | 252 |
| 340g + driftwood + Drift respawns −25 % | 21.2 | 1.89 | 20.2 min | 246 |

Driftwood is not the bottleneck; gold and respawn waiting are.

**Intended effect:** The Trimaran stays the first big goal (it opens the whole Reach) but takes a session, not an
evening of waiting for three rooftops to refill.

**Proposal:** Implement #2 first and re-measure: the winch change raises Drift income by roughly a third at 2/3 and
may close most of the gap by itself. If the step still exceeds the target: lower the Trimaran to **~320g**, keeping
its materials, and only then consider Drift respawns −25 %. Leave the Ironwake alone in this PR.

**Metrics:** `campaign.json` Trimaran step (actions, respawn wait, ratio to the largest earlier step);
`affordability.json` sloop row; `whatif/trimaran.json`.

**Success criteria**

| Metric | Before | Target |
|---|---|---|
| Trimaran step / largest earlier step | 3.4× (34 actions) | ≤ 2.2× |
| Trimaran step, absolute | 29.6–34 actions | 15–24 (still the biggest early goal) |
| Respawn waiting inside that step | ~37–42 min | ≤ 25 min |
| Whole campaign | 237 | within ±10 % |
| iPhone | — | a new save reaches the Trimaran in one or two sittings without idling at empty sites |

---

## 4. The Stormwall barely scratches the Ironwake

**Measured** (`voyages.json`, the real frame loop): the Ironwake reached the Meridian Spire 12/12 times, spending
6.5–10.7 s in the wall and losing **2.2–9.7 %** hull (stock sail 15.6/160; Cutter Rig + Riveted Armour 4.8/220).
The Trimaran is swamped trying (3/3). In `Game.updateHull` the wall multiplies storm damage by `0.55` for a
storm-capable hull (`2` otherwise), at storm 1.0 → 0.53 hull/s for the Ironwake.

**Intended effect:** The last barrier should be the most dangerous water in the game: a crossing you prepare for
(armour, patch kits, a Mechanic for afterwards) and feel, without becoming a coin flip.

**Proposal** (two levers, tuned with the voyage sim):
- Gale drag inside the wall: sail and engine top speed × ~0.4 while `atmo.wall > 0.5`, which roughly doubles the
  time spent in it;
- Storm-capable hull multiplier `0.55 → ~1.4`.

Predicted from the measured exposure: stock sail, no armour ~29 % hull; Cutter Rig ~17 %; Cutter + Riveted Armour
~7–9 %. The Trimaran stays unable to cross. Consider a first-entry toast ("Hold her steady — the wall is the worst
of it") so the damage reads as intended.

**Metrics:** `voyages.json` Spire runs (hull lost, Stormwall seconds, arrival); `hull.json` Stormwall column.

**Success criteria**

| Metric | Before | Target |
|---|---|---|
| Ironwake, stock sail, no armour: hull lost | 9.7 % | 25–40 % |
| Ironwake, Cutter Rig, no armour | 5.5 % | 15–25 % |
| Ironwake, Cutter + Riveted Armour | 2.2 % | 6–15 % (gear should pay off) |
| Swamped on arrival, any Ironwake fit, from full hull | never | never |
| Trimaran reaching the Spire | 0/3 | 0/3 |
| iPhone | — | the crossing feels dangerous and readable; frame rate holds inside the wall |

---

## 5. Sailing straight into the wind at 45 % speed

**Measured** (`sailing_fuel.json`): every boat sails dead upwind at 45 % of its beam-reach speed (stock Skiff 2.9 vs
6.5 m/s); `windEff` never drops below 0.45, so wind shapes speed, not routes.

**Why this one is different:** routes the game sends a new player on are upwind. Computed from the wind direction
(`WORLD.wind.dir`) and the destinations in `data/world.ts`:

| Leg | Off dead upwind | Speed now | Under a hard no-go zone (<30° = 15 %) |
|---|---|---|---|
| Driftholm → Sunken Tower (first salvage beacon) | 33° | 54 % | ~22 % |
| Turtle Atoll → Driftholm (tutorial return, no engine yet) | 11° | 46 % | 15 % |
| Rooftop Hollow → Driftholm | 21° | 49 % | 15 % |
| Rig Helios → Driftholm | 22° | 49 % | 15 % |

A realistic no-go zone would make the tutorial's trip home a crawl, before the player can own an engine. With a
one-thumb wheel on a phone, manual tacking is a lot to ask.

**Intended effect:** Wind should matter, so heading and timing feel like seamanship, without trapping new players.

**Options (decide before building):**
- **A (recommended first): feel, not speed.** Keep the numbers; add luffing sails, a speed-readout cue and a crew line
  when pointing within 30° of the wind. Zero risk to the tutorial.
- **B: assisted tacking.** Inside a 35° cone the boat sails a short automatic zig-zag at ±45° (the player keeps
  pointing at the goal), making good about 35–45 % toward the target. It reads as seamanship and keeps the
  one-thumb control.
- **C: a mild cone, no assist.** Dead upwind 0.30, ramping to 1.0 at 90°. Only with the tutorial route checked.

**Metrics:** `sailing_fuel.json` speed by heading; bot game time to the beacon (33.4 s now); voyage minutes; a new
sim leg for the tutorial return from Turtle Atoll.

**Success criteria (B or C)**

| Metric | Before | Target |
|---|---|---|
| Speed made good dead upwind | 45 % | 30–40 % |
| Beam reach and downwind speed | 100 % / 90 % | unchanged |
| Bot: dock to Sunken Tower beacon | 33.4 s game time | ≤ 1.5× (≤ 50 s), still 15/15 |
| Tutorial return Turtle Atoll → Driftholm | (add to sims) | ≤ 1.5× today |
| iPhone | — | a first-time player gets home from Turtle Atoll without help or frustration |

---

## What stays out of scope

Raider combat balance (not simulated yet), beach and dig income, and travel time in the economy model. Each needs
its own measurement before anyone tunes it.

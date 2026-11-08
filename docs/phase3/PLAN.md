# Phase 3 · Wild Cards: implementation plan

Phases 1 and 2 of the World & Voyage Design Bible (`creative/design-bible/`) are complete. Phase 3 is the four
**Wild Card** experiments. They are bold bets, so each one is built behind a hidden preview, tested on its own, and
only graduates into normal play after a playtest shows it beats what it replaces.

**Status:** the experiment framework is in place (this PR). No experiment gameplay exists yet.

## The experiment framework (built)

| Link | What it does |
|---|---|
| `?exp=swamped` | turns one experiment on for this visit (`?wild=` is an alias, as the bible writes it) |
| `?exp=tides,marque` | turns on several at once |
| `&fresh=1` | starts from a brand-new game held in memory, not a copy of your save |
| `&ship=brig&upgrades=…` | combines with the existing preview links to set up a mid-game state |

- **Sandboxed.** An experiment visit runs on an in-memory copy of the save, exactly like a `?ship=` preview. It never
  writes to, or clears, localStorage (`Store.sandbox`, tested in `tests/experiments.test.ts` and checked in the
  browser). Real saves, progression and normal play cannot be affected.
- **Off by default.** Without the parameter nothing changes. Unknown ids are ignored, and `fresh=1` alone does nothing.
- **Visible.** The badge reads `EXPERIMENT · <title> · NOT SAVED` (see `experiment_badge.jpg`).
- **One gate per code path.** Experiment code asks `store.exp('tides')` and is dormant otherwise. The registry lives
  in `src/state/experiments.ts`, which holds each experiment's title, summary and a ready-made try-it link.
- **Graduating** is a separate PR. It removes the gate, adds a save migration if the experiment needs saved state
  (experiments can't save, by design), and adds the feature to the main e2e run.

## The experiments, in priority order

### 1 · Swamped: the stormy cold open (`?exp=swamped&fresh=1`)
- **What:** a 60-second storm prologue on a raft that breaks apart. Juno's father's tug tows you into Driftholm, Marlo
  builds you the Patchwork Skiff "from your raft's planks", then Old Wren's board offers 3 leads (Turtle's bottle,
  the Sunken Tower, Kai's raft). Any 2 of them complete the voyage.
- **Touches:** `Game.start()` (the new-game path); storm cells in `world/atmosphere.ts`, forced at the spawn point;
  the existing swamp-and-tow sequence in `game.ts`; a set-based voyage overlay on top of the PR 2.1 beats. The raft
  uses the GITCRAFT `castaway_raft` kit node.
- **Depends on:** nothing. It only needs the framework.
- **Risks:** handing a touch player a storm before they've learned to steer, which could raise first-session
  drop-off; competing with the calm-sea title screen. A set-based voyage doesn't fit today's linear `quest` field.
  That is fine inside the sandbox, but graduation needs a save design.
- **Validate:** A/B against the current voyage. Prologue completion should be at least 90%, plus first-session
  length and replays (PLAYCRAFT pass with the link).

### 2 · Tide caves (`?exp=tides&ship=skiff&upgrades=deck_lights`)
- **What:** a tide cycle on the day clock, with low water at dawn and dusk. Some cave finds (PR 1.5) open only at low
  tide, and a Tide Table becomes a navigation part.
- **Touches:** a single `tideLevel(t)` function that returns **0 when the experiment is off**. It feeds the ocean
  surface (`world/ocean.ts`) and the water checks against `heightAt()`: anchoring depth, going ashore, wading, and
  "too wet to dig" (about 22 call sites in `game.ts`). Cave finds gain a tide condition beside `requiresUpgrade`.
- **Depends on:** the caves (PR 1.5, done).
- **Risks:** this is the most systemic experiment. Every water check moves together, which risks regressions in
  docking, anchoring and digging, plus visual seams at the shoreline. The zero-when-off design keeps production
  identical, and a unit test asserts it.
- **Validate:** e2e passes with and without the flag; a playtest checks players understand the timing (target 70%
  or more).

### 3 · Helios vs. Rustfang: Letters of Marque (`?exp=marque&ship=brig&upgrades=harpoon_turret`)
- **What:** at Helios standing 2, Dace offers a Letter of Marque, and at Rustfang Hold the raiders offer the Rust
  Token.
  - **Privateer:** raider skiffs drop prize cargo and Helios prices fall, but raiders hunt you harder.
  - **Rust Token:** raider zones go quiet and Helios prices rise. Ines confronts you or leaves the crew.
- **Touches:** a faction value; raider behaviour branches in `game/raiders.ts`; the PR 2.2 contracts and standing;
  `Store.portDiscount`; the PR 2.3 arc engine for Ines's beat.
- **Depends on:** contracts and standing (2.2), arcs (2.3) and Dace's ledger (2.4), all done. It must reconcile with
  the ledger outcome, which already empties the Meridian zone.
- **Risks:** a darker tone than the game's "cheeky menace". A crew member leaving can feel punitive. **Softlock:** a
  Rust Token taken before *Drive off a Rustfang raider* (`g_raiders`) would leave that goal impossible, so it must
  either auto-complete the goal or keep one zone hostile.
- **Validate:** the faction split in playtests should be near 50/50; no Log softlock (unit test over the goal chain).

### 4 · Take Her: stealing the Ironwake (`?exp=takeher&ship=brig&upgrades=salvage_crane,harpoon_turret`)
- **What:** the Ironwake's hull is Rustfang's hulk, chained inside the Hold. On a raid night you drive off three
  skiffs (or Ines parleys), winch the chain and tow her out. Marlo then refits her for materials and only 600g.
- **Touches:** a scripted event at `op_hold`, a tow state on the boat, and the Ironwake goal (`g_ironwake`) changing
  from a purchase to a heist inside the sandbox. It reuses the Ironwake model, the Under the Rust site and
  `hold_way` (PR 2.4), and the Salt Brig as the raiding boat (PR 2.5).
- **Depends on:** 2.4 and 2.5 (done). It also depends on **Marque**: a Rust Token ally can't raid the Hold, so build
  Marque first.
- **Risks:** the most fragile of the four. A scripted set-piece on mobile adds performance and timing risk, and it
  removes a pure "save up for it" goal that some players enjoy.
- **Validate:** set-piece completion of at least 85%; a "most memorable moment" survey.

## Recommended sequencing

1. **Swamped:** self-contained, highest player-facing value, no dependencies. Build it first.
2. **Tides:** builds on the caves; the zero-when-off function keeps it contained, but it needs the most regression care.
3. **Marque:** needs the softlock fix designed before any code is written.
4. **Take Her:** last, because it depends on Marque's faction state and is the riskiest build.

Each experiment is **one PR**. Every PR runs `npm test`, the build, the e2e suite, and the wake and turn checks
(all four hulls), plus the experiment's own link in a browser. Experiments stay hidden until a playtest justifies
graduating them.

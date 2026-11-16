# Helm pass: a captain who steers, raiders on wave runners, Wren on the radio, a shelf of tapes

Four notes from a playtest, one pass.

## 1. The captain no longer sits in the boat like a mannequin

**Before:** aboard, the rigged captain played the stock `Sit` clip: bolt upright, both hands on the knees, legs
together, beside a tiller nobody held. On the Trimaran that meant sitting on thin air in the cockpit, and on the
Ironwake sitting on the deck next to the helm console (`screens/before_*.jpg`).

**Now** (`src/player/helm.ts`): every boat has a *helm station* (`ShipParts.helm`, built in `src/ship/shipModel.ts`)
that says where the pelvis and both feet go and what the hands hold. The body is posed over the `Idle` clip with
two-bone IK in world space, on top of the existing seat-balance layer (`player/ride.ts`), so the hands stay on the
helm while the spine rides the roll.

| Boat | At the helm |
|---|---|
| Patchwork Skiff | Seated in the car seat, right hand on a bent-pipe tiller that comes round the seat back, left leg braced forward, left hand on the thigh. The tiller is a new part of its own and **swings as she turns**. |
| Scrap Trimaran (tiller) | Seated on an upturned crate in the cockpit, left hand on the model's tiller, which is lifted out of the hull mesh (`extractModel`) so it swings too. |
| Scrap Trimaran (ship's wheel) | Standing beside the wheel (there is no room behind it), turned toward it, left hand on the rim. |
| Ironwake, Salt Brig | Standing behind the wheel, both hands on the rim, knees taking the heave and the pelvis shifting uphill against the roll. |

Steering shows: the tiller hand pushes and pulls with the turn, hands travel round the wheel rim, the shoulders
follow, and the head leads into the turn and scans the water otherwise (`screens/after_*.jpg`).

Known limits: the wheels themselves are still static meshes (the hands move round the rim; the spokes don't turn),
and the hands are open mitts, not closed fists.

## 2. The raiders are the bad guys on wave runners

**Before:** zone raiders patrolled in scrap skiffs with two crew standing on deck; the raider *event* used a wave
runner painted one flat red with a capsule for a rider.

**Now** (`src/world/raiderRunner.ts`): one Rustfang ride for both. The GITCRAFT wave runner in rust red and soot
black, a welded ram of rebar spikes on the bow, saw-teeth down the flanks, a whip aerial flying a torn red rag over a
lit lamp, and the rigged Rustfang raider crouched over the bars (the same helm poser). They plane nose-up, bank into
their turns, slap from crest to crest, slalom across your wake on the way in, and on the run-in the rider lets go
with one hand and swings the blade (`screens/raiders_on_runners.jpg`). Speeds, ram damage, theft and the harpoon are
unchanged. The `?look=jury` jawboats are untouched. Text and voice follow ("Rustfang runners! Coming in hard!").

## 3. Old Wren on the radio: context and how to play, in a character's voice

`src/game/narration.ts`. Wren, who sends you on the First Voyage, now talks you through it: a two-line prologue,
one line for each of the ten steps of the voyage, and a line the first time each system turns up (pointing into the
wind, the winch, a full hold, a holed hull, an engine, low fuel, night, a storm, raiders, the Sunken Reach, the
Stormwall, crew, a living plant, the Trimaran). 27 lines, each voiced (Kokoro `bf_emma`,
`creative/audio/voice/narration`) and captioned with her portrait, so it works with the sound off
(`screens/radio_and_tapes.jpg`). One line at a time, never over another character; first-time lines are remembered
in the save; an existing save is not lectured on what it already does. A returning player gets a reminder of the
step they left off on. **Settings → Wren's radio guide** turns it all off.

## 4. More music

The game shipped one 25-second theme. There are now **seven tapes** (Settings → Music): Drowned World (the
original), Fair Wind, Slack Water, Salvage Day, Ironwake, The Long Dark, Rust & Diesel. Each is five sample-aligned
stems, so the region and raider-danger mix works on all of them. **Auto** (the default) lets the sea pick: a pool
for the harbour, the Drift by day, night, the Reach, and storms; a tape plays three times through, then the next in
the pool crossfades in, and a chase never changes the tune. Only the tape that is playing is downloaded (0.4 MB OGG /
0.9 MB AAC each).

## Checks

- `npm test`: 516 tests, including new ones for the IK and helm stations (`tests/helm.test.ts`), the narration
  script (`tests/narration.test.ts`) and the tape shelf and Auto picker (`tests/audio_fx_pack.test.ts`).
- `tests/e2e/play.cjs`: every wave runner carries a rider; the captain's steering hand is on the helm.
- The audio could only be measured (levels, loop seams, pacing), not listened to, in the build environment: the
  mixes and Wren's delivery want a listen on a phone.

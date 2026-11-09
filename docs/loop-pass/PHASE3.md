# Loop pass · Phase 3: sea events and the Daily Tide

Screenshots: [`phase3/`](phase3/).

## Sea events (two or three per trip, after the First Voyage)
| Event | What happens | Counter |
|---|---|---|
| Rogue wave | A white-crested wall rolls in from one side, with a stamp and a 3 s warning. | Bow into it with way on: you ride over (a hop and a splash). Beam-on: 26 damage and a crate or two over the side. Armour Plating's once-a-trip shield takes it. |
| Surfacing wreck | A wreck breaks the surface nearby and goes back under after 30 s. | Get there and haul it. |
| Rival scavenger | A rival boat (outpost-kit scrap boat, red rag sail) races you to a Rare wreck from the far side. | Beat them to it, or it's theirs. |
| Sea creature | Humped backs and a fin circle a Legendary wreck. | Time your approach: inside its ring it hits the hull (18). |

`?event=rogue_wave|surfacing_wreck|rival|creature` on any sandboxed `?ship=` link triggers one 2 s after casting off.

## Daily Tide
- One seeded sea per **UTC calendar day**, the same for every player: four wrecks (two Common, a Rare, a Rare or
  Legendary), placed by bearing and distance from the pier, and 2–3 events at fixed trip times.
- Start it from any harbour (big **DAILY TIDE** button). It is a normal trip: bank at any dock to score.
- End card: score breakdown (hold banked, perfect pulls ×10, events beaten ×25, legendary finds ×50; swamped = 0),
  a shareable emoji result (Share sheet or clipboard), and the day streak.
- Guardrails: free play is always open; replays are allowed (best counts); no energy, no locks, no timers that block
  play; nothing to buy.

Saves: v7 → v8 adds `daily`. Tests: tests/daily.test.ts (same map for the same date, streaks, share text), tests/seaEvents.test.ts.

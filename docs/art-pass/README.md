# Art direction & mobile visual polish pass

North star: *humanity survived the end of the world by welding together everything that floated.*
Waterworld + Mad Max. Never generic pirate fantasy.

Scope: visuals only. Gameplay, controls, input handling, progression, saves and architecture are unchanged. No new
dependencies, no new assets to download, no new lights or render passes.

## What changed

| Area | Before | After | Where |
|---|---|---|---|
| Dusk / night lighting | Moon at 0.62, sky-fill ground colour near-black: on foot the captain and sand went murky brown/teal | Moon 0.9, bluer sky-fill that reaches the ground, lifted dusk key, slightly less closed-in night fog. Day keys untouched; dusk stays rust-red, night stays cold blue | `src/world/atmosphere.ts` |
| Water at night | Moon glint ~0.3 of the sun's, ambient floor 0.3: the sea went flat | Moon glint floor (0.62 × night), ambient floor 0.42 | `src/game/game.ts` `applyAtmosphere` |
| Character visibility on foot | The boat's low-light fill was switched off ashore | The same (already-existing) point light becomes the captain's work lamp ashore: a small warm pool, 16 m reach, only when the sun is low | `src/game/game.ts` `updateShipFill` |
| On-foot camera | 10 m, pitch ≥ 0.35 rad looking straight at the captain: half the portrait screen was bare dark sand | 8.6 m, pitch 0.68 × the player's pitch (0.22–0.8), look-at 3.2 m ahead and 1.15 m up along the (already smoothed) camera yaw: captain in the lower third, horizon and settlements in frame | `src/game/game.ts` `updateCamera` |
| Steering control | Ship's wheels in honey timber and dark oak with turned handles and brass bosses | Still the classic ship's wheel (rim, spokes through it, grip handles standing proud), rebuilt from salvage per vessel: Skiff rusted pipe rim with welded patch bands, mismatched spokes and tape-wrapped grips; Trimaran oxidised copper pipe rim with rope-whipped grips; Brig aluminium rim bolted in sections, rubber grips with hazard-yellow tips; Ironwake riveted steel rim with a hazard band and sea-glass grip caps. The top grip is hazard yellow on every wheel ("amidships" mark), so the turn is visible. The brass boss is now a knurled steel thumb cap (44 px). Same 150×150 frame, same pointer code, same 50 px travel | `src/ui/helmWheel.ts`, `.stick .knob` in `src/ui/styles.css` |
| HUD | Rounded enamel plates with sea-glass glow borders; parchment objective slip | Riveted, scratched steel plates (CSS gradients only) with squared corners and a faded hazard-stripe bracket; objective is a sun-bleached painted tag with an oxide edge; radar in a bolted oxide bezel with a stencilled label; menu tray under a hazard-stripe header; squarer stamped action plates. Layout, sizes and safe-area insets unchanged | `src/ui/styles.css` |
| Narrow phones (320 px) | Steering dial overlapped the action plate (pre-existing, measured on the base commit) | Dial 112 px, slimmer instruments, action column reserves the helm's real width | `src/ui/styles.css` |
| Pirate leftovers | "Tattered Jolly Flag" | "Tattered Trawler Flag" (display name only; item id unchanged for saves) | `src/data/items.ts` |

## Screens

`before/` and `after/`: iPhone 17 viewport (402×874) in headless Chromium with SwiftShader, not a real device.
`foot-*` = on foot at Turtle Atoll, `sail-*` = the skiff off Driftholm; noon (0.5), dusk (0.78), night (0.95).
`hud-*` = the HUD at sea, the open Menu tray and the 320 px narrow phone. `dials.png` = the four helm wheels (Skiff, Trimaran, Brig, Ironwake). `before-after.png` = all six scenes, before (top) and after (bottom).

## Tradeoffs

- Night is brighter than before by design. It is still the darkest, coolest, least saturated key; tension now comes
  from colour and fog rather than from not being able to see the ground.
- The work lamp only lights within 16 m of the captain, so distant terrain at night stays dark (intended).
- The lower on-foot camera shows more of whatever stands between the captain and the horizon (a dead tree at the
  Turtle Atoll test spot). The existing "lift over hills" check still runs against the captain, not the look-at point.
- Performance: no new lights, materials, textures or draw calls. The HUD textures are CSS gradients on a handful of
  elements; the dials are the same size of inline SVG as before.

## Remaining

- The GLB cast (`creative/3d-characters`) still includes tricorn-style hats and dusters on some characters. Replacing
  them is an asset pass (MeshCraft), not a CSS/lighting change, so it was left for a dedicated pass.
- Panels (Harbor, Cargo, Ship…) keep the bleached-sand journal-page look; only the HUD was restyled here.
- The `skull_rock` landmark is a natural rock formation used in a treasure clue, kept as is.

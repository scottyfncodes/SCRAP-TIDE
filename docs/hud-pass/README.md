# Mobile HUD pass

Goal: players immediately see their boat, understand the objective and know how to sail. The HUD supports the
adventure instead of competing with it. World art, camera, palette, sailing physics, quests, economy and save data are
untouched; only `src/ui/ui.ts` (HUD markup) and `src/ui/styles.css` changed.

## What changed

| Area | Before | After |
|---|---|---|
| Status | Gold pill, hold pill, hull gauge, fuel gauge and clock stacked as 4–5 separate plates | One status plate: gold · hold · time/weather on one line, hull and fuel gauges side by side. The hold count is a button that opens Cargo |
| Objective | Taped paper card in the centre of the top bar | Slim objective slip under the status plate (portrait) or centred in the top row (landscape/desktop); still taps open for the hint, side lead unchanged |
| Navigation | Five 52 px buttons in a 2-2-1 stack (reached 160 px down the right edge) | **Maps** (one tap) + **Menu**, which opens a labelled tray: Maps, Ship, Cargo, Catalog, Settings. Taps outside or Esc close it |
| Radar | 100 px disc on the left horizon, below the top bar | 66 px scope under the nav buttons; tap to enlarge to 116 px (remembered per device in `localStorage`, never in the save) |
| Treasure compass | Floated in the centre of the screen | Sits under the radar in the navigation column |
| Sailing controls | Wheel bottom-left, speed plate floating 230 px up, engine button floating between | One helm cluster: wind dial + speed + point of sail, and the engine toggle, directly above the wheel (beside it in landscape). Actions (Harbor, Anchor, Salvage…) stay bottom-right, slightly smaller |
| Toasts | Over the sky near the top | Just above the helm in portrait (out of the objective and the horizon); top in landscape |

Everything is in normal flow inside two columns (top) and one helm cluster (bottom), so content growth (long goals,
"needs" lines, side leads, an enlarged radar) cannot overlap other controls.

## Measured (scripts/hud-shots.mjs, `npm run check:hud` after a build)

Clear world between the lowest top-HUD element and the highest bottom control, at the Driftholm framing:

| Viewport | Before: top HUD ends | After | Clear world before | After | Overlaps before | After |
|---|---|---|---|---|---|---|
| iPhone 17 402×874 | 252 px (radar) | 145 px | ~349 px | 504 px | none | none |
| iPhone 13 390×844 | 252 px (radar) | 145 px | ~319 px | 474 px | none | none |
| Narrow 320×568 | 252 px (radar) | 143 px | ~43 px | 210 px | none | none |
| Tall 430×932 | 252 px (radar) | 147 px | ~391 px | 554 px | engine × wheel | none |
| Landscape 844×390 | 110 px | 143 px | 85 px | 121 px | none | none |
| Desktop 1280×720 | 176 px | 147 px | 255 px | 342 px | engine × wheel | none |

("Before" top-HUD end includes the radar, which sat below the top bar; the JSON reports in `before/` and `after/`
measure the top bar alone.) Every viewport: no horizontal scroll, nothing off-screen, no HUD button under 44 px wide,
all five tray entries open their panels, the hold chip opens Cargo, the radar toggles.

## Screenshots

`before/<viewport>.png` and `after/<viewport>.png` are the same frame (`?ship=skiff` preview, boat parked off
Driftholm, clock pinned). `after/iphone17-menu.png` shows the Menu tray, `after/iphone17-radar-expanded.png` the
enlarged radar.

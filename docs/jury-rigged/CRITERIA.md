# The Rustfang Toll: pass/fail criteria

Written **before** implementation (Jury-Rigged proof of concept, approved Nov 2026). Each criterion is measured by a
script in this repository, not by eye, so the result can be re-run on any later commit. The visual judgement
(dangerous, weather-beaten, inventive, occasionally absurd; not pirate, not childish, not grim) stays with the
reviewer and the captures in `docs/jury-rigged/`.

All five must pass for the proof of concept to be called a pass. A failure is reported as a failure, with the number.

| # | Criterion | Pass if | Measured by |
|---|---|---|---|
| **C1** | **Proportions.** The new captain and the new Rustfang raider are stylised adults at about 5.5 heads. | Standing height ÷ head height (chin to crown, hat excluded) is **5.5 ± 0.3** for both, measured on the shipped GLB in its rest pose. | `scripts/jury-measure.mjs` (`proportions`) |
| **C2** | **Factions read without colour.** Rustfang and Driftholm differ by silhouette and construction, not paint. | Solid-black silhouettes at **40 px tall** (phone gameplay scale), front view, aligned on the feet/keel and centred: overlap (IoU) **≤ 0.70** for captain vs raider *and* for the player's Patchwork Skiff vs the Rustfang Jawboat (side view); and each pair overlaps **less** than the same pair does today. | `scripts/jury-measure.mjs` (`silhouettes`) |
| **C3** | **Driftholm has a skyline.** The town is recognisable from the water. | In the matched Driftholm approach frame (iPhone 17 portrait, 402×874), the Signal Stack is the **tallest Driftholm structure on screen** and at least **40 CSS px** tall, and it carries lamps that render at night. | `scripts/jury-shots.mjs` (projected bounds, logged in `perf.json`) |
| **C4** | **Colour discipline.** Colourful, but the brand's rules hold. | In every `?look=jury` capture (4 lighting keys × 3 frames), pixels from sun-faded plastic accents cover **≤ 10 %** of the frame (accent-mask render pass). No accent colour sits in the living-green (hue 85–165°) or Sun Gold (hue 40–60°, high chroma) bands. | `scripts/jury-shots.mjs` (mask pass) and `tests/jury.test.ts` |
| **C5** | **Cost and isolation.** It ships nothing to normal play and costs little when on. | In matched frames, `?look=jury` adds **≤ 10 % triangles** and **≤ 2 draw calls** over the default look. The retuned walk keeps planted feet planted (**≤ 1 cm** slip). A default visit requests **no** Jury-Rigged files and saves nothing differently; every existing test still passes. | `scripts/jury-shots.mjs`, `tests/jury.test.ts`, `npm test`, network log |

## Conditions

- Captures: iPhone 17 (402×874 CSS px, DPR 2) and desktop (1280×720), headless Chromium with SwiftShader (software GL).
  Frame times are relative only; real-device GPU timing is out of scope for this pass and listed as a follow-up.
- Lighting keys: noon (0.5), dusk (0.78), night (0.95), storm (noon + full squall).
- Frames: the Rustfang Toll at sea, the Driftholm approach, the captain on foot on the pier.
- "Default" means the same commit without `?look=jury`, so the comparison isolates the look.

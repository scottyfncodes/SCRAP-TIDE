# TIDEBREAKERS: GITCRAFT Studio production pass (first pass)

Goal: raise production value with GITCRAFT's Studio and 3D tools **without changing how the game plays**. Every tool used
is free and ran locally. Anything a tool could not do is listed under *Blocked or not adopted*, not faked.

## 1. Audit and baseline

`studio_status` at the start: audiocraft, fxcraft, worldcraft, testcraft, assetcraft and cinematiccraft title/assemble/capture ready;
**animcraft (all Blender actions), cinematiccraft shot/storyboard and fxcraft destruction were blocked** (MeshCraft's Blender was
still installing; it landed mid-session and animcraft was used after that); `audiocraft_music_model` (ACE-Step) blocked (not installed, no GPU).

Findings that shaped the plan:
- `audio.ts` is a good procedural bed (waves, howl, rigging, engine, rain, thunder, bells, groaning steel). What it can't do:
  voices, a real theme (it plays sparse random phrases), and weighty stingers.
- The crew GLBs had `Idle, Interact, Walk, Attack`; only the captain had `Cheer`.
- Effects were one soft round point-sprite texture for everything (foam, sparkle, harpoon hit, salvage splash).
- `creative/art-direction/visual-direction.md` is the v1 "Sunlit Shallows" storybook brief; the game has since moved to the
  grimy / Waterworld direction (`docs/grimy-pass`, `docs/waterworld-pass`), whose rule is **green means alive**. This pass
  follows the later direction: no green in any new effect, amber sparks, dirty-cream water, oily smoke.

Baseline (`baseline/`): `testcraft_smoke` + `testcraft_perf` on the phone profile (390×664 @3x).

## 2. Ranked plan (posted before changing anything)
1. Audio: voices, adaptive theme, stingers and impact layers; OGG + AAC; lazy; < 3 MB.
2. Effects: fxcraft flipbooks in plain three.js (three.quarks would be a new runtime dependency), with a low-quality fallback.
3. Animation: crew `Cheer` via animcraft (blocked at first, done once Blender landed).
4. QA against the baseline. 5. Teaser. 6. Licence report, docs, PR.

## 3. What changed

### Audio (`src/audio/pack.ts`, `public/audio/`, `creative/audio/README.md`)
- **22 voice lines** (Kokoro-82M), one voice per character: the Driftholm dockhand, Kai, Tomas (fisher), Ines (defender),
  Bram (salvager), Juno (mechanic) and the Rustfang raiders. Short, gritty lines on hails, warnings, crew joining, story finds.
- **Drowned-world theme** in five sample-aligned stems; the mix follows region (the Drift → Sunken Reach → Stormwall) and
  raider danger (a new `Raiders.danger`, 0..1 by the nearest chasing skiff). When the theme is playing the old random
  synth phrases step aside; if it can't load they carry on as before.
- **Stingers** (salvage, discovery, upgrade installed, crew joined) and **hull-impact / harpoon layers** on top of the synth hits.
- OGG Vorbis where the browser decodes it, **AAC fallback** (Safari); a browser that claims Vorbis but fails gets the AAC.
- **Lazy**: nothing loads at boot; one-shots prefetch 4 s after SET SAIL, stems start after the first tap and only while
  MUSIC > 0. Respects the existing SFX/MUSIC sliders (same buses). Pack: **0.84 MB OGG / 1.10 MB AAC** (1.9 MB both, under the 3 MB budget; a unit test enforces it).
- All 37 OGGs decode in Chromium (`decodeAudioData`), stems at exactly 25.26 s; all 37 `.m4a` are AAC-LC (ffprobe).

### Effects (`src/game/flipfx.ts`, `public/fx/`, `creative/effects/flipbooks/`)
fxcraft flipbooks (64 px frames, 256² atlases; lightning 512²; 254 KB total), played as camera-facing quads from fixed
pools (one draw call per live effect):
- salvage haul and harpoon-impact **splash**, harpoon **sparks** (amber, additive);
- **lightning** flash on every sky strike (hook `Sky.onStrike`);
- a thin **engine smoke** plume while motoring;
- **bow-slam spray** off one side of the bow at speed in a swell, thrown well clear of the hull;
- two feathered **rain sheets** in front of the camera in storms / the Stormwall, on top of the existing streaks.

Budget (high / low): splash 6/2, sparks 4/2, lightning 2/1, smoke 1/0, rain sheets 2/0, bow spray off on low. A **quality
governor** drops to low for the session when frames run slower than ~34 fps for 3 s of play; `?fx=low` / `?fx=high` pin it.

### Animation (`public/models/tb_crew_*.glb`, `creative/3d-characters/anim-pass/`)
- `animcraft_animate` added the `wave` clip (arms-up) to all six crew; renamed `Cheer` to match the captain; the repo's
  `optimize_char.mjs` pass re-applied (plus re-rooting the skinned mesh Blender had parented to the armature:
  `scripts/optimize_char_cheer.mjs`). `Idle/Interact/Walk/Attack` unchanged, so `assets.ts` loads them as before.
- `animcraft_verify`: Khronos validator 0 errors, 0 warnings; every clip moves the model in three.js r170.
- In game: the crew on deck cheer once after a good haul (2+ winch hits), an upgrade or a new hand joining.
- +22 KB per crew model (+133 KB total).

### Teaser (`creative/marketing/teaser_tidebreakers_1080p_v2.mp4`, not shipped)
28.5 s, 1080p, H.264 + AAC with the new theme. Title cards via `cinematiccraft_title_card`, cut via `cinematiccraft_assemble`.
Gameplay was captured **frame-stepped** (`creative/marketing/source/trailer_v2/capture.mjs`: the game loop advances 1/24 s per screenshot)
because headless WebGL renders 1–3 fps, so `cinematiccraft_capture`'s real-time recording would have been a slideshow.
Shots: the skiff leaving Driftholm at dusk, a salvage haul (splash + crew cheer), the Ironwake in a storm with lightning.
Sources in `creative/marketing/source/trailer_v2/`.

## 4. QA: before → after

| Check | Before | After |
|---|---|---|
| `npm test` | 272 passed | **280 passed** (8 new: audio pack, flipfx, crew `Cheer`) |
| `testcraft_smoke` phone | only failure: Google Fonts blocked by the sandbox | same; 38 → 43 requests (+5 FX atlases), no audio at boot |
| `testcraft_perf` phone, title screen (SwiftShader) | 1.0 fps, p95 1783 ms, heap 64.7 MB | 1.1 fps, p95 1750 ms, heap 68.4 MB |
| In-play perf (`scripts/perf-sail.mjs`), iPhone 13 profile, Ironwake + storm + lightning, 12 s (mean of runs) | 1.75 fps (5 runs) | full FX 2.05 fps (5), fallback 1.56 fps (3) |
| `npm run check:visual` (wake over hull) | see below | see below |
| JS bundle (game chunk, gzip) | 100.9 KB | 105.9 KB |

Perf is measured in software WebGL on a 4-core VM: run-to-run spread is ±25%, larger than any difference above, so the
honest reading is **no measurable frame-rate drop**. A real iPhone is the reference; the governor and `?fx=low` are the safety net.

**Wake visual check.** Same script on both trees. The skiff-behind row sometimes fails *on both* ("didn't get under way", 1.8 m/s vs
a 2 m/s floor in 4 s of real time under CPU load): a pre-existing timing flake. Ironwake-behind overlap varied 3.8–9.7%
across this branch's runs and 4.4–4.9% on the baseline's first two; this pass doesn't touch wake-puff emission or the
raycast targets, and the share tracks the boat's speed in that window. See the PR for the run table.

**Boat-upgrade visuals:** `screens/before-*.png` / `after-*.png` (skiff, trimaran, Ironwake at noon and dusk, same script):
hulls, upgrades and crew render the same; the new FX only appear on events. `testcraft_visual_diff` on the title screen
reports 11% differing pixels: the title camera orbits and SET SAIL pulses, so consecutive captures never align
(`after/diff_phone_final.png` shows edge shifts across the whole scene, not a change in any object).

## 5. Blocked or not adopted
- **ACE-Step music model** (`audiocraft_music_model`): not installed, no GPU. The theme uses the Studio synth instead.
- **mocap** (`animcraft_mocap`): mediapipe installed late; not needed, procedural `wave` covered the cheer.
- **three.quarks**: available, but it is a runtime dependency; flipbooks in plain three.js instead.
- **Foam-texture swap for the wake/bow spray**: tried (a splash-atlas frame as the puff texture); the stacked exhaust
  puffs read as hard white discs, worse than the current soft puff, so it was dropped and the wake is unchanged.
- **worldcraft ocean/sky**: not adopted. The ocean is a Gerstner shader with procedural ripples, wake, oil sheen and storm
  swell all tied to gameplay; an FFT normal flipbook would add texture memory and fetches for no clear gain on a phone.
- **Teaser inside the Stormwall**: the wall's swell hid the Ironwake at every capture-camera height tried, so the storm
  shot is the Ironwake in a forced storm off Driftholm.
- `cinematiccraft_shot` / `storyboard` (Cycles renders): unblocked late; the teaser uses gameplay capture as asked.
- Environment: the session's setup script failed (`tru: command not found`, line 4: a typo for `true`), and the mocap venv
  timed out during setup; neither affected this pass.

## 6. Licences
`assetcraft_license_report` → `license/`: 138 catalogued outputs, 0 restricted, 0 copyleft, 0 unknown. Summary in
`creative/LICENSE-ATTRIBUTION.md`.

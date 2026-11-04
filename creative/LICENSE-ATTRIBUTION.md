# Licensing & attribution

## Artwork
All artwork, layouts, animation and video in this folder are original work created for HaveAnApp's TIDEBREAKERS in the GITCRAFT pilot run (2026-11-02). There is no stock imagery, no third-party artwork and no AI image generation: every illustration is vector geometry authored in VectorCraft, with compositing, grading, layout and animation in the other ArtCraft apps. Rights follow the TIDEBREAKERS project.

## Tools
Produced with **GITCRAFT** (github.com/scottyfncodes/GITCRAFT), which packages seven apps from the ArtCraft suite by the ArtCraft team (github.com/storytold). The GITCRAFT README describes them as MIT or Apache-2.0:
PhotoCraft 0.19.0 · VectorCraft 0.20.0 · DesignCraft 0.16.0 · PdfCraft (printcraft) 0.17.0 · LightCraft 0.17.0 · FilmCraft 0.16.0 · EffectCraft 0.20.0.
The tools hold no claim over their output.

Supporting utilities used only for glue and QC: Python 3 + Pillow (sprite-atlas packing, QC sheets), FFmpeg/ffprobe (verification of the teaser only).

## Fonts (SIL Open Font License 1.1)
- **Fraunces**: Undercase Type (Phaedra Charles, Flavia Zimbardi). Google Fonts.
- **Nunito**: Vernon Adams, Cyreal, Jacques Le Bailly. Google Fonts.
- **Pirata One**: Rodrigo Fuenzalida, Nicolas Massi. Used in the existing game; recommended for retirement from UI headings.

Text in SVG exports is converted to outlines. PSD, PDF and native sources reference or embed these fonts; install them (OFL) to edit type.

## GITCRAFT Studio production pass (2026-11-04)
Inventory from `assetcraft_license_report` (`docs/gitcraft-pass/license/`): 138 catalogued outputs, **0 non-commercial / no-derivatives, 0 copyleft, 0 unknown licences, no third-party attributions required**. Every file below is generated, contains no third-party samples, images or motion, and is owned by the TIDEBREAKERS project.

| What | Where | Made with | Licence of the output |
|---|---|---|---|
| 22 voice lines (dockhand, Kai, Tomas, Ines, Bram, Juno, raider) | `audio/voice/` → `public/audio/vo/` | AudioCraft voice: Kokoro-82M v1.0 int8 (Apache-2.0 weights) via kokoro-onnx (MIT) + onnxruntime (MIT); phonemizer/espeak-ng (GPL-3.0) run as tools only | project-owned; Kokoro places no restriction on generated speech |
| Drowned-world theme, 5 stems + MIDI | `audio/music/` → `public/audio/music/` | AudioCraft music (GITCRAFT Studio synth) | project-owned |
| 4 stingers, hull/harpoon layers | `audio/stingers/`, `audio/sfx/` → `public/audio/` | AudioCraft music/sfx | project-owned |
| 5 effect flipbooks | `effects/flipbooks/` → `public/fx/` | FXCraft flipbook (NumPy, BSD-3-Clause) | project-owned |
| Crew `Cheer` clip on 6 crew models | `3d-characters/anim-pass/` → `public/models/tb_crew_*.glb` | AnimCraft animate (Blender 5.2, GPL-2.0+: output not covered), procedural motion, no mocap source | project-owned |
| Teaser v2 + title cards | `marketing/teaser_tidebreakers_1080p_v2.mp4`, `marketing/source/trailer_v2/` | CinematicCraft title_card/assemble (FFmpeg, x264) over frame-stepped gameplay capture (Playwright + Chromium) | project-owned |

Encoding: FFmpeg (libvorbis, native AAC). Title cards use the tool's default Inter/DejaVu face (OFL / Bitstream Vera licence).

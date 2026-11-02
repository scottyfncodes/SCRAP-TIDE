# TIDEBREAKERS: Creative Production Package v1

The first visual identity and production asset package for TIDEBREAKERS. It was produced with the GITCRAFT toolchain (seven ArtCraft apps running as headless MCP servers).

**Start here:**

- `REPORT.md`: the Creative Production Report. It covers art direction, every asset, which tools made what, limitations, and the verdict on GITCRAFT.
- `art-direction/TIDEBREAKERS_Creative_Package_v1.pdf`: the illustrated 20-page creative bible.
- `art-direction/contact_sheet_v1.png`: everything at a glance.
- `MANIFEST.md` / `MANIFEST.json`: every file, with size, dimensions, producing tools and status.

> This folder does **not** change the game. Nothing here is imported by `src/` or served from `public/`. Proposed replacements (for example app icons) live here until someone decides to adopt them.

## Structure

| Folder | Contents | Status |
|---|---|---|
| `art-direction/` | Visual direction, creative bible PDF, contact sheet | reference |
| `branding/` | Wordmarks, Grinning Sun emblem, flag, motifs, app icon set, palette (ASE/CSS/GPL/JSON) | finished (app icon *proposed*) |
| `ships/` | 4-stage progression; `custom/` cosmetic previews (canon colours); `source/` | finished 2D art / game-ready previews |
| `characters/` | Cast portraits, lineup, silhouettes, expressions, poses | finished 2D art |
| `environments/` | 5 graded location concepts; `source/` layered PSDs, depth planes, LightCraft preset | concept art |
| `ui/` | `screens/` six iPhone mockups (@3x); `kit/` icons, buttons, badges, map (SVG + PNG) | mockups / game-ready kit |
| `effects/` | `sheets/` RGBA sprite atlases + JSON; `lottie/`; `materials/` shader ramps; `source/` | game-ready |
| `marketing/` | Key art, landscape and portrait promos, 26.7 s teaser (silent) | finished |
| `pipeline/` | The scripts that drove GITCRAFT in this run (recipes; paths are from the pilot workspace) | source |

## Naming and versioning

`<area>_<subject>_v<N>.<ext>`. Editable originals sit next to exports in `source/` folders (`.vectorcraft`, `.psd`, `.designcraft`, `.ecproj`, `.fcproj`, `.lcpreset`). Bump `vN` on revision; never overwrite a shipped version.

## Using the game-ready pieces

- **Effects:** each `effects/sheets/<fx>_sheet.json` gives `frameWidth`, `frameHeight`, `frames`, `columns`, `fps`, `loop`. Map it onto a Three.js sprite texture's `offset`/`repeat`. `fx_dust_motes` is meant for additive blending.
- **Palette:** `branding/palette/tidebreakers-palette.css` is a set of `:root` custom properties.
- **UI kit:** SVGs are outlined (no font dependency). The PNGs are @3x.
- **Ocean ramp:** `effects/materials/ocean_depth_ramp_256x16.png` is sampled left (shallow) to right (deep).

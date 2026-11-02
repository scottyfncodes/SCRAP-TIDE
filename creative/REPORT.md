# TIDEBREAKERS Creative Production Report: GITCRAFT pilot v1

*First production run of GITCRAFT as HaveAnApp's internal creative department. Date: 2026-11-02.*

**Bottom line:** GITCRAFT produced a real, cohesive v1 visual identity and asset package for TIDEBREAKERS, using **all seven ArtCraft tools** chained together. That covers brand, 4-stage ship progression plus customization, cast, 5 environment concepts, 6 iPhone UI concepts with a UI kit, 7 game-ready effects and a marketing set with a teaser video. **Verdict: viable as a multi-tool 2D production pipeline today, with conditions** (see §8). It is not yet a zero-touch pipeline: setup needed manual work, and the toolchain has no raster painting, image generation or audio.

---

## 1. Art direction

Full document: `art-direction/visual-direction.md`. The illustrated deck is `art-direction/TIDEBREAKERS_Creative_Package_v1.pdf` (20 pages).

| Pillar | Decision |
|---|---|
| Promise | *Start small. Earn something magnificent.* The leaky dinghy → Grand Tidebreaker arc drives the key art and the landscape promo |
| Pirate symbol | **The Grinning Sun**: a gap-toothed, eye-patched sun rising out of the sea. It ties into canon (*Sunburst Mask*, *Redfinch's Sun Hoard*). No skulls or crossbones anywhere |
| Palette | "Sunlit Shallows", 24 named colours: lagoon teal, sea blue, Deep Tide navy outlines, doubloon gold, coral, hibiscus, cream, palm and jungle greens, honey timber, plum shadow. **No muddy browns**: shadows go cool, highlights go warm. Canon UI colours (`--gold`, `--parch`, `--red`) are kept |
| Type | **Fraunces** Black for the wordmark and display, **Nunito** Black/Bold for UI (Nunito is already in the game). Retire Pirata One from UI headings because blackletter fails under 20 pt |
| Shape language | "Pebble & Sail": rounded bodies, rocks and panels; tapering sail and wave curves for adventure. The **Tidecurl** is the signature flourish |
| Rendering | Flat vector with two-tone cel shading and Deep Tide outlines (3–4 px silhouette, 1.5–2 px interior). This matches the game's toon-shaded Three.js |
| Lighting | Golden-hour key from the upper left, teal ambient, gold rim on heroes; lantern amber against indigo at night |
| Environments | Three depth planes (cool hazy far plane, full-colour mid plane, dark framing near plane) and one signature colour per location |

## 2. Every asset created

335 files in total; the complete list with sizes, dimensions and status is in `MANIFEST.md` / `MANIFEST.json`. Visual contact sheet: `art-direction/contact_sheet_v1.png`.

| Area | Deliverables | Status |
|---|---|---|
| **Brand** | Primary and compact wordmark (SVG + PNG), Grinning Sun emblem, app icon (1024/512/192/180 + SVG), Tidebreaker flag, motifs (Tidecurl, rope divider, compass rose, doubloon), palette as **ASE / CSS / GPL / JSON / .vcswatches** | finished. App icons are *proposed*, not applied |
| **Ships** | Leaky Dinghy → Coastal Sloop → Saltwhistle Brig → Grand Tidebreaker (SVG + PNG, transparent) | finished 2D art |
| **Customization** | 5 hull paints and 4 sail patterns using the **exact canon colours** from `src/data/ship.ts`; 3 flags (Saltwhistle Pennant, Colors of the *Wren*, new Tidebreaker Colors); 3 figurehead proposals (Sun, Turtle, Gull); lantern | game-ready UI previews |
| **Cast** | Captain (canon look), Pip Farthing, Marlo Keelhart, Odessa (canon NPCs) and **Biscuit**, a new teacup hermit-crab mascot; lineup; silhouette test; 6 captain expressions; 3 captain poses (idle / cheer / dig); alternate NPC expressions | finished 2D art |
| **Environments** | Turtle Cay, Port Saltwhistle, Treasure Cove, Mossjaw jungle ruins, Wreck of the *Wren*: 1920×1080 graded JPGs, layered PSDs, VectorCraft depth planes, LightCraft preset | **concept art** |
| **UI** | Main menu, ship upgrades (Marlo's Shipyard), cargo/treasure inventory, ship customization, map and exploration, discovery notification: iPhone 390×844 pt @3x | **illustrative mockups** |
| **UI kit** | 12 treasure icons (ids match `src/data/items.ts`), 6 nav icons, 3 buttons, panel, 5 rarity badges, coin pill, "The Shallows" world map (SVG + @3x PNG) | game-ready |
| **Effects** | Treasure sparkle, discovery burst, collectible glow, water splash, wake foam (seamless loop), cartoon impact poof, dust motes: RGBA sprite atlases + JSON metadata, **Lottie JSON**, `.ecproj` source | game-ready |
| **Materials** | Ocean depth ramp and sky ramp (256×16) for the existing depth-aware ocean shader | game-ready |
| **Marketing** | Key art 2560×1440 (PSD + PNG/JPG), landscape promo 1920×1080, portrait promo 1080×1920, **teaser** 26.7 s 1080p30 H.264 | finished. The teaser is **silent** |
| **Docs** | Visual direction, creative bible PDF (DesignCraft → PdfCraft), manifest, this report, attribution, pipeline recipes | reference |

## 3. Which GITCRAFT tools produced each asset

| Tool (version) | Commands in registry | Used for |
|---|---|---|
| **VectorCraft** 0.20.0 | 911 | All vector illustration: wordmark (live Fraunces type, arc warp, stepped extrusion), emblem, flag, motifs, ships, cast, UI kit, map, environment depth planes, key-art plates, palette libraries (ASE/CSS/GPL), shader ramps |
| **PhotoCraft** 0.19.0 | 954 | Environment and key-art compositing: smart-object placement, Gaussian depth blur, clipped hue/sat haze, curves, Color Balance grades, radial vignette, Lens Flare on Screen layers, outer glow and drop-shadow layer styles; PSD + PNG/JPG |
| **LightCraft** 0.17.0 | 380 | Series grade of all five environments: one develop look (split-tone, dehaze, vibrance, vignette) saved as the **"Tidebreakers Golden Hour"** preset, applied as a batch, exported as JPG; preset file exported (`.lcpreset`) |
| **DesignCraft** 0.16.0 | 545 | Six iPhone UI screens, landscape and portrait promos, the 12-page creative bible; PNG @3x and PDF export |
| **PdfCraft** 0.17.0 | 212 | Combined bible + UI + promos into one 20-page PDF, set document metadata, **reduced 14.2 MB → 4.3 MB**, verified searchable text |
| **EffectCraft** 0.20.0 | 743 | 7 animated effects (shape layers, eased keyframes, Glow), render queue to RGBA PNG sequences, Lottie export; teaser intro card and end-title animation rendered to H.264 |
| **FilmCraft** 0.16.0 | 716 | Teaser edit: 9 shots, Motion push-in keyframes, 15-frame cross-dissolves, H.264 1080p30 export |

## 4. Which tools successfully collaborated

Every chain below ran end to end, passing real files between tools:

1. **VectorCraft → PhotoCraft → LightCraft**: environment depth planes → layered composite with depth effects → batch series grade.
2. **VectorCraft → PhotoCraft** (key art): sky and sea plates plus re-rendered no-water ships and cast → composite with waterline-accurate placement, sea-front overlap plate, rim glow and flare. The same PSD recipe was **re-framed** to a 1080×1920 plate for the portrait promo.
3. **VectorCraft → DesignCraft**: UI kit + characters + ships + environment JPGs → six iPhone screens; plates + ships → landscape promo.
4. **VectorCraft → PhotoCraft → DesignCraft**: portrait promo.
5. **DesignCraft → PdfCraft**: bible + UI + promo PDFs → one combined, tagged, reduced package PDF.
6. **VectorCraft/PhotoCraft/LightCraft/DesignCraft → EffectCraft → FilmCraft**: brand assets animated in EffectCraft, cut with the graded environment JPGs and the key art in FilmCraft.
7. **EffectCraft → packing → DesignCraft**: effect frames → sprite atlases → shown in the bible.

## 5. What required manual intervention

| # | Intervention | Why |
|---|---|---|
| 1 | Ran `GITCRAFT/scripts/install.sh` by hand | The session had two repos attached, so it started in `/home/user` and **GITCRAFT's SessionStart hook never ran**. Nothing was installed |
| 2 | Drove the MCP servers through a 60-line stdio JSON-RPC client (`pipeline/mcpc.py`) | Servers registered mid-session **do not load into the running session** (they need `/mcp` or a new session). Same binaries, same `scripts/mcp.sh` launcher, same documented commands; only the transport differs from native tool calls |
| 3 | Set `GITCRAFT_ROOT=/home/user`, then **fixed the default in GITCRAFT** (separate PR) | The file fence defaulted to `$HOME=/root`, so every read/write in the repos was rejected |
| 4 | Installed OFL fonts (Fraunces, Nunito, Pirata One) from Google Fonts into `~/.local/share/fonts` | No tool bundles them; all four type-capable apps then picked them up as system fonts |
| 5 | Wrote all artwork as vector path data (Python helpers emitting VectorCraft `draw_path`/`add_text`/effect calls) | The suite has no painting or generative tools. The illustration is authored geometry, and its ceiling is the author's drawing |
| 6 | Small Python/PIL glue | Sprite-atlas packing (no packer in the suite), QC contact sheets, reading PNG sizes for placement math, the manifest/QC scripts. `ffprobe`/`ffmpeg` used **only** to verify the teaser |
| 7 | Visual QC loop | Everything is headless, so every asset was exported and inspected as an image. **More than a dozen fixes** came from that review: muddy vignette, the sea losing colour under haze, hulls floating above the water, glyph tofu in the UI, a mis-rarity-coded doubloon, a swatch name collision, an unreadable CTA, a non-seamless wake loop, and others |

## 6. What could not be accomplished, and why

- **Teaser audio**: no tool produces music or SFX (FilmCraft has `tts.render` for voice only). The teaser ships silent; it needs a licensed track.
- **3D assets**: TIDEBREAKERS renders ships and characters as Three.js meshes. Nothing in the suite authors 3D models (EffectCraft can only *import* glTF), so ships and characters are 2D art and modelling references. **The Brig and Grand Tidebreaker do not exist in the game data yet** (`src/data/ship.ts` has only dinghy and sloop); they are proposals for the progression.
- **In-game integration**: deliberately not done, because the brief said not to modify the live game. App icons, palette tokens, UI kit and effects are ready but **not wired in**.
- **Lottie playback**: the game has no Lottie player. The sprite atlases are the drop-in path; Lottie needs a player such as `lottie-web`.
- **Interactive UI prototypes**: DesignCraft produces static layouts, so the six screens are mockups, not implemented UI.
- **Painterly or rendered illustration**: not possible without raster painting or generation; the package is consistently flat-vector by design and by constraint.

## 7. Output quality and format limitations

- **Strongest results:** the key art, both promos, the brand mark set, the ship progression and the UI screens. These are the pieces I would put in front of players.
- **Good, with honest gaps:** the environments read as one world, but they are simplified concept boards (flat ground planes, little foreground storytelling). Cast faces share one construction, and the captain's idle arms merge with the torso in silhouette. Some UI-kit items (conch, gold bar) are plainer than the rest.
- **Small known flaws:** a faint lens-flare ghost ring in the key art sky; two foam streaks from the key-art sea plate in the teaser end card; no PDF bookmarks per section (PdfCraft's combine produced none).
- **Formats:** SVG text is outlined for portability (not live-editable in the SVG; edit the `.vectorcraft` source instead). The PSDs are layered with smart objects. The FilmCraft and EffectCraft projects reference media by **absolute path** from the pilot workspace, so relink before reopening. Sprite atlases are straight (not premultiplied) alpha.
- **Size:** about 89 MB including layered PSDs (≈ 37 MB). Every file is under 15 MB, and nothing is placed in `public/`, so the deployed game is unaffected.

## 8. Recommended improvements to GITCRAFT

**Verdict:** GITCRAFT **can** act as a multi-tool production department for the portfolio's 2D work: brand, UI, marketing, sprites and effects, concept boards and print/PDF.

- **Reliability:** all seven tools ran headless with no server crashes in this run. Every failure was a parameter or API-shape error, and each one was resolved from the tools' own command registry.
- **Conditions:** to be a *reliable, low-touch* pipeline for every app in the portfolio, it needs these fixes first.

1. **Fixed in this pilot (GITCRAFT PR):** default file fence now follows the workspace when it lives outside `$HOME`; docs cover the multi-repo install path.
2. **Make tools available without a restart:** pre-install via the environment setup script (not a repo hook) so servers exist before the session starts, or ship a `gitcraft` skill that explains `/mcp` reconnects.
3. **Fence FilmCraft and LightCraft**: they currently accept no root and can read or write anywhere.
4. **Font bootstrap:** a `scripts/fonts.sh` that installs a curated OFL set (the type each app's brand uses).
5. **Glue utilities as MCP tools or skills:** sprite-atlas packer, contact-sheet/QC renderer, "place by anchor" helper. These were the only non-ArtCraft code needed.
6. **Document the cross-app quirks** found here:
   - opacity units differ: VectorCraft `draw_path` uses 0–100, PhotoCraft and DesignCraft use 0–1;
   - DesignCraft `export_png` pages are 0-based;
   - FilmCraft keyframes need `addKeyframe` (timeline ticks) before `setKeyframe` (media ticks);
   - VectorCraft Pathfinder results take the top object's paint, and an empty intersect is an error;
   - VectorCraft `swatch.new` silently keeps a pre-existing default swatch of the same name;
   - LightCraft `develop.sync` changed 0 photos for us, while `apply_preset` on ids works;
   - PdfCraft `doc_set_info` takes `key`, and `doc_combine` did not create per-file bookmarks.
7. **Add an audio source** (music/SFX library or generator) so trailers can ship complete.
8. **PhotoCraft:** accept repeated `--automation-*-root` flags like the other apps.

---
*Produced by Claude Code acting as creative director and pipeline manager, using the GITCRAFT toolchain. All artwork in this package is original work created in this run.*

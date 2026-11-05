# TIDEBREAKERS · World & Voyage Design Bible

The authoritative design brief for making TIDEBREAKERS feel like one living pirate adventure rather than a sequence of
disconnected systems. It is a game-design document: **no game code or gameplay was changed to make it.**

| File | What it is |
|---|---|
| `TIDEBREAKERS_World_and_Voyage_Bible.pdf` | The illustrated bible, 31 landscape pages, laid out in GITCRAFT **DesignCraft** |
| `WORLD_AND_VOYAGE_BIBLE.md` | The same content as text. **Implementation passes should read this first** |
| `previews/page_NN.png` | DesignCraft renders of every page, for quick review in a PR |
| `source/content.py` | Single source of truth: every word in the PDF and the Markdown |
| `source/art.py` | Draws the diagrams (world chart, loop, cast web, voyage flow, ladders, matrix) as SVG from the game's data |
| `source/build.py` | Drives the DesignCraft MCP server: swatches, paragraph styles, frames, images, pasted vectors, PDF export |
| `source/export_md.py` | Writes the Markdown from `content.py` |
| `source/capture.cjs` | Captures clean, HUD-free frames from the built game through `?ship=` preview links (read-only) |
| `source/TIDEBREAKERS_World_and_Voyage_Bible.designcraft` | The native DesignCraft document, to reopen and edit |
| `art/diagrams/*.svg` | Vector diagrams (pasted into DesignCraft as native paths) |
| `art/screens/*.jpg` | In-game frames captured from the current build |
| `art/portraits/*.jpg` | Crew and townsfolk crops from `docs/characters-pass/screens` (GITCRAFT MeshCraft cast) |

## What is in it

1. **Diagnosis:** an inventory of every system with `file:line`, and a DESIGNCRAFT baseline (25/100, ceiling 85).
2. **Identity:** pirates after the flood, with pillars, vocabulary and things the game never does.
3. **The World:** a world chart from the real coordinates, the one-world loop and the Redfinch legend.
4. **The Cast:** 14 character sheets (6 crew, 8 NPCs). Each has a want, a wound, a voice, 3 arc beats, new lines by trigger and a gameplay hook.
5. **The First Voyage:** the 13 steps measured, plus 3 redesigns.
6. **Agency & Exploration:** Two Roads, Contracts/Renown/the Green Choice, Letters of Marque.
7. **Dinghy to Pirate Ship:** refit stages and renown, the Salt Brig, Take Her.
8. **Islands, Ports, Caves & Treasure:** the One-World audit, the Redfinch Line, a matrix of the places each upgrade opens, caves.
9. **Gameplay examples:** minute by minute.
10. **Roadmap:** 15 proposals ranked, 3 phases, schemas, guardrails, acceptance metrics.

Every area has **Conservative / Ambitious / Wild Card** proposals, each with gameplay impact, implementation,
tradeoffs and validation.

## Rebuild

```bash
# 1. frames from the real game (optional: committed JPGs are used otherwise)
npm run build && npx vite preview --port 4173 &
node creative/design-bible/source/capture.cjs
# 2. diagrams, Markdown, then the DesignCraft layout + PDF
python3 creative/design-bible/source/art.py
python3 creative/design-bible/source/export_md.py
python3 creative/design-bible/source/build.py
```

`build.py` needs the GITCRAFT DesignCraft MCP server (`~/.gitcraft/runtime/scripts/mcp.sh designcraft`) and the
game's UI typefaces installed locally: Saira Stencil One, Barlow, Barlow Condensed and Share Tech Mono (Google Fonts,
OFL). They are not vendored into the repository.

## Tools used

- **GITCRAFT DesignCraft** (MCP, headless): the whole layout, the paragraph and character style system, native vector
  diagrams (`edit.pasteSvg`), image placement and PDF/PNG export.
- **DESIGNCRAFT game-design assessment** (`python3 -m gamedesign assess`, GITCRAFT runtime): the measured baseline and
  the finding list the proposals answer. Its character-line count was corrected by hand from a source read (it missed
  `VOICE_LINES`).
- **Playwright + the built game:** the in-game frames.

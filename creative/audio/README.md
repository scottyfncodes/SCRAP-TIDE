# Audio (GITCRAFT AudioCraft pass, 2026-11-04)

The soundscape stays procedural (`src/audio/audio.ts`: waves, wind, howl, rigging, engines, rain, thunder, bells, groaning
steel). These files add only what synthesis does badly; `src/audio/pack.ts` lazy-loads the shipped copies from
`public/audio/` after the first tap and plays them through the existing SFX / MUSIC buses.

Sources here are lossless FLAC (the tools wrote WAV; the `.studio.json` provenance hashes refer to those WAVs, and the
FLACs decode to the same PCM). Shipped files: mono OGG Vorbis (q-1 voice, q0 music/sfx) + AAC-LC `.m4a` (32/48 kb/s)
for iPhone Safari, encoded with FFmpeg. Pack: 0.84 MB OGG / 1.10 MB AAC; a player downloads one of the two.

| Folder | What | Tool call |
|---|---|---|
| `voice/` | 22 lines, one Kokoro voice per character (`tb_vo.dialogue.json` has the script). Dockhand `bm_george`, Kai `am_puck`, Tomas `am_onyx`, Ines `bf_isabella`, Bram `am_fenrir`, Juno `af_sarah`, Rustfang raider `bm_lewis`. Shipped with a 110 Hz high-pass, light compression and -16 LUFS. | `audiocraft_voice` |
| `music/` | Drowned-world theme: D dorian, 76 BPM, 8 bars (25.26 s seamless loop), 5 sample-aligned stems + MIDI + mixdown. | `audiocraft_music` (mood mysterious) |
| `stingers/src/` | Salvage (adventure), discovery (mysterious), upgrade (heroic), crew joined (calm): 1-bar phrases in D, shipped with a 1.1 s fade tail at -18 LUFS. | `audiocraft_music` |
| `sfx/src/` | Hull-impact thuds (3 variations) and harpoon whoosh + hit (2) layered over the synthesized hits. | `audiocraft_sfx` |

## Where it plays

| Event | Plays |
|---|---|
| Region / raider danger (every frame) | Theme stems: the Drift = pad + bass; harbour = pad + a little lead; Sunken Reach adds the arp; Stormwall adds lead and low drums; a chasing raider brings in drums, arp and lead by distance. |
| First return to Driftholm / later returns | `dockhand_hail`, then `dockhand_return`, or `dockhand_reach` / `dockhand_stormwall` when your next boat opens that region. |
| Crew joins (rescue or hire) | crew stinger + `<crew>_joined` |
| Salvage haul | salvage stinger; with Bram aboard `bram_salvage`, or `bram_story` on a first haul with story finds |
| Rare+ or living discovery | discovery stinger; with Kai aboard a living find gets `kai_green` |
| Upgrade installed / boat commissioned | upgrade stinger; with Juno aboard `juno_upgrade` |
| Storms | `kai_storm` with the lookout's existing warnings |
| Raiders | `kai_raiders` (lookout), then `ines_raiders` (defender) or `raider_threat`; ram: `raider_taunt`; harpoon: whoosh + hit layers and `ines_hit` or `raider_flee` |
| Hull strikes | thud layer under the synth crunch; `juno_hull` when the hull is low |
| Fishing | `tomas_catch` (at most every 3 min) |

One voice at a time, per-line cooldowns, and the music ducks under speech. Nothing loads while SFX/MUSIC is at 0.

## Helm pass (2026-11-16): Wren's narration and six more tapes

| Folder | What | Tool call |
|---|---|---|
| `voice/narration/` | 27 lines for Old Wren (`bf_emma`, en-gb, speed 0.94) and the re-voiced `kai_raiders` ("Rustfang runners!"). Script and timings in `tb_vo_wren.dialogue.json`. Shipped like the rest: 110 Hz high-pass, light compression, -16 LUFS, 24 kHz mono OGG q-1 + AAC 32 kb/s. | `audiocraft_voice` |
| `music/tapes/<tape>/` | Fair Wind (adventure, G, 96), Slack Water (calm, F, 66), Rust & Diesel (tense, E, 104), The Long Dark (sad, A, 60), Salvage Day (playful, C, 108), Ironwake (heroic, D, 92): 12 to 16 bars, 5 sample-aligned stems each. Kept here: the MIDI, the layer manifest and the `.studio.json` request (mood, key, tempo, bars, seed), which regenerates the stems exactly; the WAV stems themselves (125 MB) are not committed. Shipped at 24 kHz mono, OGG q0 + AAC 40 kb/s. | `audiocraft_music` |

`src/game/narration.ts` plays the narration; `src/audio/pack.ts` (`TAPES`, `autoTape`) plays the tapes.

# TIDEBREAKERS · World & Voyage Design Bible: single source of truth.
# build.py lays this out in DesignCraft (PDF) and export_md.py writes the Markdown brief from the same data,
# so the PDF and WORLD_AND_VOYAGE_BIBLE.md can never disagree.
#
# Conventions
#   * Facts about the current game cite `file:line` at commit 5766ca5 and are tagged EXISTS.
#   * Everything else is a proposal, tagged CONSERVATIVE / AMBITIOUS / WILD CARD, and is not yet in the game.
#   * Ids in `code` are real ids from src/data/*.ts unless marked (new).

TITLE = "World & Voyage Design Bible"
SUBTITLE = "Making TIDEBREAKERS one living pirate adventure"
VERSION = "v1.0 · 2026-11-05 · assessed at commit 5766ca5"

# ─────────────────────────────────────────────────────────────── 0. How to use
HOW_TO_USE = {
    "intro": (
        "This bible is the authoritative design brief for the next implementation passes on TIDEBREAKERS. "
        "It was written after reading the whole repository: the data in src/data, the game loop in src/game, "
        "the UI copy in src/ui, the voice lines in src/audio/pack.ts and every docs/ pass report. A DESIGNCRAFT "
        "assessment provided the measured baseline. Nothing in the game was changed to write it."
    ),
    "rules": [
        "**Authority:** if this bible and an older doc disagree on a design question, this bible wins. On a fact about the current code, the code wins, so fix the bible.",
        "**Preserve:** every existing id, mechanic, save field and test stays. New content is added beside the old, and retired steps migrate.",
        "**Tiers:** every area has three proposals. CONSERVATIVE fits in one PR and only changes data and copy. AMBITIOUS adds a system. WILD CARD is a prototype behind a ?wild= flag.",
        "**Recommended path:** build the Conservative tier of all five areas first (Phase 1). Then build the Ambitious items marked RECOMMENDED (Phase 2). The Wild Cards stay prototypes until playtests justify them (Phase 3).",
        "**Done means:** npm test and tests/e2e/play.cjs pass, the DESIGNCRAFT re-run meets the targets on the Acceptance page, and the live build shows the change.",
    ],
    "reading": [
        "01 Diagnosis: what exists and what is missing",
        "02 Identity: the drowned-world pirate fantasy",
        "03 The World: one map, one legend, one loop",
        "04 The Cast: 14 character sheets",
        "05 The First Voyage: 13 steps, redesigned",
        "06 Agency & Exploration: leads, contracts, the Green Choice",
        "07 Dinghy to Pirate Ship: refits, renown, the Salt Brig",
        "08 Islands, Ports, Caves & Treasure: the One-World audit",
        "09 Gameplay Examples: minute by minute",
        "10 Roadmap & Implementation Brief: phases, schemas, acceptance",
    ],
}

# ─────────────────────────────────────────────────────────────── 1. Diagnosis
DIAGNOSIS = {
    "lede": (
        "TIDEBREAKERS already has a strong world. It has a drowned county, three regions, ten salvage sites, three "
        "settlements, raiders, living green, 13 upgrade slots across three vessels, and boats that show every part you "
        "fit. What it lacks is connective tissue. The systems work, but they don't talk to each other, and its people "
        "barely speak."
    ),
    "inventory": [
        ("Regions", "3: The Drift, The Sunken Reach, The Stormwall", "src/data/world.ts:74"),
        ("Islands", "5 walkable: Driftholm, Turtle Atoll, Lantern Rock, Gull Shoal, Canopy Rise", "src/data/world.ts:92"),
        ("Settlements", "3 with services: Driftholm, Rooftop Hollow, Rig Helios", "src/data/world.ts:315"),
        ("Outposts", "6 set-dressing sites, no services: Gullstep, Tin Can Rest, Last Call, Rustfang Hold, the Stripping Yard, Going Under", "src/data/world.ts:425"),
        ("Salvage sites", "10, each with a winch mini-game, respawn and first-haul finds", "src/data/world.ts:355"),
        ("Treasure maps", "2: The Turtle's Belly, Redfinch's Sun Hoard (2 fragments)", "src/data/world.ts:197"),
        ("Vessels", "3: Patchwork Skiff (id dinghy), Scrap Trimaran (sloop), Ironwake Expedition Cat", "src/data/ship.ts:84"),
        ("Upgrades", "19 across 13 slots; only 6 slots have a tier 2", "src/data/ship.ts:101"),
        ("Characters", "14 named: 6 crew and 8 settlement NPCs", "src/data/crew.ts:25, src/ui/ui.ts:92"),
        ("Guided content", "First Voyage, 13 steps, then the Captain's Log, 10 goals", "src/data/progress.ts:53, :78"),
        ("Milestones", "11, rewarding 1,325 gold and 6 cosmetics in total", "src/data/progress.ts:17"),
        ("Caves", "None. No cave place, landmark or interior exists", "src/data/world.ts:5"),
    ],
    "score": [
        ("Level design", 8.2, 15), ("Mission design", 0.0, 15), ("Narrative", 2.6, 15), ("Progression & pacing", 5.0, 15),
        ("Player agency", 0.5, 10), ("Difficulty & balance", 0.0, 10), ("Worldbuilding", 7.0, 10), ("Variety & replay", 1.7, 10),
    ],
    "score_note": (
        "DESIGNCRAFT assessment at commit 5766ca5: 25 / 100, ceiling 85, coverage 40%, confidence low. "
        "Worldbuilding is the only category at its ceiling. Mission and difficulty score 0 because no mission data "
        "exists to measure, so the score reflects missing structure, not bad work. "
        "Correction from a source read: DESIGNCRAFT reported the 14 characters as having zero lines. It missed "
        "VOICE_LINES (src/audio/pack.ts:11) and the inline barks in game.ts/ui.ts. The true count is on the Cast page. "
        "The conclusion stands: no character has more than 6 lines or a single story beat."
    ),
    "problems": [
        ("Systems, not a story", "Salvage, treasure, crew, upgrades and settlements each work on their own, but none hands the player to another. The only thread is a reward-gold Captain's Log."),
        ("Mute people", "14 named characters share about 40 lines. Mara Okonkwo has a pitch and nothing else. The 8 NPCs share three generic townsfolk models (src/world/environment.ts:584)."),
        ("A tutorial, not a voyage", "The First Voyage is 13 strictly linear steps. 4 of them are menus or shops. The game's signature verb, SALVAGE, never appears in it."),
        ("One road", "The Captain's Log always shows exactly one next goal. Agency scores 0.5 / 10: there are no choices with consequences anywhere in the data."),
        ("A thin legend", "Redfinch, the Wren and the Last Summit are the seeds of a pirate legend, but they live in two item names, one map and one log line: 'To be continued…'."),
        ("Empty quarters", "19 of 36 map cells hold nothing to find. The north-west, between Rooftop Hollow and Canopy Rise, is 6 of 9 empty."),
    ],
}

# ─────────────────────────────────────────────────────────────── 2. Identity
IDENTITY = {
    "lede": (
        "TIDEBREAKERS is a pirate game set after the flood. Its pirates are salvagers, rovers and raiders, the "
        "apocalyptic-pirate survivors the README describes. They fly patched colours, keep articles, bury what they "
        "can't carry and race each other for the old world. That makes 'pirate' a culture inside the drowned world "
        "rather than a theme pasted over it."
    ),
    "pillars": [
        ("The boat is the game", "Every upgrade is a part you can see on the boat. Progression is something you look at, not a number. (Existing, README.)"),
        ("Green means alive", "Living plants are the rarest thing in the world and the only saturated green. Keep green reserved: the tests already enforce it."),
        ("Everything salvaged, everything fought over", "Every object has a past owner. Treasure is the old world, and someone always wants it back."),
        ("People make ports", "NEW: every place you can dock has a face, a want and a reason to come back. A port without a person is just a shop."),
        ("Follow the wake", "NEW: one legend, Redfinch and the Wren, threads every region together, so exploration always points somewhere."),
    ],
    "pirate_vocab": [
        ("Articles", "the crew's contract. Each recruit signs on with a line and a share."),
        ("Colours", "your flag. Odessa sews them; milestones and renown earn them."),
        ("Renown", "what the Drift says about you. It is earned from deeds, never bought."),
        ("Prize", "a raider skiff driven off, or a hulk claimed. Rustfang talks in prizes."),
        ("Tidebreaker", "a captain who has gone through the Stormwall and come back. This is the title the game is named for."),
    ],
    "never": [
        "No skull-and-crossbones as branding. The cheeky menace of the Grinning Sun stays the emblem (creative/art-direction).",
        "Green is never loot, success or UI. Only living things are green.",
        "No cartoon gold glitter. Treasure looks salvaged: oil-stained pearls, stopped watches, signet rings.",
        "No killing. Harpoons drive raiders off (src/game/raiders.ts:218), and the tone stays adventure, not slaughter.",
    ],
}

# ─────────────────────────────────────────────────────────────── 3. The World
WORLD_LOOP = {
    "lede": (
        "The loop the README promises is Explore → discover → salvage → collect → craft → upgrade → explore further. "
        "It is mechanically complete. To make it feel like one world, every step of the loop has to hand the player "
        "to a person or a place, not just to a menu."
    ),
    "loop": [
        ("RUMOUR", "a person tells you about a place", "Old Wren, a crew bark, a contract"),
        ("VOYAGE", "your boat decides how far you can go", "reef, swell, Stormwall, fuel"),
        ("PLACE", "an island, port, cave, wreck or ruin", "each with one find only it has"),
        ("FIND", "treasure, salvage, a castaway, living green", "a story line on first discovery"),
        ("RETURN", "a port and a choice", "sell, craft, donate, deliver"),
        ("REFIT", "a visible part on the ship", "which opens the next place"),
    ],
    "legend": [
        ("Redfinch", "Captain of the trawler Wren and the last captain who tried to reach the Last Summit. EXISTS as the journal page (journal_redfinch), Redfinch's Chart and the Sun Hoard. PROPOSED: the legend that threads all three regions."),
        ("The Wren", "Redfinch's trawler, wrecked inside the Gull Shoal reef (src/data/world.ts:136). PROPOSED: Old Wren, the cartographer, was her navigator, and the boat was named for her."),
        ("The Last Summit", "A mountain past the Stormwall that 'never went under' (ui.ts:980). Its chart is the first haul at the Meridian Spire. EXISTS as the end of the Captain's Log, 'To be continued…'."),
        ("Rustfang", "The raiders of the tanker graveyard (Rustfang Hold, Old Meridian waters). PROPOSED: they took Redfinch's last crew and kept what they found."),
    ],
    "regions": [
        ("The Drift", "Silted shallows, home and the first legend clues. Reached in the Patchwork Skiff.", "Driftholm · Turtle Atoll · Lantern Rock · Gull Shoal (the Wren) · Sunken Tower · Box Yard · Rooftop Hollow"),
        ("The Sunken Reach", "Open swell over drowned cities, with trade and raiders. Needs the Scrap Trimaran.", "Old Meridian · Rig Helios · Canopy Rise · Rustfang Graveyard & Hold"),
        ("The Stormwall", "A storm that never ends, with the Meridian Spire inside it. Needs the Ironwake.", "Meridian Spire → the Last Summit chart"),
    ],
}

# ─────────────────────────────────────────────────────────────── 4. The Cast
# lines_now = authored lines in the current code (pitch + VOICE_LINES + inline barks), counted by hand at 5766ca5.
CAST_SUMMARY = (
    "Fourteen named characters exist: six crew who ride on deck with real perks (src/data/crew.ts) and eight "
    "settlement NPCs who run services (src/ui/ui.ts:92). Together they have about 40 lines and no story beats. "
    "Each sheet keeps the existing facts (role, home, cost, perk, model) and adds a want, a wound, a voice, three "
    "arc beats tied to places that already exist, new lines by trigger and one gameplay hook. Pronouns are part of "
    "each character's design."
)

CAST = [
    # ── crew
    {
        "id": "juno", "name": "Juno Vale", "pron": "she/her", "kind": "crew", "role": "Mechanic", "color": "#f2b825",
        "home": "Driftholm · 120g · needs the Salvaged Outboard", "model": "tb_crew_mechanic (welding goggles, leather apron, wrench)",
        "exists": "Perk: the engine burns 35% less fuel and she slowly repairs the hull at sea. 4 lines: pitch, juno_joined, juno_upgrade, juno_hull.",
        "lines_now": 4,
        "faction": "Driftholm",
        "want": "To build an engine that never needs fuel. Every solar panel and turbine you fit is a step toward her dream.",
        "wound": "Her father skippered the Driftholm tug that tows swamped captains home (game.ts:896). The tug's twin diesels went missing three winters ago.",
        "voice": "Dry, quick, talks to engines like difficult pets. Never says thank you; fixes something instead.",
        "arc": [
            ("Drift", "Signs on after the outboard. She names your engine and the name shows on the Ship panel."),
            ("Reach", "At Rig Helios she sees Vik Ashby's 'Twin Diesel Drive' and goes quiet. 'Those are Dad's.' (see Vik)"),
            ("Stormwall", "While the Ironwake is being built she welds a plate from her father's tug into the hull. Her hull repair doubles inside the Stormwall."),
        ],
        "new_lines": [
            ("first engine start", "Hear that cough? That's her saying hello. Be nice to her."),
            ("solar_array installed", "Sun in, fuel out. One day we won't need a drop of crude."),
            ("docked at Rig Helios", "Don't buy anything off Vik until I've looked at it."),
            ("hull below 20% in a storm", "Captain, I can patch her or bail her. Pick one!"),
        ],
        "hook": "Juno's Call: when the hull drops below 35% she offers a choice. Spend 1 Engine Parts for an instant +30 hull, or limp home on her slow repair.",
    },
    {
        "id": "tomas", "name": "Tomas Reyes", "pron": "he/him", "kind": "crew", "role": "Fisher", "color": "#3e8c80",
        "home": "Rooftop Hollow · 60g", "model": "tb_crew_fisher (white beard, yellow oilskin, sou'wester, gaff)",
        "exists": "Perk: catches Silverfin while you sail, 3× with Trolling Rods. 3 lines: pitch, tomas_joined, tomas_catch.",
        "lines_now": 3,
        "faction": "Rooftop Hollow",
        "want": "One last run of fish nobody has caught before. 'Somewhere the fish haven't heard of me.'",
        "wound": "Forty years on one roof. His sister Old Sal never forgave him for staying when the others left for the Reach.",
        "voice": "Slow, warm, measures everything in tides and meals. Tells the same three stories, and they get better each time.",
        "arc": [
            ("Drift", "Signs on at the Hollow. Sal: 'Bring him back fat or don't bring him back.'"),
            ("Reach", "Points out a cold current off Last Call outpost. A Silverfin run appears there at dawn."),
            ("Reach", "At Canopy Rise he kneels in the soil. He asks you to take a Potted Green home to the Hollow roof (the Green Choice)."),
        ],
        "new_lines": [
            ("first Silverfin", "Silverfin on the line. We eat tonight."),
            ("sailing past Rooftop Hollow", "Forty years I looked at the sea from up there. It's better from down here."),
            ("seeing a living plant", "My mother grew beans in a boot. Real beans. I never believed her."),
            ("dawn at sea", "Fish rise at first light. So do fools. We're both."),
        ],
        "hook": "Tomas's Run: once a day a 'Silverfin running' marker appears near the boat. A short detour gives a triple catch: a small, optional choice.",
    },
    {
        "id": "kai", "name": "Kai", "pron": "they/them", "kind": "crew", "role": "Lookout", "color": "#b26bff",
        "home": "Castaway raft north of Driftholm (cw_kai, -60, -150) · free", "model": "tb_crew_lookout (tarp poncho, hood, binoculars)",
        "exists": "Perk: warns of storms and raiders, and more drifting caches are spotted. 6 lines: pitch, kai_joined, kai_storm, kai_raiders, kai_green and a storm toast.",
        "lines_now": 6,
        "faction": "none (adrift)",
        "want": "To find out who cut their family's platform loose. Their raft flies a ragged flag.",
        "wound": "Eleven days alone on that raft. The platform they came from is the one called Going Under (src/data/world.ts:431), sinking slowly in the Drift.",
        "voice": "Few words, all of them sightings. Counts things. Calls the player 'Captain' a little too formally.",
        "arc": [
            ("Drift", "Rescued on the First Voyage (Ambitious) or from the Captain's Log (current)."),
            ("Drift", "Sailing past Going Under: 'That's ours. That was ours.' A cache there opens only when Kai is aboard."),
            ("Stormwall", "Kai is the first to see the Last Summit from the Spire: 'Land, Captain. Actual land.'"),
        ],
        "new_lines": [
            ("near Going Under", "That's ours. That was ours. Don't stop. …No, stop."),
            ("night, deck lights on", "You lit us up. Every raider in the Drift can see us now. Good. Let them look."),
            ("treasure map complete", "I can see the X from here. Not really. Almost."),
        ],
        "hook": "Kai's Glint: Kai marks one optional 'glint' within 300 m, a cache, a castaway or a rumour, and names it. Sailing to it is a choice, not a goal.",
    },
    {
        "id": "mara", "name": "Mara Okonkwo", "pron": "she/her", "kind": "crew", "role": "Navigator", "color": "#4aa3ff",
        "home": "Rig Helios · 250g", "model": "tb_crew_navigator (navy coat, headwrap, round glasses, spyglass)",
        "exists": "Perk: marks the nearest unsalvaged site and +10% sail speed. 1 line, her pitch. She is the least-written character in the game.",
        "lines_now": 1,
        "faction": "Rig Helios",
        "want": "To draw the part of the map nobody has drawn: the 'Uncharted waters' the game warns about (game.ts:1655).",
        "wound": "Old Wren taught her to chart, then threw her out of Driftholm for selling a copy of a chart to Rustfang. She has been at Helios since.",
        "voice": "Precise and proud. Corrects your headings. Laughs only at good maps.",
        "arc": [
            ("Reach", "Hired at Helios. 'For a share of the haul.' Her share shows in the haul summary."),
            ("Reach", "In Old Meridian she finds her old chalk survey marks on the rooftops. Mara's Survey reveals the hidden chest on the Leaning Block."),
            ("Stormwall", "Back at Driftholm with the summit chart, she and Old Wren ink it together. Their reconciliation adds a new region outline to the World Chart."),
        ],
        "new_lines": [
            ("signing on", "I charted every roof in Old Meridian. For a share of the haul I'll chart them for you."),
            ("entering Old Meridian", "Third roof left, chalk mark. Mine. Fifteen years old and still right."),
            ("docking at Driftholm", "If Wren asks, I'm crew. Just crew."),
            ("at the map edge", "Uncharted? Give me a day and a pencil."),
            ("salvage site marked", "Nearest unworked site, two points off the bow. You're welcome."),
        ],
        "hook": "Mara's Survey: in Old Meridian, sailing through three chalk-marked roofs in any order reveals a one-time cache. It is exploration with a shape, not a waypoint.",
    },
    {
        "id": "bram", "name": "Bram Steele", "pron": "he/him", "kind": "crew", "role": "Salvager", "color": "#d2702f",
        "home": "Castaway raft at an Old Meridian lamppost (cw_bram, 455, -390) · free", "model": "tb_crew_salvager (big build, wetsuit, steel pauldron, grapple)",
        "exists": "Perk: +1 loot roll on every haul and a wider winch window. 4 lines: pitch, bram_joined, bram_salvage, bram_story.",
        "lines_now": 4,
        "faction": "none (ex-Rustfang captive)",
        "want": "His boat back. Rustfang took the Gannet and tied him to a lamppost to watch.",
        "wound": "Knows Rustfang's routes because he paid tribute to them for years. He is ashamed of it.",
        "voice": "Big, gentle, patient with the winch. Talks to the dead whose things he brings up.",
        "arc": [
            ("Reach", "Rescued in Old Meridian. 'I know where they keep the good stuff.'"),
            ("Reach", "He shows the quiet approach to the Graveyard Boxes: raiders don't patrol the north side at dawn."),
            ("Reach", "At Rustfang Hold you find the Gannet's nameplate. Bram hangs it on your rail as a trophy, and it fits a trophy slot."),
        ],
        "new_lines": [
            ("first haul with Bram", "Easy… easy. There. The sea gave something back."),
            ("history item hauled", "Somebody lived down there once. Kept this safe, right till the water came."),
            ("sighting Rustfang Hold", "That gate's made from my boat. I'd know those rivets anywhere."),
            ("dawn near the Graveyard", "North side, now. They're still sleeping it off."),
        ],
        "hook": "Bram's Quiet Approach: near the Graveyard at dawn, raiders don't spawn on the north side for 90 seconds. Timing becomes a choice.",
    },
    {
        "id": "ines", "name": "Ines Ferro", "pron": "she/her", "kind": "crew", "role": "Defender", "color": "#c8352a",
        "home": "Rig Helios · 300g · needs the Harpoon Turret", "model": "tb_crew_defender (mohawk, eyepatch, road-sign pauldron, harpoon)",
        "exists": "Perk: raiders think twice and the harpoon reloads twice as fast. 5 lines: pitch, ines_joined, ines_raiders, ines_hit and an 'And stay out!' toast.",
        "lines_now": 5,
        "faction": "Rig Helios (ex-Rustfang)",
        "want": "To be the reason a voyage is quiet. She wants a crew who doesn't need her to be cruel.",
        "wound": "She was Rustfang. The road-sign armour is theirs. She left the night they took Bram's boat.",
        "voice": "Short, flat, funny by accident. Never shouts. Raiders do the shouting.",
        "arc": [
            ("Reach", "Hired at Helios once you own a harpoon. 'Show me a harpoon and I'll show you a quiet voyage.'"),
            ("Reach", "A raider recognises her mid-fight: 'Ferro? You were one of us!' Bram goes silent for a day."),
            ("Reach", "At Rustfang Hold she can talk the raiders down (the non-violent option) or hold the line."),
        ],
        "new_lines": [
            ("raiders sighted", "Hold the wheel steady. I've got the ugly one."),
            ("raider driven off", "Hooked. Let them swim home and tell the others."),
            ("recognised by a raider", "Was. Past tense. Aim higher."),
            ("quiet night at sea", "This. This is what I signed for."),
        ],
        "hook": "Ines's Parley: with Ines aboard, a raider encounter can open with a PARLEY action (pay 20% of the hold's value, or 1 trophy) instead of a fight.",
    },
    # ── NPCs
    {
        "id": "pip", "name": "Pip Farthing", "pron": "he/him", "kind": "npc", "role": "Trader · Appraiser", "color": "#f4d06f",
        "home": "Driftholm", "model": "generic tb_npc_trader (no unique model)",
        "exists": "Buys finds and keeps the Catalog record. 3 lines in the harbour and appraiser panels (ui.ts:780, :891).",
        "lines_now": 3,
        "faction": "Driftholm",
        "want": "A museum of the old world on a dry shelf. The Catalog is his life's work, not yours.",
        "wound": "Owns one Photograph of Dry Land. He has never admitted he can't tell if it's real.",
        "voice": "Delighted by everything, haggles like a game, says 'ooh' unironically.",
        "arc": [
            ("Drift", "First sale on the First Voyage. 'What did the sea give you today?'"),
            ("Reach", "Asks for a Photograph of Dry Land (polaroid, Meridian Plaza) and pays double: his first contract."),
            ("Stormwall", "The Driftholm Museum opens on the pier. Your ten best Catalog finds stand on display, and Pip names the shelf after you."),
        ],
        "new_lines": [
            ("first living plant shown", "Ooh. Oh. Don't sell me that. I mean it. Don't you dare."),
            ("selling a history item", "Someone wrote this. Someone LIVED. Twenty gold. Twenty-five. Fine, thirty."),
            ("Catalog at 20", "Twenty discoveries! I'm building you a shelf. A whole shelf!"),
        ],
        "hook": "Pip's Wants: Pip always names one wanted item (a category or a specific find) that pays 1.5×. It turns selling into a target.",
    },
    {
        "id": "marlo", "name": "Marlo Keelhart", "pron": "he/him", "kind": "npc", "role": "Shipwright & Mechanic", "color": "#9ec5e8",
        "home": "Driftholm", "model": "generic tb_npc_dockhand (no unique model)",
        "exists": "Sells and fits upgrades and builds the Trimaran and the Ironwake. 3 lines plus 6 mentions in hints and toasts.",
        "lines_now": 3,
        "faction": "Driftholm",
        "want": "To build one boat that comes back from the Stormwall.",
        "wound": "He built the Wren for Redfinch. She never came back, and he hasn't drawn a hull that size since.",
        "voice": "Gruff, proud, speaks in guarantees. 'Every plate I weld, you'll see.'",
        "arc": [
            ("Drift", "Fits your first upgrade. 'She looks better already.' (existing reveal card)"),
            ("Drift", "Commissioning the Trimaran, he unrolls old drawings stamped 'WREN · REDFINCH'."),
            ("Stormwall", "The Ironwake launches. 'I built one boat for that wall. She didn't come back. This one will.'"),
        ],
        "new_lines": [
            ("Trimaran commissioned", "Fuel-tank floats. Redfinch would've laughed. Then bought two."),
            ("Ironwake commissioned", "Bring me alloy, and bring yourself back. In that order."),
            ("swamped and towed home", "I patched the worst of it. The worst of it was your steering."),
        ],
        "hook": "Marlo's Yard Board: the Shipwright panel shows the next hull as a blueprint that fills in part by part as materials arrive, a visible goal on the pier.",
    },
    {
        "id": "wren", "name": "Old Wren", "pron": "she/her", "kind": "npc", "role": "Cartographer · Charts & Rumours", "color": "#a8d5ba",
        "home": "Driftholm", "model": "generic tb_npc_elder (lantern, long white hair)",
        "exists": "Reads map fragments and tells 4 rumours (ui.ts:977-980), plus a fragment hint and an 'edge of the map' line. She is the best-written NPC, at about 8 lines.",
        "lines_now": 8,
        "faction": "Driftholm",
        "want": "Someone to finish Redfinch's voyage, and to be forgiven for not going with him.",
        "wound": "She was the Wren's navigator. The boat was named for her. She stayed ashore the night they sailed for the Stormwall.",
        "voice": "Riddles that turn out to be instructions. Knows more than she says, and says so.",
        "arc": [
            ("Drift", "Sends you to Turtle Atoll for the bottle: the reason for the First Voyage (Ambitious)."),
            ("Drift", "Holding both halves of Redfinch's Chart: 'That's my hand on the left half, captain.'"),
            ("Stormwall", "The Chart of the Last Summit is in her handwriting. She asks to come aboard for the final voyage (new berth event)."),
        ],
        "new_lines": [
            ("before the First Voyage", "A bottle washed up on Turtle, the gulls say. Bring me what's inside, and don't read it first. Read it first."),
            ("Redfinch map complete", "That's my hand on the left half. I drew it for him. I didn't go."),
            ("summit chart brought home", "He made it. The stubborn fool made it."),
        ],
        "hook": "Wren's Rumour Board: three rumours at a time, each pinnable to the chart as an optional lead. This is the main source of player-chosen goals (see Agency).",
    },
    {
        "id": "odessa", "name": "Odessa Brightly", "pron": "she/her", "kind": "npc", "role": "Paint, Sails & Curios", "color": "#f2b5c4",
        "home": "Driftholm (Brightly's Curios)", "model": "none (no NPC model assigned)",
        "exists": "Sells paint, sails and flags. 2 lines (ui.ts:791, :999).",
        "lines_now": 2,
        "faction": "Driftholm",
        "want": "To sew a flag worth being afraid of: the Tidebreaker colours.",
        "wound": "Lost her own boat to vanity: she painted it gold and Rustfang saw it from three miles away.",
        "voice": "Theatrical, affectionate insults, calls everyone 'darling'.",
        "arc": [
            ("Drift", "First cosmetic. 'A boat should look like its captain. Yours looks… damp.'"),
            ("Reach", "Wants Helios flare-red dye (a Rig Helios contract) and unlocks the Helios Sunburst flag sooner."),
            ("Stormwall", "Through the Wall, she sews the Tidebreaker colours, a unique flag shown on every vessel you own."),
        ],
        "new_lines": [
            ("Renown rank up", "They're talking about you on the pier, darling. Let's give them something to point at."),
            ("legendary cosmetic earned", "Stormbreaker grey. Finally, a captain I can dress."),
        ],
        "hook": "Odessa's Colours: the flag cosmetic gains an emblem layer (Grinning Sun, tidecurl, compass rose, from creative/branding) unlocked by Renown.",
    },
    {
        "id": "sal", "name": "Old Sal", "pron": "she/her", "kind": "npc", "role": "Fish Trader", "color": "#9fd8c8",
        "home": "Rooftop Hollow", "model": "generic townsfolk",
        "exists": "Trader at the Hollow. 1 line (ui.ts:781).",
        "lines_now": 1,
        "faction": "Rooftop Hollow",
        "want": "Music. The Hollow hasn't heard a song since the generator died.",
        "wound": "Tomas's older sister. She stayed to keep the forty fed when everyone young left.",
        "voice": "Barter in every sentence. Never says no; says 'and?'",
        "arc": [
            ("Drift", "Buys anything that floats or sinks."),
            ("Reach", "Asks for the 'Songs for Dry Days' LP (Hollow Underfloors or the Leaning Block) and the Transistor Radio."),
            ("Reach", "The Hollow plays the LP. While docked there, the theme's lead stem plays the melody (src/audio/pack.ts MIX)."),
        ],
        "new_lines": [
            ("docking with Tomas aboard", "You're not fat. Why aren't you fat?"),
            ("delivering the LP", "…Turn it up. No. Louder."),
        ],
        "hook": "Sal's Swap: the Hollow pays in materials (rope, nails, canvas) instead of gold at a better rate, so each port prices differently.",
    },
    {
        "id": "nori", "name": "Nori Kettle", "pron": "he/him", "kind": "npc", "role": "Raft-wright", "color": "#d8c49f",
        "home": "Rooftop Hollow", "model": "generic townsfolk",
        "exists": "Shipwright at the Hollow (Trolling Rods and basic upgrades). 1 line (ui.ts:784).",
        "lines_now": 1,
        "faction": "Rooftop Hollow",
        "want": "To keep the building standing. The Hollow Underfloors are rotting.",
        "wound": "Watched the Leaning Block in Old Meridian start to go. Knows the Hollow is next.",
        "voice": "Practical, young and anxious, explains knots unprompted.",
        "arc": [
            ("Drift", "Sells Trolling Rods and gear."),
            ("Drift", "Contract: 8 Iron Nails and 4 Scrap Metal from the Hollow Underfloors to shore up the stilts."),
            ("Reach", "A new raft deck lashed beside the roof is built and visible: the Hollow grows because you helped."),
        ],
        "new_lines": [
            ("contract complete", "That's three more winters. Maybe four. I'll take four."),
            ("Hollow deck built", "Look at that. A floor that floats. Mum would've cried."),
        ],
        "hook": "Nori's Lashings: completing Hollow contracts adds visible structures to the settlement, a permanent change in the world.",
    },
    {
        "id": "dace", "name": "Foreman Dace", "pron": "he/him", "kind": "npc", "role": "Rig Trader", "color": "#f2b825",
        "home": "Rig Helios", "model": "generic townsfolk",
        "exists": "Trader at Helios. 1 line: 'Rig rules: everybody trades, nobody steals. Rustfang excepted.' (ui.ts:782)",
        "lines_now": 1,
        "faction": "Rig Helios",
        "want": "To keep the flare burning. Crude from the Lower Deck is running dry.",
        "wound": "Pays Rustfang a quiet tribute so they leave the rig alone. 'Rustfang excepted' is a lie.",
        "voice": "Rules, numbers, a handshake he means. Respects only the paid.",
        "arc": [
            ("Reach", "Docking at Helios (milestone m_helios): 'Rig rules.'"),
            ("Reach", "Contract: drive off a Rustfang raider (goal g_raiders) to protect a fuel run, paid in Alloy Plate."),
            ("Reach", "If you find his tribute ledger in Rustfang Hold, you choose: confront him (Helios prices up, Rustfang raids stop) or keep his secret (a discount for life)."),
        ],
        "new_lines": [
            ("first sale at Helios", "Fair price. Rig price. Don't argue, it's both."),
            ("after g_raiders", "Rustfang excepted. Ha. Not any more, eh?"),
        ],
        "hook": "Dace's Fuel Run: a repeatable contract to deliver Crude Oil from the Lower Deck to the flare for Alloy Plate. It opens the Ironwake's material path.",
    },
    {
        "id": "vik", "name": "Vik Ashby", "pron": "he/him", "kind": "npc", "role": "Rig Mechanic", "color": "#ff9f45",
        "home": "Rig Helios", "model": "generic townsfolk",
        "exists": "Sells the Twin Diesel Drive, Salvage Radar and Harpoon Turret. 1 line (ui.ts:785). The diesels are 'pulled from a harbour tug' (ship.ts:113).",
        "lines_now": 1,
        "faction": "Rig Helios",
        "want": "To be the best mechanic in the Reach, which means beating Juno.",
        "wound": "The 'harbour tug' was Juno's father's. Vik stripped it after the storm and has told himself it was abandoned.",
        "voice": "Salesman's patter over a mechanic's honesty. Everything is 'proper kit'.",
        "arc": [
            ("Reach", "Sells the Reach gear: 'Proper kit for the Reach.'"),
            ("Reach", "With Juno aboard, the Twin Diesel's description changes. Juno confronts him."),
            ("Reach", "Vik confesses and offers the diesels at cost, or Juno refuses them and builds her own (a choice: price or principle)."),
        ],
        "new_lines": [
            ("Juno aboard at Helios", "Vale. You look… exactly like him, actually."),
            ("confession", "It was drifting. It was. I told myself it was."),
        ],
        "hook": "Vik's Confession: the first branching NPC choice in the game. It changes a price and a crew bark, and it proves choices exist.",
    },
]

CAST_RELATIONS = [
    ("juno", "vik", "the tug"), ("juno", "marlo", "mentor"), ("tomas", "sal", "siblings"), ("tomas", "nori", "neighbours"),
    ("mara", "wren", "student, estranged"), ("wren", "marlo", "the Wren"), ("bram", "ines", "Rustfang past"),
    ("pip", "odessa", "pier rivals"), ("dace", "vik", "the rig"), ("kai", "wren", "Going Under"),
]

# ─────────────────────────────────────────────────────────────── 5. First Voyage
VOYAGE_NOW = [
    # id, text, verb kind, note
    ("steer", "Learn to steer", "move", "1.2 s of steering"),
    ("leave_dock", "Sail out of Driftholm", "move", "35 m from the pier"),
    ("reach_turtle", "Sail to the atoll to the west", "travel", "about 185 m, ~30 s"),
    ("anchor", "Drop anchor near the beach", "boat", "slow and tap ANCHOR"),
    ("ashore", "Go ashore", "mode", "tap GO ASHORE"),
    ("find_bottle", "Search the beach", "explore", "bottle on the south beach"),
    ("read_map", "Study the map scrap", "menu", "open MAPS"),
    ("dig_x", "Find the X and dig", "puzzle", "landmark clue, dig"),
    ("return_harbor", "Return to Driftholm", "travel", "about 300 m, dead leg"),
    ("sell", "Trade some finds with Pip", "shop", "first person spoken to"),
    ("catalog", "Look at your Discovery Catalog", "menu", "menu tour"),
    ("upgrade", "Buy your first upgrade from Marlo", "shop", "Canvas Mainsail"),
    ("free", "The world drowned. You didn't.", "end", "Captain's Log begins"),
]
VOYAGE_FINDINGS = [
    ("No salvage", "SALVAGE and the winch, the game's signature verbs, first appear as Captain's Log goal 1, after the tutorial (progress.ts:79)."),
    ("No people until step 10", "Pip is the first character the player meets. The crew, the legend and the raiders are all absent."),
    ("4 of 12 steps are menus or shops", "read_map, catalog, sell and upgrade teach UI, not the world. read_map and dig_x even share one completion check (game.ts:2088-2091)."),
    ("Zero choices", "One route, one order, one upgrade suggestion. Players learn that the game tells them what to do."),
    ("A dead return leg", "Turtle Atoll to Driftholm is about 300 m of empty sailing at the skiff's 6.5 m/s, with nothing scheduled on the way."),
    ("What is great: keep it", "The treasure dig. Bottle → map scrap → landmark clue → dig is the best-designed sequence in the game and the purest pirate fantasy. Every proposal keeps it as the centrepiece."),
]

VOYAGE_PROPOSALS = {
    "conservative": {
        "title": "Tighten: 13 → 8 steps",
        "pitch": "Same route, same content and the same ids. Merge the steps that teach a button and teach menus in context.",
        "steps": [
            "Cast off (steer + leave_dock)",
            "Sail to Turtle Atoll",
            "Go ashore (ANCHOR auto-prompts, then ashore)",
            "Search the beach",
            "Follow the clue and dig (the map opens itself on pickup: read_map merged)",
            "Sail home: the Sunken Tower is on the way, SALVAGE it (optional, but the marker passes it)",
            "Refit at Driftholm: sell to Pip, then fit a part with Marlo (sell + upgrade)",
            "The world drowned. You didn't. (free)",
        ],
        "impact": "First free choice arrives about 40% sooner. Every remaining step is a world verb. The winch is taught in the first session.",
        "impl": "Edit FIRST_VOYAGE (progress.ts:53). Keep the QuestStepId union intact and map retired ids to the next live step in store.advanceQuest and on load (saves stay valid). Show 'catalog' as a one-time toast on the first discovery. Update tests and play.cjs expectations.",
        "tradeoffs": "Fewer explicit lessons. Players who never open MAPS on their own need the auto-open. Low risk.",
        "validate": "Steps 13 → 8. PLAYCRAFT time-to-first-choice down by 30% or more. e2e: first voyage completes headless.",
    },
    "ambitious": {
        "title": "The Wren's Bottle: a voyage with a reason",
        "pitch": "The same treasure dig, framed by a person, a salvage, a rescue choice and a choice of first upgrade.",
        "steps": [
            "Old Wren at the pier: 'A bottle washed up on Turtle, the gulls say. Bring me what's inside.'",
            "Cast off. A flotsam patch on the way teaches easing through (10 s, optional)",
            "Turtle Atoll: ashore, the bottle, the clue, the dig. The chest lid is scratched 'R.F.'",
            "Kai's raft blips on the radar. RESCUE now (a 60 s detour) or later (g_crew keeps it)",
            "The Sunken Tower on the way home: the first SALVAGE and winch (Log g_salvage moves here)",
            "Driftholm: sell to Pip, then pick 1 of 3 starter parts at a welcome price (sail, rudder or crate)",
            "Wren reads the scrap: 'R.F. Redfinch. So he did come this way.' The Log opens on two leads",
        ],
        "impact": "The player meets 4 characters, uses all four core verbs (sail, dig, salvage, rescue) and makes 2 real choices before the Log starts. The legend begins on minute 2.",
        "impl": "Add an optional `branch` to QuestStep ({id, optional?: true, skipWhen?}). Wren's intro uses the existing revealInfo card. Inline rescue reuses CASTAWAYS cw_kai. The salvage reuses sv_stump. The starter choice is a one-time harbor sheet with three upgrade cards and a price multiplier. Move GOALS g_salvage/g_crew to auto-complete if done in the voyage (they already check state).",
        "tradeoffs": "Longer first session (about 9 to 12 minutes, against about 7 now) but with denser content. More branching to test. The starter discount changes early economy slightly.",
        "validate": "4 characters met and 2 choices made in the voyage. Story density in the first third ≥ 3 beats (STORYCRAFT). Retention proxy: PLAYCRAFT session continues past the voyage.",
        "recommended": True,
    },
    "wild": {
        "title": "Swamped: the cold open",
        "pitch": "Start on a raft breaking apart in a storm. Towed into Driftholm by Juno's father's tug, you get a skiff built from your raft's planks. Then pick any 2 of 3 leads in any order.",
        "steps": [
            "60-second storm prologue on a failing raft: steer, bail, hold on (it reuses storm cells and hull damage)",
            "Towed home (the existing 'Swamped' sequence, game.ts:896) and given the Patchwork Skiff by Marlo",
            "Wren's board offers 3 leads: Turtle's bottle, the Sunken Tower salvage, Kai's raft",
            "Complete any 2 → free play. The third stays on the Log",
        ],
        "impact": "The strongest first image and stakes. Agency from minute 3. The skiff feels earned and personal.",
        "impl": "A new prologue scene (raft model, scripted storm), a non-linear voyage (set-based completion) and a save flag. Prototype behind ?wild=swamped.",
        "tradeoffs": "Starting with danger before control can lose touch-screen players. It costs the most art and tuning, and it competes with the calm-sea title screen.",
        "validate": "A/B against the Conservative voyage: prologue completion ≥ 90%, first-session length and replays.",
    },
}

# ─────────────────────────────────────────────────────────────── 6. Agency & Exploration
AGENCY = {
    "lede": (
        "Agency scores 0.5 / 10. The Captain's Log is a good spine but a single road. The world is full of places "
        "the player could choose between, but nothing offers them a choice. The fix is to offer leads, let the "
        "player pick, and make picks change something they can see."
    ),
    "conservative": {
        "title": "Two Roads & Rumour Pins",
        "pitch": "The Captain's Log always shows the main goal plus one side lead. Wren's rumours become pins.",
        "changes": [
            "Log card gains a second line: one SIDE LEAD drawn from the open castaways, incomplete maps, unworked salvage sites and rumours. Tap to swap which one the marker follows.",
            "Wren's 4 rumours (ui.ts:977) become RumourDefs with a target. 'Pin it' puts a lead on the World Chart.",
            "Fill the empty north-west (6 of 9 cells empty) with 3 small discoveries on routes players already sail: a bell buoy, a drowned billboard and a lashed shrine, each with one line of lore and one find.",
        ],
        "impact": "Every session starts with a choice between two goals. Empty sea becomes a string of small promises.",
        "impl": "New src/data/rumours.ts (RumourDef). GOALS unchanged. updateGuidance gets a 'followSide' toggle. Three new POIS and small finds in world.ts. One new save field: pinned: string[].",
        "tradeoffs": "Two markers can confuse a new player, so show the side lead only after the First Voyage.",
        "validate": "Agency criterion ≥ 3 / 10 in the DESIGNCRAFT re-run. Empty cells 19 → ≤ 16. Playtest: sessions in which the player chose the side lead ≥ 40%.",
    },
    "ambitious": {
        "title": "Contracts, Renown & the Green Choice",
        "pitch": "Every NPC posts contracts. Ports remember what you did. Living plants pose the game's central choice.",
        "changes": [
            "CONTRACTS: each of the 8 NPCs offers 1 to 3 contracts at a time (deliver, salvage, rescue, escort, survey, donate). Each has a giver, a target place, a reward and an arc beat. Examples: Nori's nails, Sal's LP, Dace's Fuel Run, Pip's Photograph.",
            "RENOWN per port (Driftholm, Hollow, Helios): contracts raise it, and ranks unlock prices, crew lines and visible growth (Nori's raft deck, Pip's Museum, a second flare at Helios).",
            "THE GREEN CHOICE: a living plant can be SOLD (gold), DONATED to the Driftholm garden (the garden visibly grows on the hill, and fresh food raises crew perks by 10%), or CARRIED to the Hollow roof (Tomas's beat). It is the moral spine of the game and needs no violence.",
        ],
        "impact": "Turns 14 characters into reasons to sail, gives every port a living state and makes 'green means alive' a decision as well as a colour.",
        "impl": "New src/data/contracts.ts (ContractDef), renown in the save (renown: Record<settlementId, number>), garden stages in drowned.ts keyed on donations, and a harbor-panel 'Board' tab. It reuses the existing salvage, castaway and map completion checks as contract conditions.",
        "tradeoffs": "Large surface area: about 24 contracts to write and balance. Selling plants versus donating them must be balanced so neither is obviously right.",
        "validate": "Mission design rises from 0 (untested) to ≥ 8 / 15. Choices with consequences ≥ 3. Playtest: split of donate versus sell between 30/70 and 70/30.",
        "recommended": True,
    },
    "wild": {
        "title": "Letters of Marque",
        "pitch": "Pick a side in the Reach. Privateer for Helios against Rustfang supply skiffs, or pay Rustfang and sail untouched.",
        "changes": [
            "At Renown 2 with Helios, Dace offers a Letter of Marque. At Rustfang Hold, the raiders offer the Rust Token.",
            "Privateer: raider skiffs carry prize cargo and their driven-off skiffs drop it. Helios prices drop, and raiders hunt you harder.",
            "Rust Token: raider zones go quiet, Helios prices rise, Ines leaves the crew (or confronts you).",
        ],
        "impact": "The most 'pirate' choice possible, with consequences for crew, prices and the map.",
        "impl": "Faction state, raider behaviour branches in raiders.ts, a crew-leave event and two new items. Prototype behind ?wild=marque.",
        "tradeoffs": "Risks a darker tone than 'cheeky menace'. Crew leaving can feel punitive. It needs careful balance with g_raiders.",
        "validate": "Playtest: perceived freedom rating, a 50/50-ish faction split, and no softlock of g_raiders.",
    },
}

# ─────────────────────────────────────────────────────────────── 7. Dinghy to Pirate Ship
PROGRESSION = {
    "lede": (
        "The boat is the game, and the code already proves it: every upgrade is a visible model (ship/shipModel.ts). "
        "The ladder has three rungs: Patchwork Skiff (whose id is literally 'dinghy'), Scrap Trimaran and Ironwake. "
        "Between rungs the price jumps 420 → 1,400 gold (3.3×), and nothing on the boat tells the player who they "
        "are becoming. The original art direction drew this as a four-ship arc, leaky dinghy → sloop → brig → grand "
        "Tidebreaker (creative/ships). The fantasy is there; the middle rung is missing."
    ),
    "facts": [
        ("Upgrades", "19 upgrades cost 2,630 gold in total, plus materials"),
        ("Vessels", "Trimaran 420g + 21 mats · Ironwake 1,400g + 24 mats"),
        ("Guaranteed income", "Captain's Log 880g + milestones 1,325g + 2 treasure maps ~1,080g + placed finds ~2,270g"),
        ("Salvage EV / haul", "Drift 23–42g · Reach 42–183g · Spire 353g (respawn 4–15 min)"),
        ("Cost jump", "Skiff → Trimaran: 420g · Trimaran → Ironwake: 1,400g (3.3×)"),
    ],
    "ranks": [
        ("Scavenger", "Patchwork Skiff", "the Drift", "8 planks, a car bonnet, a billboard sail"),
        ("Rover", "Scrap Trimaran", "the Sunken Reach", "a real deck, fuel-tank floats"),
        ("Corsair", "Salt Brig (new)", "the Reach and the Graveyard", "square sails, harpoon broadside"),
        ("Tidebreaker", "Ironwake Expedition Cat", "the Stormwall and beyond", "twin armoured hulls, house-sized deck"),
    ],
    "conservative": {
        "title": "Refit Stages, Renown & a Name",
        "pitch": "No new hulls. Make the existing ladder read as becoming a pirate captain.",
        "changes": [
            "REFIT STAGES: each hull has three visible stages (Stripped, Rigged, Fitted Out), computed from upgrades installed on it. Rigged adds rope fenders and a pennant. Fitted Out adds a figurehead and a lantern.",
            "NAME HER: at the first upgrade, name the boat. The name shows on the stern, in Marlo's lines and in the Log.",
            "RENOWN TITLES: Scavenger → Rover → Tidebreaker, from milestones and goals already in progress.ts, shown on the Ship panel with Odessa's new flag emblems.",
        ],
        "impact": "Progress you can see on every rung, plus identity: 'Captain of the Gull's Folly, Rover of the Reach'.",
        "impl": "RefitStage table in ship.ts (data). shipModel.ts adds 4 small kit props (tb_boat_kit already has the fittings pipeline). Save fields shipName and renown. The UI touches only the Ship panel.",
        "tradeoffs": "Cosmetic. It doesn't fix the 3.3× price gap.",
        "validate": "Playtest: players can name their rank. The Ship panel shows a stage change at least once per region.",
    },
    "ambitious": {
        "title": "The Salt Brig: the missing rung",
        "pitch": "Add a fourth hull between the Trimaran and the Ironwake: a square-rigged brig built from Rustfang prize parts. It is the pirate ship of the game.",
        "changes": [
            "NEW VESSEL 'brig' (Salt Brig): speed 11.5, cargo 18, berths 3, hull 130, crossSwell true, crossStorm false. Cost 800g + Canvas 6 + Rope 6 + Alloy Plate 3 + the Gannet's Bell (prize).",
            "BROADSIDE: two harpoon mounts (port and starboard), so driving off raiders becomes positioning.",
            "Built at Rig Helios by Vik, or by Juno if you chose principle in the Vik arc.",
            "Smooths the jump: 420 → 800 → 1,400 (×1.9, ×1.75).",
        ],
        "impact": "The game finally has the pirate-ship moment, square sails over the Graveyard, at the emotional middle of the campaign.",
        "impl": "VesselId union + VESSELS entry (ship.ts:84). A new hull model via the GITCRAFT MeshCraft pipeline (creative/3d-*), shipModel slots for broadside, a GOALS entry between g_raiders and g_ironwake, and tests for slot/upgrade compatibility. Saves need no migration (new id only).",
        "tradeoffs": "One more hull to model, rig, balance and test on mobile performance. It lengthens the Reach chapter by about 30 to 45 minutes.",
        "validate": "Price-step ratio ≤ 2×. PLAYCRAFT: the Reach chapter has no grind plateau over 15 min. Playtest: 'the brig felt like a pirate ship' ≥ 70%.",
        "recommended": True,
    },
    "wild": {
        "title": "Take Her: claim the Ironwake",
        "pitch": "The Ironwake isn't bought. Its hull is Rustfang's hulk, chained inside the Hold. You take it, and Marlo makes it yours.",
        "changes": [
            "The Ironwake hull lies in Rustfang Hold. Bram knows the back way, and Ines can parley.",
            "A raid night: drive off 3 skiffs (or parley), winch the chain (salvage), tow her out.",
            "Marlo's refit still costs materials but only 600g. The Ironwake is now a prize with a story.",
        ],
        "impact": "Ship acquisition becomes the campaign's set-piece heist, the purest pirate beat in the game.",
        "impl": "A scripted event at op_hold, with a tow state on the boat, a new goal replacing g_ironwake's purchase, and a ?wild=takeher flag. The Ironwake model is reused.",
        "tradeoffs": "Scripted set-pieces are expensive and fragile on mobile. It removes a pure 'save up' goal some players enjoy.",
        "validate": "Playtest set-piece completion ≥ 85%, and the 'most memorable moment' survey.",
    },
}

# ─────────────────────────────────────────────────────────────── 8. Islands, Ports, Caves & Treasure
PLACES_RULE = (
    "The One-World rule: every place you can reach has (1) a person who talks about it, (2) one find only it has, "
    "(3) a boat capability that opens it and (4) a reason to come back. The table audits every existing place "
    "against the rule. Gaps are in rust; proposals that fill them are in brackets."
)
PLACES = [
    # place, who talks, unique find, gate, return reason
    ("Driftholm", "Pip, Marlo, Wren, Odessa", "the vault", "start", "home, trade, refit · [garden, museum]"),
    ("Turtle Atoll", "Wren (rumour)", "Turtle's Belly chest, seedling tin", "skiff", "GAP · [sea cave: the Belly]"),
    ("Lantern Rock", "Wren (rumour)", "keeper's sea-chest, live moss", "Barnacled Key", "GAP · [night cave, needs deck lights]"),
    ("Gull Shoal · the Wren", "Wren (rumour)", "Redfinch's Chart (left)", "copper hull", "GAP · [Wren's colours, Old Wren beat]"),
    ("Sunken Tower", "Log goal 1", "transistor radio", "none", "respawn 4 min"),
    ("Box Yard", "nobody", "electronics", "none", "GAP · [Pip contract]"),
    ("Rooftop Hollow", "Sal, Nori", "Hollow Underfloors dive", "none", "trade · [Nori deck, Sal's LP]"),
    ("Old Meridian", "Bram (castaway)", "street sign, polaroid", "trimaran", "[Mara's Survey]"),
    ("Rig Helios", "Dace, Vik", "rig badge, crude", "trimaran", "Reach gear · [fuel run, brig yard]"),
    ("Canopy Rise", "nobody", "all rare/epic/legendary green", "trimaran", "GAP · [Green Choice, waterfall cave]"),
    ("Rustfang Hold", "nobody", "nothing (dressing only)", "trimaran", "GAP · [Gannet, ledger, Take Her]"),
    ("Meridian Spire", "Log goal 9", "Chart of the Last Summit", "Ironwake", "[Wren finale, Summit]"),
    ("Outposts ×5", "nobody", "nothing", "none", "GAP · [Kai: Going Under · Tomas: Last Call]"),
]
CAVES = {
    "lede": "The game has no caves, but its clues already describe them: 'Dig where the turtle keeps its lunch.' Caves are the treasure-island fantasy's missing room.",
    "conservative": {
        "title": "Cave Mouths as Dig Sites",
        "pitch": "Three sea-cave mouths on existing islands, each a lit, shallow dig site. No interiors.",
        "changes": [
            "New LandmarkType 'cave' (world.ts:5) on Turtle Atoll ('the Belly', which fits the existing clue), Lantern Rock (the smugglers' undercut) and Canopy Rise (behind the existing waterfall landmark).",
            "Each cave holds one cache that glints only at night with String Lights & Spotlight (deck_lights), which gives the lighting slot gameplay for the first time.",
        ],
        "impact": "The lighting upgrade becomes a key. The night cycle gets a reason. The treasure fantasy gains a set-piece.",
        "impl": "Landmark + cache data, one cave-mouth model from GITCRAFT MeshCraft (tb_landmark_kit), and a light check in the cache-glint code. 1 PR.",
        "tradeoffs": "Not real caves: the expectation of going inside may disappoint.",
        "validate": "Deck lights purchase rate up. 3 new discoveries in the Catalog.",
    },
    "ambitious": {
        "title": "Drowned Interiors",
        "pitch": "Two walkable interiors using the existing on-foot mode: the Hollow Underfloors and the belly of the tanker Meridian Star.",
        "changes": [
            "Enter from SALVAGE sites (sv_hollow_sub, sv_tanker): a short on-foot interior with 3 to 5 search points and one story find.",
            "The tanker belly connects to Rustfang Hold: Bram's back way.",
        ],
        "impact": "Real dungeon-like spaces with darkness, echo and a reward that matters.",
        "impl": "A new scene type in the game loop (interior), a camera mode, two GITCRAFT interior kits and audio reverb.",
        "tradeoffs": "Biggest technical cost in this bible. Needs a mobile performance budget.",
        "validate": "PLAYCRAFT interior frame time ≤ 20 ms on iPhone 13 profile. Completion ≥ 80%.",
    },
    "wild": {
        "title": "Tide Caves",
        "pitch": "A tide cycle tied to the day clock. Some caves open only at low tide (dawn and dusk) and flood at high tide.",
        "changes": ["Tide height drives ocean.ts level offset ±0.6 m. Three caves are tide-gated. A Tide Table becomes a navigation upgrade."],
        "impact": "Time becomes a resource. Planning a voyage gains a new axis.",
        "impl": "Global water-level offset (ocean, terrain wading checks, anchor depth). High systemic risk.",
        "tradeoffs": "Touches every water check in the game. Prototype only.",
        "validate": "No regressions in e2e. Playtest comprehension of tide timing ≥ 70%.",
    },
}
TREASURE = {
    "lede": "Two treasure maps exist. Both are excellent, and both already belong to one story: Redfinch. The Redfinch Line turns them into a six-map saga that crosses every region, where each map needs a different boat capability. Exploring the world becomes reading a legend.",
    "maps": [
        ("1", "The Turtle's Belly", "EXISTS", "Turtle Atoll", "skiff", "Small chest · lid scratched 'R.F.' (new line)"),
        ("2", "Redfinch's Sun Hoard", "EXISTS", "Canopy Rise", "copper hull + key + trimaran", "Grand chest · Sun Mask · Wren's handwriting"),
        ("3", "The Keeper's Light", "NEW", "Lantern Rock cave", "deck lights (night)", "Redfinch's log: why he sailed"),
        ("4", "The Broadcast Cache", "NEW", "Broadcast Spire", "salvage crane (heavy)", "Radio log: the Wren's last call"),
        ("5", "Under the Rust", "NEW", "Rustfang Hold", "Bram's way / Ines's parley", "The Gannet's Bell · Dace's ledger"),
        ("6", "Chart of the Last Summit", "EXISTS", "Meridian Spire", "Ironwake", "Wren's hand · 'He made it.'"),
    ],
}
UPGRADE_KEYS = [
    # upgrade, opens, who, what
    ("Canvas Mainsail", "speed for the dead return leg", "Marlo", "faster legend runs"),
    ("Copper-Banded Hull", "Gull Shoal reef", "Wren", "the Wren wreck, chart left half"),
    ("Salvaged Outboard", "Juno signs on", "Juno", "windless travel, fuel economy"),
    ("Brass Compass", "points to the active map's X", "Wren", "every treasure map"),
    ("String Lights", "night caves glint (new)", "Kai", "Keeper's Light, cave caches"),
    ("Salvage Crane", "heavy sites (Rig, Tanker, Spire)", "Bram", "Broadcast Cache, Gannet"),
    ("Harpoon Turret", "Ines signs on, raiders", "Ines", "Rustfang Hold, parley"),
    ("Container Cabin", "+2 berths, aboard workbench", "Mara", "a full crew of six"),
    ("Scrap Trimaran", "the open swell", "Marlo", "the Reach, Helios, Canopy"),
    ("Ironwake", "the Stormwall", "Marlo, Juno", "the Spire, the Summit"),
]

# ─────────────────────────────────────────────────────────────── 9. Examples
EXAMPLES = [
    {
        "title": "Minutes 0–12: the Wren's Bottle (Ambitious voyage)",
        "beats": [
            ("0:00", "Title orbit over Driftholm. SET SAIL. Old Wren at the pier, lantern up: 'A bottle washed up on Turtle…'", "character · motivation"),
            ("0:40", "Drag the wheel; cast off north. Gulls. A drifting algae mat: 'Ease off to pick through it.' 2 Algae Mats.", "steer · flotsam"),
            ("1:30", "Turtle Atoll rises, a dead coral ring. ANCHOR prompts in the turquoise. GO ASHORE.", "anchor · ashore"),
            ("2:30", "A glint on the south beach: the bottle. The map scrap opens itself: 'Stand between the grinning skull and the two sisters…'", "explore · clue"),
            ("4:00", "Shovel rings loose sand. The chest: doubloons, a pearl, the Turtle Idol. The lid is scratched 'R.F.'", "dig · legend seed"),
            ("5:30", "Back aboard. The radar blips: a raft with a ragged flag. Kai waves both arms. RESCUE (+60 s) or press on?", "choice 1"),
            ("7:00", "The Sunken Tower looms. SALVAGE. The winch: three green-zone hits. Transistor Radio and scrap.", "salvage · winch"),
            ("9:00", "Driftholm. Pip: 'Ooh!' Sell the idol. Marlo lays out three parts: sail, rudder or crate. Pick one.", "trade · choice 2"),
            ("11:00", "Wren turns the lid over: 'R.F. Redfinch. So he did come this way.' The Log opens on two leads.", "legend · agency"),
        ],
    },
    {
        "title": "Hour 3: an evening in the Reach (Phase 2 systems)",
        "beats": [
            ("18:40", "The Trimaran (named Gull's Folly) leaves Helios with Dace's Fuel Run contract: 6 crude to the flare.", "contract"),
            ("18:55", "Mara: 'Third roof left, chalk mark. Mine.' A survey shape appears over Old Meridian. Detour or deliver?", "choice · character"),
            ("19:10", "Kai: 'Rustfang skiffs! Coming in hard!' Ines on the harpoon. A raider yells 'Ferro?!' Bram goes quiet.", "combat · arc beat"),
            ("19:30", "Third chalk roof: a cache with the Photograph of Dry Land, Pip's wanted item.", "exploration payoff"),
            ("19:50", "Dusk at the flare. Dace pays in Alloy Plate. Renown Helios 2: Vik offers the Salt Brig yard.", "renown · progression"),
            ("20:05", "Tomas spots soil in the hold's manifest: the Potted Green from Canopy. Sell at Helios for 130g, or carry it home?", "the Green Choice"),
        ],
    },
]

# ─────────────────────────────────────────────────────────────── 10. Roadmap & brief
MATRIX = [
    # area, tier, title, impact 1-5, effort 1-5, risk, recommendation
    ("Characters", "C", "Voices for all 14 (≥ 6 lines each)", 4, 1, "low", "Phase 1"),
    ("Characters", "A", "Three-beat arcs + Vik/Juno choice", 5, 3, "med", "Phase 2 · rec."),
    ("Characters", "W", "Old Wren joins the final voyage", 3, 2, "low", "Phase 3"),
    ("First Voyage", "C", "Tighten 13 → 8", 3, 1, "low", "Phase 1"),
    ("First Voyage", "A", "The Wren's Bottle", 5, 3, "med", "Phase 2 · rec."),
    ("First Voyage", "W", "Swamped cold open", 4, 4, "high", "Prototype"),
    ("Agency", "C", "Two Roads & Rumour Pins", 4, 2, "low", "Phase 1"),
    ("Agency", "A", "Contracts, Renown, Green Choice", 5, 4, "med", "Phase 2 · rec."),
    ("Agency", "W", "Letters of Marque", 4, 4, "high", "Prototype"),
    ("Progression", "C", "Refit stages, Renown, Name her", 3, 2, "low", "Phase 1"),
    ("Progression", "A", "The Salt Brig", 5, 4, "med", "Phase 2 · rec."),
    ("Progression", "W", "Take Her (Ironwake heist)", 4, 5, "high", "Prototype"),
    ("Places", "C", "Cave mouths + Redfinch maps 3", 4, 2, "low", "Phase 1"),
    ("Places", "A", "Redfinch Line 4–5 + interiors", 5, 5, "high", "Phase 2 (maps) · rec."),
    ("Places", "W", "Tide caves", 3, 5, "high", "Prototype"),
]
PHASES = [
    ("Phase 1 · Voices & Shape", "Conservative tier, 5 PRs, data and copy first", [
        "PR 1.1 Characters: src/data/characters.ts with 14 CharacterDefs, lines by trigger, wired to say()/toast. Every character ≥ 6 lines.",
        "PR 1.2 First Voyage 13 → 8 with retired-id migration.",
        "PR 1.3 Two Roads Log + rumours.ts + 3 north-west discoveries.",
        "PR 1.4 Refit stages, ship name, Renown titles on the Ship panel.",
        "PR 1.5 Cave mouths ×3 (deck-lights glint) + treasure map 3, The Keeper's Light.",
    ]),
    ("Phase 2 · The Living Adventure", "Ambitious items marked RECOMMENDED", [
        "PR 2.1 The Wren's Bottle voyage (replaces 1.2's list; keeps its migration).",
        "PR 2.2 Contracts + port Renown + the Green Choice (Driftholm garden stages).",
        "PR 2.3 Character arcs: beats wired to contracts and places; Vik/Juno choice.",
        "PR 2.4 The Redfinch Line maps 4–5 + the Gannet + Dace's ledger.",
        "PR 2.5 The Salt Brig (MeshCraft hull, broadside, goal).",
    ]),
    ("Phase 3 · Wild Cards", "Prototypes behind ?wild= flags, one at a time", [
        "?wild=swamped, ?wild=marque, ?wild=takeher, ?wild=tides: each ships only after a playtest beats its Conservative counterpart.",
    ]),
]
SCHEMAS = r'''// src/data/characters.ts (new)
export type LineTrigger =
  | 'meet' | 'join' | 'dock' | 'storm' | 'raiders' | 'haul' | 'green'
  | 'upgrade' | 'region' | 'night' | 'contract' | 'beat';
export interface CharacterLine { trigger: LineTrigger; when?: string; text: string; voice?: VoiceId }
export interface ArcBeat { id: string; region: RegionId; place: string; requires: string; text: string; reward?: string }
export interface CharacterDef {
  id: string; name: string; pronouns: string; kind: 'crew' | 'npc';
  home: string; want: string; wound: string; voice: string;
  lines: CharacterLine[]; arc: ArcBeat[]; hook: string;
}
// src/data/contracts.ts (new, Phase 2)
export interface ContractDef {
  id: string; giver: string; settlement: string;
  kind: 'deliver' | 'salvage' | 'rescue' | 'escort' | 'survey' | 'donate';
  target: { item?: string; n?: number; site?: string; place?: { x: number; z: number } };
  reward: { gold?: number; mats?: { id: string; n: number }[]; renown: number };
  beat?: string; // ArcBeat id this contract advances
}
// save (store.ts): v2 -> v3 adds  shipName, renown, pinned, contracts, beats, garden'''
GUARDRAILS = [
    "Never rename or delete an existing id (items, upgrades, vessels, goals, quest steps, sites). Add, alias, migrate.",
    "Saves: bump to v3 with a forward migration and a test, like the v1 → v2 migration in store.ts.",
    "Green stays reserved for living things, and the existing unit test must still pass.",
    "Every new upgrade or vessel is visible on the boat (the README's core promise).",
    "Mobile first: 44 px touch targets, ≥ 12 px text, iPhone SE and 13 profiles (PIXELCRAFT pass rules).",
    "New characters' lines go in data, not in UI code. VOICE_LINES audio is optional; text toasts are required.",
    "Every PR: npm test, npm run build, tests/e2e/play.cjs, and a live preview link in the PR.",
]
ACCEPTANCE = [
    ("Characters", "14 / 14 with ≥ 6 lines and ≥ 2 beats", "0 / 14 with ≥ 2 beats; Mara has 1 line"),
    ("First Voyage", "≤ 8 steps (P1) · 4 characters + 2 choices (P2)", "13 steps, 0 choices, 1 character"),
    ("Agency (DESIGNCRAFT)", "≥ 5 / 10", "0.5 / 10"),
    ("Narrative (DESIGNCRAFT)", "≥ 9 / 15", "2.6 / 15"),
    ("Mission design (DESIGNCRAFT)", "≥ 8 / 15 (contracts measured)", "0 / 15 (untested)"),
    ("Empty map cells", "≤ 16 / 36", "19 / 36"),
    ("Price step between hulls", "≤ 2×", "3.3×"),
    ("Places obeying the One-World rule", "13 / 13", "4 / 13"),
]

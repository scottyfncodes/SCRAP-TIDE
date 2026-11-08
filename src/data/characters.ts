// The 14 named people of the Drift: who they are and what they say, by trigger.
// Source: creative/design-bible (World & Voyage Design Bible, Phase 1 · PR 1.1).
// Tone: a drowned world held together with rust, rope and diesel. Water, fuel and dirt are worth more than gold, and
// "dryland" is a rumour nobody alive has stood on. These are survivors and scavengers, not storybook pirates.
//
// A line fires when its trigger happens. `when` narrows it to a context key the caller passes (a settlement id, a
// region, 'solar', 'tomas_aboard'…); a line without `when` is the fallback for its trigger.

export type LineTrigger =
  | 'dock' // an NPC's greeting in their port, or a crew member's remark on docking
  | 'join' // signs on
  | 'upgrade' // a part is fitted
  | 'hull' // the hull is in trouble
  | 'storm'
  | 'raiders' // Rustfang sighted
  | 'repelled' // a raider driven off
  | 'haul' // salvage hauled up
  | 'green' // something alive comes aboard
  | 'fish'
  | 'region' // first time into a region
  | 'poi' // first sight of a named place
  | 'night'
  | 'upwind'; // the sails are luffing: pointed too close to the wind

export interface CharacterLine {
  trigger: LineTrigger;
  when?: string;
  text: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  pronouns: string;
  kind: 'crew' | 'npc';
  role: string;
  home: string; // settlement id, or 'castaway'
  want: string;
  wound: string;
  voice: string;
  lines: CharacterLine[];
}

const L = (trigger: LineTrigger, text: string, when?: string): CharacterLine => (when ? { trigger, text, when } : { trigger, text });

export const CHARACTERS: CharacterDef[] = [
  // ───────────── crew (src/data/crew.ts) ─────────────
  {
    id: 'juno', name: 'Juno Vale', pronouns: 'she/her', kind: 'crew', role: 'Mechanic', home: 'driftholm',
    want: 'An engine that never drinks a drop of crude.',
    wound: 'Her father ran the Driftholm tug. Three winters ago its twin diesels vanished.',
    voice: 'Dry and quick. Talks to engines like difficult dogs.',
    lines: [
      L('join', 'You can’t keep an outboard alive? Lucky for you, I can.'),
      L('upgrade', 'Bolted, patched and prayed over. She’ll hold.'),
      L('upgrade', 'Sun in, fuel out. One day we won’t need a drop of crude.', 'solar'),
      L('hull', 'She’s taking water! Give me two minutes and a hammer!'),
      L('dock', 'Don’t buy anything off Vik until I’ve looked at it.', 'helios'),
      L('storm', 'Wind’s ripping the canvas. Engine’s fine. Engine’s always fine.'),
      L('upwind', 'Sails are flapping like washing. Bear away, or let me start the engine.'),
      L('night', 'Hear that knock in the prop shaft? No? Good. Neither do I.'),
    ],
  },
  {
    id: 'tomas', name: 'Tomas Reyes', pronouns: 'he/him', kind: 'crew', role: 'Fisher', home: 'hollow',
    want: 'One last run of fish nobody has caught before.',
    wound: 'Forty years on one roof. His sister Sal never forgave him for staying.',
    voice: 'Slow and warm. Measures everything in tides and meals.',
    lines: [
      L('join', 'Forty years on that roof. Take me where the fish haven’t heard of me.'),
      L('fish', 'Silverfin on the line. We eat tonight.'),
      L('dock', 'Forty years I looked at the sea from up there. It’s better from down here.', 'hollow'),
      L('green', 'My mother grew beans in a boot. Real beans. I never believed her.'),
      L('storm', 'Rain’s fresh water, Captain. Open your mouth and steer.'),
      L('upwind', 'You’ll not catch the wind pointing straight at it. Fall off a little.'),
      L('region', 'Swell like this, the fish go deep. So do sensible people.', 'emerald'),
      L('night', 'Fish rise at first light. So do fools. We’re both.'),
    ],
  },
  {
    id: 'kai', name: 'Kai', pronouns: 'they/them', kind: 'crew', role: 'Lookout', home: 'castaway',
    want: 'To find out who cut their family’s platform loose.',
    wound: 'Eleven days alone on a raft. Home was the platform called Going Under.',
    voice: 'Few words, all of them sightings. Counts everything.',
    lines: [
      L('join', 'Eleven days on that raft. I saw you coming from six miles out.'),
      L('storm', 'Storm ahead, Captain. Go round, or brace.'),
      L('upwind', 'She’s luffing, Captain. Wind’s right on the nose.'),
      L('storm', 'Storm on us! Hold her steady, she’ll take a beating.'),
      L('raiders', 'Rustfang skiffs! Coming in hard!'),
      L('green', 'Is that… green? Captain, that thing is alive.'),
      L('haul', 'Counted the bubbles. Eleven. Something big came up.'),
      L('region', 'Open swell. I can see twelve miles and none of it is land.', 'emerald'),
      L('night', 'Lights on the horizon. Not ours. Not close. Yet.'),
      L('night', 'You lit us up. Every raider in the Drift can see us now. Good. Let them look.', 'lights'),
      L('poi', 'That’s ours. That was ours. Don’t stop. …No. Stop.', 'sinking'),
    ],
  },
  {
    id: 'mara', name: 'Mara Okonkwo', pronouns: 'she/her', kind: 'crew', role: 'Navigator', home: 'helios',
    want: 'To chart the waters nobody has charted.',
    wound: 'Old Wren taught her, then threw her out of Driftholm for selling a chart to Rustfang.',
    voice: 'Precise and proud. Corrects your heading. Laughs only at good maps.',
    lines: [
      L('join', 'I charted every roof in Old Meridian. For a share of the haul I’ll chart them for you.'),
      L('dock', 'If Wren asks, I’m crew. Just crew.', 'driftholm'),
      L('poi', 'Third roof left, chalk mark. Mine. Fifteen years old and still right.', 'meridian'),
      L('haul', 'Nearest unworked site, two points off the bow. You’re welcome.'),
      L('storm', 'Barometer’s falling like a stone. I’d turn. You won’t.'),
      L('upwind', 'Forty-five degrees off the wind and she flies. Nose into it, she crawls.'),
      L('region', 'Open water at last. A sea worth charting.', 'emerald'),
      L('region', 'Nobody has drawn this. Hold her steady and I will.', 'stormwall'),
      L('night', 'Stars are the only chart nobody ever drowned.'),
    ],
  },
  {
    id: 'bram', name: 'Bram Steele', pronouns: 'he/him', kind: 'crew', role: 'Salvager', home: 'castaway',
    want: 'His boat back. Rustfang took the Gannet.',
    wound: 'Paid Rustfang tribute for years. He knows their routes and hates that he does.',
    voice: 'Big and gentle. Talks to the dead whose things he brings up.',
    lines: [
      L('join', 'Rustfang took my boat. I know where they keep the good stuff.'),
      L('haul', 'Easy… easy. There. The sea gave something back.'),
      L('haul', 'Somebody lived down there once. Kept this safe, right till the water came.', 'first'),
      L('raiders', 'Rustfang colours. Don’t let them board. Don’t let them talk.'),
      L('upwind', 'The Gannet hated a head wind too. Turn her a touch and she’ll fill.'),
      L('poi', 'That gate’s made from my boat. I’d know those rivets anywhere.', 'hold'),
      L('night', 'My boat had a name. The Gannet. Say it sometimes, so it’s still a boat.'),
    ],
  },
  {
    id: 'ines', name: 'Ines Ferro', pronouns: 'she/her', kind: 'crew', role: 'Defender', home: 'helios',
    want: 'To be the reason a voyage stays quiet.',
    wound: 'She rode with Rustfang. The road-sign armour is theirs.',
    voice: 'Short, flat, funny by accident. Never shouts.',
    lines: [
      L('join', 'Show me a harpoon, and I’ll show you a quiet voyage.'),
      L('raiders', 'Hold the wheel steady. I’ve got the ugly one.'),
      L('repelled', 'Hooked. Let them swim home and tell the others.'),
      L('repelled', 'And stay out!'),
      L('storm', 'Storms are honest. They don’t pretend they aren’t trying to kill you.'),
      L('upwind', 'We’re in irons, near enough. Bear off before someone sees us like this.'),
      L('poi', 'Don’t look at the gate. Look at the gaps in it.', 'hold'),
      L('night', 'This. This is what I signed for.'),
    ],
  },
  // ───────────── settlement NPCs (src/ui/ui.ts NPCS) ─────────────
  {
    id: 'pip', name: 'Pip Farthing', pronouns: 'he/him', kind: 'npc', role: 'Trader', home: 'driftholm',
    want: 'A museum of the old world on one dry shelf.',
    wound: 'Owns a Photograph of Dry Land. Can’t tell if it’s real.',
    voice: 'Delighted by everything. Haggles like it’s a game.',
    lines: [
      L('dock', 'Ooh, what did the sea cough up today? Let’s have a look.', 'sellable'),
      L('dock', 'Bring me the old world and I’ll give you gold.', 'empty'),
      L('dock', 'Everything on the rafts has a price. Even you. Especially you.'),
      L('dock', 'Careful with that crate. If it’s old-world, it’s worth more than your hull.'),
      L('dock', 'The Catalog keeps the record forever. The sea doesn’t remember anything.'),
      L('dock', 'Is that dirt on your boots? Real dirt? Don’t sell it. I mean it.', 'green'),
    ],
  },
  {
    id: 'marlo', name: 'Marlo Keelhart', pronouns: 'he/him', kind: 'npc', role: 'Shipwright', home: 'driftholm',
    want: 'One hull that comes back from the Stormwall.',
    wound: 'He built the Wren for Redfinch. She never came back.',
    voice: 'Gruff and proud. Speaks in guarantees.',
    lines: [
      L('dock', 'Every plate I weld, you’ll see. That’s my guarantee. Also my only guarantee.'),
      L('dock', 'A hull is a promise. Mostly a promise to leak.'),
      L('dock', 'Bring me steel, not stories. I’ve heard every story the Drift has.'),
      L('dock', 'Eight planks and a car bonnet. I’ve seen coffins with better lines. Let’s fix that.', 'bare'),
      L('dock', 'You’ve been letting the sea chew on her. Give her here.', 'damaged'),
      L('dock', 'Fuel-tank floats. Ugly as sin. She’ll cross the swell anyway.', 'sloop'),
      L('dock', 'I built one boat for that wall before. She didn’t come back. This one will.', 'ironwake'),
      L('dock', 'How’s the {ship} holding? Don’t answer. I can hear her from here.', 'named'),
    ],
  },
  {
    id: 'wren', name: 'Old Wren', pronouns: 'she/her', kind: 'npc', role: 'Cartographer', home: 'driftholm',
    want: 'Someone to finish the voyage Redfinch started.',
    wound: 'She was the Wren’s navigator. She stayed ashore the night they sailed.',
    voice: 'Riddles that turn out to be instructions.',
    lines: [
      L('dock', 'A map fragment! Show it to old Wren.', 'fragment'),
      L('dock', 'Every chart is a promise someone forgot to keep.'),
      L('dock', 'Dryland. Everyone says it. Nobody’s walked on it. I’d like to, once.'),
      L('dock', 'The water took the coast in a week. It took the maps in an afternoon.'),
      L('dock', 'Read the water, not the sky. The sky lies about storms.'),
      L('dock', 'So you’ve seen the Reach. Then you’ve seen what we used to be.', 'reach'),
    ],
  },
  {
    id: 'odessa', name: 'Odessa Brightly', pronouns: 'she/her', kind: 'npc', role: 'Paint & Curios', home: 'driftholm',
    want: 'To paint a flag worth being afraid of.',
    wound: 'Painted her own boat gold. Rustfang saw it from three miles.',
    voice: 'Theatrical. Insults you affectionately. Calls everyone “darling”.',
    lines: [
      L('dock', 'A boat should look like its captain. Yours looks… damp.'),
      L('dock', 'Paint is a warning, darling. Rust says “easy prey”. Red says “try it”.'),
      L('dock', 'Out here you’re either noticed or you’re salvage. Let’s get you noticed.'),
      L('dock', 'Flags aren’t decoration. They tell people who’ll come looking when you sink.'),
      L('dock', 'I painted my last boat gold. Rustfang saw it from three miles. Learn from me.'),
      L('dock', 'Rare pieces come from the sea, darling, not from me. But I do a lovely red.'),
    ],
  },
  {
    id: 'sal', name: 'Old Sal', pronouns: 'she/her', kind: 'npc', role: 'Fish Trader', home: 'hollow',
    want: 'Music on the roof again.',
    wound: 'Tomas’s older sister. She stayed to keep the forty fed.',
    voice: 'Barter in every sentence. Never says no. Says “and?”',
    lines: [
      L('dock', 'Fish, scrap, old records… I buy what floats and what sinks.'),
      L('dock', 'Forty of us on one roof. Everything you sell me, somebody eats or burns.'),
      L('dock', 'The building groans at night. We sing louder.'),
      L('dock', 'And? That’s not a price, that’s a starting point.'),
      L('dock', 'No music on this roof since the generator died. Find me a record and I’ll owe you.'),
      L('dock', 'You’re not fat. Why aren’t you fat? He’s not feeding you, is he.', 'tomas_aboard'),
    ],
  },
  {
    id: 'nori', name: 'Nori Kettle', pronouns: 'he/him', kind: 'npc', role: 'Raft-wright', home: 'hollow',
    want: 'To keep the Hollow standing one more winter.',
    wound: 'Watched the Leaning Block start to go. Knows the Hollow is next.',
    voice: 'Practical, young, anxious. Explains knots nobody asked about.',
    lines: [
      L('dock', 'Rods, rafts and rope. We keep it simple up here.'),
      L('dock', 'Three knots hold the whole Hollow together. I check every one, every morning.'),
      L('dock', 'The underfloors are rotting. If you dive down there, bring up nails, not just pretty things.'),
      L('dock', 'Rope’s the one thing the flood couldn’t make worthless.'),
      L('dock', 'You can tell a raft-wright by the fingers. Count mine. Go on.'),
      L('dock', 'Lash it twice. The sea checks your work at night.'),
    ],
  },
  {
    id: 'dace', name: 'Foreman Dace', pronouns: 'he/him', kind: 'npc', role: 'Rig Trader', home: 'helios',
    want: 'To keep the flare burning.',
    wound: 'Pays Rustfang a quiet tribute. “Rustfang excepted” is a lie.',
    voice: 'Rules, numbers, and a handshake he means.',
    lines: [
      L('dock', 'Rig rules: everybody trades, nobody steals. Rustfang excepted.'),
      L('dock', 'Fair price. Rig price. Don’t argue, it’s both.'),
      L('dock', 'The flare’s burned forty years. It goes out, the Reach goes dark.'),
      L('dock', 'Crude’s running thin on the lower deck. Bring me barrels and I’ll make it worth your while.'),
      L('dock', 'Water costs more than diesel out here. Don’t spill either.'),
      L('dock', 'Heard you put a harpoon in a Rustfang skiff. The rig remembers favours.', 'repelled'),
    ],
  },
  {
    id: 'vik', name: 'Vik Ashby', pronouns: 'he/him', kind: 'npc', role: 'Rig Mechanic', home: 'helios',
    want: 'To be the best mechanic in the Reach, which means beating Juno.',
    wound: 'The “harbour tug” he stripped for diesels was Juno’s father’s.',
    voice: 'Salesman’s patter over a mechanic’s honesty.',
    lines: [
      L('dock', 'Diesels, radar, harpoons. Proper kit for the Reach.'),
      L('dock', 'Everything here’s proper kit. Pulled it out of the sea myself, mostly.'),
      L('dock', 'Two-strokes are for the Drift. Out here you want torque.'),
      L('dock', 'Radar’s the difference between seeing a raider and meeting one.'),
      L('dock', 'Harpoon’s pneumatic. Pressure’s honest. People aren’t.'),
      L('dock', 'Vale. You look… exactly like him, actually.', 'juno_aboard'),
    ],
  },
];

export const CHARACTER_MAP: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));

/**
 * Pick what `id` says for `trigger`. Lines whose `when` key is set in `ctx` get first say half the time; a line whose
 * `when` is not in ctx is never used. With `specificOnly`, generic lines are skipped (for remarks that only make
 * sense in context, like docking). `recent` holds texts said lately, avoided while there is any alternative.
 */
export function pickLine(
  id: string,
  trigger: LineTrigger,
  ctx: Record<string, boolean> = {},
  opts: { rng?: () => number; recent?: Set<string>; specificOnly?: boolean } = {},
): string | null {
  const c = CHARACTER_MAP[id];
  if (!c) return null;
  const ok = c.lines.filter((l) => l.trigger === trigger && (!l.when || ctx[l.when]));
  const specific = ok.filter((l) => l.when);
  const rng = opts.rng ?? Math.random;
  // context lines get first say half the time; otherwise they join the generic ones, so greetings keep rotating
  let pool = opts.specificOnly || (specific.length && rng() < 0.5) ? specific : ok;
  if (!pool.length) return null;
  const fresh = pool.filter((l) => !opts.recent?.has(l.text));
  if (fresh.length) pool = fresh;
  return pool[Math.floor(rng() * pool.length)].text;
}

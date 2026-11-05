// Character arcs (design bible PR 2.3): three beats per character, each pinned to a place or deed that already
// exists. A beat fires once, as a card from that person; crew beats only while they are aboard, so choosing a crew
// is choosing which stories you see. Some beats change the game: Vik's confession is the first choice an NPC asks of
// you (price or principle), and it changes a price, a part and a crew perk.

export interface ArcCtx {
  aboard: (id: string) => boolean;
  port: string | null; // docked settlement id
  flags: string[];
  has: (upgrade: string) => boolean;
  owns: (vessel: string) => boolean;
  regions: string[];
  done: string[]; // contracts done
  discoveries: number;
  standing: Partial<Record<string, number>>;
  items: (id: string) => number;
  mapsDone: string[];
}

export interface ArcBeat {
  id: string;
  who: string; // character id
  after?: string; // the beat before it
  when: (c: ArcCtx) => boolean;
  title: string;
  text: string;
  effect?: 'cache_going_under' | 'mara_survey' | 'juno_plate' | 'tidebreaker_colours' | 'museum' | 'vik_choice';
}

const B = (b: ArcBeat) => b;

export const ARCS: ArcBeat[] = [
  // Juno: her father's tug
  B({ id: 'juno_1', who: 'juno', when: (c) => c.aboard('juno') && c.has('engine_outboard'), title: '“Her name is Cough.”',
    text: 'Juno pats the outboard. “Every engine needs a name, so it knows when it’s in trouble. This one’s Cough. Be nice to her.”' }),
  B({ id: 'juno_2', who: 'juno', after: 'juno_1', when: (c) => c.aboard('juno') && c.port === 'helios', title: '“Those are Dad’s.”', effect: 'vik_choice',
    text: 'Juno stops dead in front of Vik’s Twin Diesel Drive. Two diesels “pulled from a harbour tug”. She knows the welds. She knows the dent in the left head. Her father’s tug went missing three winters ago.' }),
  B({ id: 'juno_3', who: 'juno', after: 'juno_2', when: (c) => c.aboard('juno') && c.owns('ironwake'), title: 'A plate from the tug', effect: 'juno_plate',
    text: 'Before the Ironwake launches, Juno welds one last plate inside the hull: steel from her father’s tug, the name still ghosted in the rust. “Family goes through the Wall together.” Her repairs at sea are twice as fast inside the Stormwall.' }),
  // Tomas: the roof and the soil
  B({ id: 'tomas_1', who: 'tomas', when: (c) => c.aboard('tomas') && c.port === 'hollow', title: 'Sal, at the dock',
    text: 'Old Sal looks her brother up and down. “Bring him back fat or don’t bring him back.” Tomas grins. It’s the nicest thing she’s said to him in forty years.' }),
  B({ id: 'tomas_2', who: 'tomas', after: 'tomas_1', when: (c) => c.aboard('tomas') && c.regions.includes('emerald'), title: 'The cold current',
    text: '“Feel that? Cold water, coming up from the deep. Fish follow it.” Tomas trails a hand over the side for a long time. “Somewhere the fish haven’t heard of me.”' }),
  B({ id: 'tomas_3', who: 'tomas', after: 'tomas_2', when: (c) => c.aboard('tomas') && c.flags.includes('seen_canopy'), title: 'Soil',
    text: 'Tomas kneels on Canopy Rise and pushes his fingers into real dirt. He doesn’t say anything for a while. Then: “Take something green home to the Hollow roof, Captain. Forty people should see this.”' }),
  // Kai: Going Under
  B({ id: 'kai_1', who: 'kai', when: (c) => c.aboard('kai'), title: 'Eleven days',
    text: 'Kai counts out loud in their sleep. Eleven. Always eleven. In the morning they’re up the mast before anyone, watching.' }),
  B({ id: 'kai_2', who: 'kai', after: 'kai_1', when: (c) => c.aboard('kai') && c.flags.includes('kai_going_under'), title: 'That was ours', effect: 'cache_going_under',
    text: 'Kai swims across to the sinking platform called Going Under and comes back with a tin box: a whistle, a coil of good rope, and a photograph they don’t show anyone. “Somebody cut the mooring lines. Clean cuts.”' }),
  B({ id: 'kai_3', who: 'kai', after: 'kai_2', when: (c) => c.aboard('kai') && c.flags.includes('reached_spire'), title: '“Land, Captain.”',
    text: 'At the top of the Meridian Spire, Kai lowers the binoculars. “Land. Actual land. I counted the peaks. There are three.”' }),
  // Mara: the chart nobody drew
  B({ id: 'mara_1', who: 'mara', when: (c) => c.aboard('mara'), title: 'A share of the haul',
    text: 'Mara writes every haul in a notebook, her share in red. “Don’t look at me like that. Charts cost paper. Paper costs more than you.”' }),
  B({ id: 'mara_2', who: 'mara', after: 'mara_1', when: (c) => c.aboard('mara') && c.flags.includes('seen_meridian'), title: 'Chalk on the roofs', effect: 'mara_survey',
    text: 'Mara finds her old chalk marks on three Meridian roofs, fifteen years old. Under the third, a survey tin she left herself: a Photograph of Dry Land, wrapped in oilcloth. “Pip would sell his own boat for that.”' }),
  B({ id: 'mara_3', who: 'mara', after: 'mara_2', when: (c) => c.aboard('mara') && c.port === 'driftholm' && c.flags.includes('reached_spire'), title: 'Wren and Mara',
    text: 'Old Wren and Mara bend over the summit chart for an hour without speaking. Then Wren hands her the pen. “Your hand’s steadier. Mine was, once.”' }),
  // Bram: the Gannet
  B({ id: 'bram_1', who: 'bram', when: (c) => c.aboard('bram'), title: 'The Gannet',
    text: 'Bram carves a little boat out of driftwood every night and throws it overboard every morning. “She was called the Gannet. Say it sometimes.”' }),
  B({ id: 'bram_2', who: 'bram', after: 'bram_1', when: (c) => c.aboard('bram') && c.aboard('ines'), title: '“Ferro?”',
    text: 'Bram stops halfway through a knot. “I know that armour. I know that face. You were on the skiff that took my boat.” Ines doesn’t look away. “I left the same night. I’m sorry, Bram.” He finishes the knot.' }),
  B({ id: 'bram_3', who: 'bram', after: 'bram_2', when: (c) => c.aboard('bram') && c.flags.includes('seen_hold'), title: 'The gate',
    text: 'Rustfang Hold’s gate is a wall of hull plate. Bram points at one panel, painted over, a G still showing. “That gate’s made from my boat. I’d know those rivets anywhere.”' }),
  // Ines: a quiet voyage
  B({ id: 'ines_1', who: 'ines', when: (c) => c.aboard('ines'), title: 'A quiet voyage',
    text: 'Ines oils the harpoon every evening whether it was fired or not. “The day you need it is the day you didn’t oil it.”' }),
  B({ id: 'ines_2', who: 'ines', after: 'ines_1', when: (c) => c.aboard('ines') && c.flags.includes('met_raiders'), title: 'One of us',
    text: 'A Rustfang raider yells across the water: “Ferro! You were one of us!” Ines answers by putting a harpoon through his gunwale. “Was. Past tense. Aim higher.”' }),
  B({ id: 'ines_3', who: 'ines', after: 'ines_2', when: (c) => c.aboard('ines') && c.flags.includes('seen_hold'), title: 'The gaps in the gate',
    text: '“Don’t look at the gate. Look at the gaps in it.” Ines draws you the Hold from memory: where the skiffs tie up, where the watch sleeps. “If you ever have to go in there, go in at dawn.”' }),
  // Pip: the museum
  B({ id: 'pip_1', who: 'pip', when: (c) => c.port === 'driftholm' && c.discoveries >= 10, title: 'A shelf',
    text: '“Ten discoveries!” Pip has built a shelf out of a door. “For the old world. Not for sale. Well. Not for sale to most people.”' }),
  B({ id: 'pip_2', who: 'pip', after: 'pip_1', when: (c) => c.port === 'driftholm' && c.done.includes('c_pip_photo'), title: 'Dry land',
    text: 'Pip holds the Photograph of Dry Land next to his own. Same hill. Same tree. Taken from the other side. He has to sit down.' }),
  B({ id: 'pip_3', who: 'pip', after: 'pip_1', when: (c) => c.port === 'driftholm' && c.discoveries >= 25, title: 'The Driftholm Museum', effect: 'museum',
    text: 'The shelf is now a stall on the pier with a painted sign: THE DRIFTHOLM MUSEUM · THINGS THE SEA GAVE BACK. Pip has named one shelf after you.' }),
  // Marlo: the Wren's builder
  B({ id: 'marlo_1', who: 'marlo', when: (c) => c.port === 'driftholm' && c.has('sail_canvas') && c.has('rudder_ash'), title: 'Proper lines',
    text: '“Sail and a rudder. Now she looks like she means it.” Marlo almost smiles. Almost.' }),
  B({ id: 'marlo_2', who: 'marlo', after: 'marlo_1', when: (c) => c.port === 'driftholm' && c.owns('sloop'), title: 'Old drawings',
    text: 'To size the Trimaran’s floats Marlo unrolls drawings older than you, stamped WREN · REDFINCH. He rolls them back up fast. “Different boat. Different fool.”' }),
  B({ id: 'marlo_3', who: 'marlo', after: 'marlo_2', when: (c) => c.port === 'driftholm' && c.owns('ironwake'), title: 'This one will',
    text: '“I built one boat for that wall. She didn’t come back.” Marlo slaps the Ironwake’s hull. “This one will. Bring her back, or don’t come back yourself.”' }),
  // Old Wren: Redfinch
  B({ id: 'wren_1', who: 'wren', when: (c) => c.port === 'driftholm' && c.items('journal_redfinch') > 0, title: 'His handwriting',
    text: 'Wren reads the journal page twice. “That’s him. He always crossed his sevens.”' }),
  B({ id: 'wren_2', who: 'wren', after: 'wren_1', when: (c) => c.port === 'driftholm' && c.mapsDone.includes('redfinch_map'), title: 'My hand on the left half',
    text: '“That’s my hand on the left half of his chart. I drew it for him. I was his navigator. The boat was named for me.” A long breath. “I didn’t go.”' }),
  B({ id: 'wren_3', who: 'wren', after: 'wren_2', when: (c) => c.port === 'driftholm' && c.items('summit_chart') > 0, title: '“He made it.”',
    text: 'Wren smooths the Chart of the Last Summit flat with both hands. It is in her handwriting, copied by his. “He made it. The stubborn fool made it.”' }),
  // Odessa: colours worth fearing
  B({ id: 'odessa_1', who: 'odessa', when: (c) => c.port === 'driftholm' && c.discoveries >= 5, title: 'Damp',
    text: '“Still damp, darling. But less damp. I’m proud of you. Don’t tell anyone.”' }),
  B({ id: 'odessa_2', who: 'odessa', after: 'odessa_1', when: (c) => c.port === 'driftholm' && c.done.includes('c_odessa_red'), title: 'Flare-red',
    text: 'Odessa boils the Helios crude down to a red so deep it looks wet. “Now that’s a colour that says try it.”' }),
  B({ id: 'odessa_3', who: 'odessa', after: 'odessa_1', when: (c) => c.port === 'driftholm' && c.flags.includes('reached_spire'), title: 'Tidebreaker colours', effect: 'tidebreaker_colours',
    text: 'Odessa has been sewing for a week: a flag of hazard stripes with a breaking wave across them. “Only people who’ve been through the Wall fly this one. That’s you, darling.” (New flag: Tidebreaker Colours.)' }),
  // Old Sal, Nori, Dace: the ports
  B({ id: 'sal_1', who: 'sal', when: (c) => c.port === 'hollow' && c.done.includes('c_sal_record'), title: '“Louder.”',
    text: 'The record crackles, then a voice sings about dry days. Forty people stop what they’re doing on the roof. Sal closes her eyes. “…Turn it up. No. Louder.”' }),
  B({ id: 'nori_1', who: 'nori', when: (c) => c.port === 'hollow' && c.done.includes('c_nori_nails'), title: 'A floor that floats',
    text: 'Nori stamps on the new deck to show it holds. “Three more winters. Maybe four. I’ll take four.”' }),
  B({ id: 'vik_1', who: 'vik', when: (c) => c.port === 'helios' && (c.flags.includes('twin_at_cost') || c.flags.includes('juno_diesel')), title: 'Proper kit',
    text: 'Vik has hung a photograph above his bench: a harbour tug, and a man with Juno’s jaw at the wheel. “So I remember where proper kit comes from,” he says, to nobody.' }),
  B({ id: 'dace_1', who: 'dace', when: (c) => c.port === 'helios' && (c.standing.helios ?? 0) >= 5, title: 'Rig rules',
    text: 'Dace shakes your hand on the flare deck where everyone can see. “Rig rules: you’re one of ours now. Anybody gives you trouble on this platform, they give it to me.”' }),
];

export const ARC_MAP: Record<string, ArcBeat> = Object.fromEntries(ARCS.map((b) => [b.id, b]));

/** The next beat that is ready to fire, if any (beats fire in order per character). */
export function nextBeat(seen: string[], c: ArcCtx): ArcBeat | null {
  for (const b of ARCS) {
    if (seen.includes(b.id)) continue;
    if (b.after && !seen.includes(b.after)) continue;
    if (b.when(c)) return b;
  }
  return null;
}

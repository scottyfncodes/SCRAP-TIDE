// Collection milestones and the guided first-voyage quest chain.
import type { Category } from './items';

export interface MilestoneDef {
  id: string;
  name: string;
  desc: string;
  cond:
    | { kind: 'category'; category: Category; n: number }
    | { kind: 'chests'; n: number }
    | { kind: 'discoveries'; n: number }
    | { kind: 'hauls'; n: number }
    | { kind: 'flag'; flag: string };
  reward: { gold?: number; cosmetic?: string };
}

export const MILESTONES: MilestoneDef[] = [
  { id: 'm_first_chest', name: 'X Marks the Spot', desc: 'Dig up your first buried treasure chest.', cond: { kind: 'chests', n: 1 }, reward: { gold: 25, cosmetic: 'paint_gilded' } },
  { id: 'm_beachcomber', name: 'Beachcomber', desc: 'Catalog 5 different Ocean Finds.', cond: { kind: 'category', category: 'ocean', n: 5 }, reward: { gold: 30, cosmetic: 'sail_shells' } },
  { id: 'm_wreck', name: 'Wreck Raider', desc: 'Recover 3 different Shipwreck items.', cond: { kind: 'category', category: 'wreck', n: 3 }, reward: { gold: 100, cosmetic: 'flag_wren' } },
  { id: 'm_curious', name: 'Curiouser', desc: 'Catalog 3 different Curiosities.', cond: { kind: 'category', category: 'curiosity', n: 3 }, reward: { gold: 60 } },
  { id: 'm_artifacts', name: 'Amateur Archaeologist', desc: 'Catalog 3 Ancient Artifacts.', cond: { kind: 'category', category: 'artifact', n: 3 }, reward: { gold: 150 } },
  { id: 'm_ten', name: 'Ten Discoveries', desc: 'Catalog 10 different discoveries.', cond: { kind: 'discoveries', n: 10 }, reward: { gold: 50 } },
  { id: 'm_twenty', name: 'Twenty Discoveries', desc: 'Catalog 20 different discoveries.', cond: { kind: 'discoveries', n: 20 }, reward: { gold: 120 } },
  { id: 'm_salvager', name: 'Scavenger', desc: 'Haul up 10 loads of salvage.', cond: { kind: 'hauls', n: 10 }, reward: { gold: 80, cosmetic: 'sail_billboard' } },
  { id: 'm_helios', name: 'Under the Flare', desc: 'Dock at Rig Helios.', cond: { kind: 'flag', flag: 'docked_helios' }, reward: { gold: 60, cosmetic: 'flag_helios' } },
  { id: 'm_stormwall', name: 'Through the Wall', desc: 'Reach the Meridian Spire inside the Stormwall.', cond: { kind: 'flag', flag: 'reached_spire' }, reward: { gold: 400, cosmetic: 'paint_storm' } },
  { id: 'm_thirty', name: 'Archivist of the Drowned', desc: 'Catalog 30 different discoveries.', cond: { kind: 'discoveries', n: 30 }, reward: { gold: 250 } },
];

// Guided onboarding. Each step is checked by the game against live state.
export type QuestStepId =
  | 'steer'
  | 'leave_dock'
  | 'reach_turtle'
  | 'anchor'
  | 'ashore'
  | 'find_bottle'
  | 'read_map'
  | 'dig_x'
  | 'return_harbor'
  | 'sell'
  | 'catalog'
  | 'upgrade'
  | 'free';

export interface QuestStep {
  id: QuestStepId;
  text: string;
  hint: string;
}

/**
 * The First Voyage, 8 steps (was 13; design bible PR 1.2). Same route and the same treasure dig, but every step is now
 * something you do in the world: steering is learned by casting off, the anchor by going ashore, the map by digging,
 * and the first salvage happens on the way home. Retired ids stay in QuestStepId so old saves load: see liveStep().
 */
export const FIRST_VOYAGE: QuestStep[] = [
  { id: 'leave_dock', text: 'Cast off from Driftholm', hint: 'Drag the wheel (bottom-left) toward where you want to go. Push further for more sail. Head north, clear of the rafts.' },
  { id: 'reach_turtle', text: 'Sail to Turtle Atoll', hint: 'Follow the gold marker west: a ring of dead coral on top of a drowned hill. Old Wren says something washed up there.' },
  { id: 'ashore', text: 'Anchor and go ashore', hint: 'Ease off the wheel in the turquoise shallows, tap ANCHOR, then GO ASHORE.' },
  { id: 'find_bottle', text: 'Search the beach', hint: 'Something is glinting on the south beach.' },
  { id: 'dig_x', text: 'Read the scrap, find the X, dig', hint: 'Study the map: the landmarks are real. Stand where the clue says. Your shovel tells you when the sand is loose.' },
  { id: 'return_harbor', text: 'Sail home. Salvage the Sunken Tower on the way', hint: 'The drowned office block east of the pier: slow down beside it and tap SALVAGE. Then dock at the raft pier.' },
  { id: 'upgrade', text: 'Trade with Pip, refit with Marlo', hint: 'Sell what you dug up to Pip, then have Marlo fit your first part. The Canvas Mainsail is a good start.' },
  { id: 'free', text: 'The world drowned. You didn’t.', hint: 'Follow the Captain’s Log: salvage, refit, push further out.' },
];

/** Steps cut from the First Voyage, and the live step a save sitting on one of them continues from. */
export const RETIRED_STEPS: Partial<Record<QuestStepId, QuestStepId>> = {
  steer: 'leave_dock',
  anchor: 'ashore',
  read_map: 'dig_x',
  sell: 'upgrade',
  catalog: 'upgrade',
};

/** The step a saved quest id continues from: itself if it is live, its successor if it was retired. */
export function liveStep(id: string | undefined): QuestStepId {
  if (id && FIRST_VOYAGE.some((q) => q.id === id)) return id as QuestStepId;
  return (id && RETIRED_STEPS[id as QuestStepId]) || FIRST_VOYAGE[0].id;
}

/** After the first voyage: the Captain's Log, a chain of goals that always points at the next big unlock. */
export interface GoalDef {
  id: string;
  text: string;
  hint: string;
  reward: number;
  target?: { x: number; z: number }; // waypoint while this goal is active
}

export const GOALS: GoalDef[] = [
  { id: 'g_salvage', text: 'Salvage the Sunken Tower', hint: 'The office block north-east of Driftholm. Slow down beside it and tap SALVAGE.', reward: 30, target: { x: 92, z: 150 } },
  { id: 'g_engine', text: 'Install a Salvaged Outboard', hint: 'Marlo can fit one: scrap metal and wire from salvage sites.', reward: 40 },
  { id: 'g_crew', text: 'Recruit your first crew member', hint: 'Kai is adrift on a raft north of Driftholm (follow the marker): slow down beside it and tap RESCUE. Or hire Juno at Driftholm or Tomas at Rooftop Hollow.', reward: 40 },
  { id: 'g_trimaran', text: 'Commission the Scrap Trimaran', hint: 'The only way across the open swell. Marlo needs gold, driftwood, scrap and canvas.', reward: 80 },
  { id: 'g_helios', text: 'Reach Rig Helios', hint: 'An oil platform far to the west, past the swell. Engines, radar and harpoons for sale.', reward: 60, target: { x: -540, z: 170 } },
  { id: 'g_meridian', text: 'Salvage Old Meridian', hint: 'The drowned city to the north-east. Its rooftops hold the best old-world finds.', reward: 80, target: { x: 500, z: -440 } },
  { id: 'g_raiders', text: 'Drive off a Rustfang raider', hint: 'They hunt around the tanker graveyard to the south. A Harpoon Turret helps.', reward: 100, target: { x: 270, z: 650 } },
  { id: 'g_ironwake', text: 'Build the Ironwake Expedition Cat', hint: 'Alloy plate, engine parts and electronics. The only hull that survives the Stormwall.', reward: 150 },
  { id: 'g_spire', text: 'Pierce the Stormwall: reach the Meridian Spire', hint: 'Due north, through the storm that never ends.', reward: 300, target: { x: -210, z: -1040 } },
  { id: 'g_done', text: 'Find the Last Summit', hint: 'Your chart points beyond the edge of the map. To be continued…', reward: 0 },
];


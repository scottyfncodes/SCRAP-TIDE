// Collection milestones and the guided first-voyage quest chain.
import type { Category } from './items';

export interface MilestoneDef {
  id: string;
  name: string;
  desc: string;
  cond: { kind: 'category'; category: Category; n: number } | { kind: 'chests'; n: number } | { kind: 'discoveries'; n: number };
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

export const FIRST_VOYAGE: QuestStep[] = [
  { id: 'steer', text: 'Learn to steer', hint: 'Drag the wheel (bottom-left) toward where you want to go. Push further to raise more sail.' },
  { id: 'leave_dock', text: 'Sail out of the harbor', hint: 'Head north, away from the docks, into open water.' },
  { id: 'reach_turtle', text: 'Sail to the little island to the west', hint: 'Follow the gold marker. That’s Turtle Cay.' },
  { id: 'anchor', text: 'Drop anchor near the beach', hint: 'Slow down close to shore and tap ANCHOR.' },
  { id: 'ashore', text: 'Go ashore', hint: 'Tap GO ASHORE to wade onto the beach.' },
  { id: 'find_bottle', text: 'Search the beach', hint: 'Something is glinting on the south beach.' },
  { id: 'read_map', text: 'Study the map scrap', hint: 'Open MAPS and read the clue carefully.' },
  { id: 'dig_x', text: 'Find the X and dig', hint: 'Use the landmarks on the map. Your shovel will tell you when the sand feels loose.' },
  { id: 'return_harbor', text: 'Return to Port Saltwhistle', hint: 'Board your dinghy, raise anchor and sail home. Dock at the pier.' },
  { id: 'sell', text: 'Sell some treasure to Pip the Appraiser', hint: 'Open the harbor and visit the Appraiser.' },
  { id: 'catalog', text: 'Look at your Discovery Catalog', hint: 'Tap CATALOG to see what you’ve found.' },
  { id: 'upgrade', text: 'Buy your first upgrade from Marlo', hint: 'Visit the Shipwright. The Canvas Mainsail is a fine start.' },
  { id: 'free', text: 'The ocean is full of secrets', hint: 'Follow the maps, upgrade the ship, find everything.' },
];

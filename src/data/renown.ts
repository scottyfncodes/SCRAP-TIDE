// Who you are becoming (design bible PR 1.4, "Refit Stages, Renown & a Name").
// Refit stages are what the boat looks like as parts go on her; renown titles are what the Drift calls you. Both are
// earned by doing things, never bought.

export interface RefitStage {
  id: 'stripped' | 'rigged' | 'fitted';
  name: string;
  min: number; // upgrades fitted (any slot) to reach this stage
  look: string;
}

export const REFIT_STAGES: RefitStage[] = [
  { id: 'stripped', name: 'Stripped', min: 0, look: 'Bare hull and whatever floats.' },
  { id: 'rigged', name: 'Rigged', min: 3, look: 'Old tyres lashed along the rails as fenders, a rag pennant up the mast.' },
  { id: 'fitted', name: 'Fitted Out', min: 7, look: 'A welded ram on the bow, hubcaps riveted along the rail, a lantern at the prow.' },
];

export function refitStage(upgrades: number): RefitStage {
  let st = REFIT_STAGES[0];
  for (const s of REFIT_STAGES) if (upgrades >= s.min) st = s;
  return st;
}

export interface RenownState {
  hauls: number;
  chestsOpened: number;
  regionsSeen: string[];
  flags: string[];
}

export interface RenownTitle {
  id: string;
  title: string;
  how: string; // how it is earned, shown on the Ship panel
  earned: (d: RenownState) => boolean;
}

export const RENOWN: RenownTitle[] = [
  { id: 'drifter', title: 'Drifter', how: 'Everyone starts here.', earned: () => true },
  { id: 'scavenger', title: 'Scavenger', how: 'Haul up salvage and dig up a buried chest.', earned: (d) => d.hauls > 0 && d.chestsOpened > 0 },
  { id: 'rover', title: 'Rover', how: 'Cross the open swell into the Sunken Reach.', earned: (d) => d.regionsSeen.includes('emerald') },
  { id: 'tidebreaker', title: 'Tidebreaker', how: 'Go through the Stormwall and reach the Meridian Spire.', earned: (d) => d.flags.includes('reached_spire') },
];

/** The highest title earned (titles are ordered; a later one implies the road to it). */
export function renownTitle(d: RenownState): RenownTitle {
  let t = RENOWN[0];
  for (const r of RENOWN) if (r.earned(d)) t = r;
  return t;
}

/** Names the Drift would give a boat, offered when you name yours. */
export const SHIP_NAMES = [
  'Gull’s Folly', 'Second Chance', 'Rust Bucket', 'Dry Dream', 'The Leak', 'Diesel Saint', 'Last Light', 'Bilge Queen',
  'Scrap Psalm', 'Low Tide', 'Salt Widow', 'Hope Floats', 'Borrowed Time', 'Tin Heart', 'The Long Swim',
];

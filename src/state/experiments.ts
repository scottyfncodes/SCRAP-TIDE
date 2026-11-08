// Hidden experiment previews for Phase 3 (creative/design-bible: the Wild Cards).
//
//   ?exp=swamped            turn one experiment on for this visit   (?wild= is an alias, as the design bible writes it)
//   ?exp=tides,marque       several at once
//   ?exp=swamped&fresh=1    start from a brand-new game (in memory) instead of a copy of your save
//   ?exp=takeher&ship=sloop&upgrades=all   combine with the existing ?ship= / &upgrades= previews
//
// An experiment visit is a sandbox, exactly like a ?ship= preview: it runs on an in-memory copy of the save and
// never writes to (or clears) localStorage, so it cannot touch a real save, progression or production play. Without
// the parameter nothing changes. Unknown ids are ignored. Gameplay code asks `store.exp('tides')` and stays dormant
// otherwise; when an experiment graduates it drops its gate and joins normal play in its own PR.

export type ExperimentId = 'swamped' | 'tides' | 'marque' | 'takeher';

export interface ExperimentDef {
  id: ExperimentId;
  title: string;
  summary: string;
  /** what the visit should look like to be useful (a hint for testers; the link sets it up) */
  try: string;
}

/** In the Phase 3 priority order. */
export const EXPERIMENTS: Record<ExperimentId, ExperimentDef> = {
  swamped: { id: 'swamped', title: 'Swamped (cold open)', summary: 'A storm prologue on a failing raft, towed into Driftholm, then pick 2 of 3 leads.', try: '?exp=swamped&fresh=1' },
  tides: { id: 'tides', title: 'Tide caves', summary: 'A tide cycle on the day clock: some caves open only at low tide.', try: '?exp=tides&ship=skiff&upgrades=deck_lights' },
  marque: { id: 'marque', title: 'Letters of Marque', summary: 'Side with Rig Helios or with Rustfang in the Reach.', try: '?exp=marque&ship=brig&upgrades=harpoon_turret' },
  takeher: { id: 'takeher', title: 'Take Her', summary: 'The Ironwake is Rustfang’s hulk, taken from the Hold instead of bought.', try: '?exp=takeher&ship=brig&upgrades=salvage_crane,harpoon_turret' },
};

/** The experiments a query string turns on (known ids only, de-duplicated, in priority order). */
export function parseExperiments(search: string): ExperimentId[] {
  const q = new URLSearchParams(search);
  const asked = [q.get('exp'), q.get('wild')].filter(Boolean).join(',').toLowerCase().split(',').map((s) => s.trim());
  return (Object.keys(EXPERIMENTS) as ExperimentId[]).filter((id) => asked.includes(id));
}

/** `&fresh=1` with an experiment: start from a new game held in memory, not a copy of the save. */
export function parseFresh(search: string): boolean {
  const v = new URLSearchParams(search).get('fresh');
  return v === '1' || v === 'true';
}

export function pageExperiments(): ExperimentId[] {
  return typeof location === 'undefined' ? [] : parseExperiments(location.search);
}

export function pageFresh(): boolean {
  return typeof location === 'undefined' ? false : parseFresh(location.search);
}

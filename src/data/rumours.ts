// Old Wren's rumours, as leads the player can pin to the chart (design bible PR 1.3: "Two Roads & Rumour Pins").
// A pinned rumour becomes the Captain's Log side lead until it is done. Conditions are plain data so they can be
// checked against a save without running the game.
import { ISLAND_MAP, SEA_MARKS, SETTLEMENT_MAP, type RegionId } from './world';

export interface RumourDef {
  id: string;
  label: string; // short name for the side lead and the chart pin
  text: string; // what Wren says
  x: number;
  z: number;
  region: RegionId; // the boat it needs: shallows (any), emerald (the Trimaran), stormwall (the Ironwake)
  done: { find?: string; flag?: string; settlement?: string };
}

const at = (id: string) => ISLAND_MAP[id];
const mark = (id: string) => SEA_MARKS.find((m) => m.id === id)!;

export const RUMOURS: RumourDef[] = [
  { id: 'r_wren', label: 'The wreck of the Wren', x: at('gull').x, z: at('gull').z, region: 'shallows', done: { find: 'wreck_cabin' },
    text: 'The trawler Wren went down inside the reef ring north of here. Copper on your hull and you’d slide right over.' },
  { id: 'r_keeper', label: 'The keeper’s sea-chest', x: at('lantern').x, z: at('lantern').z, region: 'shallows', done: { find: 'lantern_drawer' },
    text: 'The Lantern Rock keeper kept his sea-chest locked. Kept the key somewhere silly, too. Keepers are like that.' },
  { id: 'r_bell', label: 'The Silent Bell', x: mark('mark_bell').x, z: mark('mark_bell').z, region: 'shallows', done: { flag: 'found_mark_bell' },
    text: 'There’s a bell buoy out west of the Hollow that stopped ringing. Bells don’t stop on their own.' },
  { id: 'r_billboard', label: 'The Smiling Family', x: mark('mark_billboard').x, z: mark('mark_billboard').z, region: 'shallows', done: { flag: 'found_mark_billboard' },
    text: 'A painted family smiles out of the swell north of Tin Can Rest. Nobody smiles like that any more. Go and see what they’re selling.' },
  { id: 'r_reach', label: 'Rig Helios, past the swell', x: SETTLEMENT_MAP.helios.x, z: SETTLEMENT_MAP.helios.z, region: 'emerald', done: { settlement: 'helios' },
    text: 'Beyond the swell lies the Sunken Reach: Old Meridian, Rig Helios, and the Rustfang. Skiffs need not apply.' },
  { id: 'r_shrine', label: 'The Lashed Shrine', x: mark('mark_shrine').x, z: mark('mark_shrine').z, region: 'emerald', done: { flag: 'found_mark_shrine' },
    text: 'Out past Last Call there’s a raft of drums lashed round a dead tree. People leave things. Take one, leave one, and don’t be greedy.' },
  { id: 'r_summit', label: 'The mountain past the Wall', x: -210, z: -1040, region: 'stormwall', done: { flag: 'reached_spire' },
    text: 'They say there’s a mountain past the Stormwall that never went under. Fools say that. I say it too.' },
];
export const RUMOUR_MAP: Record<string, RumourDef> = Object.fromEntries(RUMOURS.map((r) => [r.id, r]));

export interface RumourState { findsOpened: string[]; flags: string[]; settlementsVisited: string[] }

export function rumourDone(r: RumourDef, d: RumourState): boolean {
  return (!!r.done.find && d.findsOpened.includes(r.done.find)) || (!!r.done.flag && d.flags.includes(r.done.flag)) ||
    (!!r.done.settlement && d.settlementsVisited.includes(r.done.settlement));
}

// The Captain's Log side lead (design bible PR 1.3, "Two Roads"): beside the main goal, the Log always offers one
// optional lead, so every session starts with a choice. Pure functions over the save, so they can be tested.
import { CASTAWAYS, ISLAND_MAP, SALVAGE_SITES, TREASURE_MAPS, type RegionId } from '../data/world';
import { RUMOURS, RUMOUR_MAP, rumourDone, type RumourState } from '../data/rumours';
import { CREW_MAP } from '../data/crew';

export interface Lead {
  id: string;
  kind: 'rumour' | 'map' | 'castaway' | 'salvage';
  label: string;
  x: number;
  z: number;
}

export interface LeadState extends RumourState {
  pinned: string[];
  fragments: string[];
  mapsCompleted: string[];
  castaways: string[];
  firstHauls: string[];
}

export interface LeadReach {
  crossSwell: boolean;
  crossStorm: boolean;
  heavy: boolean; // a salvage crane is fitted
}

export function canReach(region: RegionId, r: LeadReach) {
  return region === 'shallows' || (region === 'emerald' && r.crossSwell) || (region === 'stormwall' && r.crossStorm);
}

/** Rumours Wren still has to tell: not yet done, at most `n`, pinned ones first. */
export function openRumours(d: LeadState, n = 3) {
  const open = RUMOURS.filter((r) => !rumourDone(r, d));
  return [...open.filter((r) => d.pinned.includes(r.id)), ...open.filter((r) => !d.pinned.includes(r.id))].slice(0, n);
}

/**
 * The side lead, in order of preference: a rumour the player pinned, a treasure map that is whole but not dug, a
 * castaway still adrift, then the nearest salvage site never worked. Leads the boat can't reach yet are skipped, and
 * so is anything sitting on the main goal's own marker (`main`), so the two roads always differ.
 */
export function sideLead(d: LeadState, reach: LeadReach, from: { x: number; z: number }, main?: { x: number; z: number } | null): Lead | null {
  const clear = (x: number, z: number) => !main || Math.hypot(x - main.x, z - main.z) > 60;
  for (const id of d.pinned) {
    const r = RUMOUR_MAP[id];
    if (r && !rumourDone(r, d) && canReach(r.region, reach) && clear(r.x, r.z)) return { id: r.id, kind: 'rumour', label: r.label, x: r.x, z: r.z };
  }
  for (const m of TREASURE_MAPS) {
    const isl = ISLAND_MAP[m.island];
    if (d.mapsCompleted.includes(m.id) || !m.fragments.every((f) => d.fragments.includes(f)) || !canReach(isl.region, reach)) continue;
    if (clear(isl.x + m.x, isl.z + m.z)) return { id: m.id, kind: 'map', label: `Dig: ${m.name}`, x: isl.x + m.x, z: isl.z + m.z };
  }
  for (const c of CASTAWAYS) {
    const region: RegionId = Math.hypot(c.x, c.z - 30) > 365 ? 'emerald' : 'shallows';
    if (d.castaways.includes(c.id) || !canReach(region, reach) || !clear(c.x, c.z)) continue;
    return { id: c.id, kind: 'castaway', label: `Raft adrift: ${CREW_MAP[c.crew]?.name.split(' ')[0] ?? 'someone'}`, x: c.x, z: c.z };
  }
  let best: Lead | null = null, bestD = Infinity;
  for (const s of SALVAGE_SITES) {
    if (d.firstHauls.includes(s.id) || !canReach(s.region, reach) || (s.heavy && !reach.heavy) || !clear(s.x, s.z)) continue;
    const dist = Math.hypot(s.x - from.x, s.z - from.z);
    if (dist < bestD) [best, bestD] = [{ id: s.id, kind: 'salvage', label: `Unworked: ${s.name}`, x: s.x, z: s.z }, dist];
  }
  return best;
}

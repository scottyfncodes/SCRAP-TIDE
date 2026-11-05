// Two Roads (design bible PR 1.3): the Captain's Log side lead, Old Wren's pinnable rumours, and the sea marks of
// the north-west.
import { describe, expect, it } from 'vitest';
import { sideLead, openRumours, canReach, type LeadState } from '../src/game/leads';
import { RUMOURS, rumourDone } from '../src/data/rumours';
import { SEA_MARKS, POIS, CASTAWAYS } from '../src/data/world';
import { ITEM_MAP, isLiving } from '../src/data/items';
import { heightAt } from '../src/world/terrain';

const fresh = (): LeadState => ({ pinned: [], fragments: [], mapsCompleted: [], castaways: [], firstHauls: [], findsOpened: [], flags: [], settlementsVisited: ['driftholm'] });
const skiff = { crossSwell: false, crossStorm: false, heavy: false };
const trimaran = { crossSwell: true, crossStorm: false, heavy: true };
const home = { x: 6, z: 168 };

describe('side lead', () => {
  it('a pinned rumour wins, in pin order, until it is done', () => {
    const d = fresh();
    d.pinned = ['r_bell', 'r_wren'];
    expect(sideLead(d, skiff, home)?.id).toBe('r_bell');
    d.flags.push('found_mark_bell');
    expect(sideLead(d, skiff, home)?.id).toBe('r_wren');
  });
  it('skips leads the boat cannot reach yet', () => {
    const d = fresh();
    d.pinned = ['r_shrine'];
    expect(sideLead(d, skiff, home)?.id).not.toBe('r_shrine');
    expect(sideLead(d, trimaran, home)?.id).toBe('r_shrine');
  });
  it('falls back to a whole-but-undug map, then a castaway, then the nearest unworked salvage', () => {
    const d = fresh();
    d.fragments = ['turtle_scrap'];
    expect(sideLead(d, skiff, home)?.kind).toBe('map');
    d.mapsCompleted = ['turtle_map'];
    expect(sideLead(d, skiff, home)?.kind).toBe('castaway');
    d.castaways = CASTAWAYS.map((c) => c.id);
    const l = sideLead(d, skiff, home);
    expect(l?.kind).toBe('salvage');
    expect(l?.id).toBe('sv_stump'); // nearest to Driftholm
  });
  it('never duplicates the main goal’s marker', () => {
    const d = fresh();
    d.pinned = ['r_reach'];
    expect(sideLead(d, trimaran, home, { x: -540, z: 170 })?.id).not.toBe('r_reach');
  });
});

describe('rumours', () => {
  it('Wren tells at most three at a time, pinned first, and done ones drop off', () => {
    const d = fresh();
    expect(openRumours(d)).toHaveLength(3);
    d.pinned = ['r_summit'];
    expect(openRumours(d)[0].id).toBe('r_summit');
    d.findsOpened.push('wreck_cabin');
    expect(openRumours(d, 99).some((r) => r.id === 'r_wren')).toBe(false);
  });
  it('every rumour can be completed and sits in reachable water or on land', () => {
    for (const r of RUMOURS) {
      expect(Object.values(r.done).filter(Boolean).length, r.id).toBe(1);
      expect(canReach(r.region, { crossSwell: true, crossStorm: true, heavy: true })).toBe(true);
    }
    expect(rumourDone(RUMOURS[0], { findsOpened: [], flags: [], settlementsVisited: [] })).toBe(false);
  });
});

describe('sea marks', () => {
  it('three marks fill the empty north-west, in open water, announced on the chart', () => {
    expect(SEA_MARKS).toHaveLength(3);
    for (const m of SEA_MARKS) {
      expect(m.x < 0 && m.z < 0, m.id).toBe(true);
      expect(heightAt(m.x, m.z), m.id).toBeLessThan(-6);
      expect(POIS.some((p) => p.id === m.id), m.id).toBe(true);
      for (const l of m.loot) {
        expect(ITEM_MAP[l.id], l.id).toBeDefined();
        expect(isLiving(l.id), `${m.id} must not hand out living green`).toBe(false);
      }
      expect(RUMOURS.some((r) => r.done.flag === `found_${m.id}`), m.id).toBe(true);
    }
  });
});

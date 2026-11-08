// Source-only progression check (fast, runs with `npm test`): every material an upgrade or vessel costs can come from
// somewhere the player can reach by the time they could buy it. This reads the data; the runtime proof that each one
// is actually affordable and buyable is the simulation suite (tests/sim, `npm run sim`).
import { describe, expect, it } from 'vitest';
import { UPGRADES, UPGRADE_MAP, VESSELS, type VesselId } from '../src/data/ship';
import { SALVAGE_SITES, CACHE_POOL, SETTLEMENT_MAP, type RegionId } from '../src/data/world';
import { RECIPES } from '../src/data/crafting';

const REACH: Record<VesselId, RegionId[]> = { dinghy: ['shallows'], sloop: ['shallows', 'emerald'], brig: ['shallows', 'emerald'], ironwake: ['shallows', 'emerald', 'stormwall'] };
// game.ts updateCaches: what flotsam can give (every piece of it sits in reachable water)
const FLOTSAM = ['crude_oil', 'scrap_metal', 'rope', 'plastic', 'fish', 'driftwood', 'iron_nails', 'canvas', 'algae_mat', 'sea_lettuce'];

function sources(vessel: VesselId, crane: boolean): Set<string> {
  const out = new Set<string>(FLOTSAM);
  for (const r of REACH[vessel]) for (const l of CACHE_POOL[r]) out.add(l.id);
  for (const s of SALVAGE_SITES) {
    if (!REACH[vessel].includes(s.region) || (s.heavy && !crane)) continue;
    for (const l of s.loot) out.add(l.id);
    for (const f of s.first ?? []) out.add(f.id);
  }
  // recipes, repeated until nothing new appears
  for (let changed = true; changed; ) {
    changed = false;
    for (const r of RECIPES) if (!out.has(r.makes.id) && r.needs.every((n) => out.has(n.id))) (out.add(r.makes.id), (changed = true));
  }
  return out;
}

/** The weakest boat that can reach a shop selling the upgrade (Rig Helios is past the swell). */
const buyVessel = (shops: string[] | undefined): VesselId => ((shops ?? ['driftholm']).some((s) => s !== 'helios') ? 'dinghy' : 'sloop');

describe('progression sources (data)', () => {
  it('every upgrade material is obtainable in the boat that can first buy it', () => {
    for (const u of UPGRADES) {
      const v = buyVessel(u.where);
      const have = sources(v, false);
      for (const m of u.cost.mats ?? []) expect(have.has(m.id), `${u.id} needs ${m.id}, unobtainable with the ${v}`).toBe(true);
      for (const s of u.where ?? []) expect(SETTLEMENT_MAP[s], `${u.id} sold at ${s}`).toBeTruthy();
      if (u.requires) expect(UPGRADE_MAP[u.requires], `${u.id} requires ${u.requires}`).toBeTruthy();
    }
  });

  it('each vessel can be built from what the previous vessel can reach', () => {
    const prev: Record<string, VesselId> = { sloop: 'dinghy', brig: 'sloop', ironwake: 'sloop' };
    for (const [id, v] of Object.entries(VESSELS)) {
      if (!v.cost) continue;
      const have = sources(prev[id], true);
      for (const m of v.cost.mats ?? []) expect(have.has(m.id), `${id} needs ${m.id}, unobtainable with the ${prev[id]}`).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { goalNeeds, goalProgressText, goalTarget, missingMats } from '../src/game/goalHelp';
import { SALVAGE_SITES } from '../src/data/world';

const store = (gold: number, owned: Record<string, number>) => ({ data: { gold }, countOwned: (id: string) => owned[id] ?? 0 });
const HOME = { x: 5.5, z: 200 };
const all = () => true;

describe('Captain’s Log help for build goals', () => {
  it('lists the outboard’s cost against what the player owns', () => {
    const n = goalNeeds(store(60, { scrap_metal: 2 }), 'g_engine')!;
    expect(n.map((x) => [x.id, x.have, x.need])).toEqual([
      ['gold', 60, 90],
      ['scrap_metal', 2, 4],
      ['wire', 0, 2],
    ]);
    expect(goalProgressText(store(60, { scrap_metal: 2 }), 'g_engine')).toBe('Gold 60/90 · Scrap Metal 2/4 · Copper Wire 0/2');
  });

  it('ticks off what is done and says where to go when everything is aboard', () => {
    expect(goalProgressText(store(120, { scrap_metal: 5 }), 'g_engine')).toBe('✓ Gold 90/90 · ✓ Scrap Metal 4/4 · Copper Wire 0/2');
    expect(goalProgressText(store(90, { scrap_metal: 4, wire: 2 }), 'g_engine')).toMatch(/dock at Driftholm/);
  });

  it('is silent for goals that aren’t builds', () => {
    expect(goalNeeds(store(0, {}), 'g_salvage')).toBeNull();
    expect(goalProgressText(store(0, {}), 'g_crew')).toBeNull();
    expect(goalTarget(store(0, {}), 'g_helios', { x: 0, z: 0 }, HOME, all)).toBeNull();
  });

  it('points at the nearest site that drops a missing material, then home', () => {
    const t = goalTarget(store(0, { scrap_metal: 4 }), 'g_engine', { x: 6, z: 168 }, HOME, all)!;
    const site = SALVAGE_SITES.find((s) => s.id === t.site)!;
    expect(site.loot.some((l) => l.id === 'wire')).toBe(true);
    expect(t.site).toBe('sv_stump'); // the Sunken Tower is the closest wire source to Driftholm
    // only gold short: selling finds covers that, so go home
    expect(missingMats(store(10, { scrap_metal: 4, wire: 2 }), 'g_engine')).toEqual([]);
    expect(goalTarget(store(10, { scrap_metal: 4, wire: 2 }), 'g_engine', { x: 0, z: 0 }, HOME, all)).toEqual(HOME);
  });

  it('skips sites the boat can’t use right now', () => {
    const t = goalTarget(store(0, {}), 'g_engine', { x: 6, z: 168 }, HOME, (s) => s.id !== 'sv_stump');
    expect(t?.site).not.toBe('sv_stump');
  });
});

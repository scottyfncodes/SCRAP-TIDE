// The Salt Brig: the missing rung of the hull ladder (design bible PR 2.5).
import { beforeEach, describe, expect, it } from 'vitest';
import { VESSELS } from '../src/data/ship';
import { GOALS } from '../src/data/progress';
import { ITEM_MAP } from '../src/data/items';
import { goalCost } from '../src/game/goalHelp';
import { previewShip } from '../src/state/preview';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
(globalThis as any).window = globalThis;
const { Store } = await import('../src/state/store');

describe('the Salt Brig', () => {
  beforeEach(() => mem.clear());
  it('sits between the Trimaran and the Ironwake, and smooths the price steps to 2× or less', () => {
    const [t, b, i] = [VESSELS.sloop, VESSELS.brig, VESSELS.ironwake];
    expect(b.speed).toBeGreaterThan(t.speed);
    expect(b.speed).toBeLessThan(i.speed);
    expect(b.cargo).toBeGreaterThan(t.cargo);
    expect(b.hull).toBeGreaterThan(t.hull);
    expect(b.crossSwell && !b.crossStorm).toBe(true);
    expect(b.cost!.gold / t.cost!.gold).toBeLessThanOrEqual(2);
    expect(i.cost!.gold / b.cost!.gold).toBeLessThanOrEqual(2);
    for (const m of b.cost!.mats ?? []) expect(ITEM_MAP[m.id], m.id).toBeDefined();
    expect(b.builtAt).toEqual(['helios']);
  });
  it('is a Captain’s Log goal before the Ironwake, with a build plan', () => {
    const ids = GOALS.map((g) => g.id);
    expect(ids.indexOf('g_brig')).toBe(ids.indexOf('g_ironwake') - 1);
    expect(goalCost('g_brig')).toEqual(VESSELS.brig.cost);
    expect(previewShip('?ship=brig')).toBe('brig');
  });
  it('old saves past that point in the Log move up one, so nobody loses their place', () => {
    const brig = GOALS.findIndex((g) => g.id === 'g_brig');
    mem.set('tidebreakers.save.v1', JSON.stringify({ version: 4, goal: brig })); // was pointing at g_ironwake
    expect(GOALS[new Store().data.goal].id).toBe('g_ironwake');
    mem.set('tidebreakers.save.v1', JSON.stringify({ version: 4, goal: brig - 1 }));
    expect(GOALS[new Store().data.goal].id).toBe(GOALS[brig - 1].id);
  });
  it('her broadside mounts reach 30% further with a harpoon', () => {
    const s = new Store();
    s.data.upgrades = ['harpoon_turret'];
    s.data.vessel = 'sloop';
    const h = s.stats.harpoon;
    s.data.vessel = 'brig';
    expect(s.stats.harpoon).toBeCloseTo(h * 1.3);
  });
});

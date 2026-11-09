// Loop pass Phase 2: loot tiers, wreck rarity, the Salvage Log's sets, upgrade effects and dock contracts.
import { beforeEach, describe, expect, it } from 'vitest';
import { tierOf, rollWreckTier, wreckWeights, SETS, SET_ITEMS_OK, setBonuses, completedSets, WRECK_LOOT, bestTier } from '../src/data/loot';
import { UPGRADES, PLAY_EFFECT } from '../src/data/ship';
import { tripLength, clockRate } from '../src/game/trip';
import { dealBoard, progressJobs, claimJobs, jobText } from '../src/game/dockJobs';
import { ITEM_MAP } from '../src/data/items';
import { RNG } from '../src/core/noise';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
(globalThis as any).window = globalThis;
const { Store, SAVE_VERSION } = await import('../src/state/store');

describe('loot tiers', () => {
  it('maps the five rarities onto Junk, Common, Rare, Legendary', () => {
    expect(tierOf('scrap_metal')).toBe('junk');
    expect(tierOf('starfish')).toBe('junk');
    expect(tierOf('transistor_radio')).toBe('common');
    expect(tierOf('rubber_duck')).toBe('common');
    expect(tierOf('sextant')).toBe('rare');
    expect(tierOf('ship_in_bottle')).toBe('legendary');
    expect(tierOf('tree_sapling')).toBe('legendary');
    expect(bestTier(['scrap_metal', 'sextant', 'wire'])).toBe('rare');
  });
  it('every wreck loot id is a real item', () => {
    for (const list of Object.values(WRECK_LOOT)) for (const l of list) expect(ITEM_MAP[l.id], l.id).toBeTruthy();
  });
});

describe('wreck rarity roll distribution', () => {
  const dist = (risk: number, n = 20000) => {
    const rng = new RNG(7);
    const c = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < n; i++) c[rollWreckTier(() => rng.next(), risk)]++;
    return { common: c.common / n, rare: c.rare / n, legendary: c.legendary / n };
  };
  it('beside a dock: mostly common, a few rare, never legendary', () => {
    const d = dist(0);
    expect(d.legendary).toBe(0);
    expect(d.rare).toBeGreaterThan(0.03);
    expect(d.rare).toBeLessThan(0.09);
  });
  it('in risky water rare and legendary wrecks turn up, still less often than common ones', () => {
    const d = dist(1);
    expect(d.rare).toBeGreaterThan(0.2);
    expect(d.legendary).toBeGreaterThan(0.05);
    expect(d.legendary).toBeLessThan(d.rare);
    expect(d.common).toBeGreaterThan(d.rare);
  });
  it('risk only ever makes the good tiers more likely', () => {
    let prev = wreckWeights(0);
    for (let r = 0.1; r <= 1.0001; r += 0.1) {
      const w = wreckWeights(r);
      expect(w.rare).toBeGreaterThanOrEqual(prev.rare);
      expect(w.legendary).toBeGreaterThanOrEqual(prev.legendary);
      prev = w;
    }
  });
});

describe('Salvage Log sets', () => {
  beforeEach(() => mem.clear());
  it('every set lists real items, with no item in two sets', () => {
    expect(SET_ITEMS_OK()).toBe(true);
    const all = SETS.flatMap((s) => s.items);
    expect(new Set(all).size).toBe(all.length);
  });
  it('a completed set grants its bonus permanently through the stats', () => {
    const st = new Store();
    const cargo0 = st.stats.cargo, hull0 = st.stats.hullMax;
    const beach = SETS.find((s) => s.id === 'set_beach')!;
    for (const id of beach.items.slice(0, -1)) st.discover(id, 'test');
    expect(st.stats.cargo).toBe(cargo0); // not until the last piece
    st.discover(beach.items[beach.items.length - 1], 'test');
    expect(completedSets((id) => !!st.data.discoveries[id]).map((s) => s.id)).toEqual(['set_beach']);
    expect(st.stats.cargo).toBe(cargo0 + 2);
    for (const id of SETS.find((s) => s.id === 'set_green')!.items) st.discover(id, 'test');
    expect(st.stats.hullMax).toBe(hull0 + 15);
    for (const id of SETS.find((s) => s.id === 'set_office')!.items) st.discover(id, 'test');
    expect(st.stats.sellMul).toBeCloseTo(1.05);
    for (const id of SETS.find((s) => s.id === 'set_nav')!.items) st.discover(id, 'test');
    expect(tripLength(st.stats)).toBe(tripLength({ solar: 0, fuelCap: 40 }) + 20);
    expect(setBonuses(() => true)).toEqual({ sell: 10, trip: 20, cargo: 2, window: 0.03, hull: 15, perfect: 0.08 });
  });
});

describe('every upgrade changes play', () => {
  beforeEach(() => mem.clear());
  it('each upgrade has an effect line for the shop', () => {
    for (const u of UPGRADES) expect(PLAY_EFFECT[u.id], u.id).toBeTruthy();
  });
  it('the new effects are wired into the stats', () => {
    const st = new Store();
    const base = st.stats;
    expect(base.cranePulls).toBe(3);
    expect(base.harpoonReach).toBe(0);
    expect(base.shield).toBe(0);
    expect(base.nightOk).toBe(false);
    st.data.upgrades.push('salvage_crane', 'harpoon_turret', 'hull_copper', 'hull_armor', 'deck_lights', 'solar_array', 'deck_turbine', 'engine_outboard', 'tank_drums');
    const up = st.stats;
    expect(up.cranePulls).toBe(2); // Crane speeds hauling
    expect(up.harpoonReach).toBeGreaterThan(0); // Harpoon reaches far wrecks
    expect(up.shield).toBe(1); // Armour survives one rogue wave / ram
    expect(up.nightOk).toBe(true); // Lights enable night trips
    expect(tripLength(up)).toBe(tripLength(base) + 60 + 20); // Wind Turbine + drums extend trip range
    expect(up.cargo).toBe(base.cargo);
    st.data.upgrades.push('cargo_crate', 'cargo_net');
    expect(st.stats.cargo).toBe(base.cargo + 8); // Cargo Nets add hold space
  });
  it('without lights the dark runs the trip clock faster', () => {
    expect(clockRate(0, false)).toBe(1);
    expect(clockRate(1, false)).toBe(1.5);
    expect(clockRate(1, true)).toBe(1);
  });
});

describe('dock contracts', () => {
  it('three different jobs, the same board for the same seed', () => {
    const a = dealBoard(42, 0, 0), b = dealBoard(42, 0, 0);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((j) => j.kind)).size).toBe(3);
    for (const j of a) {
      expect(j.reward).toBeGreaterThan(0);
      expect(jobText(j)).toBeTruthy();
    }
  });
  it('finished jobs pay out and are refilled; unfinished ones stay', () => {
    const board = [
      { id: 'a', kind: 'hauls' as const, n: 2, progress: 0, reward: 50, done: false },
      { id: 'b', kind: 'bank' as const, n: 100, progress: 0, reward: 35, done: false },
      { id: 'c', kind: 'harpoon' as const, n: 2, progress: 0, reward: 60, done: false },
    ];
    expect(progressJobs(board, { kind: 'haul', tripHauls: 1, perfects: 0, best: 'junk' })).toEqual([]);
    expect(progressJobs(board, { kind: 'haul', tripHauls: 2, perfects: 1, best: 'common' }).map((j) => j.id)).toEqual(['a']);
    expect(progressJobs(board, { kind: 'bank', value: 140, items: [] }).map((j) => j.id)).toEqual(['b']);
    const r = claimJobs(board, 9, 10, 0);
    expect(r.paid).toBe(85);
    expect(r.board).toHaveLength(3);
    expect(r.board[2].id).toBe('c'); // untouched
    expect(r.board[0].done || r.board[1].done).toBe(false);
    expect(r.serial).toBe(12);
  });
});

describe('save migration v6 → v7', () => {
  beforeEach(() => mem.clear());
  it('adds the dock board, sets and tiers; keeps ships, upgrades, cosmetics and the trip', () => {
    mem.set('tidebreakers.save.v1', JSON.stringify({ version: 6, gold: 90, vessel: 'brig', vesselsOwned: ['dinghy', 'sloop', 'brig'], upgrades: ['sail_canvas', 'salvage_crane'], cosmetics: ['paint_hazard'], equipped: { paint: 'paint_hazard' }, quest: 'free', trip: { on: true, t: 33, hauls: 1, startGold: 80 }, loop: { banked: 500, bestHold: 200, tripsBanked: 4, tripsLost: 1, perfects: 9 } }));
    const d = new Store().data;
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.vesselsOwned).toEqual(['dinghy', 'sloop', 'brig']);
    expect(d.upgrades).toEqual(['sail_canvas', 'salvage_crane']);
    expect(d.equipped.paint).toBe('paint_hazard');
    expect(d.trip.t).toBe(33);
    expect(d.loop.banked).toBe(500);
    expect(d.jobs.board).toHaveLength(3);
    expect(d.setsDone).toEqual([]);
    expect(d.tiers).toEqual({ junk: 0, common: 0, rare: 0, legendary: 0 });
  });
});

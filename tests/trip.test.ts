// Loop pass Phase 1: push-your-luck trips, the hold, banking, the squall and the perfect pull.
import { beforeEach, describe, expect, it } from 'vitest';
import { tripLength, squallLevel, squallDamage, tripPhase, tripLeft, holdValue, sinkHold, keepsOnSink, clockText, TRIP_BASE, SQUALL_RAMP, SQUALL_WARN } from '../src/game/trip';
import { perfectBonus, pullGrade, PERFECT_SHARE, haulRolls } from '../src/game/haul';
import { item } from '../src/data/items';
import { FIRST_VOYAGE, liveStep } from '../src/data/progress';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
(globalThis as any).window = globalThis;
const { Store, freshSave, SAVE_VERSION } = await import('../src/state/store');

describe('trip clock and squall', () => {
  it('a trip is roughly 3 to 5 minutes before the squall, longer with the turbine and drums', () => {
    const base = tripLength({ solar: 0, fuelCap: 40 });
    expect(base).toBe(TRIP_BASE);
    expect(base).toBeGreaterThanOrEqual(180);
    const turbine = tripLength({ solar: 6, fuelCap: 100 });
    expect(turbine).toBeGreaterThan(base);
    expect(turbine).toBeLessThanOrEqual(300 + SQUALL_RAMP);
    expect(tripLength({ solar: 2.5, fuelCap: 40 })).toBeGreaterThan(base);
  });
  it('the squall is nothing until the clock runs out, then ramps to full', () => {
    const L = 200;
    expect(squallLevel(0, L)).toBe(0);
    expect(squallLevel(L, L)).toBe(0);
    expect(squallLevel(L + SQUALL_RAMP / 2, L)).toBeCloseTo(0.5);
    expect(squallLevel(L + 999, L)).toBe(1);
    expect(squallDamage(0, 10, L)).toBe(0);
    expect(squallDamage(1, L + 60, L)).toBeGreaterThan(squallDamage(1, L + SQUALL_RAMP, L)); // it gets worse the longer you stay
  });
  it('phases: calm, a warning, then the squall', () => {
    expect(tripPhase(0, 200)).toBe('calm');
    expect(tripPhase(200 - SQUALL_WARN + 1, 200)).toBe('warn');
    expect(tripPhase(201, 200)).toBe('squall');
    expect(tripLeft(150, 200)).toBe(50);
    expect(tripLeft(250, 200)).toBe(0);
    expect(clockText(65)).toBe('1:05');
  });
});

describe('the hold', () => {
  it('hold value is the base sell price of everything aboard', () => {
    expect(holdValue([])).toBe(0);
    expect(holdValue([{ id: 'scrap_metal', n: 3 }, { id: 'transistor_radio', n: 1 }])).toBe(item('scrap_metal').value * 3 + item('transistor_radio').value);
  });
  it('sinking loses the hold, except one-of-a-kind story finds', () => {
    const cargo = [{ id: 'scrap_metal', n: 5 }, { id: 'gold_watch', n: 1 }, { id: 'sun_mask', n: 1 }];
    const r = sinkHold(cargo);
    expect(r.lost.map((l) => l.id)).toEqual(['scrap_metal', 'gold_watch']);
    expect(r.kept.map((l) => l.id)).toEqual(['sun_mask']);
    expect(keepsOnSink('sun_mask')).toBe(true);
    expect(cargo).toHaveLength(3); // pure
  });
});

describe('banking and loss in the save', () => {
  beforeEach(() => mem.clear());
  it('docking banks the hold into the vault; gold and upgrades are untouched', () => {
    const st = new Store();
    st.data.gold = 120;
    st.data.upgrades = ['sail_canvas'];
    st.addCargo('scrap_metal', 4);
    st.addCargo('wire', 2);
    const n = st.unloadToVault();
    expect(n).toBe(6);
    expect(st.data.cargo).toEqual([]);
    expect(st.data.vault.find((v) => v.id === 'scrap_metal')?.n).toBe(4);
    expect(st.data.gold).toBe(120);
  });
  it('swamped: loseHold empties the hold but never the vault, the gold, the ships or the upgrades', () => {
    const st = new Store();
    st.data.gold = 333;
    st.data.upgrades = ['sail_canvas', 'cargo_crate'];
    st.data.vesselsOwned = ['dinghy', 'sloop'];
    st.data.vault = [{ id: 'pearl', n: 2 }];
    st.addCargo('scrap_metal', 4);
    st.addCargo('sun_mask', 1);
    const lost = st.loseHold(keepsOnSink);
    expect(lost).toEqual([{ id: 'scrap_metal', n: 4 }]);
    expect(st.data.cargo).toEqual([{ id: 'sun_mask', n: 1 }]);
    expect(st.data.vault).toEqual([{ id: 'pearl', n: 2 }]);
    expect(st.data.gold).toBe(333);
    expect(st.data.upgrades).toEqual(['sail_canvas', 'cargo_crate']);
    expect(st.data.vesselsOwned).toEqual(['dinghy', 'sloop']);
  });
  it('a v5 save migrates: trip state is added, everything owned carries over', () => {
    mem.set('tidebreakers.save.v1', JSON.stringify({ version: 5, gold: 410, vessel: 'sloop', vesselsOwned: ['dinghy', 'sloop'], upgrades: ['sail_canvas', 'radar_mast'], cosmetics: ['paint_rust', 'sail_plain', 'flag_none'], equipped: { paint: 'paint_rust' }, quest: 'free', ship: { docked: false, x: 50, z: 50 } }));
    const d = new Store().data;
    expect(d.version).toBe(SAVE_VERSION);
    expect(d.gold).toBe(410);
    expect(d.vesselsOwned).toEqual(['dinghy', 'sloop']);
    expect(d.upgrades).toEqual(['sail_canvas', 'radar_mast']);
    expect(d.cosmetics).toContain('paint_rust');
    expect(d.equipped.paint).toBe('paint_rust');
    expect(d.trip.on).toBe(true); // she was at sea: a fresh clock starts
    expect(d.trip.t).toBe(0);
    expect(d.loop).toEqual(freshSave().loop);
  });
});

describe('the perfect pull', () => {
  it('the gold centre strip is a perfect, the rest of the green a hit', () => {
    const left = 0.3, w = 0.3, mid = left + w / 2;
    expect(pullGrade(mid, left, w)).toBe('perfect');
    expect(pullGrade(mid + (w * PERFECT_SHARE) / 2 + 0.01, left, w)).toBe('hit');
    expect(pullGrade(left - 0.01, left, w)).toBe('miss');
  });
  it('perfects add bonus rolls; misses never take loot away', () => {
    expect([0, 1, 2, 3].map(perfectBonus)).toEqual([0, 1, 2, 2]);
    expect(haulRolls(3, 0) + perfectBonus(0)).toBeGreaterThanOrEqual(1);
  });
});

describe('onboarding', () => {
  it('the first haul and banking it come before Turtle Atoll; old saves still map onto live steps', () => {
    const ids = FIRST_VOYAGE.map((q) => q.id);
    expect(ids.indexOf('first_haul')).toBeLessThan(ids.indexOf('reach_turtle'));
    expect(ids.indexOf('bank_haul')).toBeLessThan(ids.indexOf('upgrade'));
    expect(ids.indexOf('upgrade')).toBeLessThan(ids.indexOf('reach_turtle'));
    for (const id of ['steer', 'anchor', 'read_map', 'sell', 'catalog', 'return_harbor', 'dig_x']) expect(ids).toContain(liveStep(id));
  });
});

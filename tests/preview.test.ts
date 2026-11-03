// ?ship= preview links start a visit in any vessel without unlocking it and never touch the saved game.
import { beforeEach, describe, expect, it } from 'vitest';

const mem = new Map<string, string>();
const writes: string[] = [];
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => (writes.push(k), void mem.set(k, v)),
  removeItem: (k: string) => (writes.push(`-${k}`), void mem.delete(k)),
};
(globalThis as any).window = globalThis;

const { Store } = await import('../src/state/store');
const { previewShip, previewUpgrades } = await import('../src/state/preview');
const { UPGRADES } = await import('../src/data/ship');

describe('preview link', () => {
  beforeEach(() => {
    mem.clear();
    writes.length = 0;
  });

  it('maps ?ship= names to vessels and ignores anything else', () => {
    expect(previewShip('?ship=trimaran')).toBe('sloop');
    expect(previewShip('?ship=Skiff')).toBe('dinghy');
    expect(previewShip('?ship=ironwake')).toBe('ironwake');
    expect(previewShip('?ship=sloop&x=1')).toBe('sloop');
    expect(previewShip('?ship=galleon')).toBeNull();
    expect(previewShip('')).toBeNull();
  });

  it('starts a fresh visit in the chosen vessel and writes nothing', () => {
    const s = new Store({ preview: 'ironwake' });
    expect(s.data.vessel).toBe('ironwake');
    expect(s.data.hull).toBe(s.stats.hullMax);
    s.data.gold = 9999;
    s.saveNow();
    s.commit();
    s.reset();
    expect(s.data.vessel).toBe('ironwake');
    expect(writes).toEqual([]);
    expect(mem.size).toBe(0);
  });

  it('previews on top of a real save without changing that save', () => {
    const real = new Store();
    real.data.gold = 321;
    real.saveNow();
    const saved = mem.get('tidebreakers.save.v1');
    writes.length = 0;

    const p = new Store({ preview: 'sloop' });
    expect(p.data.gold).toBe(321);
    expect(p.data.vessel).toBe('sloop');
    expect(p.data.vesselsOwned).toContain('sloop');
    p.data.gold = 0;
    p.saveNow();
    p.reset();
    expect(writes).toEqual([]);
    expect(mem.get('tidebreakers.save.v1')).toBe(saved);
    const after = new Store();
    expect(after.data.vessel).toBe('dinghy');
    expect(after.data.vesselsOwned).not.toContain('sloop');
  });

  it('parses upgrades=all and upgrade lists', () => {
    expect(previewUpgrades('?ship=trimaran&upgrades=all')).toEqual(UPGRADES.map((u) => u.id));
    expect(previewUpgrades('?upgrades=sail_canvas,compass_brass,bogus')).toEqual(['sail_canvas', 'compass_brass']);
    expect(previewUpgrades('?upgrades=bogus')).toBeNull();
    expect(previewUpgrades('?ship=trimaran')).toBeNull();
  });

  it('fits every upgrade for the visit only, never saving it', () => {
    const real = new Store();
    real.data.gold = 50;
    real.saveNow();
    const saved = mem.get('tidebreakers.save.v1');
    writes.length = 0;

    const p = new Store({ preview: 'sloop', upgrades: UPGRADES.map((u) => u.id) });
    for (const id of ['sail_canvas', 'cargo_crate', 'compass_brass', 'rudder_ash', 'hull_copper']) expect(p.has(id), id).toBe(true);
    expect(p.data.hull).toBe(p.stats.hullMax);
    p.saveNow();
    p.commit();
    p.reset();
    expect(p.has('hull_copper')).toBe(true);
    expect(writes).toEqual([]);
    expect(mem.get('tidebreakers.save.v1')).toBe(saved);
    expect(new Store().data.upgrades).toEqual([]);
  });

  it('an upgrades-only link previews the save’s own boat', () => {
    const p = new Store({ upgrades: ['cargo_crate'] });
    expect(p.preview).toBe('dinghy');
    expect(p.has('cargo_crate')).toBe(true);
    p.saveNow();
    expect(writes).toEqual([]);
  });
});

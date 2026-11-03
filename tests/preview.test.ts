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
const { previewShip } = await import('../src/state/preview');

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
});

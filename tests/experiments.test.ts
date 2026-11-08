// Phase 3 hidden experiment previews (src/state/experiments.ts): off unless asked for, and never touching a real save.
import { beforeEach, describe, expect, it } from 'vitest';
import { EXPERIMENTS, parseExperiments, parseFresh } from '../src/state/experiments';

const mem = new Map<string, string>();
let writes = 0;
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => (writes++, void mem.set(k, v)),
  removeItem: (k: string) => (writes++, void mem.delete(k)),
};
(globalThis as any).window = globalThis;
const { Store } = await import('../src/state/store');

describe('parsing experiment links', () => {
  it('turns on known experiments only, in priority order, from ?exp= or its ?wild= alias', () => {
    expect(parseExperiments('')).toEqual([]);
    expect(parseExperiments('?ship=brig')).toEqual([]);
    expect(parseExperiments('?exp=tides')).toEqual(['tides']);
    expect(parseExperiments('?exp=TakeHer, swamped,nonsense')).toEqual(['swamped', 'takeher']);
    expect(parseExperiments('?wild=marque')).toEqual(['marque']);
    expect(parseExperiments('?exp=tides&wild=tides')).toEqual(['tides']);
  });
  it('the four Phase 3 experiments are registered in priority order, each with a try-it link', () => {
    expect(Object.keys(EXPERIMENTS)).toEqual(['swamped', 'tides', 'marque', 'takeher']);
    for (const e of Object.values(EXPERIMENTS)) expect(parseExperiments(e.try), e.id).toEqual([e.id]);
    expect(parseFresh('?exp=swamped&fresh=1')).toBe(true);
    expect(parseFresh('?exp=swamped')).toBe(false);
  });
});

describe('experiment visits are sandboxes', () => {
  beforeEach(() => {
    mem.clear();
    writes = 0;
  });
  const realSave = () => {
    const s = new Store();
    s.data.gold = 777;
    s.data.shipName = 'Real Save';
    s.saveNow();
    writes = 0;
    return mem.get('tidebreakers.save.v1')!;
  };

  it('normal play is untouched: no experiments, not a sandbox, saves as before', () => {
    const s = new Store();
    expect(s.experiments).toEqual([]);
    expect(s.sandbox).toBe(false);
    expect(s.exp('tides')).toBe(false);
    s.saveNow();
    expect(writes).toBeGreaterThan(0);
  });

  it('an experiment visit plays on a copy of the save and never writes or clears it', () => {
    const before = realSave();
    const s = new Store({ experiments: ['tides'] });
    expect(s.sandbox).toBe(true);
    expect(s.exp('tides')).toBe(true);
    expect(s.exp('swamped')).toBe(false);
    expect(s.data.gold).toBe(777); // a copy of the real save
    s.data.gold = 1;
    s.saveNow();
    s.reset(); // "new game" inside the experiment only restarts the visit
    expect(writes).toBe(0);
    expect(mem.get('tidebreakers.save.v1')).toBe(before);
  });

  it('fresh=1 starts a brand-new game in memory, leaving the real save alone', () => {
    const before = realSave();
    const s = new Store({ experiments: ['swamped'], fresh: true });
    expect(s.isNew).toBe(true);
    expect(s.data.gold).toBe(15);
    expect(s.data.shipName).toBe('');
    expect(s.data.quest).toBe('leave_dock');
    s.saveNow();
    expect(writes).toBe(0);
    expect(mem.get('tidebreakers.save.v1')).toBe(before);
  });

  it('fresh=1 without an experiment does nothing (it is not a back door to wiping a save)', () => {
    realSave();
    const s = new Store({ fresh: true });
    expect(s.sandbox).toBe(false);
    expect(s.data.gold).toBe(777);
  });
});

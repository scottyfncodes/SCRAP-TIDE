// Save compatibility and Captain's Log progression across every save version (v1 → v5), after Phases 1 and 2.
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GOALS } from '../src/data/progress';

const mem = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
(globalThis as any).window = globalThis;
const { Store, SAVE_VERSION } = await import('../src/state/store');
const load = (raw: object) => {
  mem.clear();
  mem.set('tidebreakers.save.v1', JSON.stringify(raw));
  return new Store().data;
};
const at = (id: string) => GOALS.findIndex((g) => g.id === id);

describe('save compatibility', () => {
  beforeEach(() => mem.clear());

  it('a v1 save mid-way through the old 13-step voyage loads at the current version with every new field defaulted', () => {
    const d = load({ version: 1, gold: 80, quest: 'sell', upgrades: ['sail_canvas'], flags: ['sold'] });
    expect(d.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBe(8);
    expect(d.quest).toBe('upgrade'); // retired step continues from its successor (PR 1.2)
    expect(d.gold).toBe(80);
    expect(d.upgrades).toEqual(['sail_canvas']);
    expect(d.pinned).toEqual([]);
    expect(d.shipName).toBe('');
    expect(d.contracts).toEqual({ active: [], done: [] });
    expect(d.standing).toEqual({});
    expect(d.garden).toEqual({});
    expect(d.beats).toEqual([]);
  });

  it('v3 and v4 saves keep what they had (pins, name, jobs, standing, gardens, beats)', () => {
    const d = load({
      version: 4, quest: 'free', goal: at('g_helios'), pinned: ['r_bell'], followSide: true, shipName: 'Salt Widow', renown: 'rover',
      contracts: { active: [{ id: 'c_pip_radio', at: 5, base: 0 }], done: ['c_marlo_nails'] }, standing: { driftholm: 3 }, garden: { hollow: 2 }, beats: ['kai_1'],
    });
    expect(d.pinned).toEqual(['r_bell']);
    expect(d.followSide).toBe(true);
    expect(d.shipName).toBe('Salt Widow');
    expect(d.renown).toBe('rover');
    expect(d.contracts.active.map((a) => a.id)).toEqual(['c_pip_radio']);
    expect(d.contracts.done).toEqual(['c_marlo_nails']);
    expect(d.standing).toEqual({ driftholm: 3 });
    expect(d.garden).toEqual({ hollow: 2 });
    expect(d.beats).toEqual(['kai_1']);
    expect(GOALS[d.goal].id).toBe('g_helios'); // before the Salt Brig: unchanged
  });

  it('pre-v5 saves keep their place in the Captain’s Log across the inserted Salt Brig goal', () => {
    for (const id of ['g_ironwake', 'g_spire', 'g_done']) {
      const oldIndex = at(id) - 1; // where that goal sat before v5 inserted g_brig
      expect(GOALS[load({ version: 4, quest: 'free', goal: oldIndex }).goal].id, id).toBe(id);
    }
    // a v5 save is never shifted again
    expect(GOALS[load({ version: 5, quest: 'free', goal: at('g_ironwake') }).goal].id).toBe('g_ironwake');
  });
});

describe('Captain’s Log progression', () => {
  it('every goal but the last has a completion check in the game loop, and ids are unique', () => {
    const src = readFileSync(new URL('../src/game/game.ts', import.meta.url), 'utf8');
    const block = src.slice(src.indexOf('const done: Record<string, () => boolean> = {'), src.indexOf('};', src.indexOf('const done: Record<string, () => boolean> = {')));
    for (const g of GOALS.slice(0, -1)) expect(block.includes(`${g.id}:`), g.id).toBe(true);
    expect(new Set(GOALS.map((g) => g.id)).size).toBe(GOALS.length);
  });

  it('completing goals in order walks the whole Log, paying each reward once, and stops at the end', () => {
    mem.clear();
    const s = new Store();
    s.data.quest = 'free';
    const gold0 = s.data.gold;
    let paid = 0;
    for (const g of GOALS.slice(0, -1)) {
      expect(s.completeGoal('g_not_this_one')).toBe(0); // only the current goal completes
      paid += s.completeGoal(g.id);
    }
    expect(GOALS[s.data.goal].id).toBe('g_done');
    expect(s.completeGoal('g_done')).toBe(0);
    expect(s.data.gold - gold0).toBe(paid);
    expect(paid).toBe(GOALS.reduce((a, g) => a + g.reward, 0));
  });
});

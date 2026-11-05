// Contracts, port standing and the Green Choice (design bible PR 2.2).
import { describe, expect, it } from 'vitest';
import { CONTRACTS, CONTRACT_MAP, boardFor, contractReady, standingRank, portDiscount, gardenStage, freshFood, GARDEN_POINTS, type ContractState } from '../src/data/contracts';
import { CHARACTER_MAP } from '../src/data/characters';
import { ITEM_MAP, ITEMS } from '../src/data/items';
import { SALVAGE_SITES, CASTAWAYS, SETTLEMENT_MAP, POIS, SEA_MARKS, ISLANDS } from '../src/data/world';
import { COSMETIC_MAP } from '../src/data/ship';

const fresh = (): ContractState => ({ contracts: { active: [], done: [] }, standing: {}, garden: {}, flags: [], findsOpened: [], castaways: [], salvaged: {}, raidersRepelled: 0 });
const holds = (m: Record<string, number> = {}) => ({ countOwned: (id: string) => m[id] ?? 0 });

describe('contracts data', () => {
  it('every job is posted by an NPC who lives in that port, and every reference resolves', () => {
    const findIds = new Set(ISLANDS.flatMap((i) => i.finds.map((f) => f.id)));
    const flags = new Set([...SEA_MARKS.map((m) => `found_${m.id}`), ...POIS.map((p) => `seen_${p.id}`)]);
    for (const c of CONTRACTS) {
      expect(CHARACTER_MAP[c.giver]?.kind, c.id).toBe('npc');
      expect(CHARACTER_MAP[c.giver].home, c.id).toBe(c.port);
      expect(SETTLEMENT_MAP[c.port], c.id).toBeDefined();
      if (c.need.item) expect(ITEM_MAP[c.need.item], c.id).toBeDefined();
      if (c.need.site) expect(SALVAGE_SITES.some((s) => s.id === c.need.site), c.id).toBe(true);
      if (c.need.castaway) expect(CASTAWAYS.some((s) => s.id === c.need.castaway), c.id).toBe(true);
      if (c.need.find) expect(findIds.has(c.need.find), c.id).toBe(true);
      if (c.need.flag) expect(flags.has(c.need.flag), `${c.id}: ${c.need.flag}`).toBe(true);
      if (c.after) expect(CONTRACT_MAP[c.after], c.id).toBeDefined();
      for (const m of c.reward.mats ?? []) expect(ITEM_MAP[m.id], c.id).toBeDefined();
      if (c.reward.cosmetic) expect(COSMETIC_MAP[c.reward.cosmetic], c.id).toBeDefined();
      expect(c.reward.standing, c.id).toBeGreaterThan(0);
    }
  });
  it('every settlement NPC posts at least one job, and each port has work', () => {
    for (const id of ['pip', 'marlo', 'wren', 'odessa', 'sal', 'nori', 'dace', 'vik']) expect(CONTRACTS.some((c) => c.giver === id), id).toBe(true);
    for (const p of ['driftholm', 'hollow', 'helios']) expect(boardFor(p, fresh()).length, p).toBeGreaterThan(0);
  });
});

describe('the board and completion', () => {
  it('shows a follow-up only once its prerequisite is done, and never a taken or finished job', () => {
    const d = fresh();
    expect(boardFor('driftholm', d).some((c) => c.id === 'c_pip_photo')).toBe(false);
    d.contracts.done.push('c_pip_radio');
    expect(boardFor('driftholm', d).some((c) => c.id === 'c_pip_photo')).toBe(true);
    d.contracts.active.push({ id: 'c_pip_photo', at: 0, base: 0 });
    expect(boardFor('driftholm', d).some((c) => c.id === 'c_pip_photo')).toBe(false);
  });
  it('knows when each kind of job is done', () => {
    const d = fresh();
    const a = (id: string) => ({ id, at: 100, base: 2 });
    expect(contractReady(CONTRACT_MAP.c_marlo_nails, a('c_marlo_nails'), d, holds({ iron_nails: 7 }))).toBe(false);
    expect(contractReady(CONTRACT_MAP.c_marlo_nails, a('c_marlo_nails'), d, holds({ iron_nails: 8 }))).toBe(true);
    d.salvaged.sv_boxyard = 50; // hauled before the job was taken: doesn't count
    expect(contractReady(CONTRACT_MAP.c_pip_boxes, a('c_pip_boxes'), d, holds())).toBe(false);
    d.salvaged.sv_boxyard = 150;
    expect(contractReady(CONTRACT_MAP.c_pip_boxes, a('c_pip_boxes'), d, holds())).toBe(true);
    d.raidersRepelled = 2;
    expect(contractReady(CONTRACT_MAP.c_dace_raider, a('c_dace_raider'), d, holds())).toBe(false);
    d.raidersRepelled = 3;
    expect(contractReady(CONTRACT_MAP.c_dace_raider, a('c_dace_raider'), d, holds())).toBe(true);
    d.castaways.push('cw_bram');
    expect(contractReady(CONTRACT_MAP.c_vik_bram, a('c_vik_bram'), d, holds())).toBe(true);
  });
});

describe('standing and gardens', () => {
  it('ranks Stranger → Known → Trusted (10% off) → Kin (20% off)', () => {
    expect([0, 2, 5, 9].map((n) => standingRank(n).name)).toEqual(['Stranger', 'Known', 'Trusted', 'Kin']);
    expect([0, 4, 5, 9].map(portDiscount)).toEqual([1, 1, 0.9, 0.8]);
  });
  it('a garden grows in three stages and feeds the crew', () => {
    expect([0, 1, 2, 5, 6, 12].map(gardenStage)).toEqual([0, 0, 1, 1, 2, 3]);
    expect(freshFood({ garden: {} })).toBe(1);
    expect(freshFood({ garden: { driftholm: 6, hollow: 2 } })).toBe(1.75);
  });
  it('every living item can be planted, and rarer things count for more', () => {
    for (const i of ITEMS.filter((x) => x.category === 'living')) expect(GARDEN_POINTS[i.rarity], i.id).toBeGreaterThan(0);
    expect(GARDEN_POINTS.legendary).toBeGreaterThan(GARDEN_POINTS.common);
  });
});

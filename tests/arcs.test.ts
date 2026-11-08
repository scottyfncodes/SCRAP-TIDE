// Character arcs (design bible PR 2.3).
import { describe, expect, it } from 'vitest';
import { ARCS, ARC_MAP, nextBeat, type ArcCtx } from '../src/data/arcs';
import { CHARACTERS } from '../src/data/characters';
import { COSMETIC_MAP } from '../src/data/ship';

const ctx = (o: Partial<ArcCtx> & { crew?: string[] } = {}): ArcCtx => ({
  aboard: (id) => (o.crew ?? []).includes(id), port: null, flags: [], has: () => false, owns: () => false, regions: ['shallows'],
  done: [], discoveries: 0, standing: {}, items: () => 0, mapsDone: [], ...o,
});

describe('character arcs', () => {
  it('every crew member has three beats, every NPC at least one, and chains are sound', () => {
    for (const c of CHARACTERS) {
      const n = ARCS.filter((b) => b.who === c.id).length;
      if (c.kind === 'crew') expect(n, c.id).toBeGreaterThanOrEqual(3);
      else expect(n, c.id).toBeGreaterThanOrEqual(1);
    }
    for (const b of ARCS) {
      if (b.after) {
        expect(ARC_MAP[b.after], b.id).toBeDefined();
        expect(ARC_MAP[b.after].who, b.id).toBe(b.who);
      }
    }
    expect(new Set(ARCS.map((b) => b.id)).size).toBe(ARCS.length);
  });
  it('crew beats fire only while that person is aboard, and in order', () => {
    expect(nextBeat([], ctx({ has: (u) => u === 'engine_outboard' }))).toBeNull();
    const c = ctx({ crew: ['juno'], has: (u) => u === 'engine_outboard', port: 'helios' });
    expect(nextBeat([], c)?.id).toBe('juno_1');
    expect(nextBeat(['juno_1'], c)?.id).toBe('juno_2');
    expect(nextBeat(['juno_1', 'juno_2'], c)).toBeNull(); // the plate waits for the Ironwake
  });
  it('Juno at Helios is the first NPC choice; Odessa’s colours are a real flag', () => {
    expect(ARC_MAP.juno_2.effect).toBe('vik_choice');
    expect(COSMETIC_MAP.flag_tidebreaker?.slot).toBe('flag');
  });
});

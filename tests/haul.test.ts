// Winch payouts (balance pass 1, #2): every green-zone hit adds loot rolls, and perfect hauls are unchanged.
import { describe, expect, it } from 'vitest';
import { haulRolls } from '../src/game/haul';
import { SALVAGE_SITES } from '../src/data/world';

/** The formula before this change (src/game/salvage.ts at bed002d), for the perfect-haul comparison. */
const before = (rolls: number, hits: number, salvager: boolean) => Math.max(1, Math.round(rolls * (0.35 + 0.22 * hits)) + (salvager ? 1 : 0) + (hits === 3 ? 1 : 0));

describe('haulRolls', () => {
  it('pays strictly more for every extra hit at every salvage site', () => {
    for (const s of SALVAGE_SITES)
      for (const salvager of [false, true])
        for (let h = 0; h < 3; h++) expect(haulRolls(s.rolls, h + 1, salvager), `${s.id} ${h}→${h + 1} hits`).toBeGreaterThan(haulRolls(s.rolls, h, salvager));
  });

  it('keeps perfect hauls exactly as they were', () => {
    for (const s of SALVAGE_SITES) for (const salvager of [false, true]) expect(haulRolls(s.rolls, 3, salvager), s.id).toBe(before(s.rolls, 3, salvager));
  });

  it('gives 3-roll sites 1/2/3/4 rolls (was 1/2/2/4)', () => {
    expect([0, 1, 2, 3].map((h) => haulRolls(3, h))).toEqual([1, 2, 3, 4]);
    expect([0, 1, 2, 3].map((h) => before(3, h, false))).toEqual([1, 2, 2, 4]);
  });

  it('always rolls at least once, and a Salvager adds one', () => {
    for (const s of SALVAGE_SITES) for (let h = 0; h <= 3; h++) {
      expect(haulRolls(s.rolls, h)).toBeGreaterThanOrEqual(1);
      expect(haulRolls(s.rolls, h, true)).toBe(haulRolls(s.rolls, h) + 1);
    }
  });
});

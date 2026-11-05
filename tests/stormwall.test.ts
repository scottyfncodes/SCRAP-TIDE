// Stormwall (balance pass 1, #4): the crossing is harder; salvaging at the Meridian Spire is not.
import { describe, expect, it } from 'vitest';
import { STORMWALL, stormwallLee, SALVAGE_MAP } from '../src/data/world';
import { VESSELS } from '../src/data/ship';

describe('Stormwall', () => {
  it('the Spire salvage site, and everywhere a boat can haul it from, is in the lee', () => {
    const s = SALVAGE_MAP.sv_spire;
    expect(stormwallLee(s.x, s.z)).toBe(1);
    // Salvage.siteInReach: within site.r + beam + 10 m of the site (the Ironwake's beam is well under 5 m)
    const reach = s.r + 5 + 10;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) expect(stormwallLee(s.x + Math.sin(a) * reach, s.z + Math.cos(a) * reach)).toBe(1);
  });
  it('the lee is small: open Stormwall water is not sheltered', () => {
    expect(stormwallLee(STORMWALL.lee.x, STORMWALL.lee.z + STORMWALL.lee.r + STORMWALL.lee.fade + 1)).toBe(0);
  });
  it('in the lee the hull takes what it always did; in the wall, more; only the Ironwake can cross', () => {
    expect(STORMWALL.leeMul).toBe(0.55);
    expect(STORMWALL.hullMul).toBeGreaterThan(STORMWALL.leeMul);
    expect(STORMWALL.speedMul).toBeGreaterThan(0);
    expect(STORMWALL.speedMul).toBeLessThan(1);
    expect(Object.values(VESSELS).filter((v) => v.crossStorm).map((v) => v.id)).toEqual(['ironwake']);
  });
});

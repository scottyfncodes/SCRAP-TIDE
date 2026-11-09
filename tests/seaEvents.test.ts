// Loop pass Phase 3: the sea events' pure decisions.
import { describe, expect, it } from 'vitest';

(globalThis as any).window = globalThis;
const { rideWave, WAVE_HIT, CREATURE_R } = await import('../src/game/seaEvents');

describe('rogue wave', () => {
  it('bow into the wave with way on rides over it; on the beam or dead in the water it hits', () => {
    const from = Math.PI / 2; // the wave comes from the east
    expect(rideWave(Math.PI / 2, from, 6)).toBe(true);
    expect(rideWave(Math.PI / 2 + 0.5, from, 6)).toBe(true); // ~29° off
    expect(rideWave(Math.PI / 2 + 0.9, from, 6)).toBe(false); // ~52° off
    expect(rideWave(0, from, 6)).toBe(false); // beam on
    expect(rideWave(Math.PI / 2, from, 0.5)).toBe(false); // no way on
    expect(WAVE_HIT).toBeGreaterThan(8); // big enough that Armour Plating's shield takes it
    expect(CREATURE_R).toBeGreaterThan(5);
  });
});

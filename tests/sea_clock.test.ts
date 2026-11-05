// Sea clock (balance pass 1, #1): salvage respawn can't be skipped or locked by changing the phone's clock.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seaAdvance, OFFLINE_CAP_MS } from '../src/state/seaClock';

const mem = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
};
(globalThis as any).window = globalThis;
const { Store } = await import('../src/state/store');

const MIN = 60_000, H = 60 * MIN;

describe('seaAdvance', () => {
  it('in a session, follows only the monotonic clock', () => {
    expect(seaAdvance(5 * MIN, 5 * MIN, true)).toBe(5 * MIN);
    expect(seaAdvance(5 * MIN, -24 * H, true)).toBe(5 * MIN); // clock set back a day
    expect(seaAdvance(5 * MIN, 24 * H, true)).toBe(5 * MIN); // clock set forward a day
    expect(seaAdvance(-1, 0, true)).toBe(0);
  });
  it('between sessions, credits the device clock forwards only, capped', () => {
    expect(seaAdvance(0, 10 * MIN, false)).toBe(10 * MIN);
    expect(seaAdvance(0, 24 * H, false)).toBe(OFFLINE_CAP_MS);
    expect(seaAdvance(0, -3 * H, false)).toBe(0);
    expect(OFFLINE_CAP_MS).toBe(2 * H);
  });
});

describe('Store sea clock', () => {
  let wall = 1_800_000_000_000, perf = 1_000;
  beforeEach(() => {
    mem.clear();
    vi.spyOn(Date, 'now').mockImplementation(() => wall);
    vi.spyOn(performance, 'now').mockImplementation(() => perf);
  });
  afterEach(() => vi.restoreAllMocks());
  const tick = (ms: number) => ((wall += ms), (perf += ms));

  it('a haul respawns after real play time', () => {
    const s = new Store();
    s.data.salvaged.sv_stump = s.seaNow();
    tick(4 * MIN);
    expect(s.seaNow() - s.data.salvaged.sv_stump).toBe(4 * MIN);
  });

  it('changing the clock during a session changes nothing', () => {
    const s = new Store();
    const t0 = s.seaNow();
    wall += 24 * H; // +1 day, no real time passed
    perf += 1000;
    expect(s.seaNow() - t0).toBe(1000);
    wall -= 48 * H; // and back two days
    perf += 1000;
    const t1 = s.seaNow();
    expect(t1).toBeGreaterThanOrEqual(t0); // never runs backwards: sites can't be locked
  });

  it('a relaunch after the clock jumped a day credits at most the cap', () => {
    const a = new Store();
    a.data.salvaged.sv_stump = a.seaNow();
    a.saveNow();
    wall += 24 * H; // app closed, clock moved forward (or a real day passed: indistinguishable)
    perf = 50; // a new page's monotonic clock starts over
    const b = new Store();
    expect(b.seaNow() - b.data.salvaged.sv_stump).toBe(OFFLINE_CAP_MS);
  });

  it('a relaunch after the clock was set back still lets sites refill', () => {
    const a = new Store();
    a.data.salvaged.sv_stump = a.seaNow();
    a.saveNow();
    wall -= 24 * H;
    perf = 50;
    const b = new Store();
    const last = b.data.salvaged.sv_stump;
    tick(4 * MIN);
    expect(b.seaNow() - last).toBe(4 * MIN);
  });

  it('old saves (no sea clock) keep their Date.now() haul times', () => {
    mem.set('tidebreakers.save.v1', JSON.stringify({ version: 2, salvaged: { sv_stump: wall - 3 * MIN } }));
    const s = new Store();
    expect(s.seaNow() - s.data.salvaged.sv_stump).toBe(3 * MIN);
  });
});

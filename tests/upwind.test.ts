// Upwind sailing, Option A (balance pass 1, #5): feel, not speed. These lock in that the speed curve is untouched and
// check the new cues (luff cone, point of sail, which way to bear away, crew lines) are coherent with it.
import { describe, expect, it } from 'vitest';
import { angleDiff } from '../src/core/noise';
import { WORLD, SETTLEMENT_MAP, ISLAND_MAP, SALVAGE_MAP, STORMWALL } from '../src/data/world';
import { VESSELS } from '../src/data/ship';
import { CREW } from '../src/data/crew';
import {
  windEff, offWind, luffAmount, pointOfSail, bearAwaySide, luffLine, drawingLine, luffSpeaker, SAIL_LABEL,
  NO_GO, LUFF_FULL, LUFF_WARN_AFTER, LUFF_WARN_COOLDOWN,
} from '../src/game/pointOfSail';

const DEG = Math.PI / 180;
const W = WORLD.wind.dir;
const UP = W + Math.PI; // the heading dead into the wind
/** The speed curve exactly as it was in Game.windEff before this change. */
const original = (heading: number) => {
  const c = Math.cos(angleDiff(heading, W));
  return c >= 0 ? 1 - 0.1 * c : 1 - 0.55 * -c;
};
const bearing = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.atan2(b.x - a.x, b.z - a.z);

describe('speed is unchanged (no gameplay change)', () => {
  it('windEff matches the original curve at every heading', () => {
    for (let d = -360; d <= 360; d += 0.5) expect(windEff(d * DEG, W)).toBe(original(d * DEG));
  });
  it('keeps the measured anchors: 45% dead upwind, 100% on a beam reach, 90% dead downwind', () => {
    expect(windEff(UP, W)).toBeCloseTo(0.45, 10);
    expect(windEff(W + Math.PI / 2, W)).toBeCloseTo(1, 10);
    expect(windEff(W - Math.PI / 2, W)).toBeCloseTo(1, 10);
    expect(windEff(W, W)).toBeCloseTo(0.9, 10);
  });
  it('no hard no-go zone: every heading still sails at 45% or better', () => {
    for (let d = 0; d < 360; d++) expect(windEff(d * DEG, W)).toBeGreaterThanOrEqual(0.45 - 1e-12);
  });
  it('guardrails: the Trimaran still costs 420g and the Stormwall constants are untouched by this change', () => {
    expect(VESSELS.sloop.cost!.gold).toBe(420);
    expect(STORMWALL).toEqual({ speedMul: 0.3, hullMul: 1.5, leeMul: 0.55, lee: { x: -210, z: -1040, r: 55, fade: 25 } });
  });
});

describe('the luff cone', () => {
  it('offWind is 0 dead upwind and π dead downwind, symmetric either side', () => {
    expect(offWind(UP, W)).toBeCloseTo(0, 10);
    expect(offWind(W, W)).toBeCloseTo(Math.PI, 10);
    expect(offWind(UP + 0.3, W)).toBeCloseTo(0.3, 10);
    expect(offWind(UP - 0.3, W)).toBeCloseTo(0.3, 10);
  });
  it('is 30° either side of the wind (the proposal’s Option A), total inside 12°', () => {
    expect(NO_GO / DEG).toBeCloseTo(30, 10);
    expect(LUFF_FULL).toBeLessThan(NO_GO);
    expect(luffAmount(0)).toBe(1);
    expect(luffAmount(LUFF_FULL)).toBe(1);
    expect(luffAmount(NO_GO)).toBe(0);
    expect(luffAmount(90 * DEG)).toBe(0);
    expect(luffAmount(Math.PI)).toBe(0);
  });
  it('eases out smoothly and monotonically between full and none', () => {
    let prev = 1;
    for (let d = 12; d <= 30; d += 0.25) {
      const v = luffAmount(d * DEG);
      expect(v).toBeLessThanOrEqual(prev + 1e-12);
      expect(v).toBeGreaterThanOrEqual(0);
      prev = v;
    }
  });
});

describe('point of sail', () => {
  it('names the bands', () => {
    expect(pointOfSail(0)).toBe('luffing');
    expect(pointOfSail(29.9 * DEG)).toBe('luffing');
    expect(pointOfSail(30 * DEG)).toBe('close');
    expect(pointOfSail(59 * DEG)).toBe('close');
    expect(pointOfSail(90 * DEG)).toBe('beam');
    expect(pointOfSail(135 * DEG)).toBe('broad');
    expect(pointOfSail(Math.PI)).toBe('run');
  });
  it('every band has a short HUD label (fits the readout) and luffing is flagged', () => {
    for (const v of Object.values(SAIL_LABEL)) expect(v.label.length).toBeLessThanOrEqual(12);
    expect(SAIL_LABEL.luffing.cls).toBe('luff');
  });
  it('the label agrees with the speed curve: the slowest headings are the luffing ones', () => {
    const luffSpeeds = [], others = [];
    for (let d = 0; d < 360; d++) (pointOfSail(offWind(d * DEG, W)) === 'luffing' ? luffSpeeds : others).push(windEff(d * DEG, W));
    expect(Math.max(...luffSpeeds)).toBeLessThan(Math.min(...others));
  });
});

describe('bearing away', () => {
  it('turning the way it says always takes the bow further off the wind', () => {
    for (let d = -29; d <= 29; d += 1) {
      if (d === 0) continue;
      const h = UP + d * DEG;
      const side = bearAwaySide(h, W);
      const turned = h + (side === 'left' ? 1 : -1) * 5 * DEG; // a larger heading is a turn to the left on the wheel
      expect(offWind(turned, W)).toBeGreaterThan(offWind(h, W));
    }
  });
  it('is honest advice under the unchanged physics: for any goal inside the cone, a 35-45° course makes good at least 95% of pointing straight at it', () => {
    for (let goal = 0; goal < 30; goal += 1) {
      const straight = windEff(UP + goal * DEG, W);
      let best = 0;
      for (let c = 35; c <= 45; c++) best = Math.max(best, windEff(UP + c * DEG, W) * Math.cos((c - goal) * DEG));
      expect(best).toBeGreaterThanOrEqual(0.95 * straight);
    }
  });
});

describe('where a new player meets it', () => {
  const drift = SETTLEMENT_MAP.driftholm, turtle = ISLAND_MAP.turtle, tower = SALVAGE_MAP.sv_stump;
  it('the tutorial trip home from Turtle Atoll (≈11° off the wind) luffs, so the cue teaches there', () => {
    const off = offWind(bearing(turtle, drift), W) / DEG;
    expect(off).toBeGreaterThan(8);
    expect(off).toBeLessThan(14);
    expect(pointOfSail(off * DEG)).toBe('luffing');
  });
  it('the first salvage run, Driftholm → Sunken Tower (≈33°), is clear of the cone: no nagging on the first beacon', () => {
    const off = offWind(bearing(drift, tower), W);
    expect(off / DEG).toBeGreaterThan(30);
    expect(luffAmount(off)).toBe(0);
  });
});

describe('crew feedback', () => {
  it('with no crew, the sail itself says it, which way to steer, and (first time) how to read the dial', () => {
    const first = luffLine([], 'left', true);
    expect(first.speaker).toBeNull();
    expect(first.text).toMatch(/luffing/);
    expect(first.text).toMatch(/left/);
    expect(first.text).toMatch(/wind dial/i);
    const again = luffLine([], 'right', false);
    expect(again.text).toMatch(/right/);
    expect(again.text).not.toMatch(/dial/i);
  });
  it('every recruitable crew member has a line, naming the side to steer', () => {
    for (const c of CREW) {
      const l = luffLine([c.id], 'right', false);
      expect(l.speaker).toBe(c.id);
      expect(l.text).toContain(c.name.split(' ')[0]);
      expect(l.text).toMatch(/to the right/);
      expect(drawingLine([c.id]).speaker).toBe(c.id);
    }
  });
  it('the navigator speaks first, then the lookout', () => {
    expect(luffSpeaker(['tomas', 'kai', 'mara'])).toBe('mara');
    expect(luffSpeaker(['tomas', 'kai'])).toBe('kai');
    expect(luffSpeaker(['ines'])).toBe('ines');
    expect(luffSpeaker(['nobody'])).toBeNull();
  });
  it('a quick swing through the wind is not nagged; warnings are spaced out', () => {
    expect(LUFF_WARN_AFTER).toBeGreaterThanOrEqual(2);
    expect(LUFF_WARN_COOLDOWN).toBeGreaterThanOrEqual(30);
  });
});

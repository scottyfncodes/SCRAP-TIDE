import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { footprints, HazardField, signedDist, circleHazard } from '../src/world/hazards';

const box = (w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)));
  return { geo: g, matrix: null };
};

describe('hazard footprints (what a hull can hit is what you can see)', () => {
  it('a half-sunk container is its own 12 x 2.4 m rectangle, not a 7 m circle', () => {
    const [h] = footprints([box(12, 2.6, 2.4, 0, -0.2, 0)]);
    const c = { depth: 0, nx: 0, nz: 0 };
    expect(signedDist(h, 0, 0, c)).toBeLessThan(0); // inside
    expect(signedDist(h, 5.5, 0, c)).toBeLessThan(0); // the long end is solid
    expect(signedDist(h, 0, 3, c)).toBeGreaterThan(1.5); // 3 m off the long side is open water
    expect(signedDist(h, 0, 3, c)).toBeLessThan(2.1);
    expect(c.nz).toBeCloseTo(1, 1); // out is away from the side
  });

  it('a tall tower with no vertices near the water still has a waterline outline', () => {
    const hs = footprints([box(14, 60, 14, 0, 20, 0)]); // spans y -10..50, corners far from the slab
    expect(hs).toHaveLength(1);
    const c = { depth: 0, nx: 0, nz: 0 };
    expect(signedDist(hs[0], 0, 0, c)).toBeLessThan(-6);
    expect(signedDist(hs[0], 8, 0, c)).toBeCloseTo(1, 0);
  });

  it('separate legs stay separate, so you can sail between them', () => {
    const hs = footprints([box(2, 20, 2, -8, 5, 0), box(2, 20, 2, 8, 5, 0), box(20, 1, 3, 0, 12, 0)]); // a deck high overhead
    expect(hs).toHaveLength(2);
    const f = new HazardField();
    hs.forEach((h) => f.add(h));
    const c = { depth: 0, nx: 0, nz: 0 };
    expect(f.overlap(0, 0, 1, c)).toBe(false); // the gap under the deck is open
    expect(f.overlap(-6.5, 0, 1, c)).toBe(true);
  });

  it('nothing at the waterline (deep wreckage, a roof overhead) is not a hazard', () => {
    expect(footprints([box(10, 2, 10, 0, -6, 0)])).toHaveLength(0);
    expect(footprints([box(10, 2, 10, 0, 9, 0)])).toHaveLength(0);
  });

  it('overlap reports how far and which way to push a hull out', () => {
    const f = new HazardField();
    f.add(circleHazard(0, 0, 5));
    const c = { depth: 0, nx: 0, nz: 0 };
    expect(f.overlap(5.5, 0, 1, c)).toBe(true);
    expect(c.depth).toBeCloseTo(0.5, 1);
    expect(c.nx).toBeGreaterThan(0.9);
    expect(f.overlap(6.2, 0, 1, c)).toBe(false);
    expect(f.clearance(10, 0)).toBeCloseTo(5, 0);
  });
});

// At the helm (player/helm.ts): the IK that puts hands on the tiller, and the stations each boat gives the captain.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { solveJoint, helmTargets, tillerAngle, newTargets, type HelmStation } from '../src/player/helm';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe('two-bone IK', () => {
  const la = 0.27, lb = 0.25;
  it('reaches a target inside the limb’s range with both bones at their own length', () => {
    const a = V(0, 1.4, 0), joint = V(0, 0, 0), end = V(0, 0, 0);
    for (const t of [V(0.3, 1.2, 0.2), V(-0.1, 1.0, 0.25), V(0.05, 1.35, 0.3)]) {
      solveJoint(a, t, la, lb, V(0, -1, -0.4), joint, end);
      expect(end.distanceTo(t)).toBeLessThan(1e-6);
      expect(joint.distanceTo(a)).toBeCloseTo(la, 5);
      expect(joint.distanceTo(end)).toBeCloseTo(lb, 5);
    }
  });
  it('straightens toward a target out of reach instead of breaking', () => {
    const a = V(0, 1.4, 0), joint = V(0, 0, 0), end = V(0, 0, 0);
    const d = solveJoint(a, V(2, 1.4, 0), la, lb, V(0, -1, 0), joint, end);
    expect(d).toBeLessThan(la + lb);
    expect(end.x).toBeGreaterThan(0.5);
    expect(joint.distanceTo(a)).toBeCloseTo(la, 5);
    expect(Number.isFinite(joint.x + joint.y + joint.z)).toBe(true);
  });
  it('bends the joint toward the pole (elbows down, knees forward)', () => {
    const a = V(0, 1.4, 0), joint = V(0, 0, 0), end = V(0, 0, 0);
    solveJoint(a, V(0.35, 1.4, 0), la, lb, V(0, -1, 0), joint, end);
    expect(joint.y).toBeLessThan(1.4);
    solveJoint(V(0, 0.9, 0), V(0, 0.3, 0), 0.4, 0.42, V(0, 0, 1), joint, end);
    expect(joint.z).toBeGreaterThan(0);
  });
  it('survives a degenerate pole and a zero-length reach', () => {
    const joint = V(0, 0, 0), end = V(0, 0, 0);
    solveJoint(V(0, 1, 0), V(0, 0.6, 0), la, lb, V(0, -1, 0), joint, end); // pole along the reach
    expect(Number.isFinite(joint.length())).toBe(true);
    solveJoint(V(0, 1, 0), V(0, 1, 0), la, lb, V(0, 0, 1), joint, end);
    expect(Number.isFinite(joint.length() + end.length())).toBe(true);
  });
});

describe('helm stations', () => {
  const tillerSt: HelmStation = {
    stance: 'sit', seat: V(0, 0.43, -1.3), hips: V(0, 0.9, -1.4), yaw: 0, footL: V(0.27, 0.43, -0.92), footR: V(-0.2, 0.43, -1.1),
    tiller: { hand: 'R', pivot: V(0, 0.9, -2.25), grip: V(-0.36, 1.02, -1.34), swing: 0.14 }, restL: V(0.16, 0.95, -1.14), restR: V(-0.2, 0.93, -1.1),
  };
  const wheelSt: HelmStation = {
    stance: 'stand', seat: V(0, 1.35, -4.76), hips: V(0, 2.21, -4.76), yaw: 0, footL: V(0.15, 1.4, -4.71), footR: V(-0.15, 1.4, -4.82),
    wheel: { hub: V(0, 2.3, -4.2), radius: 0.45, left: 1.95, right: -1.95, turn: 0.5 }, restL: V(0.22, 2.25, -4.7), restR: V(-0.22, 2.25, -4.7),
  };
  it('turning to port puts the tiller to starboard, and the hand goes with it', () => {
    expect(tillerAngle(tillerSt, 1)).toBeLessThan(0);
    const mid = helmTargets(tillerSt, 0, 1, newTargets()).handR.x;
    const port = helmTargets(tillerSt, 1, 1, newTargets()).handR.x;
    const star = helmTargets(tillerSt, -1, 1, newTargets()).handR.x;
    expect(port).toBeLessThan(mid); // -x is starboard
    expect(star).toBeGreaterThan(mid);
  });
  it('the tiller hand stays on the tiller: the same distance from the pivot at every angle', () => {
    const r = tillerSt.tiller!.grip.distanceTo(tillerSt.tiller!.pivot);
    for (const s of [-1, -0.4, 0, 0.7, 1]) {
      const t = helmTargets(tillerSt, s, 1, newTargets());
      expect(t.handR.clone().add(tillerSt.seat).distanceTo(tillerSt.tiller!.pivot)).toBeCloseTo(r, 5);
    }
  });
  it('the free hand rests where the station says, and targets scale into the rider root’s units', () => {
    const t = helmTargets(tillerSt, 0, 0.9, newTargets());
    expect(t.handL.x).toBeCloseTo((0.16 - 0) / 0.9, 5);
    expect(t.hips.y).toBeCloseTo((0.9 - 0.43) / 0.9, 5);
    expect(t.seated).toBe(1);
  });
  it('both hands stay on the wheel rim and go round with it', () => {
    for (const s of [-1, 0, 1]) {
      const t = helmTargets(wheelSt, s, 1, newTargets());
      for (const h of [t.handL, t.handR]) {
        const p = h.clone().add(wheelSt.seat);
        expect(Math.hypot(p.x - wheelSt.wheel!.hub.x, p.y - wheelSt.wheel!.hub.y)).toBeCloseTo(0.45, 5);
      }
    }
    // turning to port: the wheel's top goes to port, so the port-side hand comes up and the starboard one goes down
    const a = helmTargets(wheelSt, 0, 1, newTargets()), b = helmTargets(wheelSt, 1, 1, newTargets());
    expect(b.handL.y).toBeLessThan(a.handL.y);
    expect(b.handR.y).toBeGreaterThan(a.handR.y);
  });
  it('the head leads the turn, and someone standing shifts their weight against the roll', () => {
    expect(helmTargets(wheelSt, 1, 1, newTargets()).look).toBeGreaterThan(0.3);
    expect(helmTargets(wheelSt, -1, 1, newTargets()).look).toBeLessThan(-0.3);
    const lean = helmTargets(wheelSt, 0, 1, newTargets(), 0.2).hips.x;
    expect(lean).toBeLessThan(0);
    expect(Math.abs(lean)).toBeLessThanOrEqual(0.07 + 1e-9);
    expect(helmTargets(tillerSt, 0, 1, newTargets(), 0.2).hips.x).toBe(0); // seated: the seat holds them
  });
  it('steer is clamped, so a wild yaw rate can’t throw the hands off the helm', () => {
    const a = helmTargets(tillerSt, 9, 1, newTargets()), b = helmTargets(tillerSt, 1, 1, newTargets());
    expect(a.handR.distanceTo(b.handR)).toBeLessThan(1e-9);
  });
});

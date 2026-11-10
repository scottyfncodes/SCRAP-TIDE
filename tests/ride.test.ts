// The seated captain balancing on a moving seat (src/player/ride.ts).
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Spring, SeatRider, CHEST_KEEP, HEAD_KEEP, type SeatMotion } from '../src/player/ride';

function rig() {
  const root = new THREE.Group();
  let parent: THREE.Object3D = root;
  for (const n of ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head']) {
    const b = new THREE.Bone();
    b.name = 'mixamorig' + n;
    b.position.y = 0.15;
    parent.add(b);
    parent = b;
  }
  for (const n of ['LeftShoulder', 'RightShoulder']) {
    const b = new THREE.Bone();
    b.name = 'mixamorig' + n;
    root.getObjectByName('mixamorigSpine2')!.add(b);
  }
  return root;
}
const still: SeatMotion = { roll: 0, pitch: 0, heaveV: 0, turn: 0, surge: 0, speed: 0 };

describe('balance spring', () => {
  it('swings through its target a little and settles on it', () => {
    const s = new Spring(5.2, 0.32);
    let peak = 0;
    for (let i = 0; i < 600; i++) peak = Math.max(peak, s.step(1 / 60, 1));
    expect(peak).toBeGreaterThan(1.05); // under-damped: fluid, not a snap
    expect(peak).toBeLessThan(1.6);
    expect(s.x).toBeCloseTo(1, 2);
  });
  it('stays stable on a long frame', () => {
    const s = new Spring(9, 0.42);
    for (let i = 0; i < 20; i++) s.step(0.25, 1);
    expect(Math.abs(s.x - 1)).toBeLessThan(0.01);
  });
});

describe('seat rider', () => {
  it('finds the spine, neck and head of a Mixamo-named rig', () => {
    expect(new SeatRider(rig()).ok).toBe(true);
    expect(new SeatRider(new THREE.Group()).ok).toBe(false);
  });
  it('leans the chest back against a steady heel, and the head further toward level', () => {
    const root = rig();
    const r = new SeatRider(root);
    const m = { ...still, roll: 0.2 };
    for (let i = 0; i < 600; i++) r.update(1 / 60, m);
    const z = (n: string) => new THREE.Euler().setFromQuaternion(root.getObjectByName('mixamorig' + n)!.quaternion, 'YXZ').z;
    const chest = z('Spine') + z('Spine1') + z('Spine2');
    expect(chest).toBeLessThan(0); // against the heel
    // the world tilt it ends at: boat + chest counter-lean ≈ CHEST_KEEP of the heel (± the slow weight shift)
    expect(Math.abs(0.2 + chest - 0.2 * CHEST_KEEP)).toBeLessThan(0.04);
    const head = chest + z('Neck') + z('Head');
    expect(Math.abs(0.2 + head - 0.2 * HEAD_KEEP)).toBeLessThan(0.04);
  });
  it('never accumulates on bones no clip rewrites: undo restores the pose exactly', () => {
    const root = rig();
    const r = new SeatRider(root);
    const spine = root.getObjectByName('mixamorigSpine1')!;
    const before = spine.quaternion.clone();
    for (let i = 0; i < 300; i++) r.update(1 / 60, { ...still, roll: Math.sin(i / 20) * 0.2, heaveV: Math.cos(i / 9) });
    r.undo();
    expect(spine.quaternion.angleTo(before)).toBeLessThan(1e-6);
  });
  it('Calm effects scale the motion down', () => {
    const lean = (amount: number) => {
      const root = rig();
      const r = new SeatRider(root);
      for (let i = 0; i < 600; i++) r.update(1 / 60, { ...still, roll: 0.2 }, amount);
      return Math.abs(new THREE.Euler().setFromQuaternion(root.getObjectByName('mixamorigSpine')!.quaternion, 'YXZ').z);
    };
    expect(lean(0.5)).toBeLessThan(lean(1) * 0.6);
  });
});

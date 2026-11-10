// Riding the boat (seated captain): a body on a rolling seat is not a post bolted to it. The hips go where the seat
// goes; the spine lags behind and then rights itself like a person keeping their balance (an under-damped spring, so
// it sways through and settles instead of snapping); the head steadies itself toward level a beat after the chest;
// heave from swell and wake drops into the seat cushion and the lower back; turns throw the chest outward; and there is
// a little life of its own (breathing, a slow look around). Pure maths over bone quaternions, applied as a layer on top
// of whatever clip is playing and removed again before the next mixer update, so clips never accumulate it.
import * as THREE from 'three';

/** One under-damped spring per axis: x'' = w²(target - x) - 2ζw x' + force. */
export class Spring {
  x = 0;
  v = 0;
  constructor(public w: number, public zeta: number) {}
  step(dt: number, target: number, force = 0) {
    // sub-step for stability on a slow frame
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = this.w * this.w * (target - this.x) - 2 * this.zeta * this.w * this.v + force;
      this.v += a * h;
      this.x += this.v * h;
    }
    return this.x;
  }
}

/** What the seat is doing this frame (radians, m/s, m/s², rad/s). */
export interface SeatMotion {
  roll: number; // boat roll (+ = to starboard as the ship group's z rotation)
  pitch: number; // boat pitch (ship group's x rotation)
  heaveV: number; // vertical velocity of the seat
  turn: number; // yaw rate
  surge: number; // forward acceleration
  speed: number;
}

const BONES = ['Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'RightShoulder'] as const;
type B = (typeof BONES)[number];

/** How much of the boat's tilt the chest keeps (0 = perfectly upright in the world, 1 = rigid with the hull). */
export const CHEST_KEEP = 0.3;
/** ...and the head: eyes stay close to level. */
export const HEAD_KEEP = 0.1;

export class SeatRider {
  private bones: Partial<Record<B, THREE.Object3D>> = {};
  private applied = new Map<THREE.Object3D, THREE.Quaternion>();
  private pool = new Map<THREE.Object3D, THREE.Quaternion>(); // one per bone, reused every frame
  // chest and head angles in the WORLD (roll about forward, pitch about the side axis)
  private chestR = new Spring(5.2, 0.32);
  private chestP = new Spring(4.6, 0.38);
  private headR = new Spring(8, 0.5);
  private headP = new Spring(7.5, 0.5);
  /** seat cushion compression (m) and the lower back folding with it (rad) */
  private sink = new Spring(9, 0.42);
  private lastHeave = 0;
  private t = 0;
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  /** extra drop to add to the rider's root y this frame */
  dropY = 0;
  readonly ok: boolean;

  constructor(rig: THREE.Object3D) {
    rig.traverse((o) => {
      for (const id of BONES) if (o.name === id || o.name === 'mixamorig' + id || o.name.endsWith(':' + id)) this.bones[id] ??= o;
    });
    this.ok = !!(this.bones.Spine && this.bones.Spine1 && this.bones.Spine2 && this.bones.Head);
  }

  /** Take last frame's layer back off (call before the mixer updates; un-animated bones would otherwise accumulate). */
  undo() {
    for (const [b, q] of this.applied) b.quaternion.multiply(this.q.copy(q).invert());
    this.applied.clear();
  }

  private add(id: B, x: number, y: number, z: number) {
    const b = this.bones[id];
    if (!b) return;
    let d = this.pool.get(b);
    if (!d) this.pool.set(b, (d = new THREE.Quaternion()));
    d.setFromEuler(this.e.set(x, y, z, 'YXZ'));
    b.quaternion.multiply(d);
    this.applied.set(b, d);
  }

  /**
   * Advance the balance springs and lay the result over the current pose. `amount` scales everything (Calm effects).
   * Angles go on the bones in their own local frames: for these rigs the spine's local X is the side axis (pitch) and
   * Z the forward axis (roll), close enough to the body's for a few degrees of lean.
   */
  update(dt: number, m: SeatMotion, amount = 1) {
    this.undo();
    if (!this.ok || dt <= 0) return;
    this.t += dt;
    const t = this.t;
    const heaveA = THREE.MathUtils.clamp((m.heaveV - this.lastHeave) / dt, -12, 12);
    this.lastHeave = m.heaveV;
    // centrifugal: a turn throws the chest to the outside, which it then catches
    const throwR = THREE.MathUtils.clamp(m.turn * m.speed * 0.9, -6, 6);
    const throwP = THREE.MathUtils.clamp(-m.surge * 0.9, -5, 5);
    // world-space chest: aims for a fraction of the boat's tilt, lags it, overshoots a little, settles
    const cR = this.chestR.step(dt, m.roll * CHEST_KEEP + Math.sin(t * 0.53 + 1.1) * 0.025, throwR);
    const cP = this.chestP.step(dt, m.pitch * CHEST_KEEP + Math.sin(t * 0.37) * 0.015, throwP + heaveA * 0.12);
    const hR = this.headR.step(dt, m.roll * HEAD_KEEP, 0);
    const hP = this.headP.step(dt, m.pitch * HEAD_KEEP, 0);
    const sink = this.sink.step(dt, 0, THREE.MathUtils.clamp(heaveA, -10, 10) * 0.6);
    this.dropY = THREE.MathUtils.clamp(-sink * 0.4, -0.05, 0.05) * amount; // pushed up = pressed into the cushion
    // relative to the hips (which ride the seat exactly): chest lean = world chest - boat
    const relR = THREE.MathUtils.clamp(cR - m.roll, -0.45, 0.45) * amount;
    const relP = THREE.MathUtils.clamp(cP - m.pitch, -0.4, 0.4) * amount;
    const breath = Math.sin(t * 1.55) * 0.018;
    const slump = THREE.MathUtils.clamp(-sink * 0.5, -0.12, 0.12) * amount; // dropping into a trough folds the lower back
    // spread down the spine, most in the lower back
    this.add('Spine', relP * 0.4 + slump, 0, relR * 0.4);
    this.add('Spine1', relP * 0.3 + slump * 0.5, Math.sin(t * 0.29 + 2) * 0.03 * amount, relR * 0.32);
    this.add('Spine2', relP * 0.3 - breath * amount, 0, relR * 0.28);
    // head: from wherever the chest put it back toward level, with a slow look about
    const neckR = THREE.MathUtils.clamp(hR - cR, -0.4, 0.4) * amount;
    const neckP = THREE.MathUtils.clamp(hP - cP - slump * 0.8, -0.35, 0.35) * amount;
    const look = (Math.sin(t * 0.21) * 0.7 + Math.sin(t * 0.13 + 1.7) * 0.3) * 0.28 * amount;
    this.add('Neck', neckP * 0.45, look * 0.4, neckR * 0.45);
    this.add('Head', neckP * 0.55 + breath * 0.5 * amount, look * 0.6, neckR * 0.55);
    // shoulders hang loose: they ride a beat behind the chest
    const sh = (this.chestR.v * 0.03 + Math.sin(t * 1.55) * 0.012) * amount;
    this.add('LeftShoulder', 0, 0, sh);
    this.add('RightShoulder', 0, 0, sh);
  }
}

// At the helm: a person steering a boat, not a figure placed in one.
//
// The rigged survivors only ship stock clips (Idle, Sit...), so aboard they used to sit bolt upright with both hands
// on their knees beside a tiller nobody held. This lays a posed body over the Idle clip instead: the pelvis goes where
// the seat (or the deck) puts it, both feet are planted on the boards, the steering hand closes on the tiller or the
// wheel rim and follows it as she turns, the free hand rests, and the head looks where the boat is going. Legs and arms
// are solved with two-bone IK in world space, so the hands stay on the helm while the spine balances above the hull
// (player/ride.ts) and the boat rolls under the feet.
//
// The same poser seats a Rustfang rider astride a wave runner (world/raiderRunner.ts): any Mixamo-named rig works.
import * as THREE from 'three';

/** Where the body goes, in the frame of the object the rig hangs under (metres; the rider faces +z, +x is port). */
export interface HelmTargets {
  hips: THREE.Vector3;
  /** pelvis turn about the vertical (rad, + = toward port) */
  yaw: number;
  /** forward lean of the whole back (rad) */
  lean: number;
  /** side lean of the back (rad, + = toward port) */
  side: number;
  /** ankles */
  footL: THREE.Vector3;
  footR: THREE.Vector3;
  /** wrists */
  handL: THREE.Vector3;
  handR: THREE.Vector3;
  /** head turn on top of the body (rad, + = toward port) and nod (+ = down) */
  look: number;
  nod: number;
  /** which way the knees point: 0 = straight ahead (standing), 1 = up and ahead (seated) */
  seated: number;
}

export const newTargets = (): HelmTargets => ({
  hips: new THREE.Vector3(), yaw: 0, lean: 0, side: 0, footL: new THREE.Vector3(), footR: new THREE.Vector3(),
  handL: new THREE.Vector3(), handR: new THREE.Vector3(), look: 0, nod: 0, seated: 0,
});

/**
 * A helm station in the boat's own frame (metres, bow +z, +x port, y up): where the helmsman's root, pelvis and feet
 * go, what they steer with, and where a free hand rests.
 */
export interface HelmStation {
  stance: 'sit' | 'stand';
  /** the rider root: the deck (or sole) under the pelvis */
  seat: THREE.Vector3;
  hips: THREE.Vector3;
  yaw: number;
  footL: THREE.Vector3;
  footR: THREE.Vector3;
  /** a tiller: the steering hand's grip at rest, swung about `pivot` by up to `swing` rad */
  tiller?: { hand: 'L' | 'R'; pivot: THREE.Vector3; grip: THREE.Vector3; swing: number };
  /** a wheel facing aft (its axle along z): hands on the rim at these angles (rad from the top, + toward port) */
  wheel?: { hub: THREE.Vector3; radius: number; left?: number; right?: number; turn: number };
  /** where a hand that isn't steering rests */
  restL: THREE.Vector3;
  restR: THREE.Vector3;
}

/** The tiller's angle about its pivot for a steer of -1..1 (+ = turning to port: the tiller goes to starboard). */
export const tillerAngle = (st: HelmStation, steer: number) => (st.tiller ? -steer * st.tiller.swing : 0);

const _v = new THREE.Vector3();
/**
 * This frame's targets for a station: `steer` -1..1 (+ = turning to port), `scale` the rider root's scale (targets are
 * in the root's own units), `roll`/`heave` the boat's motion for the weight shift of someone standing.
 */
export function helmTargets(st: HelmStation, steer: number, scale: number, out: HelmTargets, roll = 0, heave = 0, t = 0): HelmTargets {
  const s = THREE.MathUtils.clamp(steer, -1, 1);
  const rel = (p: THREE.Vector3, to: THREE.Vector3) => to.copy(p).sub(st.seat).divideScalar(scale);
  rel(st.hips, out.hips);
  rel(st.footL, out.footL);
  rel(st.footR, out.footR);
  rel(st.restL, out.handL);
  rel(st.restR, out.handR);
  out.seated = st.stance === 'sit' ? 1 : 0;
  out.yaw = st.yaw + s * 0.07;
  out.lean = st.stance === 'sit' ? -0.13 : 0.05;
  out.side = 0;
  if (st.tiller) {
    const a = tillerAngle(st, s);
    const g = _v.copy(st.tiller.grip).sub(st.tiller.pivot).applyAxisAngle(THREE.Object3D.DEFAULT_UP, a).add(st.tiller.pivot);
    rel(g, st.tiller.hand === 'L' ? out.handL : out.handR);
    // the shoulders follow the tiller hand out and back, so the arm never has to reach for it
    const away = (g.x - st.tiller.grip.x) * (st.tiller.hand === 'L' ? 1 : -1);
    out.side = (st.tiller.hand === 'L' ? 1 : -1) * THREE.MathUtils.clamp(away * 1.1, -0.12, 0.2);
    out.yaw += (st.tiller.hand === 'L' ? 1 : -1) * 0.1;
  }
  if (st.wheel) {
    const w = st.wheel;
    const at = (phi: number, to: THREE.Vector3) => {
      const a = phi + s * w.turn;
      rel(_v.set(w.hub.x + Math.sin(a) * w.radius, w.hub.y + Math.cos(a) * w.radius, w.hub.z - 0.03), to);
    };
    if (w.left !== undefined) at(w.left, out.handL);
    if (w.right !== undefined) at(w.right, out.handR);
    out.side = s * 0.06;
  }
  if (st.stance === 'stand') {
    // sea legs: the pelvis slides uphill against the roll and the knees take the heave
    out.hips.x += THREE.MathUtils.clamp(-roll * 0.35, -0.07, 0.07) / scale;
    out.hips.y += (THREE.MathUtils.clamp(-Math.abs(heave) * 0.02, -0.05, 0) + Math.sin(t * 0.7) * 0.006) / scale;
  }
  // eyes lead the turn; a slow scan of the water otherwise (the balance layer adds its own small look-about)
  out.look = s * 0.5 + Math.sin(t * 0.23 + 0.6) * 0.1 * (1 - Math.abs(s));
  out.nod = 0.04;
  return out;
}

const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand'] as const;
type B = (typeof BONES)[number];

/**
 * Solve a two-bone chain in a plane: the joint (elbow/knee) position for a root at `a`, a target `t`, bone lengths
 * `la`, `lb` and a `pole` direction the joint should bulge toward. Returns the reach actually used (clamped so an
 * out-of-range target straightens the limb instead of breaking it). Pure, so it is unit-tested.
 */
export function solveJoint(a: THREE.Vector3, t: THREE.Vector3, la: number, lb: number, pole: THREE.Vector3, joint: THREE.Vector3, end: THREE.Vector3): number {
  const dir = end.copy(t).sub(a);
  const want = dir.length();
  const d = THREE.MathUtils.clamp(want, Math.abs(la - lb) + 1e-4, (la + lb) * 0.999);
  if (want < 1e-6) dir.set(0, -1, 0);
  else dir.multiplyScalar(1 / want);
  const x = (la * la - lb * lb + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, la * la - x * x));
  // the pole, flattened into the plane across the reach
  joint.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (joint.lengthSq() < 1e-8) joint.set(dir.y, -dir.x, 0).addScaledVector(dir, -(dir.y * dir.x - dir.x * dir.y));
  if (joint.lengthSq() < 1e-8) joint.set(1, 0, 0);
  joint.normalize().multiplyScalar(h).addScaledVector(dir, x).add(a);
  end.copy(dir).multiplyScalar(d).add(a);
  return d;
}

export class HelmPoser {
  private bone: Partial<Record<B, THREE.Object3D>> = {};
  private saved = new Map<THREE.Object3D, THREE.Quaternion>();
  private touched: THREE.Object3D[] = [];
  private hipsAt = new THREE.Vector3();
  private moved = false;
  /** each foot's and hand's orientation in the rig's own frame at rest (flat soles; the T-pose hand) */
  private restFoot: Partial<Record<'L' | 'R', THREE.Quaternion>> = {};
  private rig: THREE.Object3D;
  readonly ok: boolean;
  // scratch
  private A = new THREE.Vector3();
  private Bv = new THREE.Vector3();
  private C = new THREE.Vector3();
  private J = new THREE.Vector3();
  private E = new THREE.Vector3();
  private T = new THREE.Vector3();
  private P = new THREE.Vector3();
  private f = new THREE.Vector3();
  private g = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private q2 = new THREE.Quaternion();
  private q3 = new THREE.Quaternion();
  private e = new THREE.Euler();
  private fq = new THREE.Quaternion();

  /** Build on a rig still in its bind pose (before any clip has played): the flat-footed rest is read from it. */
  constructor(rig: THREE.Object3D) {
    this.rig = rig;
    rig.traverse((o) => {
      for (const id of BONES) if (o.name === id || o.name === 'mixamorig' + id || o.name.endsWith(':' + id)) this.bone[id] ??= o;
    });
    this.ok = BONES.every((id) => !!this.bone[id]);
    if (!this.ok) return;
    rig.updateWorldMatrix(true, true);
    const inv = rig.getWorldQuaternion(new THREE.Quaternion()).invert();
    for (const s of ['L', 'R'] as const) this.restFoot[s] = inv.clone().multiply(this.bone[s === 'L' ? 'LeftFoot' : 'RightFoot']!.getWorldQuaternion(new THREE.Quaternion()));
    for (const id of BONES) this.saved.set(this.bone[id]!, new THREE.Quaternion());
  }

  /** Put back what the last apply() changed (before the mixer writes the next frame's clip pose). */
  undo() {
    if (!this.touched.length) return;
    for (const b of this.touched) b.quaternion.copy(this.saved.get(b)!);
    this.touched.length = 0;
    if (this.moved) this.bone.Hips!.position.copy(this.hipsAt);
    this.moved = false;
  }

  private keep(b: THREE.Object3D) {
    this.saved.get(b)!.copy(b.quaternion);
    this.touched.push(b);
  }

  /** Turn `b` in the world so the direction `from` becomes `to` (its children follow). */
  private aim(b: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
    if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return;
    this.q.setFromUnitVectors(this.f.copy(from).normalize(), this.g.copy(to).normalize());
    b.getWorldQuaternion(this.q2);
    b.parent!.getWorldQuaternion(this.q3).invert();
    b.quaternion.copy(this.q3.multiply(this.q).multiply(this.q2));
    b.updateWorldMatrix(false, true);
  }

  private limb(a: THREE.Object3D, b: THREE.Object3D, c: THREE.Object3D, target: THREE.Vector3, pole: THREE.Vector3) {
    a.getWorldPosition(this.A);
    b.getWorldPosition(this.Bv);
    c.getWorldPosition(this.C);
    solveJoint(this.A, target, this.A.distanceTo(this.Bv), this.Bv.distanceTo(this.C), pole, this.J, this.E);
    this.aim(a, this.T.copy(this.Bv).sub(this.A), this.P.copy(this.J).sub(this.A));
    b.getWorldPosition(this.Bv);
    c.getWorldPosition(this.C);
    this.aim(b, this.T.copy(this.C).sub(this.Bv), this.P.copy(this.E).sub(this.Bv));
  }

  /**
   * Lay the pose over whatever the clips wrote this frame. `frame` is the object the targets are measured in (the
   * rider root); `w` blends from the clip pose (0) to the helm pose (1).
   */
  apply(frame: THREE.Object3D, t: HelmTargets, w = 1) {
    if (!this.ok || w <= 0) return;
    const b = this.bone as Record<B, THREE.Object3D>;
    for (const id of BONES) this.keep(b[id]);
    this.hipsAt.copy(b.Hips.position);
    this.moved = true;
    frame.updateWorldMatrix(true, false);
    this.rig.updateWorldMatrix(true, true);
    const fq = frame.getWorldQuaternion(this.fq);
    const world = (p: THREE.Vector3, to: THREE.Vector3) => frame.localToWorld(to.copy(p));
    const dirW = (x: number, y: number, z: number, to: THREE.Vector3) => to.set(x, y, z).applyQuaternion(fq);

    // pelvis: where the seat puts it, turned and tipped (the clip's own breathing stays in the spine above)
    b.Hips.parent!.worldToLocal(world(t.hips, this.T));
    b.Hips.position.copy(this.T);
    b.Hips.quaternion.premultiply(this.q.setFromEuler(this.e.set(t.lean * 0.35, t.yaw, -t.side * 0.3, 'YXZ')));
    const third = (x: number, y: number, z: number) => this.q.setFromEuler(this.e.set(x, y, z, 'YXZ'));
    b.Spine.quaternion.multiply(third(t.lean * 0.3, 0, -t.side * 0.3));
    b.Spine1.quaternion.multiply(third(t.lean * 0.2, 0, -t.side * 0.25));
    b.Spine2.quaternion.multiply(third(t.lean * 0.15, 0, -t.side * 0.15));
    // the head stays on the horizon and turns into the look (minus the pelvis turn it already rides on)
    b.Neck.quaternion.multiply(third(t.nod * 0.5 - t.lean * 0.5, t.look * 0.45, t.side * 0.3));
    b.Head.quaternion.multiply(third(t.nod * 0.5 - t.lean * 0.3, t.look * 0.55, t.side * 0.3));
    b.Hips.updateWorldMatrix(false, true);

    // legs: knees ahead (standing) or up and ahead and a little apart (seated); soles flat on the boards
    const k = t.seated;
    for (const s of ['L', 'R'] as const) {
      const sx = s === 'L' ? 1 : -1;
      const up = b[s === 'L' ? 'LeftUpLeg' : 'RightUpLeg'], lo = b[s === 'L' ? 'LeftLeg' : 'RightLeg'], ft = b[s === 'L' ? 'LeftFoot' : 'RightFoot'];
      this.limb(up, lo, ft, world(s === 'L' ? t.footL : t.footR, this.T), dirW(sx * (0.18 + 0.1 * k), 0.9 * k, 1, this.P));
      // flat foot, toed out a touch and turned with the pelvis
      this.q.copy(fq).multiply(this.q2.setFromEuler(this.e.set(0, t.yaw * 0.6 + sx * 0.16, 0))).multiply(this.restFoot[s]!);
      ft.quaternion.copy(ft.parent!.getWorldQuaternion(this.q3).invert().multiply(this.q));
      ft.updateWorldMatrix(false, true);
    }
    // arms: elbows hang down and back, a little out from the ribs
    for (const s of ['L', 'R'] as const) {
      const sx = s === 'L' ? 1 : -1;
      this.limb(b[s === 'L' ? 'LeftArm' : 'RightArm'], b[s === 'L' ? 'LeftForeArm' : 'RightForeArm'], b[s === 'L' ? 'LeftHand' : 'RightHand'], world(s === 'L' ? t.handL : t.handR, this.T), dirW(sx * 0.55, -1, -0.45, this.P));
    }
    if (w < 1) {
      for (const o of this.touched) o.quaternion.copy(this.q.copy(this.saved.get(o)!).slerp(o.quaternion, w));
      b.Hips.position.lerpVectors(this.hipsAt, b.Hips.position, w);
    }
  }
}

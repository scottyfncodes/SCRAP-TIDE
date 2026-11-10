// Procedural locomotion for the survivors' 22-bone Mixamo-named rig.
//
// Why this exists: the rigs ship with one authored Walk (≈1.3 m/s, locked pelvis, low swing) and no Run. The game moved
// the captain at 5.2 m/s and sped that Walk up 2.2×, so the feet skated ~2.3 m/s over the sand at four steps a second
// while the body glided: the "puppet" run. Here the Walk and Run cycles are generated from the skeleton itself:
//
// - the stance foot is planted in the ground frame (heel strike → flat → toe-off rocker) and the legs reach it with
//   two-bone IK, so a foot on the ground never slides when the clip plays at its own speed;
// - the walk's pelvis height comes from leg reach (an inverted pendulum: high at mid-stance, low at double support);
//   the run compresses in stance and rises through a real flight phase;
// - the pelvis yaws with the stepping leg, drops on the swing side and shifts over the stance foot; the chest
//   counter-rotates; the arms swing against the legs (pumping, elbows ≈85°, in the run); the trunk leans; the head
//   stays level.
//
// The controller (captain.ts) plays these clips phase-locked to ground speed, so stride × cadence = speed.
import * as THREE from 'three';

export interface GaitParams {
  name: string;
  /** body speed in rig units (metres before the character's scale) per second */
  speed: number;
  /** seconds per stride (two steps) */
  cycle: number;
  /** fraction of the stride each foot is on the ground (walk > 0.5: double support; run < 0.5: flight) */
  duty: number;
  /** nominal Hips bone height */
  hipHeight: number;
  /** run: stance compression of the pelvis; walk: 0 (the pendulum comes from leg reach) */
  compress: number;
  /** run: extra rise through the flight phase */
  flightRise: number;
  /** forward shift of the stance footprint relative to the pelvis (m) */
  stanceShift: number;
  /** trunk lean (rad), and its bounce per step */
  lean: number;
  leanBounce: number;
  /** peak ankle lift in swing, and how far the heel folds up behind (run) */
  swingLift: number;
  heelKick: number;
  /** foot pitch: toes-up at heel strike, heel-up at toe-off (rad) */
  heelStrike: number;
  toeOff: number;
  footHalfWidth: number;
  toeOut: number;
  pelvisYaw: number;
  pelvisRoll: number;
  sway: number;
  chestYaw: number;
  armFwd: number;
  armBack: number;
  armAbduct: number;
  elbow: number;
  elbowSwing: number;
  /** forearms swing in toward the midline (run) */
  armInward: number;
  /**
   * Toe-off hinge. Unset (the original cast): the foot rocks about the ground point under the ball, so the toe joint,
   * which sits a few cm above the sole, travels with the roll. true (retune(), the Jury-Rigged captain): it hinges on
   * the toe joint itself, as a foot does at the ball, so the joint and the flat toes stay planted while the heel rises.
   */
  toeHinge?: boolean;
  /** keys baked per stride (default 40). The hinged toe-off needs more so the last stance key doesn't blend into swing. */
  keys?: number;
}

/** Brisk walk: ~1.4 m/s at the captain's in-game scale. */
export const WALK: GaitParams = {
  name: 'GaitWalk', speed: 1.42, cycle: 1.0, duty: 0.58, hipHeight: 0.905, compress: 0, flightRise: 0, stanceShift: 0,
  lean: 0.05, leanBounce: 0.012, swingLift: 0.075, heelKick: 0.02, heelStrike: 0.3, toeOff: 0.62, footHalfWidth: 0.085,
  toeOut: 0.09, pelvisYaw: 0.1, pelvisRoll: 0.07, sway: 0.028, chestYaw: 0.1, armFwd: 0.32, armBack: 0.3,
  armAbduct: 0.1, elbow: 0.28, elbowSwing: 0.16, armInward: 0.05,
};

/** Run: ~5 m/s, three steps a second, a flight phase on every step. */
export const RUN: GaitParams = {
  name: 'GaitRun', speed: 5.15, cycle: 0.68, duty: 0.24, hipHeight: 0.875, compress: 0.05, flightRise: 0.035, stanceShift: -0.05,
  lean: 0.2, leanBounce: 0.035, swingLift: 0.08, heelKick: 0.27, heelStrike: 0.12, toeOff: 0.85, footHalfWidth: 0.05,
  toeOut: 0.06, pelvisYaw: 0.16, pelvisRoll: 0.06, sway: 0.012, chestYaw: 0.2, armFwd: 0.78, armBack: 0.62,
  armAbduct: 0.16, elbow: 1.45, elbowSwing: 0.25, armInward: 0.32,
};

/**
 * Retune a gait for a rig with different proportions (the Jury-Rigged 5.5-head cast, docs/jury-rigged): every length
 * scales with leg length, so the feet still plant (IK reads the rig's own bones) and the stride shortens. At the same
 * ground speed a shorter stride means a quicker cadence, which is most of what makes short legs read as short.
 * `expr` scales the expressive swings (pelvis roll, arm swing, bounce) for a livelier walk. `strideScale` (default: the
 * leg scale) sets the stride: the walk's pelvis bob comes from an inverted pendulum, so a stride cut as hard as the leg
 * flattens it (0.9 cm on the 5.5-head captain); √legScale keeps a 2–5 cm bob and still a quicker step than today.
 */
export function retune(g: GaitParams, legScale: number, hipHeight: number, width = 1, expr = 1, strideScale = legScale): GaitParams {
  return {
    ...g,
    toeHinge: true,
    keys: 96,
    name: g.name,
    speed: g.speed * strideScale,
    hipHeight,
    stanceShift: g.stanceShift * legScale,
    swingLift: g.swingLift * legScale,
    heelKick: g.heelKick * legScale,
    footHalfWidth: g.footHalfWidth * width,
    sway: g.sway * legScale * expr,
    pelvisRoll: g.pelvisRoll * expr,
    pelvisYaw: g.pelvisYaw * expr,
    leanBounce: g.leanBounce * legScale * expr,
    armFwd: g.armFwd * expr,
    armBack: g.armBack * expr,
  };
}

/** Rest leg length (thigh + shin) of the original 7.3-head survivor rig, which WALK and RUN were tuned on. */
export const BASE_LEG = 0.82;

const BONES = ['Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder',
  'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'] as const;
type BoneId = (typeof BONES)[number];

/** Rest pose of the rig in character-root space, captured once before any clip plays. */
export interface RigRest {
  names: Record<BoneId, string>;
  /** rest world (character-root space) quaternion and position */
  q: Record<BoneId, THREE.Quaternion>;
  p: Record<BoneId, THREE.Vector3>;
  parent: Record<BoneId, BoneId | null>;
  parentRestQ: THREE.Quaternion; // Hips' parent (rig node) in root space
  parentRestInv: THREE.Matrix4;
  thigh: number;
  shin: number;
  ankleH: number;
}

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const AX = V(1, 0, 0), AY = V(0, 1, 0), AZ = V(0, 0, 1);
const qa = (axis: THREE.Vector3, a: number) => new THREE.Quaternion().setFromAxisAngle(axis, a);
const frac = (x: number) => x - Math.floor(x);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const smooth = (x: number) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Find the rig's bones (any prefix, e.g. `mixamorig`) and record their rest pose. Returns null for other rigs. */
export function captureRest(root: THREE.Object3D): RigRest | null {
  const found = {} as Record<BoneId, THREE.Bone>;
  root.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    for (const id of BONES) if (o.name === id || o.name.endsWith(':' + id) || o.name === 'mixamorig' + id) found[id] = o as THREE.Bone;
  });
  if (BONES.some((b) => !found[b])) return null;
  // measure in the character root's own space, wherever the root sits in the scene (it may already be parented)
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  const rel = (o: THREE.Object3D) => {
    const m = rootInv.clone().multiply(o.matrixWorld);
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
    m.decompose(pos, quat, scl);
    return { m, pos, quat };
  };
  const names = {} as Record<BoneId, string>, q = {} as Record<BoneId, THREE.Quaternion>, p = {} as Record<BoneId, THREE.Vector3>;
  const parent = {} as Record<BoneId, BoneId | null>;
  for (const id of BONES) {
    const b = found[id];
    names[id] = b.name;
    const r = rel(b);
    q[id] = r.quat;
    p[id] = r.pos;
    const pid = BONES.find((o) => found[o] === b.parent);
    parent[id] = pid ?? null;
  }
  const hp = rel(found.Hips.parent!);
  const parentRestQ = hp.quat;
  const parentRestInv = hp.m.clone().invert();
  return {
    names, q, p, parent, parentRestQ, parentRestInv,
    thigh: p.LeftUpLeg.distanceTo(p.LeftLeg),
    shin: p.LeftLeg.distanceTo(p.LeftFoot),
    ankleH: (p.LeftFoot.y + p.RightFoot.y) / 2,
  };
}

/** Where each foot is in the stride: on the ground (stance progress s) or swinging (progress u). */
export function legPhase(g: GaitParams, phase: number, side: 1 | -1) {
  const p = frac(phase - (side === 1 ? 0 : 0.5));
  return p < g.duty ? { stance: true, s: p / g.duty, u: 0 } : { stance: false, s: 0, u: (p - g.duty) / (1 - g.duty) };
}

interface FootState {
  ankle: THREE.Vector3; // character-root space (the body is at the origin, moving +Z)
  pitch: number; // + = toes down
  toeFlat: number; // 1 = toe bone held flat on the ground (rolling over the ball)
}

/** The gait as a pure function of phase: pelvis, feet, trunk and arm targets. */
export class GaitSolver {
  readonly heel: THREE.Vector3; // heel contact relative to the ankle (flat foot)
  readonly ball: THREE.Vector3; // ball contact relative to the ankle
  readonly reach: number;
  private hipY: Float32Array;
  constructor(readonly rest: RigRest, readonly g: GaitParams, private readonly samples = 96) {
    const r = rest;
    // the toe-off pivot: the ground under the ball (original cast) or the toe joint itself (GaitParams.toeHinge)
    this.ball = V(0, g.toeHinge ? r.p.LeftToeBase.y - r.p.LeftFoot.y : -r.ankleH, r.p.LeftToeBase.z - r.p.LeftFoot.z);
    this.heel = V(0, -r.ankleH, -0.055);
    this.reach = (r.thigh + r.shin) * 0.997;
    this.hipY = this.solveHipHeight();
  }

  /** stance foot: the flat-foot ankle position is fixed on the ground; the foot rocks over the heel, then the ball */
  private stanceFoot(s: number, side: 1 | -1): FootState {
    const g = this.g;
    const span = g.speed * g.duty * g.cycle;
    const flatZ = g.stanceShift + span * (0.5 - s); // relative to the pelvis, sweeping back at -speed
    const flat = V(side * g.footHalfWidth, this.rest.ankleH, flatZ);
    const sH = 0.16, sT = g.duty > 0.5 ? 0.55 : 0.42;
    let pitch = 0, pivot: THREE.Vector3 | null = null, toeFlat = 0;
    if (s < sH) {
      const k = 1 - s / sH;
      pitch = -g.heelStrike * k * k;
      pivot = this.heel;
    } else if (s > sT) {
      const k = (s - sT) / (1 - sT);
      pitch = g.toeOff * k * k;
      pivot = this.ball;
      toeFlat = 1;
    }
    const ankle = flat.clone();
    if (pivot) {
      const rp = pivot.clone().applyQuaternion(qa(AX, pitch));
      ankle.add(pivot).sub(rp);
    }
    return { ankle, pitch, toeFlat };
  }

  /** swing: a Hermite path from toe-off to the next heel strike that matches the ground speed at both ends */
  private swingFoot(u: number, side: 1 | -1): FootState {
    const g = this.g;
    const a = this.stanceFoot(1, side), b = this.stanceFoot(0, side);
    const ts = (1 - g.duty) * g.cycle, eps = 1e-3;
    const va = this.stanceFoot(1 - eps, side).ankle.sub(a.ankle).multiplyScalar(-1 / (eps * g.duty * g.cycle)); // d/dt at s=1
    const vb = this.stanceFoot(eps, side).ankle.sub(b.ankle).multiplyScalar(1 / (eps * g.duty * g.cycle));
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    const pos = a.ankle.clone().multiplyScalar(h00).addScaledVector(va, h10 * ts).addScaledVector(b.ankle, h01).addScaledVector(vb, h11 * ts);
    // lift peaks early in the swing (the knee folds, then the shin reaches out to land)
    const ul = Math.pow(u, 0.8);
    const lift = (4 * ul * (1 - ul)) ** 2;
    pos.y += g.swingLift * lift;
    // run: heel recovery, the foot folds up behind the hip before the knee drives forward
    const uk = Math.pow(u, 0.65);
    const kick = (4 * uk * (1 - uk)) ** 2;
    pos.y += g.heelKick * kick;
    pos.z -= g.heelKick * 0.5 * kick;
    // pitch: from toe-off, toes lifted mid-swing to clear, toes up again for the heel strike
    const mid = g.duty > 0.5 ? -0.12 : 0.35;
    const pitch = u < 0.5 ? a.pitch + (mid - a.pitch) * smooth(u * 2) : mid + (b.pitch - mid) * smooth(u * 2 - 1);
    return { ankle: pos, pitch, toeFlat: 1 - smooth(u * 4) };
  }

  foot(phase: number, side: 1 | -1): FootState {
    const l = legPhase(this.g, phase, side);
    return l.stance ? this.stanceFoot(l.s, side) : this.swingFoot(l.u, side);
  }

  /** pelvis rotation (yaw toward the stepping leg, drop on the swing side, a share of the lean) */
  pelvisQ(phase: number) {
    const g = this.g;
    const c = Math.cos(2 * Math.PI * phase);
    const st = Math.cos(2 * Math.PI * (phase - g.duty / 2));
    return qa(AY, -g.pelvisYaw * c).multiply(qa(AZ, g.pelvisRoll * st)).multiply(qa(AX, g.lean * 0.35));
  }

  private hipJoint(phase: number, side: 1 | -1, hipsPos: THREE.Vector3) {
    const off = this.rest.p[side === 1 ? 'LeftUpLeg' : 'RightUpLeg'].clone().sub(this.rest.p.Hips);
    return off.applyQuaternion(this.pelvisQ(phase)).add(hipsPos);
  }

  private hipsXZ(phase: number) {
    const g = this.g;
    return { x: g.sway * Math.cos(2 * Math.PI * (phase - g.duty / 2)), z: 0 };
  }

  /** pelvis height over the stride: nominal (walk) or compressed/flight (run), never higher than the stance legs reach */
  private solveHipHeight() {
    const g = this.g, N = this.samples;
    const raw = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const ph = i / N;
      let y = g.hipHeight;
      if (g.duty < 0.5) {
        // run: compress through each stance, rise through each flight
        for (const side of [1, -1] as const) {
          const l = legPhase(g, ph, side);
          if (l.stance) y -= g.compress * Math.sin(Math.PI * l.s);
        }
        const p2 = frac(ph * 2); // two flights per stride
        if (p2 >= g.duty) {
          const u = (p2 - g.duty) / (1 - 2 * g.duty || 1);
          if (u <= 1) y += g.flightRise * 4 * u * (1 - u);
        }
      }
      raw[i] = Math.min(y, this.reachLimit(ph, y));
    }
    // cyclic smoothing so the pelvis never jerks between legs, then re-limit to reach
    const out = new Float32Array(N);
    const K = 3;
    for (let i = 0; i < N; i++) {
      let s = 0, w = 0;
      for (let k = -K; k <= K; k++) {
        const wk = K + 1 - Math.abs(k);
        s += raw[(i + k + N) % N] * wk;
        w += wk;
      }
      out[i] = s / w;
    }
    for (let i = 0; i < N; i++) out[i] = Math.min(out[i], this.reachLimit(i / N, out[i]));
    return out;
  }

  private reachLimit(ph: number, y: number) {
    let lim = Infinity;
    const xz = this.hipsXZ(ph);
    for (const side of [1, -1] as const) {
      if (!legPhase(this.g, ph, side).stance) continue;
      const a = this.foot(ph, side).ankle;
      // fixed point: hips height at which the hip joint is exactly `reach` from the ankle
      let hy = y;
      for (let it = 0; it < 4; it++) {
        const j = this.hipJoint(ph, side, V(xz.x, hy, xz.z));
        const dx = a.x - j.x, dz = a.z - j.z;
        const h2 = this.reach * this.reach - dx * dx - dz * dz;
        if (h2 <= 0) break;
        hy = a.y + Math.sqrt(h2) + (hy - j.y);
      }
      lim = Math.min(lim, hy);
    }
    return lim;
  }

  hips(phase: number) {
    const N = this.samples, f = frac(phase) * N;
    const i0 = Math.floor(f) % N, t = f - Math.floor(f);
    const y = this.hipY[i0] * (1 - t) + this.hipY[(i0 + 1) % N] * t;
    const xz = this.hipsXZ(phase);
    return V(xz.x, y, xz.z);
  }

  /** World-space (root space) rotation deltas for every bone, applied on top of the rest pose. */
  pose(phase: number) {
    const g = this.g, r = this.rest;
    const D = {} as Record<BoneId, THREE.Quaternion>;
    const hipsPos = this.hips(phase);
    const pelvis = this.pelvisQ(phase);
    D.Hips = pelvis;
    // trunk: lean (+bounce on each landing), chest counter-rotation against the pelvis, head kept level
    const c = Math.cos(2 * Math.PI * phase);
    const lean = g.lean + g.leanBounce * Math.cos(4 * Math.PI * (phase - g.duty * 0.5));
    D.Spine = qa(AY, -g.pelvisYaw * c * 0.4).multiply(qa(AX, lean * 0.7));
    D.Spine1 = qa(AY, g.chestYaw * c * 0.45).multiply(qa(AX, lean * 0.9));
    D.Spine2 = qa(AY, g.chestYaw * c).multiply(qa(AX, lean));
    D.Neck = qa(AY, g.chestYaw * c * 0.4).multiply(qa(AX, lean * 0.45));
    D.Head = qa(AX, lean * 0.12 - 0.02);
    // legs
    for (const side of [1, -1] as const) {
      const L = side === 1 ? 'Left' : 'Right';
      const f = this.foot(phase, side);
      const J = this.hipJoint(phase, side, hipsPos);
      const d = f.ankle.clone().sub(J);
      const len = clamp(d.length(), 0.2, this.reach);
      const dh = d.normalize();
      const pole = V(side * g.toeOut * 0.4, 0, 1).applyQuaternion(qa(AY, -g.pelvisYaw * c * 0.5));
      const pp = pole.addScaledVector(dh, -pole.dot(dh)).normalize();
      const cosA = clamp((r.thigh ** 2 + len ** 2 - r.shin ** 2) / (2 * r.thigh * len), -1, 1);
      const sinA = Math.sqrt(1 - cosA * cosA);
      const thighDir = dh.clone().multiplyScalar(cosA).addScaledVector(pp, sinA);
      const knee = J.clone().addScaledVector(thighDir, r.thigh);
      const shinDir = J.clone().addScaledVector(dh, len).sub(knee).normalize();
      const restThigh = r.p[`${L}Leg`].clone().sub(r.p[`${L}UpLeg`]).normalize();
      const restShin = r.p[`${L}Foot`].clone().sub(r.p[`${L}Leg`]).normalize();
      const dThigh = new THREE.Quaternion().setFromUnitVectors(restThigh, thighDir);
      const dShin = new THREE.Quaternion().setFromUnitVectors(restShin.clone().applyQuaternion(dThigh), shinDir).multiply(dThigh);
      const yaw = qa(AY, side * g.toeOut);
      const dFoot = yaw.clone().multiply(qa(AX, f.pitch));
      D[`${L}UpLeg`] = dThigh;
      D[`${L}Leg`] = dShin;
      D[`${L}Foot`] = dFoot;
      D[`${L}ToeBase`] = yaw.clone().slerp(dFoot, 1 - f.toeFlat);
    }
    // arms swing against the legs: the left arm comes forward with the right leg
    for (const side of [1, -1] as const) {
      const L = side === 1 ? 'Left' : 'Right';
      const sw = side * -Math.cos(2 * Math.PI * (phase - 0.03)); // +1 = forward
      const alpha = sw > 0 ? sw * g.armFwd : sw * g.armBack;
      const elbow = g.elbow + g.elbowSwing * sw;
      const base = V(side * Math.sin(g.armAbduct), -Math.cos(g.armAbduct), 0);
      const armDir = base.clone().applyQuaternion(qa(AX, -alpha)).applyQuaternion(D.Spine2);
      const foreDir = base.clone().applyQuaternion(qa(AX, -(alpha + elbow))).applyQuaternion(qa(AY, -side * g.armInward)).applyQuaternion(D.Spine2);
      const restArm = r.p[`${L}ForeArm`].clone().sub(r.p[`${L}Arm`]).normalize();
      const restFore = r.p[`${L}Hand`].clone().sub(r.p[`${L}ForeArm`]).normalize();
      D[`${L}Shoulder`] = D.Spine2.clone();
      const dArm = new THREE.Quaternion().setFromUnitVectors(restArm, armDir);
      const dFore = new THREE.Quaternion().setFromUnitVectors(restFore.clone().applyQuaternion(dArm), foreDir).multiply(dArm);
      D[`${L}Arm`] = dArm;
      D[`${L}ForeArm`] = dFore;
      D[`${L}Hand`] = dFore.clone().multiply(qa(AX, 0.1));
    }
    return { D, hipsPos };
  }
}

/** Bake one cycle into an AnimationClip on this rig (local bone quaternions + the Hips position). */
export function buildGaitClip(rest: RigRest, g: GaitParams, frames = g.keys ?? 40): THREE.AnimationClip {
  const solver = new GaitSolver(rest, g);
  const times: number[] = [];
  const qv = {} as Record<BoneId, number[]>;
  for (const id of BONES) qv[id] = [];
  const hp: number[] = [];
  const prev = {} as Record<BoneId, THREE.Quaternion>;
  for (let i = 0; i <= frames; i++) {
    const ph = (i % frames) / frames;
    times.push((i / frames) * g.cycle);
    const { D, hipsPos } = solver.pose(ph);
    const W = {} as Record<BoneId, THREE.Quaternion>;
    for (const id of BONES) W[id] = D[id].clone().multiply(rest.q[id]);
    for (const id of BONES) {
      const pid = rest.parent[id];
      const parentW = pid ? W[pid] : rest.parentRestQ;
      const local = parentW.clone().invert().multiply(W[id]);
      if (prev[id] && prev[id].dot(local) < 0) local.set(-local.x, -local.y, -local.z, -local.w);
      prev[id] = local;
      qv[id].push(local.x, local.y, local.z, local.w);
    }
    const lp = hipsPos.clone().applyMatrix4(rest.parentRestInv);
    hp.push(lp.x, lp.y, lp.z);
  }
  const tracks: THREE.KeyframeTrack[] = BONES.map((id) => new THREE.QuaternionKeyframeTrack(`${rest.names[id]}.quaternion`, times, qv[id]));
  tracks.push(new THREE.VectorKeyframeTrack(`${rest.names.Hips}.position`, times, hp));
  return new THREE.AnimationClip(g.name, g.cycle, tracks);
}

/** Ground-speed-locked playback: the stride length and cadence of a walk↔run blend at a given speed (rig units). */
export function strideAt(walk: GaitParams, run: GaitParams, speed: number) {
  const w = clamp((speed - walk.speed) / (run.speed - walk.speed), 0, 1);
  const k = smooth(w);
  if (speed >= walk.speed) {
    // both clips advance at the same normalised phase; their blended stride must cover exactly `speed` per second
    const stride = (1 - k) * walk.speed * walk.cycle + k * run.speed * run.cycle;
    return { run: k, cycle: stride / speed };
  }
  // slower than the walk: shorten the stride a little and slow the cadence, keeping the planted foot honest
  const cycle = Math.min(walk.cycle * 1.45, (walk.speed * walk.cycle) / Math.max(speed, 0.05));
  return { run: 0, cycle };
}

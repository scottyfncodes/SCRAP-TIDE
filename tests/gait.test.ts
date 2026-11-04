// The captain's procedural Walk and Run, measured on the real rig after the AnimationMixer evaluates them:
// planted feet don't slide, the run has a flight phase, the pelvis moves, knees bend forward, and playback cadence
// matches ground speed through the walk↔run blend. (The old sped-up Walk skated ~2.3 m/s; see docs/expedition-pass.)
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { WALK, RUN, captureRest, buildGaitClip, legPhase, strideAt, GaitSolver, type GaitParams } from '../src/player/gait';

async function loadCaptain() {
  const buf = readFileSync('public/models/tb_captain.glb');
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const g = await new Promise<{ scene: THREE.Group }>((res, rej) => new GLTFLoader().parse(ab, '', res as never, rej));
  return g.scene;
}

type Sample = { t: number; ph: number; ankle: THREE.Vector3[]; ball: THREE.Vector3[]; knee: THREE.Vector3[]; hip: THREE.Vector3[]; hipsQ: THREE.Quaternion; hand: THREE.Vector3[] };

async function sampleClip(g: GaitParams, n = 120) {
  const root = await loadCaptain();
  const rest = captureRest(root)!;
  const clip = buildGaitClip(rest, g);
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(clip).play();
  const bone = (n: string) => root.getObjectByName('mixamorig' + n)!;
  const out: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * clip.duration;
    mixer.setTime(t);
    root.updateMatrixWorld(true);
    const wp = (b: string) => bone(b).getWorldPosition(new THREE.Vector3());
    out.push({
      t, ph: i / n,
      ankle: [wp('LeftFoot'), wp('RightFoot')],
      ball: [wp('LeftToeBase'), wp('RightToeBase')],
      knee: [wp('LeftLeg'), wp('RightLeg')],
      hip: [wp('LeftUpLeg'), wp('RightUpLeg')],
      hand: [wp('LeftHand'), wp('RightHand')],
      hipsQ: bone('Hips').getWorldQuaternion(new THREE.Quaternion()),
    });
  }
  return { out, rest, clip };
}

/** largest drift of a point that should be stationary on the ground (body moves +Z at g.speed) */
function slip(g: GaitParams, s: Sample[], leg: 0 | 1, pick: (x: Sample) => THREE.Vector3, from: number, to: number) {
  // time since this foot's touchdown, so a stance that wraps the clip's loop point is measured continuously
  const pts = s.map((x) => ({ x, l: legPhase(g, x.ph, leg === 0 ? 1 : -1) }))
    .filter(({ l }) => l.stance && l.s >= from && l.s <= to)
    .map(({ x, l }) => pick(x).clone().setZ(pick(x).z + g.speed * l.s * g.duty * g.cycle));
  let worst = 0;
  for (const p of pts) for (const q of pts) worst = Math.max(worst, Math.hypot(p.x - q.x, p.z - q.z), Math.abs(p.y - q.y) * 0);
  return { worst, n: pts.length };
}

describe('procedural gait on the captain rig', () => {
  for (const g of [WALK, RUN]) {
    it(`${g.name}: the planted foot stays put (flat foot and ball of the foot)`, async () => {
      const { out } = await sampleClip(g);
      const sT = g.duty > 0.5 ? 0.55 : 0.42;
      for (const leg of [0, 1] as const) {
        const flat = slip(g, out, leg, (x) => x.ankle[leg], 0.17, sT - 0.01);
        const ball = slip(g, out, leg, (x) => x.ball[leg], sT + 0.01, 0.99);
        expect(flat.n).toBeGreaterThan(2);
        expect(ball.n).toBeGreaterThan(2);
        expect(flat.worst).toBeLessThan(0.02);
        expect(ball.worst).toBeLessThan(0.03);
      }
    });

    it(`${g.name}: pelvis yaws and rolls, knees always bend forward, hands clear the body`, async () => {
      const { out } = await sampleClip(g);
      const yaws = out.map((x) => new THREE.Euler().setFromQuaternion(x.hipsQ, 'YXZ').y);
      const rolls = out.map((x) => new THREE.Euler().setFromQuaternion(x.hipsQ, 'YXZ').z);
      expect(Math.max(...yaws) - Math.min(...yaws)).toBeGreaterThan(0.12);
      expect(Math.max(...rolls) - Math.min(...rolls)).toBeGreaterThan(0.08);
      for (const x of out)
        for (const leg of [0, 1]) {
          // knee in front of the hip→ankle line (no hyperextension / backward knees)
          const h = x.hip[leg], a = x.ankle[leg], k = x.knee[leg];
          const t = (k.y - h.y) / (a.y - h.y || 1e-6);
          const lineZ = h.z + (a.z - h.z) * t;
          expect(k.z - lineZ).toBeGreaterThan(-0.004);
          expect(Math.abs(x.hand[leg].x)).toBeGreaterThan(0.12);
        }
    });
  }

  it('the run has a flight phase (both feet off the ground) and the walk always has a foot down', async () => {
    const run = await sampleClip(RUN);
    const walk = await sampleClip(WALK);
    const airborne = (s: Sample, rest: { ankleH: number }) => s.ankle.every((a, i) => a.y > rest.ankleH + 0.02 && s.ball[i].y > 0.05);
    expect(run.out.filter((s) => airborne(s, run.rest)).length).toBeGreaterThan(8);
    expect(walk.out.filter((s) => airborne(s, walk.rest)).length).toBe(0);
  });

  it('the swing foot clears the ground and the run folds the heel up behind', async () => {
    const run = await sampleClip(RUN);
    const walk = await sampleClip(WALK);
    const peak = (s: Sample[]) => Math.max(...s.map((x) => x.ankle[0].y));
    expect(peak(walk.out)).toBeGreaterThan(0.17);
    expect(peak(run.out)).toBeGreaterThan(0.4);
  });

  it('the rest pose is captured in the rig root\'s own space even when the rig is already placed in the world', async () => {
    const a = captureRest(await loadCaptain())!;
    const root = await loadCaptain();
    root.scale.setScalar(1.08);
    const holder = new THREE.Group();
    holder.position.set(-172, 3.5, 68);
    holder.rotation.y = 1.3;
    holder.scale.setScalar(0.9);
    holder.add(root);
    const b = captureRest(root)!;
    for (const id of ['Hips', 'LeftFoot', 'RightHand', 'Head'] as const) {
      expect(b.p[id].distanceTo(a.p[id])).toBeLessThan(1e-4);
      expect(Math.abs(b.q[id].dot(a.q[id]))).toBeGreaterThan(0.9999);
    }
    // and the baked Hips track stays at the rig's own pelvis height
    const clip = buildGaitClip(b, RUN);
    const hips = clip.tracks.find((t) => t.name.endsWith('Hips.position'))!;
    for (let i = 0; i < hips.values.length; i += 3) {
      expect(Math.abs(hips.values[i])).toBeLessThan(0.1);
      expect(hips.values[i + 1]).toBeGreaterThan(0.8);
      expect(hips.values[i + 1]).toBeLessThan(0.95);
    }
  });

  it('pelvis bounce is human: ~3-5 cm walking (high at mid-stance), ~6-10 cm running (low at mid-stance, high in flight)', async () => {
    const rest = captureRest(await loadCaptain())!;
    const range = (g: GaitParams) => {
      const s = new GaitSolver(rest, g);
      const ys = Array.from({ length: 96 }, (_, i) => s.hips(i / 96).y);
      return { lo: Math.min(...ys), hi: Math.max(...ys), mid: s.hips(g.duty / 2).y, td: s.hips(0).y };
    };
    const w = range(WALK), r = range(RUN);
    expect(w.hi - w.lo).toBeGreaterThan(0.02);
    expect(w.hi - w.lo).toBeLessThan(0.05);
    expect(w.mid).toBeGreaterThan(w.td); // inverted pendulum
    expect(r.hi - r.lo).toBeGreaterThan(0.05);
    expect(r.hi - r.lo).toBeLessThan(0.1);
    expect(r.mid).toBeLessThan(r.td); // spring-mass: compressed mid-stance
  });

  it('cadence × stride matches ground speed across the walk↔run blend', () => {
    for (const v of [WALK.speed, 2.2, 3, 4, RUN.speed]) {
      const { run, cycle } = strideAt(WALK, RUN, v);
      const stride = (1 - run) * WALK.speed * WALK.cycle + run * RUN.speed * RUN.cycle;
      expect(stride / cycle).toBeCloseTo(v, 5);
      expect(cycle).toBeGreaterThan(0.5);
      expect(cycle).toBeLessThan(1.6);
    }
    // the old approach for comparison: Walk at timeScale 0.75 + 5.2 × 0.28 moved the feet at ~2.9 m/s under a 5.2 m/s body
    const oldFoot = 1.31 * (0.75 + 5.2 * 0.28);
    expect(5.2 - oldFoot).toBeGreaterThan(2);
  });
});

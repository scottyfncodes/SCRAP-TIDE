// Jury-Rigged proof of concept, The Rustfang Toll (docs/jury-rigged/CRITERIA.md): the parts of C4 and C5 that are
// unit-testable. The flag is isolated, the accent palette keeps the brand's reserved colours, the plastic tag only
// appears when asked for, and the retuned walk on the 5.5-head captain still plants its feet.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { parseLook } from '../src/state/look';
import { PLASTIC_ACCENTS, ACCENT_BUDGET, WORLD_PALETTE } from '../src/world/style';
import { merge, paint, weather } from '../src/world/materials';
import { WALK, RUN, captureRest, buildGaitClip, legPhase, retune, BASE_LEG, GaitSolver, type GaitParams } from '../src/player/gait';

/** hue in degrees and chroma (max − min of sRGB, 0..1): HSL saturation overstates near-whites, chroma does not */
const hueChroma = (hex: string) => {
  const c = new THREE.Color(hex);
  const { h } = c.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace);
  const [r, g, b] = c.getStyle(THREE.SRGBColorSpace).match(/\d+/g)!.map((v) => +v / 255);
  return { deg: h * 360, chroma: Math.max(r, g, b) - Math.min(r, g, b) };
};

describe('?look=jury flag', () => {
  it('turns on only for look=jury; anything else is the default look', () => {
    expect(parseLook('?look=jury')).toBe('jury');
    expect(parseLook('?ship=skiff&look=JURY')).toBe('jury');
    expect(parseLook('')).toBeNull();
    expect(parseLook('?look=')).toBeNull();
    expect(parseLook('?look=pirate')).toBeNull();
    expect(parseLook('?exp=tides')).toBeNull();
  });
});

describe('sun-faded plastic accents (C4)', () => {
  it('there are exactly five, and the budget is 10 % of a frame', () => {
    expect(Object.keys(PLASTIC_ACCENTS)).toHaveLength(5);
    expect(ACCENT_BUDGET).toBe(0.1);
  });
  for (const [name, hex] of Object.entries(PLASTIC_ACCENTS)) {
    it(`${name} (${hex}) is not living green and not Sun Gold`, () => {
      const { deg, chroma } = hueChroma(hex);
      // living green: hue 85–165° with any visible chroma
      expect(chroma > 0.06 && deg >= 85 && deg <= 165).toBe(false);
      // Sun Gold (#e5c65e, chroma 0.53): hue 40–60° with real chroma
      expect(chroma > 0.2 && deg >= 40 && deg <= 60).toBe(false);
      // and it is a new colour, not a world-palette token renamed
      expect(Object.values(WORLD_PALETTE)).not.toContain(hex);
    });
  }
});

describe('the plastic tag only exists when something asks for it', () => {
  it('merge() of untagged geometry has no accent attribute (the default look is untouched)', () => {
    const g = merge([paint(new THREE.BoxGeometry(1, 1, 1), '#808080'), paint(new THREE.BoxGeometry(1, 1, 1), '#404040')]);
    expect(g.attributes.accent).toBeUndefined();
  });
  it('merge() keeps the tag when one part carries it and fills zeros for the rest', () => {
    const a = paint(new THREE.BoxGeometry(1, 1, 1), PLASTIC_ACCENTS.buoyRed);
    a.setAttribute('accent', new THREE.BufferAttribute(new Float32Array(a.attributes.position.count).fill(1), 1));
    const b = paint(new THREE.BoxGeometry(1, 1, 1), '#404040');
    const g = merge([a, b]);
    const acc = g.attributes.accent.array as Float32Array;
    expect(acc.length).toBe(g.attributes.position.count);
    expect(acc[0]).toBe(1);
    expect(acc[acc.length - 1]).toBe(0);
  });
});

describe('retune()', () => {
  it('scales every length with the leg and leaves the angles alone', () => {
    const t = retune(WALK, 0.75, 0.6, 1.1, 1.3);
    expect(t.speed).toBeCloseTo(WALK.speed * 0.75);
    expect(t.swingLift).toBeCloseTo(WALK.swingLift * 0.75);
    expect(t.hipHeight).toBe(0.6);
    expect(t.footHalfWidth).toBeCloseTo(WALK.footHalfWidth * 1.1);
    expect(t.heelStrike).toBe(WALK.heelStrike);
    expect(t.elbow).toBe(WALK.elbow);
    expect(t.armFwd).toBeCloseTo(WALK.armFwd * 1.3);
  });
});

// C5: the planted foot of the retuned walk on the shipped Jury-Rigged captain
const JURY_CAPTAIN = 'public/models/tb_jury_captain.glb';
async function loadRig(file: string) {
  await MeshoptDecoder.ready;
  const buf = readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const g = await new Promise<{ scene: THREE.Group }>((res, rej) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(ab, '', res as never, rej));
  return g.scene;
}

/** largest drift of a planted point over a stance window (the body moves +Z at g.speed), in metres */
function slip(g: GaitParams, root: THREE.Object3D, clip: THREE.AnimationClip, leg: 0 | 1, bone: string, from: number, to: number) {
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(clip).play();
  const b = root.getObjectByName('mixamorig' + (leg ? 'Right' : 'Left') + bone)!;
  const pts: THREE.Vector3[] = [];
  const n = 160;
  for (let i = 0; i < n; i++) {
    const ph = i / n;
    const l = legPhase(g, ph, leg === 0 ? 1 : -1);
    if (!l.stance || l.s < from || l.s > to) continue;
    mixer.setTime(ph * clip.duration);
    root.updateMatrixWorld(true);
    const p = b.getWorldPosition(new THREE.Vector3());
    pts.push(p.setZ(p.z + g.speed * l.s * g.duty * g.cycle));
  }
  let worst = 0;
  for (const p of pts) for (const q of pts) worst = Math.max(worst, Math.hypot(p.x - q.x, p.z - q.z));
  return { worst, n: pts.length };
}

/** how far the ankle rises between the start of toe-off and the end of stance */
function heelLift(g: GaitParams, root: THREE.Object3D, clip: THREE.AnimationClip, leg: 0 | 1, sT: number) {
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(clip).play();
  const b = root.getObjectByName('mixamorig' + (leg ? 'Right' : 'Left') + 'Foot')!;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 160; i++) {
    const l = legPhase(g, i / 160, leg === 0 ? 1 : -1);
    if (!l.stance || l.s < sT) continue;
    mixer.setTime((i / 160) * clip.duration);
    root.updateMatrixWorld(true);
    const y = b.getWorldPosition(new THREE.Vector3()).y;
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return hi - lo;
}

describe.skipIf(!existsSync(JURY_CAPTAIN))('the 5.5-head captain walks on planted feet (C5)', () => {
  for (const base of [WALK, RUN]) {
    // C5: ≤ 1 cm in both stance phases. retune() hinges toe-off on the toe joint (GaitParams.toeHinge); the original
    // cast's ground pivot let the joint travel 1.72 cm walking / 2.77 cm running by this same measurement.
    it(`${base.name}, retuned: flat foot and toe-off both ≤ 1 cm, and the heel still lifts through toe-off`, async () => {
      const root = await loadRig(JURY_CAPTAIN);
      const rest = captureRest(root)!;
      const k = (rest.thigh + rest.shin) / BASE_LEG;
      expect(k).toBeLessThan(0.85); // shorter legs than the 7.3-head cast
      // exactly what captain.ts does
      const g = retune(base, k, rest.p.Hips.y * (base.hipHeight / 0.95), 1.14, base === WALK ? 1.3 : 1.15, base === WALK ? Math.sqrt(k) : k);
      expect(g.toeHinge).toBe(true);
      expect(g.toeOff).toBe(base.toeOff); // the full roll, not a reduced one
      const clip = buildGaitClip(rest, g);
      const sT = g.duty > 0.5 ? 0.55 : 0.42;
      for (const leg of [0, 1] as const) {
        const flat = slip(g, root, clip, leg, 'Foot', 0.17, sT - 0.01);
        const ball = slip(g, root, clip, leg, 'ToeBase', sT + 0.01, 0.99);
        expect(flat.n).toBeGreaterThan(2);
        expect(ball.n).toBeGreaterThan(2);
        console.log(`[jury] ${base.name} leg ${leg}: flat ${(flat.worst * 100).toFixed(2)} cm, ball ${(ball.worst * 100).toFixed(2)} cm`);
        expect(flat.worst).toBeLessThanOrEqual(0.01);
        expect(ball.worst).toBeLessThanOrEqual(0.01);
        // the foot really rolls: the ankle rises over toe-off (no "fix" by keeping the foot flat)
        const lift = heelLift(g, root, clip, leg, sT);
        console.log(`[jury] ${base.name} leg ${leg}: ankle lift over toe-off ${(lift * 100).toFixed(1)} cm`);
        expect(lift).toBeGreaterThan(0.03);
      }
      // the pelvis still moves like a body: the gait suite's human ranges (walk 2–5 cm, high at mid-stance; run 5–10 cm)
      const sol = new GaitSolver(rest, g);
      const ys = Array.from({ length: 96 }, (_, i) => sol.hips(i / 96).y);
      const bob = Math.max(...ys) - Math.min(...ys);
      console.log(`[jury] ${base.name}: pelvis bob ${(bob * 100).toFixed(1)} cm`);
      if (base === WALK) expect(bob).toBeGreaterThan(0.02), expect(bob).toBeLessThan(0.05);
      else expect(bob).toBeGreaterThan(0.05), expect(bob).toBeLessThan(0.1);
    });
  }
});

// Toll draw-call work (docs/jury-rigged): a Jawboat's two crew drawn as one skinned mesh must look identical to the
// two separate meshes, in any pose, and keep animating independently.
const JURY_RAIDER = 'public/models/tb_jury_raider.glb';
describe.skipIf(!existsSync(JURY_RAIDER))('batched raider crew (one draw per boat)', () => {
  it('skins every vertex where the separate meshes did, with the two raiders in different clips and times', async () => {
    const { batchCrew } = await import('../src/world/crewBatch');
    const SkeletonUtils = await import('three/examples/jsm/utils/SkeletonUtils.js');
    await MeshoptDecoder.ready;
    const buf = readFileSync(JURY_RAIDER);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const gl = await new Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>((res, rej) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(ab, '', res as never, rej));
    const boat = new THREE.Group();
    boat.position.set(64, 0.3, 108);
    boat.rotation.set(0.05, 1.1, -0.04, 'YXZ');
    const crew = [0, 1].map((i) => {
      const root = SkeletonUtils.clone(gl.scene);
      root.position.set(i ? 0.1 : -0.25, 0.58, i ? -2.75 : 1.75);
      root.rotation.y = i ? 0.4 : 0.15;
      boat.add(root);
      const mixer = new THREE.AnimationMixer(root);
      const clip = gl.animations.find((c) => c.name === (i ? 'Idle' : 'Attack'))!;
      mixer.clipAction(clip).play();
      return { root, mixer, clip };
    });
    const pose = (t: number) => {
      crew.forEach((c, i) => c.mixer.setTime((t + i * 0.37) % c.clip.duration));
      boat.updateMatrixWorld(true);
    };
    const skinned = (m: THREE.SkinnedMesh) => {
      m.skeleton.update();
      m.updateMatrixWorld(true);
      const out: THREE.Vector3[] = [];
      for (let i = 0; i < m.geometry.attributes.position.count; i++) out.push(m.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(m.matrixWorld));
      return out;
    };
    const originals = crew.map((c) => {
      let m!: THREE.SkinnedMesh;
      c.root.traverse((o) => (o as THREE.SkinnedMesh).isSkinnedMesh && (m = o as THREE.SkinnedMesh));
      return m;
    });
    const times = [0.1, 0.55, 0.9];
    const before = times.map((t) => (pose(t), originals.flatMap(skinned)));
    const sm = batchCrew(boat, crew)!;
    expect(sm).not.toBeNull();
    expect(originals.every((m) => !m.parent)).toBe(true); // the separate meshes are no longer drawn
    expect(sm.skeleton.bones.length).toBe(originals[0].skeleton.bones.length * 2);
    let worst = 0;
    times.forEach((t, k) => {
      pose(t);
      const after = skinned(sm);
      expect(after.length).toBe(before[k].length);
      after.forEach((v, i) => (worst = Math.max(worst, v.distanceTo(before[k][i]))));
    });
    console.log(`[jury] batched crew: worst vertex difference ${(worst * 1000).toFixed(3)} mm over ${times.length} poses`);
    expect(worst).toBeLessThan(1e-4);
    // and the cull sphere holds the whole crew in every pose
    for (const t of times) {
      pose(t);
      const s = sm.boundingSphere!.clone().applyMatrix4(sm.matrixWorld);
      for (const v of skinned(sm)) expect(s.containsPoint(v)).toBe(true);
    }
  });
});

// Normal-look isolation at the shader level: the Jury-Rigged extension (plastic accents, the measurement mask) must
// not compile into the default look's materials. Outside a look visit an untagged material's shader carries none of
// it and keeps the default program key, so it is the same program main builds (checked byte-for-byte when added).
describe('the default look compiles the default shaders', () => {
  const compile = (accent: boolean) => {
    const m = weather(new THREE.MeshToonMaterial({ vertexColors: true }), 1, false, accent);
    const sh = { uniforms: {} as Record<string, unknown>, vertexShader: THREE.ShaderLib.toon.vertexShader, fragmentShader: THREE.ShaderLib.toon.fragmentShader };
    m.onBeforeCompile(sh as never, null as never);
    return { src: sh.vertexShader + sh.fragmentShader, key: m.customProgramCacheKey(), uniforms: Object.keys(sh.uniforms) };
  };
  it('an untagged material has no accent code, no mask uniform and the default program key', () => {
    const d = compile(false);
    expect(d.src).not.toMatch(/vWxAcc|uAccentMask|attribute float accent/);
    expect(d.uniforms).not.toContain('uAccentMask');
    expect(d.key).toBe('weather-0');
  });
  it('an accent material gets the plastic grading, the tag and its own program', () => {
    const a = compile(true);
    expect(a.src).toMatch(/attribute float accent/);
    expect(a.src).toMatch(/vWxAcc/);
    expect(a.key).toBe('weather-0-acc');
  });
});

// Cost tripwires (docs/jury-rigged/IPHONE-CHECKLIST.md). No browser and no GPU: draw-call structure, triangles,
// bones and bytes are deterministic, so these fail in a second if the encounter gets heavier. They are proxies for
// mobile cost, NOT a frame-rate test; real-device timing is a manual check. Budgets are today's values + ~15 %.
describe('Jury-Rigged cost budgets', () => {
  const tri = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.attributes.position.count) / 3;
  it('a Jawboat is one draw of at most 2,700 triangles (two on screen = two hull draws)', async () => {
    const { jawboat } = await import('../src/world/jury');
    for (const seed of [1, 2]) {
      const meshes: THREE.Mesh[] = [];
      jawboat(seed).traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh));
      expect(meshes).toHaveLength(1);
      expect(tri(meshes[0].geometry)).toBeLessThanOrEqual(2700);
    }
  });
  it('the harbour additions stay inside their triangle budget (merged into the existing harbour batches)', async () => {
    const { Kit, signalStack, bathtubLifeboat, trolleyPots, tollGate } = await import('../src/world/jury');
    const k = new Kit();
    signalStack(k);
    expect(k.geos.reduce((s, g) => s + tri(g), 0)).toBeLessThanOrEqual(3000);
    expect(k.glows.reduce((s, g) => s + tri(g), 0)).toBeLessThanOrEqual(1100);
    const k2 = new Kit();
    bathtubLifeboat(k2, 1);
    trolleyPots(k2);
    tollGate(k2);
    expect(k2.geos.reduce((s, g) => s + tri(g), 0)).toBeLessThanOrEqual(3500);
  });
  for (const f of ['tb_jury_captain', 'tb_jury_raider']) {
    it(`${f}: one primitive, ≤ 8,000 triangles, 22 joints, ≤ 420 KB`, () => {
      const path = `public/models/${f}.glb`;
      const buf = readFileSync(path);
      const j = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString());
      expect(j.meshes.reduce((s: number, m: { primitives: unknown[] }) => s + m.primitives.length, 0)).toBe(1);
      expect(j.accessors[j.meshes[0].primitives[0].indices].count / 3).toBeLessThanOrEqual(8000);
      expect(j.skins[0].joints).toHaveLength(22); // a batched crew of two is 44 bones (checked above)
      expect(buf.byteLength).toBeLessThanOrEqual(420 * 1024);
    });
  }
});

describe.skipIf(!existsSync(JURY_RAIDER))('despawning a look-visit raider boat frees what it built', () => {
  it('disposes the Jawboat hull, the merged crew geometry and its bone texture, never the shared GLB geometry', async () => {
    const { batchCrew, releaseBoat } = await import('../src/world/crewBatch');
    const { jawboat } = await import('../src/world/jury');
    const SkeletonUtils = await import('three/examples/jsm/utils/SkeletonUtils.js');
    await MeshoptDecoder.ready;
    const buf = readFileSync(JURY_RAIDER);
    const gl = await new Promise<{ scene: THREE.Group }>((res, rej) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res as never, rej));
    const boat = jawboat(1);
    const crew = [0, 1].map(() => {
      const root = SkeletonUtils.clone(gl.scene);
      boat.add(root);
      return { root };
    });
    let shared!: THREE.BufferGeometry;
    crew[0].root.traverse((o) => (o as THREE.SkinnedMesh).isSkinnedMesh && (shared = (o as THREE.SkinnedMesh).geometry));
    const batch = batchCrew(boat, crew)!;
    const hull = boat.children.find((o) => (o as THREE.Mesh).isMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh) as THREE.Mesh;
    batch.skeleton.computeBoneTexture();
    const disposed = new Set<string>();
    hull.geometry.addEventListener('dispose', () => disposed.add('hull'));
    batch.geometry.addEventListener('dispose', () => disposed.add('crew batch'));
    batch.skeleton.boneTexture!.addEventListener('dispose', () => disposed.add('bone texture'));
    shared.addEventListener('dispose', () => disposed.add('SHARED GLB GEOMETRY'));
    releaseBoat(boat);
    expect([...disposed].sort()).toEqual(['bone texture', 'crew batch', 'hull']);
  });
});

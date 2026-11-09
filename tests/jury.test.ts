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
import { merge, paint } from '../src/world/materials';
import { WALK, RUN, captureRest, buildGaitClip, legPhase, retune, BASE_LEG, type GaitParams } from '../src/player/gait';

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

describe.skipIf(!existsSync(JURY_CAPTAIN))('the 5.5-head captain walks on planted feet (C5)', () => {
  for (const base of [WALK, RUN]) {
    it(`${base.name}, retuned: flat-foot and toe-off slip ≤ 1 cm`, async () => {
      const root = await loadRig(JURY_CAPTAIN);
      const rest = captureRest(root)!;
      const k = (rest.thigh + rest.shin) / BASE_LEG;
      expect(k).toBeLessThan(0.85); // shorter legs than the 7.3-head cast
      const g = retune(base, k, rest.p.Hips.y * (base.hipHeight / 0.95), 1.14, base === WALK ? 1.3 : 1.15);
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
      }
    });
  }
});

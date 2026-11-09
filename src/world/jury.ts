// Jury-Rigged (docs/jury-rigged, docs/art-direction/STYLE-GUIDE.md §10): the proof-of-concept pieces of The Rustfang
// Toll, shown only with `?look=jury` (src/state/look.ts).
//
// Two factions, two construction logics, so they read apart without colour:
//   DRIFTHOLM  "lashed together, and proud of it": things STACKED and TIED. Guy lines, pontoon drums, bunting,
//              rounded salvage (tanks, tubs, dishes), a gentle lean held up by rope.
//   RUSTFANG   "take it, weld teeth on it": things WELDED and SHARPENED. Plate on plate, saw blades, spikes and
//              exhaust stacks, everything leaning forward, asymmetric, nothing tied when it can be welded.
// Every humorous piece is salvage in a second life that the survivors would really have made (a satellite dish as a
// crow's nest, a traffic light as the harbour lamp, a clawfoot bath as a lifeboat, supermarket trolleys as lobster
// pots, a car-park barrier and a STOP sign as a toll). The thing must stay recognisable: that is the joke.
//
// Output is plain vertex-coloured geometry merged into the existing batches (the harbour's one draw call, one mesh per
// raider boat), weathered by the shared shader. Sun-faded plastic is painted from style.ts PLASTIC_ACCENTS and
// tagged with the `accent` attribute so the shader treats it as plastic.
import * as THREE from 'three';
import { paint, merge, vcMat } from './materials';
import { glowMat } from './assets';
import { PLASTIC_ACCENTS as ACC } from './style';
import { SALVAGE } from './shanty';

type V3 = [number, number, number];
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _up = new THREE.Vector3(0, 1, 0);
const ACCENTS = new Set<string>(Object.values(ACC));

/** Rustfang's materials: oily navy, oxide, gunmetal, hazard-free (gold is for interactive things only). */
export const RUSTFANG = {
  hull: '#4a2c22',
  hullDark: '#2a2326',
  navy: '#26323b',
  plate: ['#6e767c', '#8c4529', '#3a4148', '#5e3424', '#7a3a1e'],
  steel: '#9aa3ad',
  chrome: '#b9c0c4',
  soot: '#1f1d1c',
  rubber: '#1e1c1a',
} as const;

/** A tiny geometry kit: every part is painted, optionally tagged as plastic, and merged once at the end. */
export class Kit {
  geos: THREE.BufferGeometry[] = [];
  glows: THREE.BufferGeometry[] = [];
  /** a transform applied to everything added after it is set (e.g. the Signal Stack's lean) */
  frame = new THREE.Matrix4();

  add(g: THREE.BufferGeometry, color: string, pos: V3, rot: V3 = [0, 0, 0], jitter = 0.06, glow = false) {
    _m.compose(new THREE.Vector3(...pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(_m).applyMatrix4(this.frame);
    const p = paint(g, color, glow ? 0 : jitter);
    if (!glow) {
      const n = p.attributes.position.count;
      p.setAttribute('accent', new THREE.BufferAttribute(new Float32Array(n).fill(ACCENTS.has(color) ? 1 : 0), 1));
    }
    (glow ? this.glows : this.geos).push(p);
    return p;
  }
  box(w: number, h: number, d: number, pos: V3, color: string, rot: V3 = [0, 0, 0]) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, pos, rot);
  }
  cyl(r0: number, r1: number, h: number, pos: V3, color: string, rot: V3 = [0, 0, 0], seg = 10) {
    return this.add(new THREE.CylinderGeometry(r0, r1, h, seg), color, pos, rot);
  }
  torus(R: number, r: number, pos: V3, color: string, rot: V3 = [0, 0, 0], arc = Math.PI * 2, seg = 14) {
    return this.add(new THREE.TorusGeometry(R, r, 5, seg, arc), color, pos, rot);
  }
  glow(g: THREE.BufferGeometry, color: string, pos: V3, rot: V3 = [0, 0, 0]) {
    return this.add(g, color, pos, rot, 0, true);
  }
  /** a member from a to b: posts, braces, rope, rebar */
  beam(a: V3, b: V3, t: number, color: string, round = 0) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const d = vb.clone().sub(va);
    const len = d.length();
    if (len < 1e-3) return;
    const g = round ? new THREE.CylinderGeometry(t / 2, t / 2, len, round) : new THREE.BoxGeometry(t, len, t);
    _q.setFromUnitVectors(_up, d.normalize());
    _m.compose(va.add(vb).multiplyScalar(0.5), _q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(_m).applyMatrix4(this.frame);
    const p = paint(g, color, 0.05);
    p.setAttribute('accent', new THREE.BufferAttribute(new Float32Array(p.attributes.position.count).fill(ACCENTS.has(color) ? 1 : 0), 1));
    this.geos.push(p);
  }
  /** a triangular pennant hung under a line at p, facing along the line */
  pennant(p: V3, along: number, color: string, size = 0.5) {
    const g = new THREE.BufferGeometry();
    const s = size;
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-s / 2, 0, 0, s / 2, 0, 0, 0, -s, 0, s / 2, 0, 0, -s / 2, 0, 0, 0, -s, 0]), 3));
    g.computeVertexNormals();
    this.add(g, color, p, [0, along, 0], 0.04);
  }
  /** move everything added so far (a whole piece) into place */
  place(from: number, x: number, y: number, z: number, ry = 0, s = 1) {
    _m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), new THREE.Vector3(s, s, s));
    for (const g of this.geos.slice(from)) g.applyMatrix4(_m);
    return _m.clone();
  }
  mark() {
    return this.geos.length;
  }
}

// ───────────────────────────── Rustfang: the Jawboat ─────────────────────────────

/** A welded steel hull: a long box drawn to a raked, pointed bow and a square transom (bow = +Z). */
function hullGeo(len: number, w: number, h: number) {
  const g = new THREE.BoxGeometry(w, h, len, 2, 2, 10).toNonIndexed();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i);
    const z = p.getZ(i);
    const t = (z + len / 2) / len; // 0 stern .. 1 bow
    const bow = Math.max(0, (t - 0.55) / 0.45);
    x *= 1 - Math.pow(bow, 1.4) * 0.92;
    if (y < 0) {
      y += bow * bow * h * 0.75; // raked forefoot
      x *= 0.78; // chined bottom
    }
    if (y > 0) y += bow * 0.22; // the bow rides up
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** The Rustfang Jawboat: low, long and all teeth. A saw-blade fang at the bow, a welded jaw, exhaust stacks. */
export function jawboat(seed = 1) {
  const k = new Kit();
  const r = (i: number) => RUSTFANG.plate[(seed * 7 + i * 3) % RUSTFANG.plate.length];
  // hull: welded plate on plate, a lighter gunmetal sheer strake, a rubbing strake of cut tyre
  k.add(hullGeo(7.0, 2.5, 1.05), RUSTFANG.hull, [0, 0.0, 0]);
  k.add(hullGeo(6.6, 2.62, 0.22), RUSTFANG.navy, [0, 0.46, 0.1]);
  k.box(2.3, 0.08, 4.6, [0, 0.54, -0.9], '#5a4a3c'); // deck plate
  for (let i = 0; i < 7; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -2.8 + i * 0.8;
    const half = 1.25 * (1 - Math.max(0, (z / 7 + 0.5 - 0.55) / 0.45) ** 1.4 * 0.92);
    k.box(0.05, 0.42 + (i % 3) * 0.08, 0.7 + (i % 2) * 0.25, [side * (half + 0.02), 0.08 + (i % 3) * 0.06, z], r(i), [0, 0, side * 0.06]);
  }
  // the fang: a 1.9 m circular saw blade standing at the bow, half in the water, teeth all round
  const fz = 3.55, fy = 0.15, R = 0.95;
  k.cyl(R, R, 0.07, [0, fy, fz], RUSTFANG.steel, [0, 0, Math.PI / 2], 28);
  k.cyl(0.22, 0.22, 0.2, [0, fy, fz], RUSTFANG.soot, [0, 0, Math.PI / 2], 10);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    k.box(0.06, 0.24, 0.13, [0, fy + Math.cos(a) * (R + 0.07), fz + Math.sin(a) * (R + 0.07)], RUSTFANG.steel, [a + 0.5, 0, 0]);
  }
  k.beam([0, 0.55, 2.4], [0, fy, fz], 0.16, RUSTFANG.plate[2]);
  k.beam([0, -0.3, 2.6], [0, fy, fz], 0.14, RUSTFANG.plate[4]);
  // the jaw: rebar teeth along both bow gunwales, raked forward
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const z = 1.0 + i * 0.5, half = 1.25 * (1 - Math.max(0, (z / 7 + 0.5 - 0.55) / 0.45) ** 1.4 * 0.92);
      k.cyl(0.0, 0.07, 0.5 - i * 0.05, [s * half, 0.82, z + 0.12], RUSTFANG.steel, [1.05, 0, -s * 0.5], 5);
    }
  // road-sign shields bolted on the flanks: a red-bordered warning triangle is still a warning triangle
  for (const [s, z] of [[1, 0.2], [1, -1.2], [-1, -0.4]] as const) {
    k.cyl(0.46, 0.46, 0.03, [s * 1.33, 0.45, z], ACC.buoyRed, [Math.PI / 2, 0, s * Math.PI / 2 + Math.PI / 2], 3);
    k.cyl(0.3, 0.3, 0.03, [s * 1.355, 0.43, z], ACC.bleachWhite, [Math.PI / 2, 0, s * Math.PI / 2 + Math.PI / 2], 3);
  }
  // tyre fenders, uneven: three to starboard, two to port
  for (const [s, z] of [[1, 1.4], [1, -0.4], [1, -2.2], [-1, 0.6], [-1, -1.8]] as const) k.torus(0.27, 0.1, [s * 1.32, 0.1, z], RUSTFANG.rubber, [0, Math.PI / 2, 0], Math.PI * 2, 12);
  // a car-horn cluster on a post amidships: the war cry is three klaxons wired to one button
  k.beam([0.35, 0.55, 1.2], [0.35, 1.65, 1.35], 0.08, RUSTFANG.plate[0]);
  for (let i = 0; i < 3; i++) k.cyl(0.17 - i * 0.02, 0.04, 0.5, [0.35 + (i - 1) * 0.2, 1.7 + i * 0.12, 1.55], RUSTFANG.chrome, [1.1 - i * 0.15, 0, (i - 1) * 0.25], 10);
  // the oversized outboard: a red cowling twice the size the boat needs, and the shaft down into the sea
  k.box(0.9, 1.2, 0.95, [0, 1.05, -3.75], ACC.buoyRed, [0.12, 0, 0]);
  k.box(0.95, 0.2, 1.0, [0, 1.62, -3.82], RUSTFANG.navy, [0.12, 0, 0]);
  k.box(0.22, 1.4, 0.3, [0, -0.1, -3.95], RUSTFANG.plate[2]);
  k.cyl(0.32, 0.32, 0.08, [0, -0.7, -4.05], RUSTFANG.steel, [Math.PI / 2, 0, 0], 3);
  // exhaust stacks: four pipes of different heights to starboard aft, raked back, sooted at the top
  for (let i = 0; i < 4; i++) {
    const hgt = 1.6 + ((i * 5 + seed) % 4) * 0.35;
    const x = 0.72 + (i % 2) * 0.22, z = -2.2 - i * 0.28;
    k.cyl(0.09, 0.11, hgt, [x, 0.55 + hgt / 2, z], RUSTFANG.plate[(i + seed) % 5], [-0.22, 0, -0.08], 8);
    k.cyl(0.12, 0.1, 0.18, [x, 0.55 + hgt, z - hgt * 0.22], RUSTFANG.soot, [-0.22, 0, -0.08], 8);
  }
  // a cage outrigger to port only: rebar box round a float drum (asymmetric on purpose)
  {
    const ox = -2.05;
    for (const z of [-1.3, 1.1]) for (const y of [-0.15, 0.55]) k.beam([ox - 0.4, y, z], [ox + 0.4, y, z], 0.05, RUSTFANG.steel);
    for (const x of [ox - 0.4, ox + 0.4]) for (const y of [-0.15, 0.55]) k.beam([x, y, -1.3], [x, y, 1.1], 0.05, RUSTFANG.steel);
    for (const x of [ox - 0.4, ox + 0.4]) for (const z of [-1.3, 1.1]) k.beam([x, -0.15, z], [x, 0.55, z], 0.05, RUSTFANG.steel);
    k.cyl(0.32, 0.32, 2.1, [ox, 0.18, -0.1], ACC.buoyRed, [Math.PI / 2, 0, 0], 10);
    k.beam([ox + 0.4, 0.5, 0.6], [-1.2, 0.6, 0.6], 0.1, RUSTFANG.plate[3]);
    k.beam([ox + 0.4, 0.5, -0.8], [-1.2, 0.6, -0.8], 0.1, RUSTFANG.plate[3]);
  }
  // the trophy rack: other crews' nameplates on a pole, and the Rustfang rag on a whip aerial above them
  k.beam([-0.8, 0.55, -2.9], [-0.95, 3.4, -3.2], 0.07, RUSTFANG.steel);
  const plates = [ACC.bleachWhite, ACC.poolBlue, '#ddd2b4'];
  plates.forEach((c, i) => k.box(0.62, 0.17, 0.04, [-0.86 - i * 0.01, 1.3 + i * 0.32, -3.0 - i * 0.03], c, [0, 0.4, (i - 1) * 0.12]));
  k.add(new THREE.PlaneGeometry(0.9, 0.5), ACC.buoyRed, [-1.35, 3.12, -3.3], [0, -0.3, -0.12]);
  const geo = merge(k.geos);
  const root = new THREE.Group();
  const mesh = new THREE.Mesh(geo, vcMat({ accent: true, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  root.add(mesh);
  root.userData.jury = 'jawboat';
  return root;
}

/** Where a Jawboat's crew stand: bow lookout with the glaive, helmsman aft at the outboard. */
export const JAWBOAT_CREW: { x: number; y: number; z: number; ry: number }[] = [
  { x: -0.25, y: 0.58, z: 1.75, ry: 0.15 },
  { x: 0.1, y: 0.58, z: -2.75, ry: 0.4 },
];

// ───────────────────────────── Driftholm: the Signal Stack ─────────────────────────────

/**
 * Driftholm's landmark, ~22 m: a pontoon of drums, two containers stacked crosswise, a plastic water tank, a lattice
 * of scaffold pole, and a satellite dish turned up into a crow's nest with a traffic light for a harbour lamp
 * (its green lens long since swapped for bottle glass: green means alive in this world). Leans 3°, held up by four
 * guy lines strung with laundry bunting. Built in its own frame, base at y = 0, facing -Z (the sea).
 */
export function signalStack(k: Kit) {
  const start = k.mark();
  const startGlow = k.glows.length;
  // pontoon: drums under a plank deck
  for (let i = 0; i < 4; i++) k.cyl(0.42, 0.42, 6.4, [-2.4 + i * 1.6, 0.3, 0], SALVAGE.drum[i % SALVAGE.drum.length], [Math.PI / 2, 0, 0], 10);
  for (let i = 0; i < 9; i++) k.box(0.68, 0.12, 6.8, [-2.9 + i * 0.72, 0.78, 0], SALVAGE.wood[i % 5]);
  // container 1, ribbed, doors to the sea; container 2 across it, overhanging
  k.box(6.0, 2.5, 2.4, [0, 2.1, 0], '#3e8486');
  for (let i = 0; i < 9; i++) k.box(0.08, 2.4, 2.46, [-2.8 + i * 0.7, 2.1, 0], '#36777a');
  k.box(0.08, 2.3, 1.1, [3.02, 2.05, -0.58], '#2f5b6c');
  k.box(2.4, 2.5, 6.0, [0.4, 4.6, 0.6], '#2f5b6c');
  for (let i = 0; i < 9; i++) k.box(2.46, 2.4, 0.08, [0.4, 4.6, -2.2 + i * 0.7], '#294f5e');
  k.box(1.2, 0.9, 0.06, [0.4, 4.9, -2.44], SALVAGE.rust[1]); // a patch over a rust hole
  // the lean starts above the containers: 3° toward the sea, held by rope
  const lean = new THREE.Matrix4().makeRotationX(-0.052).premultiply(new THREE.Matrix4().makeTranslation(0, 5.85, 0)).multiply(new THREE.Matrix4().makeTranslation(0, -5.85, 0));
  k.frame = lean;
  // a white plastic water tank with a ladder
  k.cyl(1.35, 1.35, 2.6, [0.3, 7.2, 0.4], ACC.bleachWhite, [0, 0, 0], 14);
  k.cyl(1.4, 1.4, 0.14, [0.3, 7.4, 0.4], '#c8c0ad', [0, 0, 0], 14);
  k.cyl(0.3, 0.3, 0.2, [0.3, 8.6, 0.4], ACC.poolBlue, [0, 0, 0], 8);
  // scaffold lattice, 8.5 m, tapering
  const y0 = 8.5, y1 = 17.0, b0 = 1.25, b1 = 0.75;
  const corner = (sx: number, sz: number, y: number): V3 => {
    const t = (y - y0) / (y1 - y0);
    const b = b0 + (b1 - b0) * t;
    return [0.3 + sx * b, y, 0.4 + sz * b];
  };
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) k.beam(corner(sx, sz, y0), corner(sx, sz, y1), 0.24, '#4f5a5e', 6);
  for (let i = 0; i < 5; i++) {
    const ya = y0 + i * 1.7, yb = ya + 1.7;
    const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
    for (let j = 0; j < 4; j++) {
      const [ax, az] = cs[j], [bx, bz] = cs[(j + 1) % 4];
      k.beam(corner(ax, az, ya), corner(bx, bz, yb), 0.13, i % 2 ? SALVAGE.rust[2] : '#55605f', 5);
      k.beam(corner(ax, az, ya), corner(bx, bz, ya), 0.14, '#4f5a5e', 5);
    }
  }
  // ladder up the landward face
  for (const sx of [-0.25, 0.25]) k.beam([0.3 + sx, y0, 0.4 + b0 + 0.08], [0.3 + sx, y1, 0.4 + b1 + 0.08], 0.06, SALVAGE.wood[3]);
  for (let y = y0 + 0.4; y < y1; y += 0.55) {
    const t = (y - y0) / (y1 - y0);
    k.box(0.5, 0.05, 0.05, [0.3, y, 0.4 + b0 + (b1 - b0) * t + 0.08], SALVAGE.wood[0]);
  }
  // the crow's nest: a satellite dish turned face-up, a rail of pipe, the LNB arm still on it as a flagpole
  k.add(new THREE.SphereGeometry(2.3, 20, 5, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), ACC.bleachWhite, [0.3, y1 + 2.4, 0.4], [0, 0, 0], 0.03);
  k.cyl(1.25, 1.25, 0.08, [0.3, y1 + 0.4, 0.4], '#c8c0ad', [0, 0, 0], 18);
  k.beam([0.3, y1 + 0.5, 0.4 - 1.2], [0.3, y1 + 3.6, 0.4 - 0.4], 0.08, '#9aa3ad', 6);
  // the traffic light, re-glazed: red on top, warm amber, bottle-glass white (never green)
  const tx = 0.3, ty = y1 + 2.9, tz = 0.4 + 0.2;
  k.box(0.5, 1.45, 0.42, [tx, ty, tz], '#2b2f36');
  for (let i = 0; i < 3; i++) {
    k.box(0.44, 0.06, 0.22, [tx, ty + 0.55 - i * 0.47, tz - 0.3], '#2b2f36', [0.35, 0, 0]);
    k.glow(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), ['#e2553e', SALVAGE.lamp, '#f2dcb0'][i], [tx, ty + 0.45 - i * 0.47, tz - 0.23], [Math.PI / 2, 0, 0]);
  }
  // an airport windsock, striped orange and white, on the LNB arm
  for (let i = 0; i < 4; i++) k.cyl(0.32 - i * 0.05, 0.27 - i * 0.05, 0.42, [0.3, y1 + 3.55, 0.4 - 0.65 - i * 0.4], i % 2 ? ACC.bleachWhite : ACC.coneOrange, [Math.PI / 2 + 0.15, 0, 0], 10);
  k.frame = new THREE.Matrix4();
  // guy lines to drum anchors, two strung with laundry-bunting pennants
  const top = new THREE.Vector3(0, 0, 0);
  const anchors: V3[] = [[-7.5, 0.4, -5.5], [7.5, 0.4, -5.5], [7.0, 0.4, 6.0], [-7.0, 0.4, 6.0]];
  const tops: V3[] = [[-0.5, 15.6, -0.4], [1.1, 15.6, -0.4], [1.1, 15.6, 1.2], [-0.5, 15.6, 1.2]];
  const cols = [ACC.poolBlue, ACC.laundryPink, ACC.bleachWhite, ACC.coneOrange, '#ddd2b4'];
  anchors.forEach((a, i) => {
    const tp = new THREE.Vector3(...tops[i]).applyMatrix4(lean);
    const t: V3 = [tp.x, tp.y, tp.z];
    top.add(tp);
    k.beam(a, t, 0.05, SALVAGE.rope, 4);
    k.cyl(0.4, 0.4, 0.9, [a[0], 0.45, a[2]], SALVAGE.drum[(i + 2) % 5], [0, 0, 0], 10);
    if (i < 2) {
      const along = Math.atan2(t[0] - a[0], t[2] - a[2]) + Math.PI / 2;
      for (let j = 1; j < 12; j++) {
        const u = j / 12;
        k.pennant([a[0] + (t[0] - a[0]) * u, a[1] + (t[1] - a[1]) * u - 0.05, a[2] + (t[2] - a[2]) * u], along, cols[(j + i) % cols.length], 0.55);
      }
    }
  });
  return { start, startGlow, height: y1 + 3.65 };
}

// ───────────────────────────── Driftholm: the pier ─────────────────────────────

/** A clawfoot bath hung from a pipe davit as the pier's lifeboat (oars inside, the taps still on). Local frame. */
export function bathtubLifeboat(k: Kit, side: 1 | -1) {
  const start = k.mark();
  const x0 = side * 0.2;
  // the davit: a scaffold pole up, an arm out over the water, rope falls
  k.beam([x0, 0, 0], [x0, 3.4, 0], 0.14, '#7e8b8d', 6);
  k.beam([x0, 3.3, 0], [x0 + side * 2.1, 3.5, 0], 0.12, '#7e8b8d', 6);
  k.beam([x0, 2.3, 0], [x0 + side * 1.2, 3.35, 0], 0.08, SALVAGE.rust[0], 5);
  const bx = x0 + side * 2.05, by = 1.35;
  for (const dz of [-0.6, 0.6]) k.beam([bx, 3.5, dz * 0.2], [bx, by + 0.45, dz], 0.03, SALVAGE.rope, 4);
  // the bath: white enamel outside, a darker basin, roll top, four brass claw feet and a pair of taps
  k.add(new THREE.CylinderGeometry(0.42, 0.34, 1.7, 14, 1, false).scale(1, 1, 0.78), ACC.bleachWhite, [bx, by, 0], [Math.PI / 2, 0, 0], 0.03);
  k.add(new THREE.CylinderGeometry(0.36, 0.36, 1.55, 14).scale(1, 1, 0.68), '#8f9a96', [bx, by + 0.1, 0], [Math.PI / 2, 0, 0], 0.03);
  k.torus(0.4, 0.05, [bx, by + 0.12, 0.84], ACC.bleachWhite, [0, 0, 0], Math.PI, 10);
  for (const dx of [-0.25, 0.25]) for (const dz of [-0.6, 0.6]) k.cyl(0.06, 0.03, 0.22, [bx + dx, by - 0.36, dz], '#a88a4f', [0, 0, dx * 0.8], 6);
  for (const dx of [-0.12, 0.12]) k.cyl(0.035, 0.035, 0.22, [bx + dx, by + 0.42, 0.82], '#b9c0c4', [0, 0, 0], 6);
  // oars across it
  k.beam([bx - 0.5, by + 0.35, -0.6], [bx + 0.45, by + 0.4, 0.9], 0.06, SALVAGE.wood[2]);
  return start;
}

/** Supermarket trolleys turned lobster pots: three on the pier edge, one already let down on its rope. Local frame. */
export function trolleyPots(k: Kit) {
  const start = k.mark();
  const trolley = (x: number, y: number, z: number, ry: number, tilt = 0) => {
    const m0 = k.mark();
    const w = 0.56, l = 0.9, h0 = 0.38, h1 = 0.95;
    const c = '#a7afb5';
    for (const sx of [-1, 1]) {
      k.beam([sx * w / 2, h0, -l / 2], [sx * w / 2, h1, -l / 2 - 0.08], 0.03, c);
      k.beam([sx * w / 2, h0, l / 2], [sx * w / 2, h1, l / 2 + 0.04], 0.03, c);
      k.beam([sx * w / 2, h1, -l / 2 - 0.08], [sx * w / 2, h1, l / 2 + 0.04], 0.03, c);
      k.beam([sx * w / 2, h0, -l / 2], [sx * w / 2, h0, l / 2], 0.03, c);
      for (let i = 1; i < 5; i++) k.beam([sx * w / 2, h0, -l / 2 + (i * l) / 5], [sx * w / 2, h1, -l / 2 + (i * l) / 5], 0.015, c);
    }
    for (const zz of [-l / 2 - 0.08, l / 2 + 0.04]) k.beam([-w / 2, h1, zz], [w / 2, h1, zz], 0.03, c);
    k.box(w, 0.02, l, [0, h0, 0], '#8e979c');
    // the red plastic handle is how anyone knows what it was
    k.cyl(0.035, 0.035, w + 0.1, [0, h1 + 0.12, l / 2 + 0.12], ACC.buoyRed, [0, 0, Math.PI / 2], 8);
    k.beam([-w / 2, h1, l / 2 + 0.04], [-w / 2, h1 + 0.12, l / 2 + 0.12], 0.03, c);
    k.beam([w / 2, h1, l / 2 + 0.04], [w / 2, h1 + 0.12, l / 2 + 0.12], 0.03, c);
    for (const sx of [-1, 1]) for (const zz of [-l / 2, l / 2]) {
      k.beam([sx * w / 2, h0, zz], [sx * w / 2, 0.12, zz], 0.03, c);
      k.cyl(0.07, 0.07, 0.05, [sx * w / 2, 0.07, zz], '#2b2f36', [0, 0, Math.PI / 2], 8);
    }
    // a bait bundle inside
    k.box(0.3, 0.2, 0.3, [0, h0 + 0.12, 0], '#6e5a3c');
    _m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(0, ry, tilt)), new THREE.Vector3(1, 1, 1));
    for (const g of k.geos.slice(m0)) g.applyMatrix4(_m);
  };
  trolley(0, 0, 0, 0.1);
  trolley(0.05, 1.0, 0.1, -0.15);
  trolley(0.0, 0, 1.2, 0.35);
  // the one let down: half under water off the edge, rope to a cleat, a cut-down jerrycan for a marker float
  trolley(-1.6, -1.55, 0.6, 1.2, 0.5);
  k.beam([-0.4, 0.05, 0.6], [-1.4, -0.4, 0.6], 0.03, SALVAGE.rope, 4);
  k.box(0.32, 0.38, 0.18, [-2.4, -1.15, 1.6], ACC.coneOrange, [0.3, 0.4, 0.2]);
  return start;
}

// ───────────────────────────── Rustfang: the toll ─────────────────────────────

/**
 * The Rustfang Toll, on the water outside Driftholm: a car-park barrier arm across the approach (striped white and
 * red, so everyone knows what it means), saw teeth welded along it, a toll booth on a drum raft with a STOP sign,
 * and a red rag. Local frame, waterline y = 0.
 */
export function tollGate(k: Kit) {
  const start = k.mark();
  const startGlow = k.glows.length;
  // two drum rafts, each with a post
  for (const sx of [-1, 1]) {
    const x = sx * 6;
    for (let i = 0; i < 3; i++) k.cyl(0.42, 0.42, 3.2, [x - 0.9 + i * 0.9, 0.05, 0], i === 1 ? ACC.buoyRed : RUSTFANG.plate[(i + 3) % 5], [Math.PI / 2, 0, 0], 10);
    k.box(3.0, 0.14, 3.3, [x, 0.52, 0], RUSTFANG.plate[0]);
    k.cyl(0.18, 0.2, 2.2, [x, 1.6, 0], RUSTFANG.navy, [0, 0, 0], 8);
  }
  // the boom: a car-park barrier, white/red bands, pivoting on the east post, saw teeth along the top
  const by = 2.4;
  for (let i = 0; i < 8; i++) k.box(1.5, 0.22, 0.18, [-5.25 + i * 1.5, by, 0], i % 2 ? ACC.buoyRed : ACC.bleachWhite);
  k.box(0.7, 0.55, 0.45, [6.3, by, 0], RUSTFANG.navy); // the counterweight box
  for (let i = 0; i < 14; i++) k.cyl(0.0, 0.08, 0.32, [-5.6 + i * 0.8, by + 0.24, 0], RUSTFANG.steel, [0, 0, 0.35], 4);
  // the toll booth: a plate kiosk on the west raft, a lit hatch, a STOP sign on top (octagon, white rim)
  const bx = -6;
  k.box(1.5, 2.0, 1.5, [bx, 1.6, 0.4], RUSTFANG.plate[1]);
  k.box(1.8, 0.14, 1.8, [bx, 2.66, 0.4], RUSTFANG.plate[2], [0.06, 0, 0]);
  k.glow(new THREE.BoxGeometry(0.7, 0.5, 0.05), SALVAGE.lamp, [bx, 1.9, -0.37]);
  k.beam([bx, 2.7, 0.4], [bx, 4.1, 0.4], 0.08, RUSTFANG.steel);
  k.cyl(0.62, 0.62, 0.04, [bx, 4.55, 0.4], ACC.bleachWhite, [Math.PI / 2, 0, Math.PI / 8], 8);
  k.cyl(0.54, 0.54, 0.05, [bx, 4.55, 0.38], ACC.buoyRed, [Math.PI / 2, 0, Math.PI / 8], 8);
  // the rag
  k.beam([6, 2.7, 0], [6.2, 5.2, 0.1], 0.06, RUSTFANG.steel);
  k.add(new THREE.PlaneGeometry(1.1, 0.6), ACC.buoyRed, [6.75, 4.85, 0.1], [0, 0, -0.1]);
  return { start, startGlow };
}

/** The toll's water and its patrol (raiders.ts): only with ?look=jury. */
export const TOLL = { id: 'rz_toll', name: 'The Rustfang Toll', x: 64, z: 108, r: 40, count: 2, speed: 5.6, ry: 0.5 } as const;

/** Merge a kit into one weathered mesh (+ glow mesh). Used for standalone pieces in tools and tests. */
export function kitMeshes(k: Kit) {
  const out: THREE.Mesh[] = [];
  if (k.geos.length) out.push(new THREE.Mesh(merge(k.geos), vcMat({ accent: true, side: THREE.DoubleSide })));
  if (k.glows.length) out.push(new THREE.Mesh(merge(k.glows), glowMat()));
  return out;
}

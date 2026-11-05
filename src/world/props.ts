// Procedural weathered props (drowned-world palette; the shared toon material adds grime and rust). Each returns a
// vertex-coloured geometry to be merged. These are now only the FALLBACK for the GITCRAFT coast and landmark kits
// (creative/3d-coast, public/models/tb_coast_kit.glb + tb_landmark_kit.glb): drawn only if a kit fails to load.
import * as THREE from 'three';
import { paint, paintGradient, xf, merge } from './materials';
import { RNG, valueNoise } from '../core/noise';

const C = {
  trunkA: '#5e4b3b',
  trunkB: '#463829',
  leafA: '#6b6a3a',
  leafB: '#3e3f24',
  coconut: '#5a3a1e',
  rock: '#5f5852',
  rockDark: '#3f3a36',
  moss: '#4a5530',
};

function frond(rng: RNG, x: number, y: number, z: number, ang: number, len: number, light: string, dark: string) {
  const N = 9;
  const pos: number[] = [];
  const col: number[] = [];
  const sway: number[] = [];
  const cl = new THREE.Color(light);
  const cd = new THREE.Color(dark);
  const tmp = new THREE.Color();
  const dirX = Math.cos(ang);
  const dirZ = Math.sin(ang);
  const sideX = -dirZ;
  const sideZ = dirX;
  const lift = rng.range(0.4, 0.9);
  const spine: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const d = t * len;
    const h = lift * Math.sin(t * Math.PI * 0.55) * 1.4 - t * t * len * 0.55;
    spine.push(new THREE.Vector3(x + dirX * d, y + h, z + dirZ * d));
  }
  for (let i = 0; i < N; i++) {
    const t0 = i / N;
    const t1 = (i + 1) / N;
    const w0 = Math.sin(Math.min(1, t0 * 1.3) * Math.PI) * 0.75 + 0.05;
    const w1 = Math.sin(Math.min(1, t1 * 1.3) * Math.PI) * 0.75 + 0.05;
    const a = spine[i];
    const b = spine[i + 1];
    for (const s of [-1, 1]) {
      const ea = new THREE.Vector3(a.x + sideX * w0 * s, a.y - w0 * 0.35, a.z + sideZ * w0 * s);
      const eb = new THREE.Vector3(b.x + sideX * w1 * s, b.y - w1 * 0.35, b.z + sideZ * w1 * s);
      const tri = s > 0 ? [a, ea, eb, a, eb, b] : [a, eb, ea, a, b, eb];
      for (const v of tri) {
        pos.push(v.x, v.y, v.z);
        const isEdge = v === ea || v === eb;
        tmp.copy(cl).lerp(cd, isEdge ? 0.65 : 0.1 + t0 * 0.3);
        col.push(tmp.r, tmp.g, tmp.b);
        sway.push(0.3 + (v === a || v === ea ? t0 : t1) * 1.2);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
  g.computeVertexNormals();
  return g;
}

export function rock(rng: RNG, r = 1.5, squash = 0.7, color = C.rock, mossy = false): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, 1);
  const p = g.attributes.position;
  const seed = rng.int(0, 1000);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = valueNoise(v.x * 0.9 + seed, v.y * 0.9 + v.z * 0.7, seed);
    v.multiplyScalar(0.75 + n * 0.5);
    v.y *= squash;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const ng = g.index ? g.toNonIndexed() : g;
  ng.computeVertexNormals();
  // vertex colors: moss on top-facing faces
  const n = ng.attributes.position.count;
  const cols = new Float32Array(n * 3);
  const base = new THREE.Color(color);
  const dark = new THREE.Color(C.rockDark);
  const moss = new THREE.Color(C.moss);
  const nrm = ng.attributes.normal;
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i += 3) {
    const ny = (nrm.getY(i) + nrm.getY(i + 1) + nrm.getY(i + 2)) / 3;
    tmp.copy(base).lerp(dark, rng.range(0, 0.35));
    if (mossy && ny > 0.55) tmp.copy(moss).multiplyScalar(rng.range(0.85, 1.1));
    for (let k = 0; k < 3; k++) {
      cols[(i + k) * 3] = tmp.r;
      cols[(i + k) * 3 + 1] = tmp.g;
      cols[(i + k) * 3 + 2] = tmp.b;
    }
  }
  ng.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  ng.setAttribute('sway', new THREE.BufferAttribute(new Float32Array(n), 1));
  ng.deleteAttribute('uv');
  return ng;
}

export function grassTuft(rng: RNG, color = '#7a7246'): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const h = rng.range(0.5, 1.1);
    const cone = new THREE.ConeGeometry(0.07, h, 3);
    xf(cone, rng.range(-0.25, 0.25), h / 2, rng.range(-0.25, 0.25), rng.range(-0.4, 0.4), 0, rng.range(-0.4, 0.4));
    parts.push(paintGradient(cone, new THREE.Color(color).multiplyScalar(0.7), color, 0.6));
  }
  return merge(parts);
}

// ───────── Landmarks ─────────

export function skullRock(rng: RNG): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const head = new THREE.SphereGeometry(3.2, 16, 12);
  const p = head.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < -1) p.setY(i, -1 + (y + 1) * 0.4);
    const z = p.getZ(i);
    if (z > 0 && y < 0.2) p.setZ(i, z * 0.85); // jaw
  }
  head.computeVertexNormals();
  parts.push(paint(xf(head, 0, 2.6, 0), '#d8cfbe', 0.06));
  // eye sockets + nose (dark insets)
  parts.push(paint(xf(new THREE.SphereGeometry(0.85, 10, 8), -1.15, 3.2, 2.55, 0, 0, 0, [1, 1.1, 0.6]), '#2b2420'));
  parts.push(paint(xf(new THREE.SphereGeometry(0.85, 10, 8), 1.15, 3.2, 2.55, 0, 0, 0, [1, 1.1, 0.6]), '#2b2420'));
  parts.push(paint(xf(new THREE.ConeGeometry(0.38, 0.8, 3), 0, 2.25, 2.85, Math.PI, 0, 0), '#2b2420'));
  // teeth
  for (let i = -2; i <= 2; i++) parts.push(paint(xf(new THREE.BoxGeometry(0.42, 0.55, 0.3), i * 0.48, 1.45, 2.55), '#efe7d6'));
  parts.push(rock(rng, 1.8, 0.6, '#a69c8e'));
  xf(parts[parts.length - 1], 2.6, 0.4, -1);
  return merge(parts);
}

export function lighthouse(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bands = 6;
  const H = 16;
  for (let i = 0; i < bands; i++) {
    const r0 = 2.6 - (i / bands) * 1.0;
    const r1 = 2.6 - ((i + 1) / bands) * 1.0;
    const cyl = new THREE.CylinderGeometry(r1, r0, H / bands, 16, 1);
    parts.push(paint(xf(cyl, 0, (i + 0.5) * (H / bands), 0), i % 2 ? '#7e3324' : '#a8a08c'));
  }
  parts.push(paint(xf(new THREE.CylinderGeometry(2.2, 2.2, 0.4, 16), 0, H + 0.2, 0), '#3b3b3b'));
  parts.push(paint(xf(new THREE.CylinderGeometry(1.3, 1.3, 2.2, 10), 0, H + 1.5, 0), '#d8c890'));
  parts.push(paint(xf(new THREE.ConeGeometry(1.8, 1.8, 10), 0, H + 3.5, 0), '#c0392b'));
  parts.push(paint(xf(new THREE.SphereGeometry(0.3, 8, 6), 0, H + 4.5, 0), '#f4c542'));
  // door + window
  parts.push(paint(xf(new THREE.BoxGeometry(1.1, 1.9, 0.4), 0, 1, 2.45), '#5a3a1e'));
  parts.push(paint(xf(new THREE.BoxGeometry(0.6, 0.8, 0.3), 0, 8, 1.95), '#2a4058'));
  return merge(parts);
}

export function hut(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(xf(new THREE.BoxGeometry(4.2, 2.6, 3.6), 0, 1.3, 0), '#7d6c56', 0.05));
  parts.push(paint(xf(new THREE.ConeGeometry(3.6, 2.4, 4), 0, 3.8, 0, 0, Math.PI / 4, 0, [1.15, 1, 1]), '#6a5a3a', 0.08));
  parts.push(paint(xf(new THREE.BoxGeometry(1, 1.8, 0.2), 0, 0.9, 1.82), '#5a3a1e'));
  for (const sx of [-1, 1]) parts.push(paint(xf(new THREE.BoxGeometry(0.15, 2.8, 0.15), sx * 2.1, 1.4, 1.8), '#6e4527'));
  return merge(parts);
}

export function arch(rng: RNG): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const stone = '#6c6e62';
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) parts.push(paint(xf(new THREE.BoxGeometry(1.8, 1.4, 1.8), sx * 3.2 + rng.range(-0.1, 0.1), 0.7 + i * 1.4, 0, 0, rng.range(-0.08, 0.08), 0), i % 2 ? stone : '#5c6054', 0.08));
  }
  const top = new THREE.TorusGeometry(3.2, 0.95, 6, 10, Math.PI);
  parts.push(paint(xf(top, 0, 5.6, 0), stone, 0.08));
  // carved sun disk at the keystone
  parts.push(paint(xf(new THREE.CylinderGeometry(1.0, 1.0, 0.4, 12), 0, 8.4, 0.5, Math.PI / 2, 0, 0), '#d8a63a'));
  // moss + vines
  for (let i = 0; i < 6; i++) parts.push(paint(xf(new THREE.IcosahedronGeometry(0.6, 0), rng.range(-4, 4), rng.range(5, 8.5), rng.range(-0.8, 0.8)), '#4a5230', 0.15, 0.2));
  return merge(parts);
}

export function pillars(rng: RNG): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const h = rng.range(2, 6.5);
    parts.push(paint(xf(new THREE.CylinderGeometry(0.8, 0.9, h, 8), Math.cos(a) * 4.5, h / 2, Math.sin(a) * 4.5, rng.range(-0.08, 0.08), 0, rng.range(-0.08, 0.08)), '#76786a', 0.1));
    parts.push(paint(xf(new THREE.BoxGeometry(2, 0.5, 2), Math.cos(a) * 4.5, h + 0.25, Math.sin(a) * 4.5), '#686a5e', 0.1));
  }
  parts.push(paint(xf(new THREE.CylinderGeometry(2.2, 2.4, 0.6, 12), 0, 0.3, 0), '#686a5e'));
  return merge(parts);
}

export function brokenWreck(rng: RNG): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const wood = '#6e4b2a';
  const dark = '#4a3019';
  // ribs of the hull
  for (let i = 0; i < 9; i++) {
    const z = -9 + i * 2.2;
    const w = 4.2 - Math.abs(z) * 0.18;
    const rib = new THREE.TorusGeometry(w, 0.28, 5, 10, Math.PI * rng.range(0.55, 1));
    parts.push(paint(xf(rib, 0, 3.2, z, 0, 0, Math.PI + rng.range(-0.15, 0.25)), i % 2 ? wood : dark, 0.08));
  }
  // keel + remaining planks on one side
  parts.push(paint(xf(new THREE.BoxGeometry(0.6, 0.7, 21), 0, -0.6, 0), dark));
  for (let k = 0; k < 6; k++) {
    const y = -0.4 + k * 0.75;
    const len = rng.range(10, 18);
    parts.push(paint(xf(new THREE.BoxGeometry(0.25, 0.65, len), -3.7 + k * 0.08 + Math.sin(k) * 0.2, y + 0.4, rng.range(-3, 3), 0, 0, -0.35 + k * 0.08), k % 2 ? wood : '#7d5a36', 0.08));
  }
  // fallen mast with tattered sail
  parts.push(paint(xf(new THREE.CylinderGeometry(0.35, 0.45, 15, 8), 5, 0.8, 2, Math.PI / 2 - 0.15, 0.5, 0.1), '#7a5534'));
  const sail = new THREE.PlaneGeometry(6, 4, 4, 3);
  const sp = sail.attributes.position;
  for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.sin(sp.getX(i) * 0.8) * 0.5);
  parts.push(paint(xf(sail, 7, 0.6, 5, -Math.PI / 2 + 0.2, 0.3, 0), '#9c907a'));
  // captain's cabin stern
  parts.push(paint(xf(new THREE.BoxGeometry(6, 3.2, 4), 0.4, 2.0, 9, 0.05, 0, -0.12), '#7d5a36', 0.06));
  parts.push(paint(xf(new THREE.BoxGeometry(1.2, 1.0, 0.2), -1.4, 2.6, 11.05), '#2a4058'));
  parts.push(paint(xf(new THREE.BoxGeometry(1.2, 1.0, 0.2), 1.6, 2.4, 11.05), '#2a4058'));
  const out = merge(parts);
  return xf(out, 0, 0, 0, 0, 0, 0.18);
}

/** A sea-cave mouth: a hood of rock around a black opening, facing +z (design bible PR 1.5). */
export function caveMouth(rng: RNG): THREE.BufferGeometry {
  // the rocks frame the opening without covering it: flanks clear of its edge, the lintel above it, the mass behind it
  const parts: THREE.BufferGeometry[] = [
    xf(rock(rng, 4.4, 1.0, '#4a4b44'), 0, 2.2, -5.4), // the mass of the rock behind
    xf(rock(rng, 2.3, 1.35, '#55574e'), -3.9, 1.5, -0.9),
    xf(rock(rng, 2.2, 1.3, '#55574e'), 3.9, 1.4, -1.0),
    xf(rock(rng, 3.2, 0.5, '#5c5e55'), 0, 4.1, -1.2), // the lintel
    xf(rock(rng, 1.0, 0.6, '#4a4b44'), -2.9, 0.2, 1.0),
    xf(rock(rng, 0.9, 0.6, '#4a4b44'), 3.0, 0.2, 0.9),
  ];
  // the dark: a black half-disc framed by the rocks, with a half-dome of shadow behind it so the mouth has depth
  parts.push(paint(xf(new THREE.CircleGeometry(2.6, 20, 0, Math.PI), 0, 0, 0.1), '#060708'));
  // (the +z half of a dome, mirrored to -z: mirroring flips its winding, so its inside faces the opening)
  parts.push(paint(xf(new THREE.SphereGeometry(2.55, 14, 8, 0, Math.PI, 0, Math.PI / 2), 0, 0, -0.1, 0, 0, 0, [1, 1, -1.4]), '#0b0c0d'));
  return merge(parts);
}

export function waterfallRocks(rng: RNG): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const r = rock(rng, rng.range(2.5, 4), 1.3, '#555a4e', true);
    parts.push(xf(r, rng.range(-5, 5), rng.range(1, 7), rng.range(-3, -1)));
  }
  // pool
  parts.push(paint(xf(new THREE.CylinderGeometry(4, 4.2, 0.3, 16), 0, 0.15, 3), '#2c4a46'));
  return merge(parts);
}

export function barrel(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const b = new THREE.CylinderGeometry(0.55, 0.55, 1.3, 10);
  const p = b.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const k = 1 + 0.18 * (1 - Math.pow(y / 0.65, 2));
    p.setX(i, p.getX(i) * k);
    p.setZ(i, p.getZ(i) * k);
  }
  b.computeVertexNormals();
  parts.push(paint(xf(b, 0, 0.65, 0), '#9a6a3c', 0.06));
  for (const y of [0.25, 1.05]) parts.push(paint(xf(new THREE.TorusGeometry(0.66, 0.05, 4, 12), 0, y, 0, Math.PI / 2, 0, 0), '#4a4a4a'));
  return merge(parts);
}

export function crate(s = 1): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(xf(new THREE.BoxGeometry(1.2 * s, 1.2 * s, 1.2 * s), 0, 0.6 * s, 0), '#b48a5a', 0.05));
  for (const z of [-1, 1]) {
    parts.push(paint(xf(new THREE.BoxGeometry(1.25 * s, 0.16 * s, 0.05), 0, 0.6 * s, z * 0.61 * s, 0, 0, 0.78), '#7a5534'));
  }
  return merge(parts);
}

export function person(rng: RNG, shirt: string, hat: string | null): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const skin = rng.pick(['#f1c7a1', '#d7a27a', '#a8714c', '#7a4e33', '#e8b896']);
  parts.push(paint(xf(new THREE.CylinderGeometry(0.16, 0.18, 0.8, 6), -0.17, 0.4, 0), '#3d3a4a'));
  parts.push(paint(xf(new THREE.CylinderGeometry(0.16, 0.18, 0.8, 6), 0.17, 0.4, 0), '#3d3a4a'));
  parts.push(paint(xf(new THREE.CapsuleGeometry(0.42, 0.6, 3, 8), 0, 1.25, 0, 0, 0, 0, [1, 1, 0.8]), shirt));
  parts.push(paint(xf(new THREE.SphereGeometry(0.42, 10, 8), 0, 2.15, 0), skin));
  parts.push(paint(xf(new THREE.SphereGeometry(0.07, 6, 4), -0.14, 2.2, 0.38), '#1a1a1a'));
  parts.push(paint(xf(new THREE.SphereGeometry(0.07, 6, 4), 0.14, 2.2, 0.38), '#1a1a1a'));
  if (hat) {
    parts.push(paint(xf(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 12), 0, 2.45, 0), hat));
    parts.push(paint(xf(new THREE.CylinderGeometry(0.3, 0.36, 0.35, 10), 0, 2.62, 0), hat));
  }
  return merge(parts);
}

// ───────── Dead vegetation (Waterworld pass): nothing on the islands is green unless someone protects it ─────────

/** A sun-bleached palm trunk, snapped near the top, two dead fronds hanging off it. */
export function deadPalm(rng: RNG, height = 7, lean = 0.3): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const segs = 6;
  const dir = rng.range(0, Math.PI * 2);
  const lx = Math.cos(dir) * lean, lz = Math.sin(dir) * lean;
  const snap = rng.range(0.62, 0.95);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = (i / segs) * snap;
    pts.push(new THREE.Vector3(lx * height * t * t, height * t, lz * height * t * t));
  }
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[i + 1];
    const r0 = 0.4 - (i / segs) * 0.17;
    const cyl = new THREE.CylinderGeometry(r0 * 0.9, r0, a.distanceTo(b) * 1.04, 7, 1);
    cyl.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
    const mid = a.clone().add(b).multiplyScalar(0.5);
    cyl.translate(mid.x, mid.y, mid.z);
    parts.push(paint(cyl, i % 2 ? '#a39a88' : '#8c8373', 0.08));
  }
  const top = pts[segs];
  // a jagged snapped crown
  parts.push(paint(xf(new THREE.ConeGeometry(0.26, 0.7, 5), top.x, top.y + 0.3, top.z, rng.range(-0.3, 0.3), 0, rng.range(-0.3, 0.3)), '#7a6f5e'));
  if (snap > 0.75) {
    for (let i = 0; i < 2; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const f = frond(rng, top.x, top.y - 0.1, top.z, ang, rng.range(2, 3), '#6b5a40', '#4a3d2c');
      // hang them straight down: dead fronds droop against the trunk
      f.translate(-top.x, -top.y, -top.z);
      f.applyMatrix4(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang)), -0.9));
      f.translate(top.x, top.y, top.z);
      parts.push(f);
    }
  }
  return merge(parts);
}

/** Dry, salt-killed scrub: grey-brown twigs, no leaves. */
export function deadScrub(rng: RNG, s = 1): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const n = rng.int(5, 8);
  for (let i = 0; i < n; i++) {
    const h = rng.range(0.5, 1.2) * s;
    const twig = new THREE.CylinderGeometry(0.015 * s, 0.04 * s, h, 3);
    xf(twig, rng.range(-0.3, 0.3) * s, h / 2, rng.range(-0.3, 0.3) * s, rng.range(-0.7, 0.7), 0, rng.range(-0.7, 0.7));
    parts.push(paint(twig, rng.pick(['#7c705c', '#6a604f', '#8d826c']), 0.1, 0.15));
  }
  parts.push(paint(xf(new THREE.IcosahedronGeometry(0.35 * s, 0), 0, 0.12 * s, 0, 0, 0, 0, [1.4, 0.4, 1.2]), '#5a5244', 0.1));
  return merge(parts);
}

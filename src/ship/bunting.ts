// Journey bunting: lines of hand-sewn pennants dressed from the masthead down to the stern quarters. One pennant goes up for
// every two discoveries the captain logs, so the boat wears the voyage: a bare line on a new skiff, a full run of
// rags and colours on a veteran's ship. Once she is refitted, a string of salvaged festoon bulbs hangs between them.
//
// Built as ONE raw BufferGeometry for the batched toon mesh and ONE for the glow mesh (no extra draw calls, and only
// two geometry allocations, so the seeded simulations' Math.random stream moves as little as possible).
import * as THREE from 'three';

/** SCRAP TIDE palette, faded: rag colours, never fresh paint. */
const RAGS = ['#a04d30', '#e5c65e', '#168d9c', '#d7b87b', '#2a5a6e', '#c98a4a'];
const ROPE = '#3a3127';
const BULB = '#ffcf7a';

export const MAX_PENNANTS = 18;
/** pennant slots on one line (the count is split between two lines) */
const SLOTS = MAX_PENNANTS / 2;
export function pennantCount(discoveries: number) {
  return Math.min(MAX_PENNANTS, 2 + Math.floor(Math.max(0, discoveries) / 2));
}

/** A point on the sagging line from a (t = 0) to b (t = 1). */
function along(a: THREE.Vector3, b: THREE.Vector3, t: number, sag: number, out: THREE.Vector3) {
  out.lerpVectors(a, b, t);
  out.y -= sag * 4 * t * (1 - t);
  return out;
}

export function buntingGeometry(top: THREE.Vector3, stern: THREE.Vector3, count: number, scale: number, bulbs: boolean) {
  const pos: number[] = [], col: number[] = [];
  const gpos: number[] = [], gcol: number[] = [];
  const c = new THREE.Color();
  const tri = (arrP: number[], arrC: number[], color: string, ...v: THREE.Vector3[]) => {
    c.set(color);
    for (const p of v) {
      arrP.push(p.x, p.y, p.z);
      arrC.push(c.r, c.g, c.b);
    }
  };
  const quad2 = (color: string, a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3, e: THREE.Vector3) => {
    // both windings: the line is seen from either side
    tri(pos, col, color, a, b, d); tri(pos, col, color, a, d, e);
    tri(pos, col, color, a, d, b); tri(pos, col, color, a, e, d);
  };
  const len = top.distanceTo(stern);
  const sag = len * 0.06;
  const segs = 14;
  const w = 0.025 * scale;
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3();
  // the line: a crossed ribbon (reads as a rope from any angle)
  for (let i = 0; i < segs; i++) {
    along(top, stern, i / segs, sag, p0);
    along(top, stern, (i + 1) / segs, sag, p1);
    quad2(ROPE, p0.clone().setY(p0.y + w), p1.clone().setY(p1.y + w), p1.clone().setY(p1.y - w), p0.clone().setY(p0.y - w));
    quad2(ROPE, p0.clone().setX(p0.x + w), p1.clone().setX(p1.x + w), p1.clone().setX(p1.x - w), p0.clone().setX(p0.x - w));
  }
  // pennants: triangles hanging under the line, flat in the line's vertical plane, each a little different
  const ph = 0.46 * scale, pw = 0.17 * scale;
  for (let i = 0; i < count; i++) {
    const t = 0.1 + (0.82 * (i + 0.5)) / SLOTS;
    const k = Math.sin(i * 12.9898) * 43758.5453;
    const jit = k - Math.floor(k); // a fixed per-pennant wobble (no Math.random)
    const a = along(top, stern, t - (pw / len), sag, new THREE.Vector3());
    const b = along(top, stern, t + (pw / len), sag, new THREE.Vector3());
    const m = along(top, stern, t, sag, new THREE.Vector3());
    const tip = new THREE.Vector3(m.x + (jit - 0.5) * 0.06 * scale, m.y - ph * (0.85 + jit * 0.3), m.z + (jit - 0.5) * 0.1 * scale);
    const color = RAGS[i % RAGS.length];
    tri(pos, col, color, a, b, tip);
    tri(pos, col, color, a, tip, b);
    // and a second leaf across the line, so a pennant never vanishes edge-on (the chase camera looks along the lines)
    const across = new THREE.Vector3(stern.z - top.z, 0, -(stern.x - top.x)).normalize().multiplyScalar(pw * 0.8);
    const c0 = m.clone().add(across), c1 = m.clone().sub(across);
    tri(pos, col, color, c0, c1, tip);
    tri(pos, col, color, c0, tip, c1);
  }
  // festoon bulbs between pennants: tiny warm diamonds
  if (bulbs) {
    const r = 0.06 * scale;
    for (let i = 0; i <= count; i++) {
      const t = 0.1 + (0.82 * i) / SLOTS;
      const m = along(top, stern, t, sag, new THREE.Vector3());
      m.y -= r * 1.4;
      const up = m.clone().setY(m.y + r), dn = m.clone().setY(m.y - r);
      const ring = [new THREE.Vector3(r, 0, 0), new THREE.Vector3(0, 0, r), new THREE.Vector3(-r, 0, 0), new THREE.Vector3(0, 0, -r)].map((o) => o.add(m));
      for (let j = 0; j < 4; j++) {
        const q = ring[j], s = ring[(j + 1) % 4];
        tri(gpos, gcol, BULB, up, q, s);
        tri(gpos, gcol, BULB, dn, s, q);
      }
    }
  }
  const make = (p: number[], cc: number[]) => {
    if (!p.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3));
    g.computeVertexNormals();
    return g;
  };
  return { solid: make(pos, col), glow: make(gpos, gcol) };
}

// Salvage architecture: SCRAP TIDE's settlements, assembled from what the sea gave back.
//
// Every structure follows one construction logic (docs/brand/visual-cohesion.md), so a town reads as people building
// with what they had, not as a cluster of boxes:
//   1. a BASE that meets the water: piles driven into the shallows, a raft on oil drums, or a plinth on the hill;
//   2. a BODY clad in mismatched planks, tin sheets and the odd panel of painted metal (never one flat colour);
//   3. a ROOF that overhangs: a patched tin gable, a lean-to or a barrel vault;
//   4. one VERTICAL ACCENT for the silhouette: a stovepipe, a mast with a rag flag, an aerial or a lookout;
//   5. CANVAS and ROPE: awnings, stays and bunting that tie the pieces into a place.
// Pieces are chunky (nothing thinner than ~0.12 m) so they survive at phone size, and lean a degree or two.
// Output is plain vertex-coloured geometry for the existing batches (one draw call per settlement, toon + weathering).
import * as THREE from 'three';
import { paint } from './materials';
import { RNG } from '../core/noise';

/** The shared settlement palette: sun-faded, salt-bleached, and painted in the brand colours, never saturated. */
export const SALVAGE = {
  wood: ['#8d7457', '#76604a', '#a08a6a', '#64503d', '#8a6f52'],
  woodDeep: '#3d2f25',
  tin: ['#7e8b8d', '#6c797c', '#949a94', '#5e6a6e'],
  rust: ['#8c4529', '#a3522f', '#6e3420', '#9a6a3e'],
  // faded Abyss Blue, Sea Glass, Oxide Rust, Sun Gold, bleached bone, a sun-killed teal
  paint: ['#2f5b6c', '#3e8486', '#a04d30', '#c9a24a', '#ddd2b4', '#4f7a7c'],
  canvas: ['#d6bc86', '#c8a576', '#b98a5c', '#e0d2ae', '#a8664a'],
  rope: '#9c8458',
  dark: '#1f2a2e',
  drum: ['#8c4529', '#2f5b6c', '#c9a24a', '#5e6a6e', '#a3522f'],
  lamp: '#e8a95a', // lamplight behind a window: warm, but not a light bulb by day
} as const;

type V3 = [number, number, number];
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _up = new THREE.Vector3(0, 1, 0);

export class Shanty {
  geos: THREE.BufferGeometry[] = [];
  glows: THREE.BufferGeometry[] = [];
  constructor(public rng: RNG) {}

  private put(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, glow = false, jitter = 0.07) {
    _m.compose(new THREE.Vector3(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(_m);
    (glow ? this.glows : this.geos).push(paint(g, color, glow ? 0 : jitter));
  }
  box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, rx = 0, ry = 0, rz = 0) {
    this.put(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz);
  }
  cyl(r0: number, r1: number, h: number, x: number, y: number, z: number, color: string, seg = 8, rx = 0, ry = 0, rz = 0) {
    this.put(new THREE.CylinderGeometry(r0, r1, h, seg), color, x, y, z, rx, ry, rz);
  }
  glowBox(w: number, h: number, d: number, x: number, y: number, z: number, color: string = SALVAGE.lamp) {
    this.put(new THREE.BoxGeometry(w, h, d), color, x, y, z, 0, 0, 0, true);
  }
  /** A square-section member from a to b (posts, braces, rails, rope). */
  beam(a: V3, b: V3, t: number, color: string, seg = 0) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const d = vb.clone().sub(va);
    const len = d.length();
    if (len < 1e-3) return;
    const g = seg ? new THREE.CylinderGeometry(t / 2, t / 2, len, seg) : new THREE.BoxGeometry(t, len, t);
    _q.setFromUnitVectors(_up, d.normalize());
    _m.compose(va.add(vb).multiplyScalar(0.5), _q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(_m);
    this.geos.push(paint(g, color, 0.05));
  }
  pick<T>(a: readonly T[]): T {
    return a[Math.floor(this.rng.next() * a.length)];
  }

  /** Wall cladding: a face of `w` x `h` split into boards and sheets of mismatched stock, standing just proud. */
  private clad(w: number, h: number, y0: number, place: (u: number, pw: number, ph: number, color: string, proud: number) => void) {
    let u = -w / 2;
    while (u < w / 2 - 0.05) {
      const r = this.rng.next();
      const pw = Math.min(w / 2 - u, r < 0.55 ? this.rng.range(0.6, 1.3) : this.rng.range(1.2, 2.4));
      // most of a wall is plank, then tin, then a panel of painted metal off something bigger
      const color = r < 0.55 ? this.pick(SALVAGE.wood) : r < 0.8 ? this.pick(SALVAGE.tin) : r < 0.9 ? this.pick(SALVAGE.rust) : this.pick(SALVAGE.paint);
      const ph = h * (this.rng.next() < 0.2 ? this.rng.range(0.7, 0.92) : 1);
      place(u + pw / 2, pw - 0.04, ph, color, 0.05 + this.rng.next() * 0.03);
      u += pw;
    }
    void y0;
  }

  /** A box body clad on all four sides, a dark core showing in the gaps. Origin: floor centre. */
  private body(w: number, h: number, d: number, x: number, y: number, z: number) {
    this.box(w, h, d, x, y + h / 2, z, SALVAGE.woodDeep);
    // front/back (normal ±z), sides (normal ±x)
    for (const s of [1, -1]) {
      this.clad(w, h, y, (u, pw, ph, c, p) => this.box(pw, ph, 0.08, x + u, y + ph / 2, z + s * (d / 2 + p), c));
      this.clad(d, h, y, (u, pw, ph, c, p) => this.box(0.08, ph, pw, x + s * (w / 2 + p), y + ph / 2, z + u, c));
    }
    // a bleached batten along the eaves ties the patchwork together
    this.box(w + 0.3, 0.16, d + 0.3, x, y + h - 0.05, z, this.pick(['#ddd2b4', '#8d7457', '#6c797c']));
  }

  /** Door and windows on the front face (+z), shutters hanging, one window lit after dark. */
  private openings(w: number, h: number, d: number, x: number, y: number, z: number, lit: boolean) {
    const fz = z + d / 2 + 0.11;
    const dx = x + this.rng.range(-w * 0.22, w * 0.22);
    this.box(0.95, Math.min(1.95, h - 0.3), 0.06, dx, y + Math.min(1.95, h - 0.3) / 2, fz, SALVAGE.dark);
    this.box(1.15, 0.14, 0.1, dx, y + Math.min(1.95, h - 0.3) + 0.05, fz + 0.02, '#ddd2b4');
    const wx = dx + (dx > x ? -1 : 1) * Math.min(w * 0.3, 1.5);
    if (Math.abs(wx - x) < w / 2 - 0.5) {
      if (lit) this.glowBox(0.75, 0.6, 0.05, wx, y + h * 0.62, fz);
      else this.box(0.75, 0.6, 0.06, wx, y + h * 0.62, fz, SALVAGE.dark);
      this.box(0.95, 0.1, 0.1, wx, y + h * 0.62 - 0.36, fz + 0.03, '#ddd2b4');
      // a shutter swung open, off its top hinge
      this.box(0.08, 0.7, 0.5, wx + 0.55, y + h * 0.62, fz + 0.25, this.pick(SALVAGE.paint), 0, 0, 0.08);
    }
    // a side porthole: everyone took one off a wreck
    if (this.rng.next() < 0.5) this.cyl(0.32, 0.32, 0.12, x + w / 2 + 0.12, y + h * 0.6, z, '#9a6a3e', 10, 0, 0, Math.PI / 2);
  }

  /** Roofs overhang the walls; tin sheets of different ages. Returns the ridge height. */
  private roof(kind: 'gable' | 'lean' | 'barrel', w: number, d: number, x: number, y: number, z: number) {
    const o = 0.5;
    const sheets = (n: number, len: number, put: (k: number, seg: number, c: string) => void) => {
      for (let k = 0; k < n; k++) put(k, len / n, this.rng.next() < 0.35 ? this.pick(SALVAGE.rust) : this.pick(SALVAGE.tin));
    };
    if (kind === 'gable') {
      const pitch = this.rng.range(0.42, 0.6);
      const span = w / 2 + o;
      const run = span / Math.cos(pitch);
      const rise = Math.tan(pitch) * (w / 2);
      // gable ends: a timber triangle under the ridge (a 3-sided prism, apex up, squashed to the pitch)
      const tr = w / Math.sqrt(3);
      const k = rise / (1.5 * tr);
      this.put(new THREE.CylinderGeometry(tr, tr, d, 3).scale(1, 1, k), this.pick(SALVAGE.wood), x, y + (tr / 2) * k, z, -Math.PI / 2, 0, 0);
      for (const s of [1, -1]) {
        sheets(3, d + o * 2, (i, seg, c) =>
          this.box(run, 0.12, seg - 0.04, x + (s * span) / 2, y + rise - (Math.tan(pitch) * span) / 2 + 0.08, z - (d + o * 2) / 2 + seg * (i + 0.5), c, 0, 0, -s * pitch)
        );
      }
      this.box(0.22, 0.18, d + o * 2 + 0.1, x, y + rise + 0.14, z, '#5e6a6e'); // ridge cap
      return y + rise + 0.2;
    }
    if (kind === 'lean') {
      const tilt = this.rng.range(0.16, 0.28) * (this.rng.next() < 0.5 ? 1 : -1);
      const run = (d + o * 2) / Math.cos(tilt);
      const lift = Math.abs(Math.sin(tilt)) * run * 0.5;
      sheets(3, w + o * 2, (k, seg, c) => this.box(seg - 0.04, 0.12, run, x - (w + o * 2) / 2 + seg * (k + 0.5), y + lift + 0.06, z, c, tilt));
      return y + lift * 2;
    }
    // barrel vault: a half-round of tin over the body, sheets lapped along its length
    const r = w / 2 + 0.25;
    sheets(3, d + o * 2, (k, seg, c) => {
      const g = new THREE.CylinderGeometry(r, r, seg - 0.03, 10, 1, true, -Math.PI / 2, Math.PI);
      this.put(g, c, x, y, z - (d + o * 2) / 2 + seg * (k + 0.5), -Math.PI / 2, 0, 0);
    });
    this.put(new THREE.CylinderGeometry(r - 0.02, r - 0.02, d - 0.02, 10, 1, false, -Math.PI / 2, Math.PI), this.pick(SALVAGE.wood), x, y, z, -Math.PI / 2, 0, 0);
    return y + r;
  }

  /** The vertical accent that gives a roofline its character. */
  private accent(kind: 'chimney' | 'mast' | 'aerial' | 'none', x: number, y: number, z: number, top: number) {
    if (kind === 'chimney') {
      this.cyl(0.17, 0.2, top - y + 1.4, x, (top + y + 1.4) / 2, z, this.pick(['#3d3a36', '#5e6a6e', '#6e3420']), 8);
      this.cyl(0.32, 0.2, 0.22, x, top + 1.5, z, '#3d3a36', 8);
    } else if (kind === 'mast') {
      const h = this.rng.range(4, 6.5);
      this.cyl(0.09, 0.12, h, x, top + h / 2 - 0.4, z, this.pick(SALVAGE.wood), 6);
      this.box(1.6, 0.1, 0.1, x, top + h * 0.72, z, SALVAGE.woodDeep);
      // a rag flag, faded but still flown
      const fc = this.pick(['#a04d30', '#c9a24a', '#2f5b6c', '#ddd2b4', '#a8664a']);
      this.box(1.3, 0.8, 0.05, x + 0.7, top + h - 0.85, z, fc, 0, 0, -0.06);
      this.beam([x, top + h - 0.4, z], [x + 1.8 * (this.rng.next() < 0.5 ? 1 : -1), top - 0.2, z + 0.6], 0.05, SALVAGE.rope);
    } else if (kind === 'aerial') {
      const h = this.rng.range(2.5, 4);
      this.beam([x, top - 0.3, z], [x + 0.1, top + h, z], 0.08, '#5e6a6e', 5);
      for (const k of [0.55, 0.8]) this.box(1.1 - k * 0.6, 0.06, 0.06, x + 0.08 * k, top + h * k, z, '#5e6a6e');
    }
  }

  /** Piles into the shallows (seabed is never deeper than ~3 m under a stilt house), braced, with a ladder. */
  private stilts(w: number, d: number, x: number, z: number, deck: number) {
    for (const sx of [-1, 0, 1]) for (const sz of [-1, 1]) {
      if (sx === 0 && w < 5) continue;
      const px = x + sx * (w / 2 - 0.2), pz = z + sz * (d / 2 - 0.2);
      const lean = this.rng.range(-0.06, 0.06);
      this.beam([px + lean * 3, -4, pz], [px, deck, pz], 0.28, this.rng.next() < 0.25 ? '#5e6a6e' : SALVAGE.woodDeep, 6);
    }
    // cross braces on the long sides
    for (const sz of [-1, 1]) {
      const pz = z + sz * (d / 2 - 0.2);
      this.beam([x - w / 2 + 0.2, -0.6, pz], [x + w / 2 - 0.2, deck - 0.4, pz], 0.14, SALVAGE.woodDeep);
    }
    // ladder down to the boats
    const lx = x + w / 2 + 0.25;
    for (const s of [-0.3, 0.3]) this.beam([lx, -0.8, z + s], [lx, deck + 0.9, z + s], 0.08, SALVAGE.wood[3]);
    for (let yy = -0.4; yy < deck + 0.6; yy += 0.45) this.box(0.08, 0.06, 0.6, lx, yy, z, SALVAGE.wood[0]);
  }

  /** A raft floated on oil drums, lashed in two rows. Returns the deck height. */
  private drums(w: number, d: number, x: number, z: number) {
    const n = Math.max(2, Math.round(d / 1.25));
    for (const sx of [-1, 1]) for (let k = 0; k < n; k++) {
      const dz = z - d / 2 + (d / n) * (k + 0.5);
      this.cyl(0.45, 0.45, 1.15, x + sx * (w / 2 - 0.7), 0.15, dz, this.pick(SALVAGE.drum), 9, 0, 0, Math.PI / 2);
    }
    return 0.75;
  }

  /** Deck planks with an uneven edge; a rail on the open sides. */
  private deck(w: number, d: number, x: number, y: number, z: number, rail: boolean) {
    const n = Math.max(3, Math.round(w / 0.9));
    for (let k = 0; k < n; k++) {
      const dz = this.rng.range(-0.25, 0.25);
      this.box(w / n - 0.06, 0.16, d + this.rng.range(-0.2, 0.4), x - w / 2 + (w / n) * (k + 0.5), y - 0.08, z + dz, this.pick(SALVAGE.wood));
    }
    if (!rail) return;
    const fz = z + d / 2 - 0.1;
    for (let u = -w / 2 + 0.1; u <= w / 2; u += w / 3) this.box(0.1, 1, 0.1, x + u, y + 0.5, fz, SALVAGE.woodDeep);
    this.box(w, 0.1, 0.1, x, y + 0.95, fz, this.pick(SALVAGE.wood));
    this.beam([x - w / 2, y + 0.55, fz], [x + w / 2, y + 0.5, fz], 0.05, SALVAGE.rope);
  }

  /** Canvas awning off the front, on two poles, in two colours of sun-killed sailcloth. */
  private awning(w: number, x: number, y: number, z: number) {
    const aw = Math.min(w * 0.8, 3.6), out = this.rng.range(1.6, 2.4);
    const c0 = this.pick(SALVAGE.canvas), c1 = this.pick(SALVAGE.canvas);
    const n = 3;
    for (let k = 0; k < n; k++) this.box(aw / n, 0.06, out, x - aw / 2 + (aw / n) * (k + 0.5), y - 0.25, z + out / 2, k % 2 ? c1 : c0, 0.22);
    for (const s of [-1, 1]) this.beam([x + s * aw / 2, y - 2.6, z + out - 0.1], [x + s * aw / 2, y - 0.5, z + out - 0.1], 0.1, SALVAGE.woodDeep, 5);
  }

  /** Clutter at the door: drums, crates, a coil of rope. */
  private clutter(x: number, y: number, z: number, n: number) {
    for (let k = 0; k < n; k++) {
      const px = x + this.rng.range(-1.2, 1.2), pz = z + this.rng.range(-0.5, 0.5);
      if (this.rng.next() < 0.5) this.cyl(0.32, 0.32, 0.9, px, y + 0.45, pz, this.pick(SALVAGE.drum), 8);
      else this.box(0.7, 0.6, 0.7, px, y + 0.3, pz, this.pick(SALVAGE.wood), 0, this.rng.range(0, 1));
    }
  }

  /**
   * A dwelling: base, clad body (one or two storeys), overhanging roof, accent, canvas and clutter. Origin at the
   * water (or ground) level under its centre, front facing +z. Returns its top height (for rope lines).
   */
  dwelling(opts: { base: 'stilts' | 'drums' | 'ground' | 'none'; w?: number; d?: number; storeys?: 1 | 2; roof?: 'gable' | 'lean' | 'barrel'; accent?: 'chimney' | 'mast' | 'aerial' | 'none'; awning?: boolean; lit?: boolean } = { base: 'ground' }) {
    const r = this.rng;
    const w = opts.w ?? r.range(4.2, 6.2), d = opts.d ?? r.range(3.8, 5.4);
    let floor = 0;
    if (opts.base === 'stilts') {
      floor = r.range(1.8, 2.6);
      this.stilts(w + 1.2, d + 1.4, 0, 0, floor);
      this.deck(w + 1.4, d + 1.6, 0, floor, 0, true);
    } else if (opts.base === 'drums') {
      floor = this.drums(w + 1, d + 1.2, 0, 0);
      this.deck(w + 1.2, d + 1.4, 0, floor, 0, r.next() < 0.5);
    } else if (opts.base === 'ground') {
      // a plinth of old kerb stone and sleepers so the house sits level on the slope
      this.box(w + 0.6, 1.2, d + 0.6, 0, -0.3, 0, '#6a645a');
      floor = 0.3;
    }
    const h = r.range(2.5, 3.1);
    this.body(w, h, d, 0, floor, 0);
    this.openings(w, h, d, 0, floor, 0, opts.lit ?? r.next() < 0.6);
    let top: number;
    const roof = opts.roof ?? this.pick(['gable', 'gable', 'lean', 'barrel'] as const);
    if (opts.storeys === 2) {
      // flat roof as a deck with a rail; a smaller cabin set back on top
      this.box(w + 0.4, 0.18, d + 0.4, 0, floor + h + 0.09, 0, this.pick(SALVAGE.tin));
      const w2 = w * r.range(0.55, 0.7), d2 = d * r.range(0.6, 0.75), ox = (w - w2) / 2 * (r.next() < 0.5 ? 1 : -1) * 0.8;
      const y2 = floor + h + 0.18, h2 = r.range(2.1, 2.5);
      this.body(w2, h2, d2, ox, y2, -d * 0.12);
      this.openings(w2, h2, d2, ox, y2, -d * 0.12, r.next() < 0.5);
      top = this.roof(roof, w2, d2, ox, y2 + h2, -d * 0.12);
      this.accent(opts.accent ?? this.pick(['mast', 'aerial', 'chimney'] as const), ox - w2 * 0.25, y2 + h2, -d * 0.12, top);
      this.box(w + 0.2, 0.1, 0.08, 0, y2 + 0.9, d / 2 + 0.1, SALVAGE.wood[1]);
    } else {
      top = this.roof(roof, w, d, 0, floor + h, 0);
      this.accent(opts.accent ?? this.pick(['chimney', 'mast', 'aerial', 'chimney'] as const), w * 0.25 * (r.next() < 0.5 ? 1 : -1), floor + h, -d * 0.15, top);
    }
    if (opts.awning ?? r.next() < 0.6) this.awning(w, 0, floor + h, d / 2 + 0.1);
    this.clutter(0, floor, d / 2 + (opts.base === 'ground' ? 1.4 : 0.6), r.int(1, 3));
    return top;
  }

  /** A lookout: four splayed legs of pipe and timber, braced, a cabin on top with a lamp and a flag. */
  lookout(h = 11) {
    const r = this.rng;
    const b = 2.6, t = 1.3;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.beam([sx * b, -3, sz * b], [sx * t, h, sz * t], 0.3, r.next() < 0.5 ? '#5e6a6e' : SALVAGE.woodDeep, 6);
    for (let k = 0; k < 3; k++) {
      const y0 = -1 + k * (h / 3), y1 = y0 + h / 3;
      const w0 = b + (t - b) * ((y0 + 3) / (h + 3)), w1 = b + (t - b) * ((y1 + 3) / (h + 3));
      for (const s of [-1, 1]) {
        this.beam([-w0, y0, s * w0], [w1, y1, s * w1], 0.12, SALVAGE.woodDeep);
        this.beam([s * w0, y0, -w0], [s * w1, y1, w1], 0.12, SALVAGE.woodDeep);
      }
    }
    this.deck(3.6, 3.6, 0, h, 0, false);
    this.body(2.4, 2, 2.4, 0, h, 0);
    this.glowBox(0.8, 0.5, 0.05, 0, h + 1.3, 1.32);
    const top = this.roof('gable', 2.4, 2.4, 0, h + 2, 0);
    this.accent('mast', 0.6, h + 2, -0.4, top);
    return top;
  }

  /** Rope from a to b, sagging, hung with rag pennants every metre or so: the town's washing and its colours. */
  bunting(a: V3, b: V3, sag = 1.2, pennants = true) {
    const N = 8;
    const pts: V3[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t]);
    }
    for (let i = 0; i < N; i++) this.beam(pts[i], pts[i + 1], 0.05, SALVAGE.rope);
    if (!pennants) return;
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const ry = Math.atan2(-(b[2] - a[2]), b[0] - a[0]);
    const n = Math.floor(len / 1.1);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag;
      const c = this.pick(['#a04d30', '#c9a24a', '#ddd2b4', '#2f5b6c', '#3e8486', '#a8664a']);
      // a pennant: a triangle hanging point down, flat in the rope's plane
      const g = new THREE.CylinderGeometry(0.34, 0.34, 0.04, 3).rotateX(Math.PI / 2).scale(1, 1.25, 1);
      this.put(g, c, a[0] + (b[0] - a[0]) * t, y - 0.32, a[2] + (b[2] - a[2]) * t, 0, ry, 0, false, 0);
    }
  }

  /** A boardwalk on piles from a to b (x, z) at deck height y: planks across, piles every 3 m, a rope rail. */
  boardwalk(ax: number, az: number, bx: number, bz: number, y: number, w = 2.2) {
    const len = Math.hypot(bx - ax, bz - az);
    const ry = Math.atan2(bx - ax, bz - az);
    const dx = (bx - ax) / len, dz = (bz - az) / len;
    const n = Math.floor(len / 0.75);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) * (len / n);
      const sag = this.rng.range(-0.05, 0.05);
      this.box(w + this.rng.range(-0.3, 0.2), 0.14, len / n - 0.08, ax + dx * t + this.rng.range(-0.1, 0.1), y + sag, az + dz * t, this.pick(SALVAGE.wood), 0, ry, 0);
    }
    const px = Math.cos(ry), pz = -Math.sin(ry);
    for (let t = 0.5; t < len; t += 3) for (const s of [-1, 1]) {
      const x = ax + dx * t + px * s * (w / 2 - 0.1), z = az + dz * t + pz * s * (w / 2 - 0.1);
      this.beam([x, -3, z], [x, y + (s > 0 ? 1.0 : -0.05), z], 0.22, SALVAGE.woodDeep, 6);
    }
    const ex = px * (w / 2 - 0.1), ez = pz * (w / 2 - 0.1);
    this.bunting([ax + ex, y + 0.9, az + ez], [bx + ex, y + 0.9, bz + ez], 0.25, false);
  }

  /** Take the parts built so far, placed at x, y, z turned by ry (and scaled), and start fresh. */
  take(x: number, y: number, z: number, ry = 0, s = 1) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
    const out = { geos: this.geos.map((g) => g.applyMatrix4(m)), glows: this.glows.map((g) => g.applyMatrix4(m)) };
    this.geos = [];
    this.glows = [];
    return out;
  }
}

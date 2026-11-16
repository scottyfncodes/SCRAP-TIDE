// What a boat can hit, taken from what you can see. Every solid piece of the drowned world gets its outline where
// its own geometry meets the water: the model is sliced by a thin slab around the waterline, the slice is
// rasterised onto a 1 m grid, touching cells are grouped (a crane's two legs or an oil rig's four stay apart, so you
// can sail between them) and each group becomes a convex polygon. Hand-sized circles used to stand in for these
// shapes; a 7 m circle round a 2.4 m wide container, or one circle round a whole tanker, meant hits on open water.
import * as THREE from 'three';

/** A convex outline in the x-z plane, counter-clockwise (x right, z as "up"), with its bounding circle. */
export interface Hazard { x: number; z: number; r: number; pts: Float32Array }
/** The deepest overlap found: how far the circle is inside a hazard and which way is out. */
export interface Contact { depth: number; nx: number; nz: number }

/** The waterline slab: from the surface (anything lower is lost under the water) to the top of a wave. */
const Y_LO = -0.08, Y_HI = 1.6;
const CELL = 1;

/** Convex hull, monotone chain; returns CCW points (x, z pairs) without the closing point. */
function hull(points: number[]): Float32Array {
  const n = points.length / 2;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => points[a * 2] - points[b * 2] || points[a * 2 + 1] - points[b * 2 + 1]);
  const cross = (o: number, a: number, b: number) =>
    (points[a * 2] - points[o * 2]) * (points[b * 2 + 1] - points[o * 2 + 1]) - (points[a * 2 + 1] - points[o * 2 + 1]) * (points[b * 2] - points[o * 2]);
  const lower: number[] = [], upper: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0) lower.pop();
    lower.push(i);
  }
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0) upper.pop();
    upper.push(i);
  }
  const h = lower.slice(0, -1).concat(upper.slice(0, -1));
  const out = new Float32Array(h.length * 2);
  h.forEach((i, k) => {
    out[k * 2] = points[i * 2];
    out[k * 2 + 1] = points[i * 2 + 1];
  });
  return out;
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

/**
 * The waterline outlines of some geometry. `parts` are geometries with the matrix that puts them in the world
 * (null: already in world space). Returns one hazard per separate piece; none if nothing reaches the water.
 */
export function footprints(parts: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 | null }[]): Hazard[] {
  const cells = new Map<number, number[]>(); // cell key -> sampled x, z
  const key = (i: number, j: number) => (i + 4096) * 8192 + (j + 4096);
  const mark = (x: number, z: number) => {
    const k = key(Math.floor(x / CELL), Math.floor(z / CELL));
    let c = cells.get(k);
    if (!c) cells.set(k, (c = []));
    if (c.length < 24) c.push(x, z); // a dozen points a cell is plenty for the hull (corners land in cells of their own)
  };
  // a segment of the slice, sampled every half metre so long flat faces still fill their cells
  const seg = (x0: number, z0: number, x1: number, z1: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / (CELL * 0.5)));
    for (let s = 0; s <= n; s++) mark(x0 + ((x1 - x0) * s) / n, z0 + ((z1 - z0) * s) / n);
  };
  const clipPts: number[] = [];
  for (const { geo, matrix } of parts) {
    const pos = geo.attributes.position as THREE.BufferAttribute | undefined;
    if (!pos) continue;
    const index = geo.index;
    const tris = index ? index.count / 3 : pos.count / 3;
    for (let t = 0; t < tris; t++) {
      const ia = index ? index.getX(t * 3) : t * 3, ib = index ? index.getX(t * 3 + 1) : t * 3 + 1, ic = index ? index.getX(t * 3 + 2) : t * 3 + 2;
      _a.fromBufferAttribute(pos, ia);
      _b.fromBufferAttribute(pos, ib);
      _c.fromBufferAttribute(pos, ic);
      if (matrix) {
        _a.applyMatrix4(matrix);
        _b.applyMatrix4(matrix);
        _c.applyMatrix4(matrix);
      }
      const lo = Math.min(_a.y, _b.y, _c.y), hi = Math.max(_a.y, _b.y, _c.y);
      if (hi < Y_LO || lo > Y_HI) continue;
      // the triangle clipped to the slab, as a polygon in x-z: its vertices inside plus its edges' crossings
      clipPts.length = 0;
      const vs = [_a, _b, _c];
      for (let e = 0; e < 3; e++) {
        const p = vs[e], q = vs[(e + 1) % 3];
        if (p.y >= Y_LO && p.y <= Y_HI) clipPts.push(p.x, p.z);
        for (const yy of [Y_LO, Y_HI]) {
          if ((p.y - yy) * (q.y - yy) < 0) {
            const f = (yy - p.y) / (q.y - p.y);
            clipPts.push(p.x + (q.x - p.x) * f, p.z + (q.z - p.z) * f);
          }
        }
      }
      const m = clipPts.length / 2;
      for (let i = 0; i < m; i++) {
        const j = (i + 1) % m;
        seg(clipPts[i * 2], clipPts[i * 2 + 1], clipPts[j * 2], clipPts[j * 2 + 1]);
      }
    }
  }
  if (!cells.size) return [];
  // group cells that touch (8-neighbours, plus one cell of slack: a gap under 2 m is no gap to a boat)
  const out: Hazard[] = [];
  const seen = new Set<number>();
  for (const start of cells.keys()) {
    if (seen.has(start)) continue;
    const pts: number[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const k = stack.pop()!;
      pts.push(...cells.get(k)!);
      const i = Math.floor(k / 8192) - 4096, j = (k % 8192) - 4096;
      for (let di = -2; di <= 2; di++) {
        for (let dj = -2; dj <= 2; dj++) {
          const nk = key(i + di, j + dj);
          if (!seen.has(nk) && cells.has(nk)) {
            seen.add(nk);
            stack.push(nk);
          }
        }
      }
    }
    if (pts.length < 6) {
      // a lone post: a small square round it
      const x = pts[0], z = pts[1];
      pts.push(x - 0.3, z - 0.3, x + 0.3, z - 0.3, x + 0.3, z + 0.3, x - 0.3, z + 0.3);
    }
    out.push(make(hull(pts)));
  }
  return out;
}

function make(pts: Float32Array): Hazard {
  let x = 0, z = 0;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    x += pts[i * 2];
    z += pts[i * 2 + 1];
  }
  x /= n;
  z /= n;
  let r = 0;
  for (let i = 0; i < n; i++) r = Math.max(r, Math.hypot(pts[i * 2] - x, pts[i * 2 + 1] - z));
  return { x, z, r, pts };
}

/** A round hazard as a polygon (for solids with no model to slice). */
export function circleHazard(x: number, z: number, r: number, seg = 12): Hazard {
  const pts = new Float32Array(seg * 2);
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    pts[i * 2] = x + Math.cos(a) * r;
    pts[i * 2 + 1] = z + Math.sin(a) * r;
  }
  return { x, z, r, pts };
}

/**
 * Signed distance from a point to a convex CCW polygon (negative inside) and the outward direction at the nearest
 * point of its edge.
 */
export function signedDist(h: Hazard, px: number, pz: number, out: Contact) {
  const p = h.pts, n = p.length / 2;
  let maxD = -Infinity, mnx = 0, mnz = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ex = p[j * 2] - p[i * 2], ez = p[j * 2 + 1] - p[i * 2 + 1];
    const len = Math.hypot(ex, ez) || 1;
    const nx = ez / len, nz = -ex / len; // outward for CCW
    const d = (px - p[i * 2]) * nx + (pz - p[i * 2 + 1]) * nz;
    if (d > maxD) {
      maxD = d;
      mnx = nx;
      mnz = nz;
    }
  }
  if (maxD <= 0) {
    out.depth = maxD;
    out.nx = mnx;
    out.nz = mnz;
    return maxD;
  }
  // outside: the true distance is to the nearest point on the boundary
  let best = Infinity, bx = 0, bz = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const ax = p[i * 2], az = p[i * 2 + 1], ex = p[j * 2] - ax, ez = p[j * 2 + 1] - az;
    const l2 = ex * ex + ez * ez || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * ex + (pz - az) * ez) / l2));
    const qx = ax + ex * t, qz = az + ez * t;
    const d = Math.hypot(px - qx, pz - qz);
    if (d < best) {
      best = d;
      bx = qx;
      bz = qz;
    }
  }
  out.depth = best;
  out.nx = (px - bx) / (best || 1);
  out.nz = (pz - bz) / (best || 1);
  return best;
}

/** Every hazard, bucketed on a coarse grid so a query only looks at its neighbourhood. */
export class HazardField {
  list: Hazard[] = [];
  private grid = new Map<number, Hazard[]>();
  private static G = 32;
  private _c: Contact = { depth: 0, nx: 0, nz: 0 };

  add(h: Hazard) {
    this.list.push(h);
    const G = HazardField.G;
    for (let i = Math.floor((h.x - h.r) / G); i <= Math.floor((h.x + h.r) / G); i++) {
      for (let j = Math.floor((h.z - h.r) / G); j <= Math.floor((h.z + h.r) / G); j++) {
        const k = (i + 512) * 1024 + (j + 512);
        let b = this.grid.get(k);
        if (!b) this.grid.set(k, (b = []));
        b.push(h);
      }
    }
  }

  near(x: number, z: number) {
    const G = HazardField.G;
    return this.grid.get((Math.floor(x / G) + 512) * 1024 + (Math.floor(z / G) + 512)) ?? EMPTY;
  }

  /**
   * The deepest overlap of a circle (centre x, z, radius r) with any hazard, written to `out`; false if clear.
   * `out.depth` is then how far to push the circle along (nx, nz) to free it.
   */
  overlap(x: number, z: number, r: number, out: Contact): boolean {
    let hit = false, best = 0;
    for (const h of this.near(x, z)) {
      if (Math.hypot(x - h.x, z - h.z) > h.r + r) continue;
      const d = signedDist(h, x, z, this._c);
      const pen = r - d;
      if (pen > best) {
        best = pen;
        out.depth = pen;
        out.nx = this._c.nx;
        out.nz = this._c.nz;
        hit = true;
      }
    }
    return hit;
  }

  /** Distance from a point to the nearest hazard edge (Infinity when none is within `max`). */
  clearance(x: number, z: number, max = 60): number {
    let best = Infinity;
    const G = HazardField.G;
    const reach = Math.ceil(max / G);
    const ci = Math.floor(x / G), cj = Math.floor(z / G);
    const done = new Set<Hazard>();
    for (let i = ci - reach; i <= ci + reach; i++) {
      for (let j = cj - reach; j <= cj + reach; j++) {
        for (const h of this.grid.get((i + 512) * 1024 + (j + 512)) ?? EMPTY) {
          if (done.has(h)) continue;
          done.add(h);
          if (Math.hypot(x - h.x, z - h.z) - h.r > Math.min(best, max)) continue;
          best = Math.min(best, signedDist(h, x, z, this._c));
        }
      }
    }
    return best;
  }
}
const EMPTY: Hazard[] = [];

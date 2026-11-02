// The single source of truth for world height. Rendering, water depth, collision
// and walking all sample this function so visuals and gameplay always agree.
import { fbm, valueNoise, smoothstep, clamp } from '../core/noise';
import { ISLANDS, WORLD, type IslandDef } from '../data/world';

const SHELF = 2.5; // island underwater shelf extends to r * SHELF

function islandWarp(isl: IslandDef, ang: number) {
  // Organic coastline: radius varies with angle (periodic noise).
  const cx = Math.cos(ang);
  const cz = Math.sin(ang);
  const n = valueNoise(cx * 1.6 + isl.seed, cz * 1.6 + 7, isl.seed) * 0.6 + valueNoise(cx * 3.4 + 20, cz * 3.4 + isl.seed, isl.seed + 1) * 0.4;
  const amt = isl.style === 'sandbar' ? 0.18 : isl.style === 'harbor' ? 0.12 : 0.26;
  return 1 + (n - 0.5) * 2 * amt;
}

export function islandHeight(isl: IslandDef, x: number, z: number): number {
  const dx = x - isl.x;
  const dz = z - isl.z;
  const d = Math.hypot(dx, dz);
  if (d > isl.r * SHELF * 1.35) return -999;
  const ang = Math.atan2(dz, dx);
  // blend warp across the seam to avoid a crack at angle = PI
  const w = islandWarp(isl, ang);
  const rw = isl.r * w;
  const t = d / rw;
  if (t < 1) {
    const n = fbm(x * 0.045 + isl.seed, z * 0.045, 4, isl.seed);
    let core = smoothstep(0.98, 0.25, t);
    let h: number;
    if (isl.style === 'harbor') {
      // Flat town plateau with a hill to the south (away from the pier).
      const southBias = clamp((dz / isl.r) * 0.9 + 0.4, 0, 1);
      h = 0.4 + 3.2 * smoothstep(0.98, 0.7, t) + isl.peak * core * southBias * (0.6 + n * 0.6);
    } else if (isl.style === 'sandbar') {
      h = 0.3 + isl.peak * core * (0.6 + 0.6 * n);
    } else if (isl.style === 'rocky') {
      core = Math.pow(core, 0.7);
      h = 0.35 + isl.peak * core * (0.55 + 0.9 * n);
    } else {
      h = 0.35 + isl.peak * Math.pow(core, 1.3) * (0.55 + 0.8 * n);
    }
    // gentle beach band
    const beach = smoothstep(1, 0.82, t);
    return h * beach + 0.35 * (1 - beach) - (1 - beach) * 0.2;
  }
  // Underwater shelf: wide turquoise band, then dropping to the deep floor.
  const s = smoothstep(1, SHELF, t);
  return -0.25 - (Math.abs(WORLD.deepFloor) - 0.25) * Math.pow(s, 1.25);
}

function reefHeight(x: number, z: number): number {
  const R = WORLD.reef;
  const d = Math.hypot(x - R.x, z - R.z);
  const off = Math.abs(d - R.r);
  // inside the lagoon stays shallow
  if (d < R.r) {
    const lagoon = -2.6 - valueNoise(x * 0.08, z * 0.08, 9) * 1.2;
    if (off > R.w * 2) return lagoon;
  }
  const ang = Math.atan2(z - R.z, x - R.x);
  const bump = valueNoise(Math.cos(ang) * 4 + 10, Math.sin(ang) * 4, 4) * 0.5;
  const ring = -0.45 + bump * 0.3 - Math.pow(off / R.w, 2) * 1.5;
  if (d < R.r) return Math.max(ring, -2.6 - valueNoise(x * 0.08, z * 0.08, 9) * 1.2);
  return ring;
}

export function isReef(x: number, z: number) {
  const R = WORLD.reef;
  const d = Math.hypot(x - R.x, z - R.z);
  return Math.abs(d - R.r) < R.w * 1.15;
}

export function deepFloor(x: number, z: number) {
  return WORLD.deepFloor + (fbm(x * 0.006, z * 0.006, 3, 5) - 0.5) * 6;
}

export function heightAt(x: number, z: number): number {
  let h = deepFloor(x, z);
  for (const isl of ISLANDS) {
    const ih = islandHeight(isl, x, z);
    if (ih > h) h = ih;
  }
  const rh = reefHeight(x, z);
  if (rh > h) h = rh;
  return h;
}

export function nearestIsland(x: number, z: number): { isl: IslandDef; d: number } {
  let best = ISLANDS[0];
  let bd = Infinity;
  for (const isl of ISLANDS) {
    const d = Math.hypot(x - isl.x, z - isl.z) - isl.r;
    if (d < bd) {
      bd = d;
      best = isl;
    }
  }
  return { isl: best, d: bd };
}

/** Distance from the Shallows centre, used for the open-swell boundary. */
export function swellFactor(x: number, z: number) {
  const c = WORLD.shallowsCenter;
  const d = Math.hypot(x - c.x, z - c.z);
  return smoothstep(WORLD.shallowsRadius - 20, WORLD.shallowsRadius + 30, d);
}

/** Find a walkable beach point from a boat position (searches outward rings). */
export function findShore(x: number, z: number, maxR = 22): { x: number; z: number } | null {
  let best: { x: number; z: number } | null = null;
  let bd = Infinity;
  for (let r = 2; r <= maxR; r += 1.5) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * Math.PI * 2;
      const px = x + Math.cos(ang) * r;
      const pz = z + Math.sin(ang) * r;
      const h = heightAt(px, pz);
      if (h > 0.35 && h < 3.5 && !isReef(px, pz)) {
        if (r < bd) {
          bd = r;
          best = { x: px, z: pz };
        }
      }
    }
    if (best) return best;
  }
  return best;
}

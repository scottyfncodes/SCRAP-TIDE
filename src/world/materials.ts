// Shared storybook toon materials + geometry helpers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let gradient: THREE.DataTexture | null = null;
export function toonGradient() {
  if (gradient) return gradient;
  // 4 soft bands: gives an illustrated, painted feel without going flat.
  const data = new Uint8Array([90, 90, 90, 255, 150, 150, 150, 255, 210, 210, 210, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const cache = new Map<string, THREE.Material>();

export function vcMat(opts: { emissive?: number; side?: THREE.Side; sway?: boolean } = {}) {
  const key = `vc-${opts.emissive ?? 0}-${opts.side ?? 0}-${opts.sway ? 1 : 0}`;
  let m = cache.get(key) as THREE.MeshToonMaterial | undefined;
  if (!m) {
    m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: opts.side ?? THREE.FrontSide });
    if (opts.emissive) m.emissive = new THREE.Color(opts.emissive);
    if (opts.sway) addSway(m);
    cache.set(key, m);
  }
  return m;
}

export function toonMat(color: THREE.ColorRepresentation, extra: Partial<THREE.MeshToonMaterialParameters> = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra });
}

export const swayUniforms = { uTime: { value: 0 } };

/** Gentle wind sway for foliage. Amount scales with height above the prop's base (stored in uv.y). */
function addSway(m: THREE.Material) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = swayUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nattribute float sway;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        float ph = wp.x * 0.15 + wp.z * 0.11;
        transformed.x += sin(uTime * 1.4 + ph) * 0.18 * sway;
        transformed.z += cos(uTime * 1.1 + ph * 1.3) * 0.12 * sway;
        transformed.y += sin(uTime * 2.0 + ph) * 0.05 * sway;`
      );
  };
}

export function paint(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, jitter = 0, sway = 0): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const cols = new Float32Array(n * 3);
  const sw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = jitter ? 1 + (Math.random() - 0.5) * jitter : 1;
    cols[i * 3] = c.r * j;
    cols[i * 3 + 1] = c.g * j;
    cols[i * 3 + 2] = c.b * j;
    sw[i] = sway;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.setAttribute('sway', new THREE.BufferAttribute(sw, 1));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

/** Paint with a vertical gradient (bottom->top colors). */
export function paintGradient(geo: THREE.BufferGeometry, bottom: THREE.ColorRepresentation, top: THREE.ColorRepresentation, swayTop = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const a = new THREE.Color(bottom);
  const b = new THREE.Color(top);
  const n = g.attributes.position.count;
  const cols = new Float32Array(n * 3);
  const sw = new Float32Array(n);
  const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const y = g.attributes.position.getY(i);
    const t = (y - bb.min.y) / Math.max(0.0001, bb.max.y - bb.min.y);
    tmp.copy(a).lerp(b, t);
    cols[i * 3] = tmp.r;
    cols[i * 3 + 1] = tmp.g;
    cols[i * 3 + 2] = tmp.b;
    sw[i] = t * swayTop;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  g.setAttribute('sway', new THREE.BufferAttribute(sw, 1));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}

export function xf(geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s: number | [number, number, number] = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  const sc = Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s);
  m.compose(new THREE.Vector3(x, y, z), q, sc);
  geo.applyMatrix4(m);
  return geo;
}

export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = geos.map((g) => {
    const ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'color', 'sway'].includes(k)) ng.deleteAttribute(k);
    if (!ng.attributes.sway) ng.setAttribute('sway', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count), 1));
    if (!ng.attributes.normal) ng.computeVertexNormals();
    return ng;
  });
  const out = mergeGeometries(clean, false);
  if (!out) throw new Error('merge failed');
  return out;
}

/** Canvas texture helper. */
export function canvasTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

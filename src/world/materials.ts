// Shared toon materials + geometry helpers. Every toon surface in the game goes through `weather()`:
// a world-space shader pass that grades vertex colours into the drowned-world palette and layers
// grime, rust streaks, tide-line staining and salt crust on top, so nothing reads as clean plastic.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

let gradient: THREE.DataTexture | null = null;
export function toonGradient() {
  if (gradient) return gradient;
  // 4 hard bands with a deep shadow step: contrasty, weathered light instead of soft storybook shading.
  const data = new Uint8Array([58, 58, 58, 255, 118, 118, 118, 255, 196, 196, 196, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const cache = new Map<string, THREE.Material>();

export function vcMat(opts: { emissive?: number; side?: THREE.Side; sway?: boolean; weather?: number } = {}) {
  const key = `vc-${opts.emissive ?? 0}-${opts.side ?? 0}-${opts.sway ? 1 : 0}-${opts.weather ?? 1}`;
  let m = cache.get(key) as THREE.MeshToonMaterial | undefined;
  if (!m) {
    m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonGradient(), side: opts.side ?? THREE.FrontSide });
    if (opts.emissive) m.emissive = new THREE.Color(opts.emissive);
    weather(m, opts.weather ?? 1, !!opts.sway);
    cache.set(key, m);
  }
  return m;
}

export function toonMat(color: THREE.ColorRepresentation, extra: Partial<THREE.MeshToonMaterialParameters> = {}, amount = 1) {
  return weather(new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra }), amount);
}

export const swayUniforms = { uTime: { value: 0 } };

const WEATHER_COMMON = /* glsl */ `
varying vec3 vWxPos;
varying vec3 vWxNrm;
varying float vWxY; // height above the sea, for the tide line
uniform float uWeather;
float wxHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wxNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wxHash(i), wxHash(i + vec3(1,0,0)), f.x), mix(wxHash(i + vec3(0,1,0)), wxHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(wxHash(i + vec3(0,0,1)), wxHash(i + vec3(1,0,1)), f.x), mix(wxHash(i + vec3(0,1,1)), wxHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

const WEATHER_FRAG = /* glsl */ `
{
  vec3 c = diffuseColor.rgb;
  // living plants (saturated green, and nothing else is) are exempt: sun and salt bleach everything but them
  float living = smoothstep(0.16, 0.3, c.g - max(c.r, c.b));
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));
  // grade: bleach saturation the way sun and salt do, pull toward a warm grey-sienna base
  vec3 graded = mix(vec3(lum), c, 0.62) * vec3(1.0, 0.95, 0.87);
  vec3 P = vWxPos;
  float big = wxNoise(P * 0.21);
  float fine = wxNoise(P * 1.7 + 11.0);
  // grime: blotchy oily build-up, heavier in crevices facing down
  float grime = smoothstep(0.42, 0.95, big * 0.7 + fine * 0.45) * (0.55 + 0.45 * (1.0 - max(vWxNrm.y, 0.0)));
  graded = mix(graded, graded * vec3(0.42, 0.38, 0.33), grime * 0.55);
  // rust streaks: noise stretched vertically so it runs down walls; strongest on grey/neutral (metal) surfaces
  float streak = wxNoise(vec3(P.x * 2.3, P.y * 0.16, P.z * 2.3)) * 0.75 + fine * 0.25;
  float metal = 1.0 - smoothstep(0.08, 0.32, sat);
  float rust = smoothstep(0.58, 0.82, streak) * (0.35 + 0.65 * metal) * (1.0 - max(vWxNrm.y, 0.0) * 0.6);
  graded = mix(graded, vec3(0.40, 0.17, 0.07) * (0.7 + lum * 0.6), rust * 0.6);
  // tide line: algae-black stain below, a crust of bone-white salt just above
  float y = vWxY;
  float algae = (1.0 - smoothstep(-0.2, 0.9, y)) * step(-6.0, y);
  graded = mix(graded, vec3(0.09, 0.12, 0.09), algae * (0.45 + fine * 0.3));
  float salt = smoothstep(0.5, 1.0, y) * (1.0 - smoothstep(1.2, 2.6, y)) * smoothstep(0.45, 0.75, fine);
  #ifdef WX_LOCAL
  // no salt crust on moving things: the band is fixed to the sea, so as the boat bobs it would wash up and down over
  // the deck boards and the crew's bodies (it read as a shiny reflection)
  salt = 0.0;
  #endif
  graded = mix(graded, vec3(0.70, 0.67, 0.59), salt * 0.45);
  // sun-bleached tops
  graded = mix(graded, graded * 0.85 + vec3(0.11, 0.105, 0.09), smoothstep(0.75, 1.0, vWxNrm.y) * 0.35);
  diffuseColor.rgb = mix(c, graded, uWeather * (1.0 - living)) + c * living * 0.18;
}
`;

/**
 * Drowned-world weathering for a toon material. `amount` 0..1 scales the whole effect (crew faces get less
 * than steel hulls). Composes with optional foliage sway.
 */
export function weather<M extends THREE.Material>(m: M, amount = 1, sway = false): M {
  const u = { value: amount };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uWeather = u;
    if (sway) shader.uniforms.uTime = swayUniforms.uTime;
    let vs = shader.vertexShader.replace('#include <common>', `#include <common>\n${WEATHER_COMMON}${sway ? 'uniform float uTime;\nattribute float sway;' : ''}`);
    if (sway)
      vs = vs.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 wp = modelMatrix * vec4(transformed, 1.0);
        float ph = wp.x * 0.15 + wp.z * 0.11;
        transformed.x += sin(uTime * 1.4 + ph) * 0.18 * sway;
        transformed.z += cos(uTime * 1.1 + ph * 1.3) * 0.12 * sway;
        transformed.y += sin(uTime * 2.0 + ph) * 0.05 * sway;`
      );
    vs = vs.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      {
        mat4 wxM = modelMatrix;
        #ifdef USE_INSTANCING
        wxM = modelMatrix * instanceMatrix;
        #endif
        vWxPos = (wxM * vec4(transformed, 1.0)).xyz;
        vWxY = vWxPos.y;
        #ifdef WX_LOCAL
        // things that move (the player's boat, crew, captain): the grime/rust/salt pattern is pinned to the model,
        // in metres, so it rides along instead of sliding over the boat as it sails through world-space noise
        vWxPos = transformed * length(wxM[0].xyz);
        #endif
        vWxNrm = normalize(mat3(wxM) * objectNormal);
      }`
    );
    shader.vertexShader = vs;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${WEATHER_COMMON}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${WEATHER_FRAG}`);
  };
  m.customProgramCacheKey = () => `weather-${sway ? 1 : 0}`;
  m.userData.weather = u;
  return m;
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

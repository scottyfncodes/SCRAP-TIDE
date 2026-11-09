// The Drowned World ocean. Gerstner swell (computed identically on CPU for floating objects and on GPU),
// depth-aware colour from silted shallows through dirty teal to oil-black abyss, drifting oil slicks with a
// thin-film sheen, sky + sun reflection, murky subsurface glow on crests, scummy crest/shore foam and
// wind-driven spindrift streaks, a live wake trail, storm swell and day/night lighting.
import * as THREE from 'three';
import { heightAt, isReef, swellFactor } from './terrain';
import { WORLD, STRUCTURES } from '../data/world';
import { smoothstep } from '../core/noise';

const DEPTH_RES = 512;
export const WAKE_N = 24;
/** Seconds a wake puff lasts on a wide screen (was 3.2 s, growing to 6 m radius; now ~2.9 m at most). */
const WAKE_LIFE = 2.3;

// direction (x,z), wavelength, amplitude weight, steepness
const WAVES = [
  [0.94, 0.34, 64, 0.55, 0.45],
  [0.6, -0.8, 33, 0.32, 0.5],
  [-0.42, 0.91, 19, 0.18, 0.55],
  [0.86, 0.51, 9.5, 0.08, 0.5],
] as const;
const K = WAVES.map((w) => (Math.PI * 2) / w[2]);
const W = K.map((k) => Math.sqrt(9.8 * k) * 0.55);

export const oceanState = { storm: 0 };

export function waveAmp(depth: number, swell: number, storm = oceanState.storm) {
  return (0.22 + 0.78 * smoothstep(0.5, 10, depth)) * (1 + swell * 1.6) * (1 + storm * 2.4);
}

export function waveHeight(x: number, z: number, t: number, amp: number) {
  let h = 0;
  for (let i = 0; i < WAVES.length; i++) {
    const [dx, dz, , a] = WAVES[i];
    h += Math.sin(K[i] * (dx * x + dz * z) - W[i] * t) * a;
  }
  return h * amp;
}

function buildDepthTexture() {
  const data = new Uint8Array(DEPTH_RES * DEPTH_RES * 4);
  const half = WORLD.size / 2;
  for (let j = 0; j < DEPTH_RES; j++) {
    for (let i = 0; i < DEPTH_RES; i++) {
      const x = -half + ((i + 0.5) / DEPTH_RES) * WORLD.size;
      const z = -half + ((j + 0.5) / DEPTH_RES) * WORLD.size;
      const h = heightAt(x, z);
      const depth = Math.max(0, -h);
      const k = (j * DEPTH_RES + i) * 4;
      data[k] = Math.min(255, Math.round(Math.sqrt(Math.min(1, depth / 22)) * 255));
      let ring = isReef(x, z) ? 255 : 0;
      // surf where drowned structures break the surface (foam band drawn by the shader, no extra geometry)
      for (const st of STRUCTURES) {
        const rr = st.r * (st.kind === 'container' ? 0.9 : 0.85);
        const d = Math.hypot(x - st.x, z - st.z);
        if (d < rr * 1.25 && d > rr * 0.55) ring = Math.max(ring, 170);
      }
      data[k + 1] = ring;
      data[k + 2] = Math.round(swellFactor(x, z) * 255);
      data[k + 3] = h > 0 ? 255 : 0;
    }
  }
  const tex = new THREE.DataTexture(data, DEPTH_RES, DEPTH_RES, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

const waveGLSL = /* glsl */ `
const vec4 WD[4] = vec4[4](
  vec4(${WAVES.map((w, i) => `${w[0].toFixed(3)}, ${w[1].toFixed(3)}, ${K[i].toFixed(5)}, ${W[i].toFixed(5)}`).join('), vec4(')}));
const vec2 WA[4] = vec2[4](vec2(${WAVES.map((w) => `${w[3].toFixed(3)}, ${w[4].toFixed(3)}`).join('), vec2(')}));
`;

const vert = /* glsl */ `
uniform float uTime;
uniform float uStorm;
uniform sampler2D uDepth;
uniform vec3 uWorld;
varying vec3 vWorld;
varying vec2 vDUv;
varying float vWave;
varying vec3 vN;
${waveGLSL}
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 duv = (wp.xz - uWorld.xy) / uWorld.z;
  vec4 dt = texture2D(uDepth, duv);
  float depth = dt.r * dt.r * 22.0;
  float swell = dt.b;
  float amp = (0.22 + 0.78 * smoothstep(0.5, 10.0, depth)) * (1.0 + swell * 1.6) * (1.0 + uStorm * 2.4);
  vec2 p = wp.xz;
  float h = 0.0;
  vec2 disp = vec2(0.0);
  vec3 n = vec3(0.0, 1.0, 0.0);
  for (int i = 0; i < 4; i++) {
    vec2 d = WD[i].xy; float k = WD[i].z; float w = WD[i].w;
    float a = WA[i].x * amp;
    float ph = k * dot(d, p) - w * uTime;
    float s = sin(ph), c = cos(ph);
    h += a * s;
    disp += d * (WA[i].y * a * c * 0.8);
    n.xz -= d * (k * a * c);
  }
  wp.xz += disp;
  wp.y += h;
  vWave = h / max(amp, 0.001);
  vN = normalize(n);
  vWorld = wp.xyz;
  vDUv = duv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */ `
uniform float uTime;
uniform float uStorm;
uniform float uNight;
uniform sampler2D uDepth;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uSkyColor;
uniform vec3 uSkyTop;
uniform vec3 uAmbient;
uniform vec4 uWake[${WAKE_N}];
uniform vec2 uWakeShape; // x: size scale, y: lifetime (s)
uniform vec4 uHull;      // the player's hull: x, z, forward (sin, cos heading)
uniform vec4 uHullSize;  // waterline half-length, half-beam, twin-hull offset, speed 0..1 (half-length 0: no collar)
uniform sampler2D uChop; // GITCRAFT WorldCraft FFT chop normal tile (24 m, 9 m/s wind at 20°)
uniform float uChopK;    // 0 until the tile has loaded (the swell normal alone is used)
varying vec3 vWorld;
varying vec2 vDUv;
varying float vWave;
varying vec3 vN;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float caustic(vec2 p, float t){
  vec2 q = p * 0.35;
  float a = sin(q.x + t*0.8 + sin(q.y*1.3 + t*0.6));
  float b = sin(q.y*1.1 - t*0.7 + sin(q.x*0.9 - t*0.5));
  return smoothstep(0.35, 0.0, abs(a + b));
}

void main() {
  vec4 dt = texture2D(uDepth, vDUv);
  float depth = dt.r * dt.r * 22.0;
  float reef = dt.g;
  float swell = dt.b;
  vec2 p = vWorld.xz;
  float t = uTime;
  // inside the player's hull there is no sea: the hull floor sits below the waterline, and the see-through surface
  // (sky reflection, glitter, foam) was drawn as a sheet across the deck and around the crew's feet. Cut a hull-shaped
  // hole a little inside the waterline footprint: full-width amidships and at the transom, pointed at the bow.
  if (uHullSize.x > 0.0) {
    vec2 hq = p - uHull.xy;
    float ax = abs(dot(hq, vec2(uHull.w, -uHull.z))) - uHullSize.z;
    float al = dot(hq, uHull.zw) / uHullSize.x;
    float hw = uHullSize.y * (al > 0.0 ? 1.0 - al * al : sqrt(max(0.0, 1.0 - al * al)));
    if (abs(al) < 0.96 && ax < hw - 0.06) discard;
  }

  // wind chop on top of the swell normal: the GITCRAFT FFT tile at two scales, drifting across each other
  // downwind, so the surface never repeats visibly; the fine layer fades with distance (no shimmer at the horizon)
  float rip = 0.9 + uStorm * 1.2;
  float camD = length(cameraPosition.xz - p);
  float nearK = 1.0 - smoothstep(20.0, 90.0, camD);
  float midK = 1.0 - smoothstep(60.0, 420.0, camD);
  vec2 wdir = vec2(0.94, 0.34);
  vec2 c1 = texture2D(uChop, p / 24.0 - wdir * t * 0.022).xy * 2.0 - 1.0;
  vec2 q = mat2(0.8, -0.6, 0.6, 0.8) * p / 8.5;
  vec2 c2 = texture2D(uChop, q + vec2(-0.031, 0.024) * t).xy * 2.0 - 1.0;
  vec2 slope = (c1 * (1.0 + 0.4 * midK) + c2 * 1.1 * nearK) * rip * 1.5 * uChopK;
  vec3 N = normalize(vN + vec3(slope.x, 0.0, slope.y));
  // the sky reflection follows a gentler normal: at sunset a low, bright horizon reflected through every chop tilt
  // turned the sea into pale camouflage blotches; the full chop still drives the sun glitter below
  vec3 Nsky = normalize(vN + vec3(slope.x, 0.0, slope.y) * 0.16);
  vec3 Nflat = normalize(vN);

  // depth colour (SCRAP TIDE, BEAUTIFUL RUIN): sandy shallows -> luminous Sea Glass shelf -> Abyss Blue open water ->
  // ink-blue deep. Beautiful from a distance; the silt, oil and scum below keep it weathered up close.
  // (visual cohesion pass: a little less chroma and a touch of warmth, so the sea sits in the same sun-faded world
  // as the salvage on it instead of reading as a separate, photographic layer)
  vec3 cShore = vec3(0.22, 0.28, 0.22);
  vec3 cShelf = vec3(0.030, 0.165, 0.170);
  vec3 cOpen = vec3(0.018, 0.078, 0.108);
  vec3 cDeep = vec3(0.010, 0.040, 0.066);
  vec3 cAbyss = vec3(0.005, 0.018, 0.035);
  vec3 col = mix(cShore, cShelf, smoothstep(0.0, 1.8, depth));
  col = mix(col, cOpen, smoothstep(1.8, 7.0, depth));
  col = mix(col, cDeep, smoothstep(7.0, 16.0, depth));
  col = mix(col, cAbyss, smoothstep(15.0, 22.0, depth) * 0.8 + swell * 0.3);
  col = mix(col, col * vec3(0.62, 0.64, 0.62), uStorm * 0.6);
  // suspended silt churns the shallows
  col = mix(col, vec3(0.24, 0.22, 0.15), (1.0 - smoothstep(0.0, 4.0, depth)) * noise(p * 0.08 + t * 0.03) * 0.25);

  float cs = caustic(p, t) * (1.0 - smoothstep(0.5, 6.0, depth));
  col += cs * vec3(0.08, 0.16, 0.14) * (1.0 - uNight * 0.8);

  // oil slicks: slow-drifting patches that flatten the chop and shimmer with a thin-film sheen
  float oilN = noise(p * 0.016 + vec2(t * 0.004, -t * 0.003)) * 0.75 + noise(p * 0.06 - t * 0.01) * 0.25;
  float oil = smoothstep(0.68, 0.76, oilN) * smoothstep(1.0, 4.0, depth);
  col *= uAmbient;
  N = normalize(mix(N, Nflat, oil * 0.8));

  vec3 V = normalize(cameraPosition - vWorld);
  // subsurface: Sea Glass light through the back of the crests
  float sss = pow(max(0.0, dot(V, -uSunDir) + 0.3), 2.0) * max(0.0, vWave) * (1.0 - uNight);
  col += vec3(0.02, 0.20, 0.21) * sss * 0.85;
  // the slick itself: a tarry darkening with an iridescent film that shifts with view angle
  float film = noise(p * 0.21 + t * 0.02) * 2.0 + dot(N, V) * 3.0;
  vec3 sheen = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + film));
  col = mix(col, col * 0.3 + mix(vec3(0.05, 0.04, 0.035), sheen * vec3(0.07, 0.06, 0.075), 0.55) * (1.0 - uNight * 0.7) * uAmbient, oil * 0.85);

  // reflections
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(Nsky, V), 0.0), 5.0);
  vec3 R = reflect(-V, Nsky);
  vec3 sky = mix(uSkyColor, uSkyTop, smoothstep(0.0, 0.45, R.y));
  // the sky's reflection laid on in soft-edged bands, like the toon light on everything else, instead of a smooth
  // photographic gradient (which also broke into cloudy blotches through the chop)
  float fr = clamp(fres * 0.62, 0.0, 0.7) * 4.0;
  fr = (floor(fr) + smoothstep(0.3, 0.7, fract(fr))) / 4.0;
  col = mix(col, sky * vec3(0.82, 0.86, 0.85), fr);
  vec3 H = normalize(uSunDir + V);
  float ndh = max(dot(N, H), 0.0);
  // glints are crisp, cut-out highlights (the toon world's language), with a faint soft sheen under them
  float glint = pow(ndh, mix(1400.0, 200.0, uStorm));
  float spec = smoothstep(0.12, 0.3, glint) * 0.75 + glint * 0.15 + pow(ndh, 90.0) * 0.03 + pow(ndh, 600.0) * oil * 0.8;
  col += uSunColor * spec * mix(1.1, 0.45, uNight) * (1.0 - uStorm * 0.7);

  // foam: shoreline, reef breakers, wave crests (more in storms), and the boat's wake
  float fn = noise(p * 0.9 + vec2(t*0.6, -t*0.3));
  float shoreBand = 1.0 - smoothstep(0.0, 0.55 + fn*0.35, depth);
  float pulse = 0.5 + 0.5 * sin(depth * 9.0 - t * 2.4 + fn * 3.0);
  float foam = shoreBand * (0.55 + 0.45 * pulse);
  foam = max(foam, reef * smoothstep(0.35, 0.75, fn + 0.25 * sin(t*3.0 + p.x*0.4)));
  // whitecaps: crests break into torn lace, never solid blobs of paint
  float lace = smoothstep(0.32, 0.78, noise(p * 2.3 + vec2(t * 0.9, t * 0.4)) * 0.7 + noise(p * 6.1 - t * 0.5) * 0.3);
  foam = max(foam, smoothstep(0.55 - uStorm * 0.25, 0.95, vWave + fn*0.35) * (0.2 + swell*0.5 + uStorm * 0.8) * (0.35 + 0.75 * lace));
  float wk = 0.0;
  for (int i = 0; i < ${WAKE_N}; i++) {
    vec4 w = uWake[i];
    if (w.w <= 0.0) continue;
    float d = length(p - w.xy);
    float width = (1.1 + w.z * 0.78) * uWakeShape.x;
    float fade = 1.0 - smoothstep(0.0, uWakeShape.y, w.z);
    float ring = smoothstep(width, width * 0.35, d) * w.w * fade;
    wk = max(wk, ring);
  }
  foam = max(foam, wk * smoothstep(0.25, 0.7, fn + 0.35));
  // hull collar: water piles up and breaks into foam where it meets the hull, so the boat sits IN the sea; a bow
  // wave builds with speed
  if (uHullSize.x > 0.0) {
    vec2 hd = p - uHull.xy;
    vec2 lp = vec2(abs(dot(hd, vec2(uHull.w, -uHull.z))) - uHullSize.z, dot(hd, uHull.zw));
    float al = lp.y / uHullSize.x;
    float e = length(vec2(lp.x / uHullSize.y, al));
    float dm = (e - 1.0) * uHullSize.y;
    float bow = smoothstep(0.2, 1.0, al) * uHullSize.w;
    float reach = 0.32 + bow * 0.9 + uHullSize.w * 0.25;
    float collar = smoothstep(-0.12, 0.04, dm) * (1.0 - smoothstep(reach * 0.3, reach, dm));
    float churn = 0.55 + 0.45 * noise(p * 3.1 + vec2(t * 1.3, -t * 0.9));
    foam = max(foam, collar * churn * (0.75 + bow * 0.5));
  }
  // spindrift: long scum lines blown along the wind, thicker in a blow
  vec2 wd = normalize(vec2(0.94, 0.34));
  float along = dot(p, wd), across = dot(p, vec2(-wd.y, wd.x));
  float streaks = smoothstep(0.78, 0.96, noise(vec2(along * 0.025 - t * 0.12, across * 0.55)) * 0.8 + noise(p * 0.4) * 0.2);
  foam = max(foam, streaks * (0.35 + uStorm * 0.6) * smoothstep(2.0, 6.0, depth));
  foam *= 1.0 - oil * 0.7;
  foam = smoothstep(0.4, 0.72, foam);
  // foam here is never white: salt-scum the colour of old bone, stained by the water under it
  vec3 foamCol = mix(vec3(0.78, 0.76, 0.68), uSkyColor, 0.18) * (uAmbient * 0.6 + 0.4);
  foamCol *= 0.85 + 0.15 * fn;
  col = mix(col, foamCol, foam * 0.82);

  float alpha = mix(0.5, 0.97, smoothstep(0.0, 6.0, depth));
  alpha = max(alpha, foam * 0.95);

  // the same highlight shoulder as the toon materials (materials.ts GRADE_FRAG)
  vec3 over = max(col - 0.72, 0.0);
  col = min(col, 0.72) + over / (1.0 + over * 2.6);

  float dist = length(cameraPosition - vWorld);
  float fog = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fog);
  alpha = mix(alpha, 1.0, fog);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;

export class Ocean {
  mesh: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  private step: number;
  private wake: THREE.Vector4[] = [];
  private wakeHead = 0;
  private wakeTimer = 0;

  constructor(scene: THREE.Scene) {
    const tex = buildDepthTexture();
    const half = WORLD.size / 2;
    for (let i = 0; i < WAKE_N; i++) this.wake.push(new THREE.Vector4(0, 0, 0, 0));
    this.uniforms = {
      uTime: { value: 0 },
      uStorm: { value: 0 },
      uNight: { value: 0 },
      uDepth: { value: tex },
      uWorld: { value: new THREE.Vector3(-half, -half, WORLD.size) },
      uSunDir: { value: new THREE.Vector3(0.5, 0.6, -0.4).normalize() },
      uSunColor: { value: new THREE.Color('#fff4dc') },
      uFogColor: { value: new THREE.Color('#c1e5ee') },
      uFogNear: { value: 240 },
      uFogFar: { value: 1000 },
      uSkyColor: { value: new THREE.Color('#c4ebf4') },
      uSkyTop: { value: new THREE.Color('#2f86d8') },
      uAmbient: { value: new THREE.Color(1, 1, 1) },
      uWake: { value: this.wake },
      uWakeShape: { value: new THREE.Vector2(1, WAKE_LIFE) },
      uHull: { value: new THREE.Vector4(0, 0, 0, 1) },
      uHullSize: { value: new THREE.Vector4(0, 1, 0, 0) },
      uChop: { value: null },
      uChopK: { value: 0 },
    };
    // wind chop: a tileable Tessendorf FFT normal map from GITCRAFT WorldCraft (creative/ocean), 69 KB
    new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/tb_sea_chop_normal.png`, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
      this.uniforms.uChop.value = t;
      this.uniforms.uChopK.value = 1;
    });
    // denser near the centre (the camera), coarser at the horizon
    const size = 2200;
    const segs = 240;
    this.step = (size / segs) * 0.62; // centre vertex spacing: snapping by it keeps vertices from swimming
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const r = Math.hypot(x, z) / (size / 2);
      const k = r < 0.12 ? 1 : 1 + (r - 0.12) * 1.6; // stretch outer rings so detail concentrates near the boat
      pos.setXYZ(i, x * k * 0.62, 0, z * k * 0.62);
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050a0b }));
    floor.position.y = -21;
    scene.add(floor);
  }

  /**
   * Narrow (portrait phone) screens see the wake trail close and large; shrink the puffs and shorten their life
   * there. aspect = width / height.
   */
  setWakeAspect(aspect: number) {
    const k = Math.min(1, Math.max(0.45, aspect));
    this.uniforms.uWakeShape.value.set(0.7 + 0.3 * k, WAKE_LIFE * (0.75 + 0.25 * k));
  }

  /** Where the player's hull meets the water (the foam collar). halfLen 0 hides it (the captain is ashore). */
  setHull(x: number, z: number, heading: number, halfLen: number, halfBeam: number, twinOffset: number, speed01: number) {
    this.uniforms.uHull.value.set(x, z, Math.sin(heading), Math.cos(heading));
    this.uniforms.uHullSize.value.set(halfLen, halfBeam, twinOffset, speed01);
  }

  /** Drop a wake point (call while the boat moves). strength 0..1 */
  addWake(x: number, z: number, strength: number, dt: number) {
    this.wakeTimer -= dt;
    if (this.wakeTimer > 0) return;
    this.wakeTimer = 0.095; // close enough that the puffs overlap into one trail
    const w = this.wake[this.wakeHead];
    w.set(x, z, 0, strength);
    this.wakeHead = (this.wakeHead + 1) % WAKE_N;
  }

  update(t: number, dt: number, focus: THREE.Vector3) {
    this.uniforms.uTime.value = t;
    for (const w of this.wake) if (w.w > 0) {
      w.z += dt;
      if (w.z > this.uniforms.uWakeShape.value.y) w.w = 0;
    }
    this.mesh.position.x = Math.round(focus.x / this.step) * this.step;
    this.mesh.position.z = Math.round(focus.z / this.step) * this.step;
  }

  /** Surface height + approximate slope for floating objects. */
  sample(x: number, z: number, t: number) {
    const h = heightAt(x, z);
    const depth = Math.max(0, -h);
    const amp = waveAmp(depth, swellFactor(x, z));
    const y = waveHeight(x, z, t, amp);
    const yx = waveHeight(x + 1, z, t, amp);
    const yz = waveHeight(x, z + 1, t, amp);
    return { y, dx: yx - y, dz: yz - y, depth };
  }
}

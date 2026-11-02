// The Drowned World ocean. Gerstner swell (computed identically on CPU for floating objects and on GPU),
// depth-aware colour from turquoise shelf to abyss, sky + sun reflection, subsurface glow on crests,
// crest and shoreline foam, a live wake trail behind the boat, storm swell and day/night lighting.
import * as THREE from 'three';
import { heightAt, isReef, swellFactor } from './terrain';
import { WORLD, STRUCTURES } from '../data/world';
import { smoothstep } from '../core/noise';

const DEPTH_RES = 512;
export const WAKE_N = 20;

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

  // ripple detail on top of the swell normal
  float e = 0.5;
  vec2 o1 = vec2(t*0.35, t*0.2), o2 = vec2(t*0.25, -t*0.4);
  float n0 = noise(p*0.3 + o1) + noise(p*0.75 - o2)*0.5;
  float nx = noise((p+vec2(e,0.0))*0.3 + o1) + noise((p+vec2(e,0.0))*0.75 - o2)*0.5;
  float nz = noise((p+vec2(0.0,e))*0.3 + o1) + noise((p+vec2(0.0,e))*0.75 - o2)*0.5;
  float rip = 0.9 + uStorm * 1.2;
  // a fine octave near the camera breaks big glints into glitter
  vec2 o3 = vec2(-t*0.6, t*0.45);
  float f0 = noise(p*2.1 + o3), fx = noise((p+vec2(0.25,0.0))*2.1 + o3), fz = noise((p+vec2(0.0,0.25))*2.1 + o3);
  float nearK = 1.0 - smoothstep(20.0, 90.0, length(cameraPosition.xz - p));
  vec3 N = normalize(vN + vec3((n0-nx)*rip + (f0-fx)*0.9*nearK, 0.0, (n0-nz)*rip + (f0-fz)*0.9*nearK));

  // depth colour: shore → turquoise shelf → open water → deep → abyss
  vec3 cShore = vec3(0.30, 0.86, 0.78);
  vec3 cShelf = vec3(0.03, 0.62, 0.62);
  vec3 cOpen = vec3(0.012, 0.25, 0.42);
  vec3 cDeep = vec3(0.004, 0.09, 0.22);
  vec3 cAbyss = vec3(0.002, 0.035, 0.11);
  vec3 col = mix(cShore, cShelf, smoothstep(0.0, 1.8, depth));
  col = mix(col, cOpen, smoothstep(1.8, 7.0, depth));
  col = mix(col, cDeep, smoothstep(7.0, 16.0, depth));
  col = mix(col, cAbyss, smoothstep(15.0, 22.0, depth) * 0.85 + swell * 0.35);
  col = mix(col, col * vec3(0.55, 0.62, 0.66), uStorm * 0.6);

  float cs = caustic(p, t) * (1.0 - smoothstep(0.5, 6.0, depth));
  col += cs * vec3(0.28, 0.36, 0.32) * (1.0 - uNight * 0.8);
  col *= uAmbient;

  vec3 V = normalize(cameraPosition - vWorld);
  // subsurface: light through the back of the crests
  float sss = pow(max(0.0, dot(V, -uSunDir) + 0.3), 2.0) * max(0.0, vWave) * (1.0 - uNight);
  col += vec3(0.02, 0.32, 0.30) * sss * 0.9;

  // reflections
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uSkyColor, uSkyTop, smoothstep(0.0, 0.6, R.y));
  col = mix(col, sky, clamp(fres * 0.85, 0.0, 0.9));
  vec3 H = normalize(uSunDir + V);
  float ndh = max(dot(N, H), 0.0);
  float spec = pow(ndh, mix(1400.0, 200.0, uStorm)) * 0.75 + pow(ndh, 90.0) * 0.035;
  col += uSunColor * spec * mix(1.1, 0.45, uNight) * (1.0 - uStorm * 0.7);

  // foam: shoreline, reef breakers, wave crests (more in storms), and the boat's wake
  float fn = noise(p * 0.9 + vec2(t*0.6, -t*0.3));
  float shoreBand = 1.0 - smoothstep(0.0, 0.55 + fn*0.35, depth);
  float pulse = 0.5 + 0.5 * sin(depth * 9.0 - t * 2.4 + fn * 3.0);
  float foam = shoreBand * (0.55 + 0.45 * pulse);
  foam = max(foam, reef * smoothstep(0.35, 0.75, fn + 0.25 * sin(t*3.0 + p.x*0.4)));
  foam = max(foam, smoothstep(0.55 - uStorm * 0.25, 0.95, vWave + fn*0.35) * (0.2 + swell*0.5 + uStorm * 0.8));
  float wk = 0.0;
  for (int i = 0; i < ${WAKE_N}; i++) {
    vec4 w = uWake[i];
    if (w.w <= 0.0) continue;
    float d = length(p - w.xy);
    float width = 0.9 + w.z * 1.6;
    float ring = smoothstep(width, width * 0.35, d) * w.w * (1.0 - smoothstep(0.0, 3.2, w.z));
    wk = max(wk, ring);
  }
  foam = max(foam, wk * smoothstep(0.25, 0.7, fn + 0.35));
  foam = smoothstep(0.45, 0.6, foam);
  vec3 foamCol = mix(vec3(0.95, 0.99, 1.0), uSkyColor, 0.15) * (uAmbient * 0.6 + 0.4);
  col = mix(col, foamCol, foam * 0.92);

  float alpha = mix(0.5, 0.97, smoothstep(0.0, 6.0, depth));
  alpha = max(alpha, foam * 0.95);

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
    };
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

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x061a33 }));
    floor.position.y = -21;
    scene.add(floor);
  }

  /** Drop a wake point (call while the boat moves). strength 0..1 */
  addWake(x: number, z: number, strength: number, dt: number) {
    this.wakeTimer -= dt;
    if (this.wakeTimer > 0) return;
    this.wakeTimer = 0.14;
    const w = this.wake[this.wakeHead];
    w.set(x, z, 0, strength);
    this.wakeHead = (this.wakeHead + 1) % WAKE_N;
  }

  update(t: number, dt: number, focus: THREE.Vector3) {
    this.uniforms.uTime.value = t;
    for (const w of this.wake) if (w.w > 0) {
      w.z += dt;
      if (w.z > 3.2) w.w = 0;
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

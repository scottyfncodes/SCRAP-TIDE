// Stylized ocean: depth-aware color bands, shoreline foam, caustics, sun glints.
// Waves are computed identically on CPU (for boat bobbing) and GPU.
import * as THREE from 'three';
import { heightAt, isReef, swellFactor } from './terrain';
import { WORLD } from '../data/world';
import { smoothstep } from '../core/noise';

const DEPTH_RES = 384;

export function waveAmp(depth: number, swell: number) {
  return (0.25 + 0.75 * smoothstep(0.5, 10, depth)) * (1 + swell * 2.2);
}

export function waveHeight(x: number, z: number, t: number, amp: number) {
  const h =
    Math.sin(x * 0.09 + t * 1.1) * 0.32 +
    Math.sin(z * 0.07 + x * 0.03 - t * 0.9) * 0.28 +
    Math.sin((x + z) * 0.16 + t * 1.7) * 0.1;
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
      data[k] = Math.min(255, Math.round(Math.sqrt(Math.min(1, depth / 22)) * 255)); // sqrt for shallow precision
      data[k + 1] = isReef(x, z) ? 255 : 0;
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

const vert = /* glsl */ `
uniform float uTime;
uniform sampler2D uDepth;
uniform vec3 uWorld;
varying vec3 vWorld;
varying vec2 vDUv;
varying float vWave;

float waveH(vec2 p, float t, float amp) {
  float h = sin(p.x * 0.09 + t * 1.1) * 0.32
          + sin(p.y * 0.07 + p.x * 0.03 - t * 0.9) * 0.28
          + sin((p.x + p.y) * 0.16 + t * 1.7) * 0.10;
  return h * amp;
}
float sq(float x){ return x*x; }
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec2 duv = (wp.xz - uWorld.xy) / uWorld.z;
  vec4 dt = texture2D(uDepth, duv);
  float depth = sq(dt.r) * 22.0;
  float swell = dt.b;
  float amp = (0.25 + 0.75 * smoothstep(0.5, 10.0, depth)) * (1.0 + swell * 2.2);
  float h = waveH(wp.xz, uTime, amp);
  wp.y += h;
  vWave = h / max(amp, 0.001);
  vWorld = wp.xyz;
  vDUv = duv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const frag = /* glsl */ `
uniform float uTime;
uniform sampler2D uDepth;
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform float uFogNear;
uniform float uFogFar;
uniform vec3 uSkyColor;
varying vec3 vWorld;
varying vec2 vDUv;
varying float vWave;

vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
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
  float c = abs(a + b);
  return smoothstep(0.35, 0.0, c);
}

void main() {
  vec4 dt = texture2D(uDepth, vDUv);
  float depth = dt.r * dt.r * 22.0;
  float reef = dt.g;
  float swell = dt.b;

  // Detail normal from analytic-ish ripples.
  vec2 p = vWorld.xz;
  float t = uTime;
  float e = 0.6;
  float n0 = noise(p*0.25 + vec2(t*0.35, t*0.2)) + noise(p*0.6 - vec2(t*0.25, -t*0.4))*0.5;
  float nx = noise((p+vec2(e,0.0))*0.25 + vec2(t*0.35, t*0.2)) + noise((p+vec2(e,0.0))*0.6 - vec2(t*0.25, -t*0.4))*0.5;
  float nz = noise((p+vec2(0.0,e))*0.25 + vec2(t*0.35, t*0.2)) + noise((p+vec2(0.0,e))*0.6 - vec2(t*0.25, -t*0.4))*0.5;
  vec3 N = normalize(vec3((n0-nx)*1.4, 1.0, (n0-nz)*1.4));

  // Depth color bands — turquoise shallows to cobalt deep.
  vec3 cShore = lin(vec3(0.55, 0.95, 0.88));
  vec3 cShallow = lin(vec3(0.18, 0.84, 0.80));
  vec3 cMid = lin(vec3(0.07, 0.58, 0.76));
  vec3 cDeep = lin(vec3(0.07, 0.30, 0.62));
  vec3 cAbyss = lin(vec3(0.05, 0.17, 0.45));
  vec3 col = mix(cShore, cShallow, smoothstep(0.0, 1.6, depth));
  col = mix(col, cMid, smoothstep(1.6, 5.5, depth));
  col = mix(col, cDeep, smoothstep(5.5, 13.0, depth));
  col = mix(col, cAbyss, smoothstep(13.0, 21.0, depth) * 0.8 + swell * 0.3);

  // Caustics dancing over sandy shallows.
  float cs = caustic(p, t) * (1.0 - smoothstep(0.5, 6.0, depth));
  col += cs * lin(vec3(0.55, 0.62, 0.58));

  // Lighting: soft diffuse + stylized sun glint + fresnel sky.
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col = mix(col, uSkyColor, fres * 0.45);
  vec3 H = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 180.0);
  col += smoothstep(0.35, 0.6, spec) * vec3(1.0, 0.95, 0.8) * 0.9;

  // Foam: shoreline, reef breakers, and wave crests in the open swell.
  float fn = noise(p * 0.9 + vec2(t*0.6, -t*0.3));
  float shoreBand = 1.0 - smoothstep(0.0, 0.55 + fn*0.35, depth);
  float pulse = 0.5 + 0.5 * sin(depth * 9.0 - t * 2.4 + fn * 3.0);
  float foam = shoreBand * (0.55 + 0.45 * pulse);
  foam = max(foam, reef * smoothstep(0.35, 0.75, fn + 0.25 * sin(t*3.0 + p.x*0.4)) );
  foam = max(foam, smoothstep(0.62, 0.9, vWave + fn*0.35) * (0.25 + swell*0.75));
  foam = smoothstep(0.45, 0.6, foam);
  col = mix(col, vec3(0.97, 1.0, 1.0), foam * 0.9);

  float alpha = mix(0.42, 0.97, smoothstep(0.0, 6.0, depth));
  alpha = max(alpha, foam * 0.95);

  // Fog to horizon.
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

  constructor(scene: THREE.Scene, sunDir: THREE.Vector3, fog: { color: THREE.Color; near: number; far: number }, sky: THREE.Color) {
    const tex = buildDepthTexture();
    const half = WORLD.size / 2;
    this.uniforms = {
      uTime: { value: 0 },
      uDepth: { value: tex },
      uWorld: { value: new THREE.Vector3(-half, -half, WORLD.size) },
      uSunDir: { value: sunDir.clone().normalize() },
      uFogColor: { value: fog.color.clone() },
      uFogNear: { value: fog.near },
      uFogFar: { value: fog.far },
      uSkyColor: { value: sky.clone() },
    };
    const size = 1500;
    const segs = 220;
    this.step = size / segs;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
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

    // Deep floor plane so the deep sea never looks hollow.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x0d2a5c })
    );
    floor.position.y = -21;
    scene.add(floor);
  }

  update(t: number, focus: THREE.Vector3) {
    this.uniforms.uTime.value = t;
    // snap to grid so vertices don't swim
    this.mesh.position.x = Math.round(focus.x / this.step) * this.step;
    this.mesh.position.z = Math.round(focus.z / this.step) * this.step;
  }

  /** Surface height + approximate normal for floating objects. */
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

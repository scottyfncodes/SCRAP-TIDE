// Flipbook effects from GITCRAFT FXCraft (creative/effects/flipbooks → public/fx): salvage and harpoon splashes,
// harpoon sparks, lightning, engine smoke, bow-slam spray in a swell, and sheets of Stormwall rain.
// Plain three.js billboards (no particle library): one quad and one draw call per live effect, from small fixed pools.
// A quality governor drops to a low budget (fewer bursts, no smoke, bow spray or rain sheets) when the frame
// rate sags, or on `?fx=low`; `?fx=high` pins the full budget. Nothing here changes how the game plays.
import * as THREE from 'three';

type Kind = 'splash' | 'sparks' | 'lightning' | 'smoke' | 'rain';
const FILES: Record<Kind, { file: string; grid: number; fps: number; loop: boolean; additive: boolean }> = {
  splash: { file: 'fx_splash', grid: 4, fps: 24, loop: false, additive: false },
  sparks: { file: 'fx_harpoon_sparks', grid: 4, fps: 24, loop: false, additive: true },
  lightning: { file: 'fx_lightning', grid: 4, fps: 24, loop: false, additive: true },
  smoke: { file: 'fx_engine_smoke', grid: 4, fps: 12, loop: true, additive: false },
  rain: { file: 'fx_rain', grid: 4, fps: 24, loop: true, additive: false },
};
/** Live-effect budget per kind: [high, low]. */
export const FX_BUDGET: Record<Kind, [number, number]> = { splash: [6, 2], sparks: [4, 2], lightning: [2, 1], smoke: [1, 0], rain: [2, 0] };

const VERT = /* glsl */ `
uniform vec2 uScale;
uniform float uUpright;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  // camera-facing quad; uUpright keeps it standing (rain, smoke, bolts) by using the world up in view space
  vec3 up = mix(vec3(0.0, 1.0, 0.0), normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), uUpright);
  vec3 right = normalize(cross(up, vec3(0.0, 0.0, 1.0)));
  mv.xyz += right * position.x * uScale.x + up * position.y * uScale.y;
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform float uFrame;
uniform float uGrid;
uniform float uOpacity;
uniform vec3 uTint;
uniform float uSoft;
varying vec2 vUv;
void main() {
  float f = floor(uFrame);
  vec2 cell = vec2(mod(f, uGrid), uGrid - 1.0 - floor(f / uGrid));
  vec4 c = texture2D(uMap, (cell + vUv) / uGrid);
  // big sheets (rain) feather out at their edges so the quad never shows
  float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
  gl_FragColor = vec4(c.rgb * uTint, c.a * uOpacity * mix(1.0, edge, uSoft));
}`;

interface Live {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  t: number;
  life: number;
  kind: Kind;
}

export function fxQualityFromUrl(search: string): 'high' | 'low' | null {
  const q = new URLSearchParams(search).get('fx');
  return q === 'low' || q === 'high' ? q : null;
}

export class FlipFX {
  quality: 'high' | 'low' = 'high';
  private pinned: boolean;
  private tex = new Map<Kind, THREE.Texture>();
  private pools = new Map<Kind, Live[]>();
  private geo = new THREE.PlaneGeometry(1, 1);
  private slow = 0;
  private played = 0;
  onQuality: ((q: 'high' | 'low') => void) | null = null;

  constructor(private scene: THREE.Scene) {
    const forced = typeof location !== 'undefined' ? fxQualityFromUrl(location.search) : null;
    this.pinned = !!forced;
    if (forced) this.quality = forced;
    const loader = new THREE.TextureLoader();
    const base = `${import.meta.env.BASE_URL}fx/`;
    for (const k of Object.keys(FILES) as Kind[]) {
      loader.load(
        `${base}${FILES[k].file}.png`,
        (t) => {
          t.colorSpace = THREE.NoColorSpace; // the shader writes the atlas colours straight out
          t.generateMipmaps = false;
          t.minFilter = THREE.LinearFilter;
          this.tex.set(k, t);
        },
        undefined,
        () => {}, // a missing atlas just means no flipbook for that effect
      );
    }
  }

  private budget(k: Kind) {
    return FX_BUDGET[k][this.quality === 'high' ? 0 : 1];
  }

  private acquire(k: Kind): Live | null {
    const tex = this.tex.get(k);
    if (!tex) return null;
    let pool = this.pools.get(k);
    if (!pool) this.pools.set(k, (pool = []));
    let l = pool.find((p) => !p.mesh.visible);
    if (!l) {
      if (pool.length >= this.budget(k)) {
        if (!pool.length) return null;
        l = pool.reduce((a, b) => (a.t / a.life > b.t / b.life ? a : b)); // recycle the oldest
      } else {
        const f = FILES[k];
        const mat = new THREE.ShaderMaterial({
          vertexShader: VERT,
          fragmentShader: FRAG,
          uniforms: {
            uMap: { value: tex },
            uFrame: { value: 0 },
            uGrid: { value: f.grid },
            uOpacity: { value: 1 },
            uTint: { value: new THREE.Color(1, 1, 1) },
            uScale: { value: new THREE.Vector2(1, 1) },
            uUpright: { value: 0 },
            uSoft: { value: k === 'rain' ? 1 : 0 },
          },
          transparent: true,
          depthWrite: false,
          blending: f.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        const mesh = new THREE.Mesh(this.geo, mat);
        mesh.frustumCulled = false;
        mesh.renderOrder = 4;
        mesh.visible = false;
        this.scene.add(mesh);
        l = { mesh, mat, t: 0, life: 1, kind: k };
        pool.push(l);
      }
    }
    return l;
  }

  /** A one-shot effect at `p`, `w` metres wide (`h` tall, default square). */
  burst(kind: 'splash' | 'sparks' | 'lightning', p: THREE.Vector3, w: number, h = w, opacity = 1) {
    const l = this.acquire(kind);
    if (!l) return;
    const f = FILES[kind];
    l.t = 0;
    l.life = (f.grid * f.grid) / f.fps;
    l.mesh.position.copy(p);
    l.mat.uniforms.uScale.value.set(w, h);
    l.mat.uniforms.uUpright.value = kind === 'lightning' ? 1 : 0;
    l.mat.uniforms.uOpacity.value = opacity;
    l.mat.uniforms.uFrame.value = 0;
    l.mesh.visible = true;
  }

  private smoke: Live | null = null;
  private rain: Live[] = [];
  private v = new THREE.Vector3();

  /** `exhaust`: world position of the engine exhaust while motoring (null when the engine is off or you're ashore). */
  update(dt: number, camera: THREE.Camera, exhaust: THREE.Vector3 | null, storm: number) {
    this.governor(dt);
    for (const pool of this.pools.values())
      for (const l of pool) {
        if (!l.mesh.visible) continue;
        const f = FILES[l.kind];
        l.t += dt;
        if (f.loop) l.mat.uniforms.uFrame.value = (l.t * f.fps) % (f.grid * f.grid);
        else if (l.t >= l.life) l.mesh.visible = false;
        else l.mat.uniforms.uFrame.value = Math.min(f.grid * f.grid - 1, l.t * f.fps);
      }
    // engine smoke: one thin, faint plume that rises off the exhaust, only on the high budget
    if (exhaust && this.budget('smoke')) {
      if (!this.smoke || this.smoke.kind !== 'smoke') this.smoke = this.acquire('smoke');
      if (this.smoke) {
        const m = this.smoke.mat.uniforms;
        this.smoke.mesh.visible = true;
        this.smoke.mesh.position.copy(exhaust).y += 0.85;
        m.uScale.value.set(0.7, 1.7);
        m.uUpright.value = 1;
        m.uOpacity.value = Math.min(0.32, (m.uOpacity.value as number) + dt * 0.6);
      }
    } else if (this.smoke) {
      const m = this.smoke.mat.uniforms;
      m.uOpacity.value = Math.max(0, (m.uOpacity.value as number) - dt * 0.8);
      if (m.uOpacity.value <= 0) {
        this.smoke.mesh.visible = false;
        this.smoke = null;
      }
    }
    // Stormwall / storm rain: a couple of falling sheets in front of the camera on top of the streaks in sky.ts
    const want = storm > 0.15 ? this.budget('rain') : 0;
    while (this.rain.length < want) {
      const l = this.acquire('rain');
      if (!l || this.rain.includes(l)) break;
      l.mat.uniforms.uUpright.value = 1;
      l.mesh.visible = true;
      this.rain.push(l);
    }
    this.rain.forEach((l, i) => {
      const on = i < want;
      const d = 6 + i * 7;
      camera.getWorldDirection(this.v).setY(0).normalize();
      l.mesh.position.copy(camera.position).addScaledVector(this.v, d).add(new THREE.Vector3(0, -0.5, 0));
      l.mat.uniforms.uScale.value.set(d * 2.8, d * 1.8);
      const target = on ? Math.min(0.85, (storm - 0.15) * 1.2) : 0;
      const o = l.mat.uniforms.uOpacity.value as number;
      l.mat.uniforms.uOpacity.value = o + (target - o) * Math.min(1, dt * 2);
      l.mesh.visible = l.mat.uniforms.uOpacity.value > 0.01;
    });
    if (!want) this.rain = this.rain.filter((l) => l.mesh.visible);
  }

  /** Drop to the low budget for the rest of the session if frames run long for a few seconds of play. */
  private governor(dt: number) {
    if (this.pinned || this.quality === 'low') return;
    this.played += dt;
    if (this.played < 4) return;
    this.slow = dt > 1 / 34 ? this.slow + dt : Math.max(0, this.slow - dt * 0.5);
    if (this.slow > 3) {
      this.quality = 'low';
      for (const l of this.rain) l.mesh.visible = false;
      this.rain = [];
      if (this.smoke) this.smoke.mesh.visible = false;
      this.smoke = null;
      this.onQuality?.('low');
    }
  }
}

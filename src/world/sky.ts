// Sky for the Drowned World: day/night dome with a sun smeared by haze, moon and stars; a low, heavy cloud
// ceiling tinted by the hour; dark storm decks riding the storm cells; the Stormwall ring on the horizon;
// rain, lightning bolts, scavenger birds, and a ruined horizon: drowned skylines, gantry cranes, rig legs,
// listing hulls and smokestacks, with gas flares still burning out there.
import * as THREE from 'three';
import { merge, paint, paintGradient, xf } from './materials';
import { RNG } from '../core/noise';
import { WORLD } from '../data/world';
import type { Atmosphere } from './atmosphere';
import { model } from './assets';

/**
 * Fog that dissolves a far object into whatever sky is behind it, instead of painting it the flat fog colour.
 * Plain fog turned the distant Stormwall into a solid fog-coloured silhouette; harmless by day (fog ≈ sky), but at
 * sunset the fog is orange and the high sky is charcoal, so a big orange blob hung near the top of the screen.
 */
function skyFade<M extends THREE.Material>(m: M): M {
  m.transparent = true;
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    prev?.call(m, shader, r);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      `#ifdef USE_FOG
        float skyFadeF = smoothstep(fogNear, fogFar, vFogDepth);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, skyFadeF * 0.55);
        gl_FragColor.a *= 1.0 - skyFadeF;
      #endif`
    );
  };
  m.customProgramCacheKey = () => 'skyFade';
  return m;
}

export const SUN_DIR = new THREE.Vector3(0.55, 0.62, -0.42).normalize();

const domeVert = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const domeFrag = `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunColor; uniform float uNight; uniform float uStorm; uniform float uTime;
varying vec3 vDir;
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 c = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.7, h), 0.75));
  float s = max(dot(d, uSun), 0.0);
  // sun / moon glow and disc
  c += uSunColor * (pow(s, 10.0) * 0.35 + pow(s, 60.0) * 0.4) * mix(0.6, 0.25, uNight) * (1.0 - uStorm);
  // a dirty band of haze sits on the horizon
  c = mix(c, uHorizon * vec3(0.92, 0.9, 0.86), (1.0 - smoothstep(0.0, 0.16, h)) * 0.5);
  c += mix(vec3(1.0, 0.97, 0.88), vec3(0.9, 0.95, 1.0), uNight) * smoothstep(0.9975, 0.999, s) * mix(1.4, 1.1, uNight) * (1.0 - uStorm * 0.9);
  // stars
  vec3 q = floor(d * 260.0);
  float st = step(0.9965, hash(q)) * smoothstep(0.05, 0.4, h) * uNight * (1.0 - uStorm);
  c += vec3(st) * (0.6 + 0.4 * sin(uTime * 3.0 + hash(q) * 40.0));
  c = mix(c, uHorizon * 1.02, smoothstep(0.05, -0.1, h));
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

export class Sky {
  group = new THREE.Group();
  private dome: THREE.Mesh;
  private domeU: Record<string, THREE.IUniform>;
  private clouds: THREE.Mesh[] = [];
  private cloudMat: THREE.MeshToonMaterial;
  private stormDecks: THREE.Mesh[] = [];
  private stormMat: THREE.MeshToonMaterial;
  private wallMat: THREE.MeshToonMaterial;
  private skylineMat: THREE.MeshBasicMaterial;
  private rain: THREE.LineSegments;
  private rainMat: THREE.LineBasicMaterial;
  private bolt: THREE.Mesh;
  private boltLife = 0;
  private flares: THREE.Sprite[] = [];
  private flarePos: THREE.Vector3[] = [];
  private gulls: { m: THREE.Group; r: number; c: THREE.Vector3; sp: number; ph: number; wingL: THREE.Object3D; wingR: THREE.Object3D }[] = [];

  constructor(scene: THREE.Scene, private atmo: Atmosphere) {
    this.domeU = {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uSun: { value: new THREE.Vector3() },
      uSunColor: { value: new THREE.Color() },
      uNight: { value: 0 },
      uStorm: { value: 0 },
      uTime: { value: 0 },
    };
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(3200, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: this.domeU, vertexShader: domeVert, fragmentShader: domeFrag }));
    this.dome.renderOrder = -10;
    this.group.add(this.dome);

    const rng = new RNG(99);
    // fair-weather clouds
    this.cloudMat = new THREE.MeshToonMaterial({ color: 0xa8aca6, emissive: 0x4a5250, fog: false, vertexColors: true });
    for (let i = 0; i < 20; i++) {
      const parts: THREE.BufferGeometry[] = [];
      const n = rng.int(4, 7);
      for (let k = 0; k < n; k++) {
        const r = rng.range(14, 30);
        parts.push(xf(new THREE.SphereGeometry(r, 10, 7), rng.range(-55, 55), rng.range(0, 8), rng.range(-16, 16), 0, 0, 0, [1.3, 0.45, 1]));
      }
      // sooty, rain-heavy bellies under paler tops
      const m = new THREE.Mesh(paintGradient(merge(parts.map((g) => paint(g, '#ffffff'))), '#55585a', '#d0d0c8'), this.cloudMat);
      const ang = rng.range(0, Math.PI * 2);
      const dist = rng.range(500, 1500);
      m.position.set(Math.cos(ang) * dist, rng.range(120, 220), Math.sin(ang) * dist);
      m.scale.set(rng.range(1.5, 2.6), rng.range(0.7, 1.1), rng.range(1.5, 2.6));
      this.clouds.push(m);
      this.group.add(m);
    }

    // storm decks: heavy flat-bottomed clouds that ride each storm cell
    this.stormMat = skyFade(new THREE.MeshToonMaterial({ color: 0x4a5664, emissive: 0x1a222c, fog: true, transparent: true, opacity: 0.96 }));
    for (let s = 0; s < atmo.storms.length; s++) {
      const parts: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 26; k++) {
        const a = rng.range(0, Math.PI * 2), d = Math.sqrt(rng.next()) * 130;
        const r = rng.range(26, 48);
        parts.push(paint(xf(new THREE.SphereGeometry(r, 9, 6), Math.cos(a) * d, rng.range(0, 24), Math.sin(a) * d, 0, 0, 0, [1, 0.5, 1]), '#ffffff'));
      }
      const m = new THREE.Mesh(merge(parts), this.stormMat);
      this.stormDecks.push(m);
      this.group.add(m);
    }

    // the Stormwall: a ring of towering cloud columns at the edge of the Reach
    this.wallMat = skyFade(new THREE.MeshToonMaterial({ color: 0x3c4a5c, emissive: 0x141c26, fog: true }));
    const wall: THREE.BufferGeometry[] = [];
    const c0 = WORLD.shallowsCenter;
    const R = WORLD.stormRadius + 90;
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 + rng.range(-0.03, 0.03);
      for (let k = 0; k < 4; k++) {
        const r = rng.range(50, 85);
        wall.push(paint(xf(new THREE.SphereGeometry(r, 8, 6), c0.x + Math.cos(a) * (R + rng.range(-30, 60)), 40 + k * 70 + rng.range(-10, 20), c0.z + Math.sin(a) * (R + rng.range(-30, 60)), 0, 0, 0, [1.2, 1.1, 1.2]), '#ffffff'));
      }
    }
    const wallMesh = new THREE.Mesh(merge(wall), this.wallMat);
    wallMesh.frustumCulled = false;
    scene.add(wallMesh);

    // the ruined horizon: drowned skylines, gantry cranes, rig legs, listing hulls, smokestacks
    this.skylineMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.72 });
    const far: THREE.BufferGeometry[] = [];
    this.flarePos = [];
    for (let cluster = 0; cluster < 11; cluster++) {
      const ang = (cluster / 11) * Math.PI * 2 + rng.range(-0.15, 0.15);
      const d = rng.range(2250, 2700);
      const cx = Math.cos(ang) * d, cz = Math.sin(ang) * d;
      const tang = new THREE.Vector3(-Math.sin(ang), 0, Math.cos(ang));
      const at = (ox: number) => [cx + tang.x * ox, cz + tang.z * ox] as const;
      const kind = cluster % 4;
      if (kind === 0 || kind === 2) {
        // drowned towers, some snapped off and leaning
        const n = rng.int(6, 12);
        for (let k = 0; k < n; k++) {
          const w = rng.range(18, 45), h = rng.range(30, 160) * (k % 4 === 0 ? 1.6 : 1);
          const [x, z] = at(rng.range(-170, 170));
          const lean = k % 3 === 0 ? rng.range(-0.12, 0.12) : 0;
          far.push(paint(xf(new THREE.BoxGeometry(w, h, w), x, h / 2 - 20, z, lean, rng.range(0, 3), lean), '#ffffff'));
          if (k % 5 === 0) far.push(paint(xf(new THREE.CylinderGeometry(1.5, 3, 60, 4), x, h + 10, z), '#ffffff'));
        }
      }
      if (kind === 1) {
        // offshore rig: four legs, a deck, a derrick and a flare boom
        const [x, z] = at(rng.range(-60, 60));
        for (const [lx, lz] of [[-30, -30], [30, -30], [-30, 30], [30, 30]]) far.push(paint(xf(new THREE.CylinderGeometry(5, 6, 120, 6), x + lx, 40, z + lz), '#ffffff'));
        far.push(paint(xf(new THREE.BoxGeometry(90, 18, 80), x, 108, z), '#ffffff'));
        far.push(paint(xf(new THREE.CylinderGeometry(3, 14, 90, 4), x - 15, 160, z), '#ffffff'));
        far.push(paint(xf(new THREE.BoxGeometry(70, 4, 4), x + 60, 130, z, 0, 0, 0.5), '#ffffff'));
        this.flarePos.push(new THREE.Vector3(x + 90, 150, z));
      }
      if (kind === 3) {
        // a listing cargo hull and a pair of gantry cranes over it
        const [x, z] = at(rng.range(-80, 80));
        far.push(paint(xf(new THREE.BoxGeometry(260, 46, 40), x, 4, z, 0, ang + Math.PI / 2, 0.14), '#ffffff'));
        far.push(paint(xf(new THREE.BoxGeometry(40, 50, 36), x + tang.x * 90, 50, z + tang.z * 90, 0, ang + Math.PI / 2, 0.14), '#ffffff'));
        for (const off of [-140, 150]) {
          const [gx, gz] = at(off);
          far.push(paint(xf(new THREE.BoxGeometry(8, 190, 8), gx, 75, gz), '#ffffff'));
          far.push(paint(xf(new THREE.BoxGeometry(8, 190, 8), gx + 26, 75, gz), '#ffffff'));
          far.push(paint(xf(new THREE.BoxGeometry(180, 9, 9), gx + Math.cos(ang) * -40, 172, gz + Math.sin(ang) * -40, 0, ang, 0), '#ffffff'));
        }
      }
      // smokestacks and a few flare towers scattered through every cluster
      if (rng.next() > 0.4) {
        const [x, z] = at(rng.range(-200, 200));
        const h = rng.range(90, 170);
        far.push(paint(xf(new THREE.CylinderGeometry(5, 8, h, 6), x, h / 2 - 15, z), '#ffffff'));
        if (rng.next() > 0.5) this.flarePos.push(new THREE.Vector3(x, h - 10, z));
      }
    }
    this.group.add(new THREE.Mesh(merge(far), this.skylineMat));
    // gas flares: unlit sprites that flicker on the horizon, brightest at night
    const flareTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,230,170,1)');
      gr.addColorStop(0.25, 'rgba(255,140,50,0.85)');
      gr.addColorStop(1, 'rgba(200,60,10,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    for (const p of this.flarePos) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flareTex, fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffffff }));
      sp.position.copy(p);
      sp.scale.set(38, 60, 1);
      this.flares.push(sp);
      this.group.add(sp);
    }

    // rain: streaks in a box that follows the camera
    const rp = new Float32Array(1400 * 6);
    for (let i = 0; i < 1400; i++) {
      const x = rng.range(-45, 45), y = rng.range(0, 40), z = rng.range(-45, 45);
      rp.set([x, y, z, x + 0.15, y - 1.6, z + 0.1], i * 6);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    this.rainMat = new THREE.LineBasicMaterial({ color: 0xbfd2e2, transparent: true, opacity: 0, depthWrite: false });
    this.rain = new THREE.LineSegments(rg, this.rainMat);
    this.rain.frustumCulled = false;
    scene.add(this.rain);

    // lightning bolt (re-shaped on every strike)
    this.bolt = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xeef4ff, transparent: true, opacity: 0, fog: false, side: THREE.DoubleSide }));
    this.bolt.frustumCulled = false;
    scene.add(this.bolt);

    // gulls circling landmarks and settlements
    // scavenger birds: soot-dark, circling whatever the sea gives up
    const gullBody = new THREE.MeshToonMaterial({ color: 0x2c2a27 });
    const gullWing = new THREE.MeshToonMaterial({ color: 0x3a3732, side: THREE.DoubleSide });
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.3, 0, 0, 0.35, 1.6, 0.1, 0.1], 3));
    wingGeo.computeVertexNormals();
    const spots = [[0, 260], [-150, 70], [175, 10], [40, -175], [92, 150], [-235, -70], [-540, 170], [500, -440], [270, 650], [-330, -320]];
    // the GITCRAFT gull (creative/3d-finds): a body, and a wing hinged at the shoulder that flaps (mirrored for the right)
    const kitBody = model('tb_finds_kit', 'gull_body');
    const kitWing = model('tb_finds_kit', 'gull_wing', { side: THREE.DoubleSide });
    for (let i = 0; i < 18; i++) {
      const g = new THREE.Group();
      const body = kitBody && kitWing ? kitBody.clone() : new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.6, 3, 6).rotateX(Math.PI / 2), gullBody);
      const wl = kitBody && kitWing ? kitWing.clone() : new THREE.Mesh(wingGeo, gullWing);
      const wr = kitBody && kitWing ? kitWing.clone() : new THREE.Mesh(wingGeo, gullWing);
      wr.scale.x = -1;
      g.add(body, wl, wr);
      g.scale.setScalar(1.6);
      const s = spots[i % spots.length];
      this.gulls.push({ m: g, r: rng.range(12, 40), c: new THREE.Vector3(s[0], rng.range(16, 40), s[1]), sp: rng.range(0.2, 0.45) * (rng.next() > 0.5 ? 1 : -1), ph: rng.range(0, 6), wingL: wl, wingR: wr });
      this.group.add(g);
    }
    scene.add(this.group);
  }

  /** Called on every lightning strike with the point it hits (the flipbook flash in game/flipfx.ts). */
  onStrike: ((p: THREE.Vector3) => void) | null = null;

  strike(origin: THREE.Vector3) {
    this.onStrike?.(origin);
    const pts: number[] = [];
    let x = origin.x, y = 260, z = origin.z;
    const segs = 9;
    for (let i = 0; i < segs; i++) {
      const nx = x + (Math.random() - 0.5) * 40, ny = y - 260 / segs, nz = z + (Math.random() - 0.5) * 40;
      const w = 2.2 * (1 - i / segs) + 0.6;
      pts.push(x - w, y, z, x + w, y, z, nx + w, ny, nz, x - w, y, z, nx + w, ny, nz, nx - w, ny, nz);
      x = nx; y = ny; z = nz;
    }
    this.bolt.geometry.dispose();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.bolt.geometry = g;
    this.boltLife = 0.35;
  }

  update(t: number, dt: number, focus: THREE.Vector3) {
    const a = this.atmo;
    this.dome.position.copy(focus);
    this.domeU.uTop.value.copy(a.skyTop);
    this.domeU.uHorizon.value.copy(a.skyHorizon);
    this.domeU.uSun.value.copy(a.sunDir);
    this.domeU.uSunColor.value.copy(a.sunColor);
    this.domeU.uNight.value = a.night;
    this.domeU.uStorm.value = a.storm;
    this.domeU.uTime.value = t;

    // a heavy, grimy ceiling that takes the colour of the hour
    this.cloudMat.color.copy(a.sunColor).lerp(new THREE.Color(0.6, 0.62, 0.6), 0.6).multiplyScalar(0.85 - a.night * 0.6);
    this.cloudMat.emissive.copy(a.skyHorizon).multiplyScalar(0.42);
    this.cloudMat.opacity = 1 - a.storm * 0.5;
    for (const c of this.clouds) {
      c.position.x += dt * 2.2;
      if (c.position.x - focus.x > 1500) c.position.x -= 3000;
      if (c.position.x - focus.x < -1500) c.position.x += 3000;
    }
    for (let i = 0; i < this.stormDecks.length; i++) {
      const s = a.storms[i];
      this.stormDecks[i].position.set(s.x, 95, s.z);
      this.stormDecks[i].scale.setScalar(s.r / 150);
    }
    const dark = 1 - a.night * 0.55;
    this.stormMat.color.setRGB(0.29 * dark, 0.34 * dark, 0.39 * dark).lerp(new THREE.Color('#dfe6ff'), a.lightning * 0.6);
    this.wallMat.color.setRGB(0.24 * dark, 0.29 * dark, 0.36 * dark).lerp(new THREE.Color('#dfe6ff'), a.lightning * 0.3);
    this.skylineMat.color.copy(a.skyHorizon).multiplyScalar(0.48);
    for (let i = 0; i < this.flares.length; i++) {
      const f = this.flares[i];
      const flick = 0.75 + 0.25 * Math.sin(t * 9 + i * 3.1) * Math.sin(t * 5.3 + i);
      (f.material as THREE.SpriteMaterial).opacity = (0.35 + a.night * 0.65) * flick * (1 - a.storm * 0.5);
      f.scale.set(34 + flick * 10, 50 + flick * 22, 1);
    }

    // rain follows the camera, intensity follows the storm
    this.rain.position.set(focus.x, focus.y - 18, focus.z);
    const rp = (this.rain.geometry.attributes.position as THREE.BufferAttribute);
    const fall = dt * 38;
    const arr = rp.array as Float32Array;
    for (let i = 0; i < arr.length; i += 6) {
      arr[i + 1] -= fall;
      arr[i + 4] -= fall;
      if (arr[i + 4] < 0) {
        arr[i + 1] += 40;
        arr[i + 4] += 40;
      }
    }
    rp.needsUpdate = a.storm > 0.05;
    this.rainMat.opacity = Math.min(0.55, a.storm * 0.75);
    this.rain.visible = a.storm > 0.05;

    // lightning
    if (a.lightning > 0.98 && this.boltLife <= 0) {
      const ang = Math.random() * Math.PI * 2;
      this.strike(new THREE.Vector3(focus.x + Math.cos(ang) * 260, 0, focus.z + Math.sin(ang) * 260));
    }
    this.boltLife -= dt;
    (this.bolt.material as THREE.MeshBasicMaterial).opacity = Math.max(0, this.boltLife / 0.35);

    for (const g of this.gulls) {
      const an = t * g.sp + g.ph;
      g.m.visible = a.storm < 0.6 && a.night < 0.7;
      g.m.position.set(g.c.x + Math.cos(an) * g.r, g.c.y + Math.sin(t * 0.7 + g.ph) * 2, g.c.z + Math.sin(an) * g.r);
      g.m.rotation.y = -an + (g.sp > 0 ? 0 : Math.PI);
      const flap = Math.sin(t * 7 + g.ph) * 0.5;
      g.wingL.rotation.z = flap;
      g.wingR.rotation.z = -flap;
    }
  }
}

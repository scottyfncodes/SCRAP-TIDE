// Painted sky dome, sun, drifting storybook clouds, gulls.
import * as THREE from 'three';
import { merge, paint, xf, vcMat } from './materials';
import { RNG } from '../core/noise';

export const SUN_DIR = new THREE.Vector3(0.55, 0.62, -0.42).normalize();
export const SKY_HORIZON = new THREE.Color('#bfe8f2');
export const SKY_TOP = new THREE.Color('#3e9be0');
export const FOG = { color: new THREE.Color('#c4e9f0'), near: 220, far: 720 };

export class Sky {
  group = new THREE.Group();
  private clouds: THREE.Mesh[] = [];
  private gulls: { m: THREE.Group; r: number; c: THREE.Vector3; sp: number; ph: number; wingL: THREE.Mesh; wingR: THREE.Mesh }[] = [];

  constructor(scene: THREE.Scene) {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: SKY_TOP },
          uHorizon: { value: SKY_HORIZON },
          uSun: { value: SUN_DIR },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; varying vec3 vDir;
          void main(){
            float h = clamp(vDir.y, -0.2, 1.0);
            vec3 c = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.75, h), 0.8));
            float s = max(dot(normalize(vDir), uSun), 0.0);
            c += vec3(1.0, 0.85, 0.55) * pow(s, 24.0) * 0.6;
            c += vec3(1.0, 0.98, 0.9) * smoothstep(0.9975, 0.999, s) * 2.0;
            c = mix(c, uHorizon * 1.02, smoothstep(0.05, -0.1, h));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      })
    );
    dome.renderOrder = -10;
    this.group.add(dome);

    // Puffy clouds: clusters of squashed spheres, toon-shaded.
    const rng = new RNG(99);
    const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, emissive: 0x8fb8cc, fog: false });
    for (let i = 0; i < 22; i++) {
      const parts: THREE.BufferGeometry[] = [];
      const n = rng.int(4, 7);
      for (let k = 0; k < n; k++) {
        const r = rng.range(14, 30);
        parts.push(paint(xf(new THREE.SphereGeometry(r, 12, 8), rng.range(-45, 45), rng.range(0, 10), rng.range(-14, 14), 0, 0, 0, [1, 0.62, 1]), '#ffffff'));
      }
      const g = merge(parts);
      const m = new THREE.Mesh(g, cloudMat);
      const ang = rng.range(0, Math.PI * 2);
      const dist = rng.range(500, 1300);
      m.position.set(Math.cos(ang) * dist, rng.range(140, 260), Math.sin(ang) * dist);
      m.scale.setScalar(rng.range(0.8, 1.6));
      this.clouds.push(m);
      this.group.add(m);
    }

    // Distant mountain silhouettes along the horizon: the wider world.
    const far: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + rng.range(-0.1, 0.1);
      const d = rng.range(1700, 2000);
      const h = rng.range(40, 110);
      const cone = new THREE.SphereGeometry(rng.range(140, 280), 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      cone.scale(1, h / 200, 1);
      far.push(paint(xf(cone, Math.cos(ang) * d, -10, Math.sin(ang) * d, 0, rng.range(0, 3), 0, [1, 1, rng.range(0.6, 1.2)]), '#8fbfcc'));
    }
    const farMesh = new THREE.Mesh(merge(far), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0.45 }));
    this.group.add(farMesh);

    // Gulls circling around the world.
    const gullBody = new THREE.MeshToonMaterial({ color: 0xffffff });
    const gullWing = new THREE.MeshToonMaterial({ color: 0xf2f2f2, side: THREE.DoubleSide });
    const wingGeo = new THREE.BufferGeometry();
    wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.3, 0, 0, 0.35, 1.6, 0.1, 0.1], 3));
    wingGeo.computeVertexNormals();
    const spots = [
      [0, 260], [-150, 70], [175, 10], [40, -175], [-330, -320], [60, 120], [-60, -60],
    ];
    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.6, 3, 6).rotateX(Math.PI / 2), gullBody);
      const wl = new THREE.Mesh(wingGeo, gullWing);
      const wr = new THREE.Mesh(wingGeo, gullWing);
      wr.scale.x = -1;
      g.add(body, wl, wr);
      g.scale.setScalar(1.6);
      const s = spots[i % spots.length];
      this.gulls.push({ m: g, r: rng.range(12, 40), c: new THREE.Vector3(s[0], rng.range(14, 30), s[1]), sp: rng.range(0.2, 0.45) * (rng.next() > 0.5 ? 1 : -1), ph: rng.range(0, 6), wingL: wl, wingR: wr });
      this.group.add(g);
    }
    scene.add(this.group);
    void vcMat;
  }

  update(t: number, dt: number, focus: THREE.Vector3) {
    // sky follows camera so it's always "at infinity"
    this.group.children[0].position.copy(focus);
    for (const c of this.clouds) {
      c.position.x += dt * 2.2;
      if (c.position.x - focus.x > 1400) c.position.x -= 2800;
    }
    for (const g of this.gulls) {
      const a = t * g.sp + g.ph;
      g.m.position.set(g.c.x + Math.cos(a) * g.r, g.c.y + Math.sin(t * 0.7 + g.ph) * 2, g.c.z + Math.sin(a) * g.r);
      g.m.rotation.y = -a + (g.sp > 0 ? 0 : Math.PI);
      const flap = Math.sin(t * 7 + g.ph) * 0.5;
      g.wingL.rotation.z = flap;
      g.wingR.rotation.z = -flap;
    }
  }
}

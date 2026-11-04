// Lightweight particle bursts + interactive world objects (pickups, chests, bottles, crates).
import * as THREE from 'three';
import { paint, xf, merge, vcMat, canvasTex } from '../world/materials';
import { item, LIVING_GREEN } from '../data/items';
import { model } from '../world/assets';

let sparkTex: THREE.Texture | null = null;
function sparkTexture() {
  if (sparkTex) return sparkTex;
  sparkTex = canvasTex(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  return sparkTex;
}

export class Particles {
  private max: number;
  private pos: Float32Array;
  private col: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private grav: Float32Array;
  private base: Float32Array;
  private geo: THREE.BufferGeometry;
  points: THREE.Points;
  private cursor = 0;
  /** >1 fades particles out sooner in their life (alpha = (life left)^fade). */
  fade = 1;

  constructor(scene: THREE.Scene, max = 600, size = 0.5, additive = false) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.base = new Float32Array(max * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4));
    const mat = new THREE.PointsMaterial({
      size,
      map: sparkTexture(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -9999;
    scene.add(this.points);
  }

  emit(p: THREE.Vector3, n: number, color: THREE.ColorRepresentation, speed = 3, up = 3, life = 1, gravity = 9, spread = 0.2) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      this.pos[i * 3] = p.x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * spread;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = up * (0.5 + Math.random() * 0.7);
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.life[i] = this.maxLife[i] = life * (0.7 + Math.random() * 0.6);
      this.grav[i] = gravity;
      const j = 0.85 + Math.random() * 0.3;
      this.base[i * 3] = c.r * j;
      this.base[i * 3 + 1] = c.g * j;
      this.base[i * 3 + 2] = c.b * j;
    }
  }

  /** Emit `n` particles with a set velocity `v` (plus up to `jitter` m/s of random spread on each axis), e.g. spray
   *  thrown off a moving hull that has to carry the boat's own speed so the hull doesn't sail through it. */
  emitVel(p: THREE.Vector3, n: number, color: THREE.ColorRepresentation, v: THREE.Vector3, jitter = 0.3, life = 1, gravity = 9, spread = 0.2) {
    const c = new THREE.Color(color);
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      this.pos[i * 3] = p.x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * spread * 0.5;
      this.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * spread;
      this.vel[i * 3] = v.x + (Math.random() - 0.5) * 2 * jitter;
      this.vel[i * 3 + 1] = v.y * (0.6 + Math.random() * 0.6);
      this.vel[i * 3 + 2] = v.z + (Math.random() - 0.5) * 2 * jitter;
      this.life[i] = this.maxLife[i] = life * (0.7 + Math.random() * 0.6);
      this.grav[i] = gravity;
      const j = 0.85 + Math.random() * 0.3;
      this.base[i * 3] = c.r * j;
      this.base[i * 3 + 1] = c.g * j;
      this.base[i * 3 + 2] = c.b * j;
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -9999;
        continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = this.life[i] / this.maxLife[i];
      this.col[i * 4] = this.base[i * 3];
      this.col[i * 4 + 1] = this.base[i * 3 + 1];
      this.col[i * 4 + 2] = this.base[i * 3 + 2];
      this.col[i * 4 + 3] = Math.min(1, (this.fade === 1 ? f : Math.pow(f, this.fade)) * 1.5);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  setSize(size: number) {
    (this.points.material as THREE.PointsMaterial).size = size;
  }
}

/** A collectable lying on the sand. */
export function pickupMesh(id: string): THREE.Object3D {
  const d = item(id);
  const [a, b] = d.colors;
  const parts: THREE.BufferGeometry[] = [];
  switch (d.icon) {
    case 'conch':
    case 'spiral':
      parts.push(paint(xf(new THREE.ConeGeometry(0.22, 0.5, 8), 0, 0.12, 0, 0, 0, Math.PI / 2.4), a));
      parts.push(paint(xf(new THREE.SphereGeometry(0.16, 8, 6), -0.12, 0.12, 0), b));
      break;
    case 'starfish':
      for (let i = 0; i < 5; i++) parts.push(paint(xf(new THREE.ConeGeometry(0.08, 0.32, 4), Math.cos((i / 5) * Math.PI * 2) * 0.14, 0.04, Math.sin((i / 5) * Math.PI * 2) * 0.14, Math.PI / 2, 0, -(i / 5) * Math.PI * 2 - Math.PI / 2, [1, 1, 0.4]), a));
      break;
    case 'sanddollar':
      parts.push(paint(xf(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12), 0, 0.03, 0), a));
      break;
    case 'plank':
      parts.push(paint(xf(new THREE.BoxGeometry(1.4, 0.12, 0.3), 0, 0.06, 0, 0, Math.random() * 3, 0), a));
      break;
    case 'rope':
      parts.push(paint(xf(new THREE.TorusGeometry(0.22, 0.07, 5, 10), 0, 0.07, 0, Math.PI / 2, 0, 0), a));
      break;
    case 'bottle':
      parts.push(paint(xf(new THREE.CylinderGeometry(0.11, 0.13, 0.42, 8), 0, 0.12, 0, 0, 0, Math.PI / 2), a));
      break;
    case 'coral':
      for (let i = 0; i < 3; i++) parts.push(paint(xf(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 5), (i - 1) * 0.08, 0.15, 0, 0, 0, (i - 1) * 0.5), a));
      break;
    default:
      parts.push(paint(xf(new THREE.IcosahedronGeometry(0.16, 0), 0, 0.12, 0), a));
  }
  const m = new THREE.Mesh(merge(parts), vcMat());
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  // sparkle sprite so it reads at a glance
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xfff3b0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(0.9);
  s.position.y = 0.45;
  s.userData.sparkle = true;
  g.add(s);
  return g;
}

export function bottleMesh(): THREE.Object3D {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 12), new THREE.MeshToonMaterial({ color: 0x7fd6a8, transparent: true, opacity: 0.75 }));
  glass.rotation.z = Math.PI / 2.2;
  glass.position.y = 0.2;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 8), glass.material);
  neck.position.set(0.55, 0.28, 0);
  neck.rotation.z = Math.PI / 2.2;
  const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 8), new THREE.MeshToonMaterial({ color: 0xa0703a }));
  cork.position.set(0.74, 0.31, 0);
  cork.rotation.z = Math.PI / 2.2;
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8), new THREE.MeshToonMaterial({ color: 0xefdcb0 }));
  paper.rotation.z = Math.PI / 2.2;
  paper.position.y = 0.2;
  g.add(paper, glass, neck, cork);
  g.traverse((o) => (o.castShadow = true));
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTexture(), color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(1.6);
  s.position.y = 0.7;
  s.userData.sparkle = true;
  g.add(s);
  return g;
}

export function chestMesh(tier: 'small' | 'grand' | 'sea'): { root: THREE.Group; lid: THREE.Object3D; glow: THREE.PointLight } {
  const s = tier === 'grand' ? 1.5 : tier === 'sea' ? 1.1 : 1;
  const root = new THREE.Group();
  const wood = tier === 'sea' ? '#5a7a8a' : '#8a5a34';
  const band = tier === 'grand' ? '#f4c542' : '#4a4a4a';
  const body = new THREE.Mesh(
    merge([
      paint(xf(new THREE.BoxGeometry(1.4 * s, 0.8 * s, 0.9 * s), 0, 0.4 * s, 0), wood, 0.05),
      paint(xf(new THREE.BoxGeometry(1.44 * s, 0.12 * s, 0.94 * s), 0, 0.1 * s, 0), band),
      paint(xf(new THREE.BoxGeometry(0.12 * s, 0.82 * s, 0.94 * s), -0.45 * s, 0.4 * s, 0), band),
      paint(xf(new THREE.BoxGeometry(0.12 * s, 0.82 * s, 0.94 * s), 0.45 * s, 0.4 * s, 0), band),
      paint(xf(new THREE.BoxGeometry(0.22 * s, 0.26 * s, 0.06), 0, 0.62 * s, 0.47 * s), '#f4c542'),
      paint(xf(new THREE.BoxGeometry(1.3 * s, 0.05, 0.8 * s), 0, 0.78 * s, 0), '#f4c542'),
    ]),
    vcMat()
  );
  body.castShadow = true;
  root.add(body);
  const lid = new THREE.Group();
  const lidMesh = new THREE.Mesh(
    merge([
      paint(xf(new THREE.CylinderGeometry(0.45 * s, 0.45 * s, 1.4 * s, 12, 1, false, 0, Math.PI), 0, 0, 0.45 * s, 0, 0, Math.PI / 2), wood, 0.05),
      paint(xf(new THREE.CylinderGeometry(0.47 * s, 0.47 * s, 0.12 * s, 12, 1, false, 0, Math.PI), -0.45 * s, 0, 0.45 * s, 0, 0, Math.PI / 2), band),
      paint(xf(new THREE.CylinderGeometry(0.47 * s, 0.47 * s, 0.12 * s, 12, 1, false, 0, Math.PI), 0.45 * s, 0, 0.45 * s, 0, 0, Math.PI / 2), band),
    ]),
    vcMat()
  );
  lidMesh.castShadow = true;
  lid.add(lidMesh);
  lid.position.set(0, 0.8 * s, -0.45 * s);
  root.add(lid);
  const glow = new THREE.PointLight(0xffd36b, 0, 8, 2);
  glow.position.set(0, 1.2 * s, 0);
  root.add(glow);
  return { root, lid, glow };
}

export function crateFindMesh(kind: 'crate' | 'drawer'): { root: THREE.Group; lid: THREE.Object3D } {
  if (kind === 'drawer') {
    const c = chestMesh('sea');
    return { root: c.root, lid: c.lid };
  }
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    merge([
      paint(xf(new THREE.BoxGeometry(1.2, 0.9, 1.0), 0, 0.45, 0), '#7d5a36', 0.08),
      paint(xf(new THREE.BoxGeometry(1.25, 0.12, 1.05), 0, 0.2, 0), '#4a3019'),
      paint(xf(new THREE.BoxGeometry(1.25, 0.12, 1.05), 0, 0.7, 0), '#4a3019'),
    ]),
    vcMat()
  );
  body.castShadow = true;
  root.add(body);
  const lid = new THREE.Mesh(paint(xf(new THREE.BoxGeometry(1.25, 0.12, 1.05), 0, 0, 0.52), '#6e4b2a'), vcMat());
  const lidG = new THREE.Group();
  lidG.add(lid);
  lidG.position.set(0, 0.92, -0.52);
  root.add(lidG);
  // barnacles + seaweed
  root.add(new THREE.Mesh(paint(xf(new THREE.IcosahedronGeometry(0.12, 0), 0.5, 0.3, 0.5), '#cfd7c8'), vcMat()));
  return { root, lid: lidG };
}

export function digHole(): THREE.Object3D {
  const g = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.7, 14), new THREE.MeshBasicMaterial({ color: 0x8a6a3a, transparent: true, opacity: 0.85, depthWrite: false }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = 0.04;
  const inner = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12), new THREE.MeshBasicMaterial({ color: 0x5a4224, transparent: true, opacity: 0.9, depthWrite: false }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.05;
  const mound = new THREE.Mesh(paint(xf(new THREE.SphereGeometry(0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0.9, 0, 0, 0, 0, 0, [1, 0.45, 0.8]), '#d9bf86'), vcMat());
  g.add(hole, inner, mound);
  return g;
}

export function crabMesh(): THREE.Object3D {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(xf(new THREE.SphereGeometry(0.25, 10, 6), 0, 0.15, 0, 0, 0, 0, [1.3, 0.6, 1]), '#e2553a'));
  for (const s of [-1, 1]) {
    parts.push(paint(xf(new THREE.SphereGeometry(0.1, 6, 4), s * 0.36, 0.2, 0.18), '#e2553a'));
    parts.push(paint(xf(new THREE.SphereGeometry(0.05, 6, 4), s * 0.09, 0.32, 0.18), '#111'));
    for (let k = 0; k < 3; k++) parts.push(paint(xf(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), s * 0.3, 0.08, -0.1 + k * 0.1, 0, 0, s * 1.1), '#c0392b'));
  }
  const m = new THREE.Mesh(merge(parts), vcMat());
  m.castShadow = true;
  return m;
}

// ───────── Living plants (Waterworld pass) ─────────
let shaftTex: THREE.Texture | null = null;
function shaftTexture() {
  if (shaftTex) return shaftTex;
  shaftTex = canvasTex(8, 128, (ctx) => {
    const g = ctx.createLinearGradient(0, 128, 0, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
  });
  return shaftTex;
}

/** Display scale per flora node: small finds are shown a little larger than life so they read on a phone. */
const PLANT_SCALE: Record<string, number> = {
  flora_algae: 1.5, flora_seaweed: 1.6, flora_seedling: 2.6, flora_moss: 1.7, flora_potted: 1.6, flora_flowering: 1.6, flora_fruit: 1.25, flora_sapling: 1.25,
};

/**
 * A living plant waiting to be found: the GITCRAFT flora-kit model, a pulsing green halo on the ground and a faint
 * shaft of green light that can be seen from the water. Green is the only saturated colour in the world, so
 * this is the thing your eye goes to.
 */
export function plantFindMesh(node: string): THREE.Object3D {
  const g = new THREE.Group();
  const m = model('tb_flora_kit', node, { shadows: true });
  const s = PLANT_SCALE[node] ?? 1.4;
  if (m) {
    m.scale.setScalar(s);
    g.add(m);
  } else {
    const fb = new THREE.Mesh(paint(new THREE.IcosahedronGeometry(0.5, 1), LIVING_GREEN), vcMat());
    fb.position.y = 0.5;
    g.add(fb);
  }
  const halo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.5, 32), new THREE.MeshBasicMaterial({ color: LIVING_GREEN, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.32; // above sloped ground so the ring never half-sinks into the hill
  halo.renderOrder = 2;
  halo.userData.halo = true;
  g.add(halo);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 14, 12, 1, true), new THREE.MeshBasicMaterial({ map: shaftTexture(), color: LIVING_GREEN, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  shaft.position.y = 7;
  shaft.userData.shaft = true;
  g.add(shaft);
  g.userData.living = true;
  return g;
}

// The drowned world: places every structure, settlement module, salvage marker and debris field from data,
// using the GITCRAFT MeshCraft models (public/models). Each piece falls back to simple procedural geometry
// if its model failed to load, so the game always runs.
import * as THREE from 'three';
import { STRUCTURES, SALVAGE_SITES, type StructureDef } from '../data/world';
import { model } from './assets';
import { vcMat, paint, xf, merge } from './materials';
import { RNG } from '../core/noise';

export interface Circle { x: number; z: number; r: number }

const FILE: Record<StructureDef['kind'], [string, string]> = {
  tower_glass: ['tb_tower_glass', 'tower_glass_body'],
  tower_brick: ['tb_tower_brick', 'tower_brick_body'],
  tower_spire: ['tb_tower_spire', 'tower_spire_body'],
  tower_stump: ['tb_tower_stump', 'tower_stump_body'],
  oil_rig: ['tb_oil_rig', 'oil_rig_body'],
  tanker: ['tb_tanker_wreck', 'tanker_body'],
  container: ['tb_containers', 'container_red'],
  mega_spire: ['tb_tower_spire', 'tower_spire_body'],
};

function fallback(kind: StructureDef['kind']) {
  const h = kind === 'container' ? 2.6 : kind === 'oil_rig' ? 26 : kind === 'tanker' ? 30 : kind === 'tower_stump' ? 14 : 40;
  const w = kind === 'container' ? 12 : 14;
  const g = paint(xf(new THREE.BoxGeometry(w, h + 10, kind === 'container' ? 2.4 : w), 0, h / 2 - 5, 0), kind === 'container' ? '#c8352a' : '#7f8a94');
  return new THREE.Mesh(g, vcMat());
}

export class DrownedWorld {
  colliders: Circle[] = [];
  animators: ((t: number, dt: number) => void)[] = [];
  glows: THREE.Object3D[] = [];
  siteMarkers = new Map<string, THREE.Object3D>();
  hollowTop = 21.5;

  constructor(private scene: THREE.Scene) {
    for (const s of STRUCTURES) this.place(s);
    this.buildDriftholmRafts();
    this.buildRooftopHollow();
    this.buildHeliosDock();
    this.scatterDebris();
    this.markSites();
  }

  private add(obj: THREE.Object3D, x: number, y: number, z: number, rot = 0, scale = 1) {
    obj.position.set(x, y, z);
    obj.rotation.y = rot;
    obj.scale.setScalar(scale);
    obj.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = !o.userData.glow;
        o.receiveShadow = !o.userData.glow;
      }
      if (o.userData.glow) this.glows.push(o);
    });
    this.scene.add(obj);
    return obj;
  }

  private place(s: StructureDef) {
    const [file, node] = FILE[s.kind];
    const name = s.kind === 'container' ? `container_${s.variant ?? 'red'}` : node;
    const obj = model(file, name) ?? fallback(s.kind);
    const scale = (s.scale ?? 1) * (s.kind === 'mega_spire' ? 2.4 : 1);
    this.add(obj, s.x, s.kind === 'container' ? -1.1 : s.kind === 'tower_stump' ? -2.5 : 0, s.z, s.rot ?? 0, scale);
    if (s.kind === 'container') {
      // half-sunk and gently rolling
      obj.rotation.z = 0.12;
      const ph = s.x * 0.1;
      this.animators.push((t) => {
        obj.position.y = -1.1 + Math.sin(t * 0.8 + ph) * 0.18;
        obj.rotation.x = Math.sin(t * 0.6 + ph) * 0.04;
      });
    }
    if (s.r) this.colliders.push({ x: s.x, z: s.z, r: s.r });
    if (s.kind === 'oil_rig') {
      // the flare still burns: flicker its glow
      const flare = obj.children.find((c) => c.userData.glow);
      if (flare) this.animators.push((t) => flare.scale.setScalar(1 + Math.sin(t * 13) * 0.04 + Math.sin(t * 7.3) * 0.03));
    }
  }

  private module(kind: string, x: number, y: number, z: number, rot = 0, bob = true) {
    const obj = model('tb_settlement_kit', kind);
    if (!obj) {
      const m = new THREE.Mesh(paint(xf(new THREE.BoxGeometry(7, 2.4, 7), 0, 1.2, 0), '#8a5a34'), vcMat());
      this.add(m, x, y, z, rot);
      this.colliders.push({ x, z, r: 4.5 });
      return m;
    }
    this.add(obj, x, y, z, rot);
    if (kind === 'mod_turbine') {
      const rotor = model('tb_settlement_kit', 'mod_turbine_rotor');
      if (rotor) {
        const pivot = new THREE.Group();
        pivot.position.set(0, 12.3, 0);
        rotor.rotation.order = 'YXZ';
        pivot.add(rotor);
        obj.add(pivot);
        this.animators.push((t) => (rotor.rotation.z = t * 1.6));
        rotor.traverse((o) => (o.castShadow = true));
      }
    }
    if (bob) {
      const ph = x * 0.13 + z * 0.07;
      this.animators.push((t) => {
        obj.position.y = y + Math.sin(t * 0.9 + ph) * 0.12;
        obj.rotation.z = Math.sin(t * 0.7 + ph) * 0.015;
      });
    }
    if (y < 2) this.colliders.push({ x, z, r: 4.6 });
    return obj;
  }

  /** Raft districts moored either side of Driftholm's pier. */
  private buildDriftholmRafts() {
    const west = [
      ['mod_shack', -26, 194, 0.1], ['mod_market', -40, 184, -0.2], ['mod_water', -27, 176, 0.3], ['mod_turbine', -54, 194, 0],
    ] as const;
    const east = [
      ['mod_market', 28, 195, 0.15], ['mod_shack', 42, 185, -0.3], ['mod_turbine', 30, 177, 0.2], ['mod_water', 57, 193, 0],
    ] as const;
    for (const [k, x, z, r] of [...west, ...east]) this.module3(k, x, z, r);
    // walkways tie the rafts to the pier
    for (const [x, z, r] of [[-14, 196, 0], [16, 197, 0], [-34, 186, 0.6], [36, 187, -0.6]] as const) this.module3('mod_walkway', x, z, r);
  }

  private module3(kind: string, x: number, z: number, rot = 0) {
    return this.module(kind, x, 0, z, rot);
  }

  /** Rooftop Hollow: a fishing community on the roof of the drowned apartment block. */
  private buildRooftopHollow() {
    const bx = -235, bz = -70, rot = 0.5;
    const top = this.hollowTop;
    const local = (lx: number, lz: number) => {
      const c = Math.cos(rot), s = Math.sin(rot);
      return { x: bx + lx * c + lz * s, z: bz - lx * s + lz * c };
    };
    for (const [k, lx, lz, r] of [['mod_market', 4.5, -2, 0], ['mod_water', -4, 2.5, 0], ['mod_turbine', 6, 3, 0]] as const) {
      const p = local(lx, lz);
      this.module(k, p.x, top - 0.8, p.z, rot + r, false);
    }
    // pontoon dock at water level by the south face, with fishing rafts
    this.module3('mod_shack', -226, -45, rot + 0.2);
    this.module3('mod_walkway', -234, -52, rot + Math.PI / 2);
    this.module3('mod_water', -214, -52, rot);
  }

  private buildHeliosDock() {
    this.module3('mod_walkway', -532, 150, 0.6 + Math.PI / 2);
    this.module3('mod_shack', -522, 142, 0.6);
    this.module3('mod_market', -548, 140, 0.6);
  }

  /** Floating wreckage around the drowned places: planks, drums, foam and tyres. */
  private scatterDebris() {
    const rng = new RNG(4242);
    const parts: THREE.BufferGeometry[] = [];
    const patch = model('tb_debris_kit', 'debris_patch');
    const drum = model('tb_debris_kit', 'oil_drum');
    const anchors = STRUCTURES.filter((s) => s.kind !== 'container').map((s) => [s.x, s.z, s.r] as const);
    const placed: THREE.Object3D[] = [];
    for (const [ax, az, ar] of anchors) {
      for (let k = 0; k < 3; k++) {
        const a = rng.range(0, Math.PI * 2), d = ar + rng.range(6, 30);
        const src = k % 2 ? drum : patch;
        if (!src) continue;
        const o = src.clone();
        this.add(o, ax + Math.cos(a) * d, 0, az + Math.sin(a) * d, rng.range(0, 6), rng.range(0.8, 1.4));
        placed.push(o);
      }
    }
    for (const o of placed) {
      const ph = o.position.x * 0.2 + o.position.z * 0.1;
      const y0 = -0.05;
      this.animators.push((t) => {
        o.position.y = y0 + Math.sin(t * 1.3 + ph) * 0.15;
        o.rotation.z = Math.sin(t * 1.1 + ph) * 0.08;
      });
    }
    void parts;
    void merge;
  }

  /** A blinking beacon buoy beside every salvage site. */
  private markSites() {
    const buoy = model('tb_debris_kit', 'buoy');
    for (const s of SALVAGE_SITES) {
      const o = buoy ? buoy.clone() : new THREE.Mesh(paint(new THREE.CylinderGeometry(0.6, 0.6, 2, 8), '#c8352a'), vcMat());
      const a = (s.x * 13 + s.z * 7) % 6.28;
      const x = s.x + Math.cos(a) * (s.r * 0.75), z = s.z + Math.sin(a) * (s.r * 0.75);
      this.add(o, x, 0, z);
      this.siteMarkers.set(s.id, o);
      const glow = o.children.find((c) => c.userData.glow);
      const ph = a;
      this.animators.push((t) => {
        o.position.y = Math.sin(t * 1.4 + ph) * 0.25 - 0.1;
        o.rotation.z = Math.sin(t * 1.1 + ph) * 0.1;
        if (glow) glow.visible = Math.sin(t * 3 + ph) > -0.2;
      });
    }
  }

  update(t: number, dt: number, nightGlow: number) {
    for (const a of this.animators) a(t, dt);
    // glow geometry is unlit; by day it reads as paint, at night it reads as light
    void nightGlow;
  }
}

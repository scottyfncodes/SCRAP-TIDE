// The raider event (loop pass Phase 4, added to the Phase 3 event pool): Rustfang riders on wave runners circle the
// boat and dart in to snatch from the hold. Ram them with your own Wave Runner, harpoon them, or outrun them under
// engine. Readable on a phone: three bright rust-red riders on a ring around you, each with a lit lamp, and a stamp
// when one gets away with something.
import * as THREE from 'three';
import type { Game } from './game';
import { sceneModel } from '../world/assets';
import { item } from '../data/items';
import { raiderSteal } from './vehicles';
import { audio } from '../audio/audio';

export interface Rider {
  x: number;
  z: number;
  ang: number;
  r: number;
  state: 'circle' | 'dart' | 'flee' | 'out';
  t: number;
  obj: THREE.Object3D;
  stole: boolean;
}

/** One rider of the raider event: the runner model, recoloured rust-red, with a rider block and a lit lamp. */
function riderMesh(): THREE.Object3D {
  const g = new THREE.Group();
  const m = sceneModel('tb_waverunner', { shadows: true });
  if (m) {
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && !mesh.userData.glow) mesh.material = new THREE.MeshToonMaterial({ color: 0x8e2f1c });
    });
    const sled = m.getObjectByName('waverunner_sled');
    if (sled) sled.visible = false;
    g.add(m);
  } else {
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.8, 4, 8), new THREE.MeshToonMaterial({ color: 0x8e2f1c }));
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(1, 1, 0.55);
    hull.position.y = 0.15;
    g.add(hull);
  }
  const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.6, 3, 6), new THREE.MeshToonMaterial({ color: 0x2b2f36 }));
  rider.position.set(0, 1.05, -0.35);
  g.add(rider);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7a3a }));
  lamp.position.set(0, 1.6, -0.35);
  g.add(lamp);
  return g;
}

export class RaiderRun {
  riders: Rider[] = [];
  stolen = 0;
  out = 0;
  private dartTimer = 4;
  active = false;
  t = 0;

  constructor(private g: Game) {}

  start() {
    const g = this.g, b = g.boat;
    this.clear();
    this.active = true;
    this.t = 0;
    this.stolen = 0;
    this.out = 0;
    this.dartTimer = 4;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const obj = riderMesh();
      const r = 70;
      const rd: Rider = { x: b.x + Math.cos(ang) * r, z: b.z + Math.sin(ang) * r, ang, r, state: 'circle', t: 0, obj, stole: false };
      obj.position.set(rd.x, 0, rd.z);
      g.scene.add(obj);
      this.riders.push(rd);
    }
    audio.raiderHorn();
    g.ui.stamp('RAIDERS!', 'Wave runners after your hold: ram, harpoon or outrun them', '#ff7a5c');
    g.haptic([60, 40, 60]);
  }

  clear() {
    for (const r of this.riders) this.g.scene.remove(r.obj);
    this.riders = [];
    this.active = false;
  }

  /** The nearest rider still in it (for the harpoon ring). */
  nearest(maxD: number) {
    const b = this.g.boat;
    let best: Rider | null = null, bd = maxD;
    for (const r of this.riders) {
      if (r.state === 'out') continue;
      const d = Math.hypot(r.x - b.x, r.z - b.z);
      if (d < bd) {
        bd = d;
        best = r;
      }
    }
    return best;
  }

  /** Knock a rider out (rammed or harpooned): it spins off and sinks. */
  knockOut(r: Rider, how: string) {
    if (r.state === 'out') return;
    r.state = 'out';
    r.t = 0;
    this.out++;
    this.g.foam.emit(new THREE.Vector3(r.x, 0.4, r.z), 30, '#ffffff', 3, 4, 1.1, 8, 1);
    this.g.kick(0.15);
    this.g.haptic([30, 30, 60]);
    audio.clunk();
    this.g.ui.toast(`${how}! One raider down.`, { color: '#f0c445', life: 2 });
  }

  /** Returns 'won' | 'lost' | null (still on). */
  update(dt: number): 'won' | 'lost' | null {
    const g = this.g, b = g.boat;
    if (!this.active) return null;
    this.t += dt;
    const v = g.vehicles;
    const fast = b.speed > 8.5;
    this.dartTimer -= dt;
    for (const r of this.riders) {
      r.t += dt;
      if (r.state === 'out') {
        r.obj.position.y -= dt * 0.6;
        r.obj.rotation.z += dt * 2;
        continue;
      }
      let tx: number, tz: number, sp: number;
      if (r.state === 'circle') {
        r.ang += dt * 0.6;
        r.r += (18 - r.r) * Math.min(1, dt * 0.5);
        tx = b.x + Math.cos(r.ang) * r.r;
        tz = b.z + Math.sin(r.ang) * r.r;
        sp = 13;
        if (this.dartTimer <= 0 && !fast) {
          this.dartTimer = 5;
          r.state = 'dart';
          r.t = 0;
        }
      } else if (r.state === 'dart') {
        tx = b.x;
        tz = b.z;
        sp = 12;
        if (Math.hypot(r.x - b.x, r.z - b.z) < g.ship.beam + 2.5) {
          // the snatch
          const loot = raiderSteal(g.store.data.cargo, Math.random);
          if (loot) {
            g.store.removeFrom(g.store.data.cargo, loot.id, loot.n);
            this.stolen++;
            g.ui.toast(`A raider snatched ${item(loot.id).name}!`, { icon: loot.id, color: '#ff5a2a', life: 2.5 });
            g.haptic([50, 30, 50]);
            audio.deny();
            g.store.commit();
          }
          r.stole = true;
          r.state = 'flee';
          r.t = 0;
        }
        if (fast) r.state = 'circle';
      } else {
        tx = r.x + (r.x - b.x);
        tz = r.z + (r.z - b.z);
        sp = 14;
        if (r.t > 4) {
          r.state = 'circle';
          r.r = 45;
          r.ang = Math.atan2(r.z - b.z, r.x - b.x);
        }
      }
      const dx = tx - r.x, dz = tz - r.z;
      const d = Math.hypot(dx, dz) || 1;
      // they can't keep up with a boat under full engine
      const speed = fast ? Math.min(sp, b.speed * 0.8) : sp;
      r.x += (dx / d) * Math.min(d, speed * dt);
      r.z += (dz / d) * Math.min(d, speed * dt);
      const w = g.ocean.sample(r.x, r.z, g.renderT);
      r.obj.position.set(r.x, w.y + 0.05, r.z);
      r.obj.rotation.set(-w.dz * 0.4, Math.atan2(dx, dz), w.dx * 0.4, 'YXZ');
      if (Math.random() < dt * 8) g.wakeFoam.emit(new THREE.Vector3(r.x, w.y + 0.2, r.z), 1, '#ffffff', 0.8, 0.8, 0.9, 1, 0.5);
      // rammed by your Wave Runner
      if (v.active === 'runner' && v.thrown <= 0 && v.rSpeed > 9 && Math.hypot(v.rx - r.x, v.rz - r.z) < 2.6) this.knockOut(r, 'Rammed');
    }
    // the boat got away: outran them
    const live = this.riders.filter((r) => r.state !== 'out');
    if (!live.length) return this.finish(true, 'All raiders down!');
    if (fast && live.every((r) => Math.hypot(r.x - b.x, r.z - b.z) > 90)) return this.finish(true, 'Outran them!');
    if (this.t > 50) return this.finish(this.stolen === 0, this.stolen ? `They got away with ${this.stolen} thing${this.stolen > 1 ? 's' : ''}` : 'They gave up. Nothing taken!');
    return null;
  }

  private finish(won: boolean, msg: string): 'won' | 'lost' {
    this.g.ui.stamp(won ? 'RAIDERS BEATEN' : 'RAIDERS GONE', msg, won ? '#f0c445' : '#c9b48a');
    for (const r of this.riders) if (r.state !== 'out') r.state = 'flee';
    setTimeout(() => this.clear(), 4000);
    this.active = false;
    return won ? 'won' : 'lost';
  }
}

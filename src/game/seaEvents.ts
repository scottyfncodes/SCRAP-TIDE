// Sea events (loop pass Phase 3): two or three per trip, randomised (seeded on the Daily Tide).
//
//  rogue_wave       a white-crested wall rolls in from one side. Turn your bow into it and keep way on to ride
//                   over (a jump), or take it on the beam: hull damage and a crate or two over the side.
//                   Armour Plating's once-a-trip shield takes the hit.
//  surfacing_wreck  a wreck breaks the surface nearby and goes back down after 30 s.
//  rival            a rival scavenger races you to a wreck. If they get there first, it's theirs.
//  creature         something very big circles a Legendary wreck. Get close and it hits the hull.
//  raiders          (Phase 4) Rustfang wave runners circle and snatch from the hold.
//
// Pure decisions (dodge, steal, creature hit) are exported for the tests; the class drives the scene.
import * as THREE from 'three';
import type { Game } from './game';
import { angleDiff } from '../core/noise';
import { heightAt } from '../world/terrain';
import { model } from '../world/assets';
import { audio } from '../audio/audio';
import { planEvents, type PlannedEvent, type SeaEventKind } from './daily';
import type { Wreck } from './wrecks';

/** Do you ride over a rogue wave? Bow within 40° of the wave's travel (into it) and at least some way on. */
export function rideWave(boatHeading: number, waveFrom: number, speed: number): boolean {
  // the wave travels from `waveFrom` toward the boat; meeting it bow-on means heading toward waveFrom
  return Math.abs(angleDiff(boatHeading, waveFrom)) < (40 * Math.PI) / 180 && speed > 1.5;
}

/** How hard a rogue wave hits a boat it catches on the beam (before armour). */
export const WAVE_HIT = 26;

/** The creature's hit radius around its body. */
export const CREATURE_R = 14;

interface Active {
  kind: SeaEventKind;
  t: number;
  done: boolean;
  won: boolean;
  data: any;
}

export class SeaEvents {
  plan: PlannedEvent[] = [];
  active: Active[] = [];
  seen: SeaEventKind[] = [];
  beaten = 0;
  /** extra event kinds available (Phase 4 adds 'raiders') */
  pool: SeaEventKind[] = ['rogue_wave', 'surfacing_wreck', 'rival', 'creature'];
  private next = 0;

  constructor(private g: Game) {}

  /** A new trip: plan its events (a fixed plan on the Daily Tide). */
  onTripStart(fixed?: PlannedEvent[]) {
    this.clear();
    this.plan = fixed ? fixed.map((e) => ({ ...e })) : planEvents(Math.random, this.g.tripLen, this.pool);
    this.next = 0;
    this.seen = [];
    this.beaten = 0;
  }
  clear() {
    for (const a of this.active) this.cleanup(a);
    this.active = [];
  }

  /** Start an event now (also used by the ?event= preview and tests). */
  trigger(kind: SeaEventKind) {
    const g = this.g;
    const b = g.boat;
    const a: Active = { kind, t: 0, done: false, won: false, data: {} };
    this.seen.push(kind);
    switch (kind) {
      case 'rogue_wave': {
        const from = b.heading + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + (Math.random() - 0.5) * 0.6);
        const wall = waveMesh();
        g.scene.add(wall);
        a.data = { from, wall, dist: 150, hit: false };
        g.ui.stamp('ROGUE WAVE!', 'Turn your bow into it and keep moving', '#e9fbf6');
        audio.squallWarn();
        g.haptic([60, 40, 60]);
        break;
      }
      case 'surfacing_wreck': {
        const spot = this.openWater(70, 150);
        if (!spot) return;
        const w = g.wrecks.spawnAt(spot.x, spot.z, Math.random() < 0.35 ? 'rare' : 'common', { sinkIn: 30, name: 'Surfacing Wreck' });
        a.data = { wreck: w };
        g.foam.emit(new THREE.Vector3(spot.x, 0.5, spot.z), 50, '#ffffff', 4, 6, 1.4, 8, 2);
        audio.haulUp(true);
        g.ui.stamp('A WRECK SURFACED!', '30 seconds before she goes back down', '#d9cfb4');
        break;
      }
      case 'rival': {
        const spot = this.openWater(110, 190);
        if (!spot) return;
        const w = g.wrecks.spawnAt(spot.x, spot.z, 'rare', { name: 'Rare Wreck: Contested' });
        // the rival starts about as far from the wreck as you are, on the other side
        const a2 = Math.atan2(spot.x - b.x, spot.z - b.z);
        const rx = spot.x + Math.sin(a2) * 150, rz = spot.z + Math.cos(a2) * 150;
        const boat = rivalMesh();
        boat.position.set(rx, 0, rz);
        g.scene.add(boat);
        a.data = { wreck: w, boat, x: rx, z: rz, speed: Math.max(5.5, Math.min(9, g.store.stats.speed * 0.8)) };
        g.ui.stamp('RIVAL SCAVENGER!', 'Race them to the wreck', '#ff7a5c');
        audio.raiderHorn();
        break;
      }
      case 'creature': {
        const spot = this.openWater(150, 230);
        if (!spot) return;
        const w = g.wrecks.spawnAt(spot.x, spot.z, 'legendary', { name: 'Legendary Wreck: The Deep One’s Hoard' });
        const body = creatureMesh();
        g.scene.add(body);
        a.data = { wreck: w, body, ang: 0, r: 26, hits: 0 };
        g.ui.stamp('SOMETHING BIG…', 'A legendary wreck, and it is guarded', '#f0c445');
        audio.thunder(0.6);
        break;
      }
      case 'raiders':
        g.raiderEvent?.(a);
        break;
    }
    this.active.push(a);
  }

  private openWater(min: number, max: number) {
    const b = this.g.boat;
    for (let i = 0; i < 12; i++) {
      const a = b.heading + (Math.random() - 0.5) * 2.2;
      const d = min + Math.random() * (max - min);
      const x = b.x + Math.sin(a) * d, z = b.z + Math.cos(a) * d;
      if (heightAt(x, z) > -4) continue;
      if (this.g.drowned.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 10)) continue;
      if (!this.g.crossOk(x, z)) continue;
      return { x, z };
    }
    return null;
  }

  private finish(a: Active, won: boolean, msg?: string) {
    if (a.done) return;
    a.done = true;
    a.won = won;
    if (won) {
      this.beaten++;
      this.g.jobEvent?.({ kind: 'event' } as any);
    }
    if (msg) this.g.ui.toast(msg, { color: won ? '#f0c445' : '#c9b48a', life: 3 });
    this.cleanup(a);
  }
  private cleanup(a: Active) {
    const s = this.g.scene;
    if (a.data.wall) s.remove(a.data.wall);
    if (a.data.boat) s.remove(a.data.boat);
    if (a.data.body) s.remove(a.data.body);
  }

  /** A wreck went under (sunk or taken): resolve whichever event owned it. */
  wreckLost(w: Wreck) {
    for (const a of this.active) if (!a.done && a.data.wreck === w) this.finish(a, false, a.kind === 'surfacing_wreck' ? 'She went back under.' : undefined);
  }
  /** A wreck was hauled: you won its event. */
  wreckHauled(id: string) {
    for (const a of this.active) if (!a.done && a.data.wreck?.site.id === id) {
      if (a.kind === 'rival') this.g.ui.stamp('BEAT THEM TO IT!', '+25 Daily Tide points', '#f0c445');
      this.finish(a, true);
    }
  }

  update(dt: number) {
    const g = this.g, b = g.boat;
    const d = g.store.data;
    if (d.trip.on && !b.docked && g.mode === 'sail' && g.tripClock()) {
      while (this.next < this.plan.length && d.trip.t >= this.plan[this.next].at) this.trigger(this.plan[this.next++].kind);
    }
    for (const a of this.active) {
      if (a.done) continue;
      a.t += dt;
      if (a.kind === 'rogue_wave') this.updateWave(a, dt);
      else if (a.kind === 'rival') this.updateRival(a, dt);
      else if (a.kind === 'creature') this.updateCreature(a, dt);
      else if (a.kind === 'surfacing_wreck' && a.t > 40) this.finish(a, false);
    }
    this.active = this.active.filter((a) => !a.done);
  }

  private updateWave(a: Active, dt: number) {
    const g = this.g, b = g.boat;
    a.data.dist -= dt * 22;
    const fx = Math.sin(a.data.from), fz = Math.cos(a.data.from);
    const w = a.data.wall as THREE.Object3D;
    w.position.set(b.x + fx * a.data.dist, 0, b.z + fz * a.data.dist);
    w.rotation.y = a.data.from; // the face (local -z) looks back at the boat
    // spray blowing off the lip
    if (Math.random() < 0.7) {
      const along = (Math.random() - 0.5) * 80;
      const rx = Math.cos(a.data.from), rz = -Math.sin(a.data.from);
      g.foam.emit(new THREE.Vector3(w.position.x + rx * along - fx * 2, 6 * w.scale.y, w.position.z + rz * along - fz * 2), 2, '#ffffff', 1.4, 1.5, 1.1, 4, 1.2);
    }
    const rise = Math.min(1, (150 - a.data.dist) / 40);
    w.scale.set(1, 0.4 + rise * 0.8, 1);
    if (a.data.dist < 60 && !a.data.warned) {
      a.data.warned = true;
      g.ui.toast(rideWave(b.heading, a.data.from, b.speed) ? 'Bow on. Hold her steady!' : 'Turn INTO the wave!', { color: '#e9fbf6', life: 2 });
    }
    if (a.data.dist <= 4 && !a.data.hit) {
      a.data.hit = true;
      if (rideWave(b.heading, a.data.from, b.speed)) {
        g.jump?.(1.2);
        g.ui.stamp('RODE IT!', 'Bow into the wave', '#e9fbf6');
        this.finish(a, true);
      } else {
        g.damage(WAVE_HIT, 'Rogue wave on the beam!');
        g.kick(0.6);
        g.haptic([90, 40, 120]);
        if (!g.shieldBlockedLast) {
          // a crate or two goes over the side
          const c = g.store.data.cargo.filter((s) => s.n > 0);
          if (c.length) {
            const s = c[Math.floor(Math.random() * c.length)];
            const n = g.store.removeFrom(g.store.data.cargo, s.id, 1 + Math.floor(Math.random() * 2));
            g.ui.toast(`The wave took ${n} from the hold`, { color: '#c9b48a', life: 2.5 });
          }
        }
        this.finish(a, !!g.shieldBlockedLast, g.shieldBlockedLast ? 'The armour took the wave!' : undefined);
      }
    }
  }

  private updateRival(a: Active, dt: number) {
    const g = this.g;
    const w = a.data.wreck as Wreck;
    if (!w || w.hauled) return this.finish(a, true);
    const tx = w.site.x, tz = w.site.z;
    const dx = tx - a.data.x, dz = tz - a.data.z;
    const d = Math.hypot(dx, dz);
    const boat = a.data.boat as THREE.Object3D;
    if (d < 6) {
      // they got there first
      w.taken = true;
      g.wrecks.remove(w);
      g.ui.stamp('THEY GOT IT', 'The rival scavenger hauled it first', '#c9b48a');
      return this.finish(a, false);
    }
    a.data.x += (dx / d) * a.data.speed * dt;
    a.data.z += (dz / d) * a.data.speed * dt;
    const s = g.ocean.sample(a.data.x, a.data.z, g.renderT);
    boat.position.set(a.data.x, s.y, a.data.z);
    boat.rotation.set(-s.dz * 0.5, Math.atan2(dx, dz), s.dx * 0.5, 'YXZ');
    if (Math.random() < 0.3) g.foam.emit(new THREE.Vector3(a.data.x, s.y + 0.2, a.data.z), 1, '#ffffff', 0.8, 0.8, 1.2, 1, 0.6);
  }

  private updateCreature(a: Active, dt: number) {
    const g = this.g, b = g.boat;
    const w = a.data.wreck as Wreck;
    if (!w || w.hauled) return this.finish(a, true, 'You got the hoard out from under it!');
    a.data.ang += dt * 0.55;
    const x = w.site.x + Math.cos(a.data.ang) * a.data.r, z = w.site.z + Math.sin(a.data.ang) * a.data.r;
    const body = a.data.body as THREE.Object3D;
    body.position.set(x, -0.6 + Math.sin(g.renderT * 1.3) * 0.4, z);
    body.rotation.y = -a.data.ang;
    if (Math.hypot(b.x - x, b.z - z) < CREATURE_R + g.ship.beam && (a.data.cool ?? 0) <= g.renderT) {
      a.data.cool = g.renderT + 4;
      g.damage(18, 'The creature hit the hull!');
      g.kick(0.5);
      g.haptic([100, 50, 100]);
      g.foam.emit(new THREE.Vector3(x, 0.5, z), 40, '#ffffff', 4, 6, 1.2, 8, 2);
    }
    if (Math.hypot(b.x - w.site.x, b.z - w.site.z) > 900) this.finish(a, false);
  }
}

/**
 * A rogue wave: a long ridge of sea-coloured water that steepens into a curling lip, with a white foam crest
 * (extruded profile, code-built; the foam spray along the lip is emitted every frame by updateWave).
 */
function waveMesh(): THREE.Object3D {
  const g = new THREE.Group();
  const sh = new THREE.Shape();
  // cross-section in (forward, up): long back slope, steep face, a lip curling over the face
  sh.moveTo(-14, -1);
  sh.quadraticCurveTo(-6, 1.5, -1, 5.2);
  sh.quadraticCurveTo(0.6, 6.6, 2.4, 6.1);
  sh.quadraticCurveTo(3.4, 5.6, 2.6, 4.7);
  sh.quadraticCurveTo(2.2, 2.4, 4, -1);
  sh.lineTo(-14, -1);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 90, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -45);
  geo.rotateY(Math.PI / 2); // the profile's forward axis becomes local -z: the face points along -z
  const body = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ color: 0x1f6474, transparent: true, opacity: 0.94 }));
  g.add(body);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 90, 8), new THREE.MeshBasicMaterial({ color: 0xe9fbf6 }));
  lip.rotation.z = Math.PI / 2;
  lip.position.set(0, 5.9, -1.9);
  g.add(lip);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(90, 3.2), new THREE.MeshBasicMaterial({ color: 0xcfeef0, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  face.position.set(0, 3.3, -3.2);
  face.rotation.x = 0.35;
  g.add(face);
  return g;
}

/** A rival scavenger: the GITCRAFT outpost kit's scrap boat with a red rag of a sail; a box hull if missing. */
function rivalMesh(): THREE.Object3D {
  const g = new THREE.Group();
  const hull = model('tb_outpost_kit', 'scrap_boat', { shadows: true });
  if (hull) {
    hull.scale.setScalar(1.3);
    g.add(hull);
  } else {
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 6), new THREE.MeshToonMaterial({ color: 0x5a4636 }));
    m.position.y = 0.3;
    g.add(m);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 6), new THREE.MeshToonMaterial({ color: 0x4a3524 }));
  mast.position.y = 2.8;
  g.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3), new THREE.MeshToonMaterial({ color: 0xa03a22, side: THREE.DoubleSide }));
  sail.position.set(0, 3.2, -0.6);
  sail.rotation.y = Math.PI / 2;
  g.add(sail);
  return g;
}

/** Humped back segments and a ragged fin: something very large, just under the surface. */
function creatureMesh(): THREE.Object3D {
  const g = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ color: 0x1f2c30 });
  for (let i = 0; i < 5; i++) {
    const s = 1.8 - Math.abs(i - 1.5) * 0.25;
    const hump = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    hump.position.set(0, 0, -i * 3.2);
    hump.scale.set(1, 0.9, 1.4);
    g.add(hump);
  }
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 4), new THREE.MeshToonMaterial({ color: 0x2e3f3f }));
  fin.position.set(0, 2.2, -1.5);
  fin.scale.set(0.35, 1, 1);
  g.add(fin);
  return g;
}

// Rustfang raiders: riders on wave runners (world/raiderRunner.ts) that patrol hostile waters, chase, ram and steal
// cargo.
// The Harpoon Turret (and a Defender) drives them off; twin diesels outrun them.
import * as THREE from 'three';
import type { Game } from './game';
import { RAIDER_ZONES, type RaiderZone } from '../data/world';
import { item } from '../data/items';
import { characterModel, type Character } from '../world/assets';
import { buildRaiderRunner, mountRider, poseRaider, runnerReady, type RaiderRunner } from '../world/raiderRunner';
import { batchCrew, releaseBoat } from '../world/crewBatch';
import { angleDiff, clamp } from '../core/noise';
import { audio } from '../audio/audio';
import { pack } from '../audio/pack';
import { jury } from '../state/look';
import { jawboat, JAWBOAT_CREW, TOLL } from '../world/jury';

/** The patrolled waters: with ?look=jury, also the Rustfang Toll outside Driftholm (docs/jury-rigged). */

export const ZONES: RaiderZone[] = jury() ? [...RAIDER_ZONES, { ...TOLL }] : RAIDER_ZONES;

interface Raider {
  obj: THREE.Object3D;
  x: number;
  z: number;
  heading: number;
  speed: number;
  state: 'patrol' | 'chase' | 'flee';
  timer: number;
  zone: RaiderZone;
  ph: number;
  crew: Character[];
  attacking: boolean;
  /** the wave runner and its rider (null on the Jury-Rigged look's jawboats) */
  run: RaiderRunner | null;
  /** smoothed turn -1..1 (+ = to port) and the bank it leans to */
  turn: number;
  hop: number;
}

/** Rustfang runners are a size up on yours: the bad guys should read from across the water. */
const RUNNER_SCALE = 1.2;

export class Raiders {
  list: Raider[] = [];
  private spawned = new Set<string>();
  private harpoonCool = 0;
  private bolt: THREE.Line;
  private boltLife = 0;

  constructor(private g: Game) {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.bolt = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe9fbf6, transparent: true }));
    this.bolt.visible = false;
    this.bolt.frustumCulled = false;
    g.scene.add(this.bolt);
  }

  positions() {
    return this.list.map((r) => ({ x: r.x, z: r.z }));
  }

  /** 0..1: how close the nearest raider that is chasing you is (drives the combat layer of the theme). */
  get danger() {
    const b = this.g.boat;
    let d = 0;
    for (const r of this.list) if (r.state === 'chase') d = Math.max(d, 1 - Math.min(1, Math.max(0, (Math.hypot(r.x - b.x, r.z - b.z) - 30) / 150)));
    return d;
  }

  private spawn(z: RaiderZone) {
    for (let i = 0; i < z.count; i++) {
      const a = (i / z.count) * Math.PI * 2;
      const run = jury() ? null : buildRaiderRunner(a);
      const obj = run ? run.obj : jawboat(i + 1);
      if (run) obj.scale.setScalar(RUNNER_SCALE);
      const r: Raider = { obj, x: z.x + Math.cos(a) * z.r * 0.5, z: z.z + Math.sin(a) * z.r * 0.5, heading: a, speed: 4, state: 'patrol', timer: 0, zone: z, ph: a, crew: [], attacking: false, run, turn: 0, hop: 0 };
      this.crewUp(r);
      this.g.scene.add(obj);
      this.list.push(r);
    }
    this.spawned.add(z.id);
  }

  /** The rider (GITCRAFT survivor rig) astride the runner; on the Jury-Rigged look, the jawboat's crew on deck. */
  crewUp(r: Raider) {
    if (r.run) {
      // a runner spawned before its model arrived was the stand-in hull: swap it for the real thing
      if (!r.run.model && runnerReady()) {
        this.g.scene.remove(r.obj);
        r.run = buildRaiderRunner(r.ph);
        r.obj = r.run.obj;
        r.obj.scale.setScalar(RUNNER_SCALE);
        this.g.scene.add(r.obj);
      }
      mountRider(r.run);
      return;
    }
    if (r.crew.length) return;
    const spots = JAWBOAT_CREW;
    for (const p of spots) {
      const c = (jury() && characterModel('tb_jury_raider')) || characterModel('tb_raider');
      if (!c) return;
      c.root.position.set(p.x, p.y, p.z);
      c.root.rotation.y = p.ry;
      r.obj.add(c.root);
      const idle = c.actions.Idle;
      if (idle) {
        idle.time = r.ph + p.z;
        idle.play();
      }
      r.crew.push(c);
    }
    if (jury()) batchCrew(r.obj, r.crew);
  }

  /** Characters stream in after the title: give runners already on the water their riders. */
  onCharacters() {
    for (const r of this.list) this.crewUp(r);
  }

  private despawn(z: RaiderZone) {
    for (const r of this.list.filter((r) => r.zone === z)) {
      this.g.scene.remove(r.obj);
      if (jury()) releaseBoat(r.obj); // look visits build per-boat geometry; the default look's is shared and cached
    }
    this.list = this.list.filter((r) => r.zone !== z);
    this.spawned.delete(z.id);
  }

  update(dt: number) {
    const g = this.g;
    const b = g.boat;
    const px = g.mode === 'sail' ? b.x : g.foot.x, pz = g.mode === 'sail' ? b.z : g.foot.z;
    for (const z of ZONES) {
      const d = Math.hypot(px - z.x, pz - z.z);
      // the ledger read out on the flare deck: Rustfang pulls its riders out of Old Meridian (PR 2.4)
      if (z.id === 'rz_meridian' && g.store.data.flags.includes('ledger_confront')) {
        if (this.spawned.has(z.id)) this.despawn(z);
        continue;
      }
      if (!this.spawned.has(z.id) && d < z.r + 260) this.spawn(z);
      else if (this.spawned.has(z.id) && d > z.r + 650) this.despawn(z);
    }
    const st = g.store.stats;
    const defender = g.store.hasRole('defender');
    this.harpoonCool -= dt;
    this.boltLife -= dt;
    this.bolt.visible = this.boltLife > 0;
    const exposed = g.started && g.mode === 'sail' && !b.docked && !g.ui.panelOpen;
    for (const r of this.list) {
      r.timer -= dt;
      const dToP = Math.hypot(px - r.x, pz - r.z);
      // the bow raider waves the cutlass when they close in
      const attack = r.state === 'chase' && dToP < 40;
      if (attack !== r.attacking && r.crew[0]) {
        r.attacking = attack;
        const c = r.crew[0];
        const to = attack ? c.actions.Attack : c.actions.Idle;
        const from = attack ? c.actions.Idle : c.actions.Attack;
        if (to && from) {
          to.reset().play();
          if (attack) to.setLoop(THREE.LoopRepeat, Infinity);
          from.crossFadeTo(to, 0.2, false);
        }
      }
      if (dToP < 260) for (const c of r.crew) c.mixer.update(dt);
      const h0 = r.heading;
      const zoneD = Math.hypot(px - r.zone.x, pz - r.zone.z);
      const chaseR = r.zone.r * (defender ? 0.6 : 1);
      if (r.state === 'flee' && r.timer <= 0) r.state = 'patrol';
      if (r.state === 'patrol' && exposed && zoneD < chaseR) {
        r.state = 'chase';
        if (!g.store.data.flags.includes('met_raiders')) {
          g.store.data.flags.push('met_raiders');
          g.ui.revealInfo('Rustfang Raiders', 'Wave runners, closing fast', 'Rustfang riders on scrap jet skis. They ram boats and snatch cargo. Outrun them with an engine, or fit a <b>Harpoon Turret</b> at Rig Helios to drive them off.', 'Hold on');
        } else {
          g.crewBark('raiders', {}, { prefer: 'lookout', force: true, cool: 30 });
          if (g.store.hasRole('lookout')) pack.say('kai_raiders', 30);
        }
        audio.raiderHorn();
        setTimeout(() => (g.store.hasRole('defender') ? pack.say('ines_raiders', 45) : pack.say('raider_threat', 45)), 2600);
      }
      if (r.state === 'chase' && (!exposed || zoneD > chaseR + 140)) r.state = 'patrol';
      // steering target
      let tx: number, tz: number, sp: number;
      if (r.state === 'chase') {
        tx = px + Math.sin(b.heading) * b.speed * 0.8;
        tz = pz + Math.cos(b.heading) * b.speed * 0.8;
        sp = r.zone.speed;
        if (r.run && dToP > 30) {
          // runners don't come in straight: they slalom across your wake until the last run-in
          const w = Math.sin(g.renderT * 0.9 + r.ph * 3) * Math.min(14, dToP * 0.22);
          const dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz) || 1;
          tx += (dz / d) * w;
          tz -= (dx / d) * w;
        }
      } else if (r.state === 'flee') {
        tx = r.x + (r.x - px);
        tz = r.z + (r.z - pz);
        sp = r.zone.speed * 1.1;
      } else {
        const a = g.renderT * 0.05 + r.ph;
        tx = r.zone.x + Math.cos(a) * r.zone.r * 0.55;
        tz = r.zone.z + Math.sin(a) * r.zone.r * 0.55;
        sp = 4.5;
      }
      const want = Math.atan2(tx - r.x, tz - r.z);
      const agile = r.run ? 2.4 : 1.6; // a runner turns inside any hull
      r.heading += clamp(angleDiff(r.heading, want), -agile * dt, agile * dt);
      r.speed += (sp - r.speed) * Math.min(1, dt * 0.8);
      let nx = r.x + Math.sin(r.heading) * r.speed * dt, nz = r.z + Math.cos(r.heading) * r.speed * dt;
      if (g.drowned.colliders.some((c) => Math.hypot(nx - c.x, nz - c.z) < c.r + 2)) {
        r.heading += 1.2 * dt * 3;
        nx = r.x;
        nz = r.z;
      }
      r.x = nx;
      r.z = nz;
      const w = g.ocean.sample(r.x, r.z, g.renderT);
      if (r.run) {
        // a wave runner planes: nose up with speed, banked hard into its turns, slapping from crest to crest
        const k = clamp(r.speed / r.zone.speed, 0, 1.1);
        const rate = dt > 0 ? angleDiff(h0, r.heading) / dt : 0;
        r.turn += (clamp(rate / 1.6, -1, 1) - r.turn) * Math.min(1, dt * 6);
        r.hop += (Math.max(0, Math.sin(g.renderT * (2.2 + k * 2.6) + r.ph * 5)) * 0.16 * k - r.hop) * Math.min(1, dt * 10);
        r.obj.position.set(r.x, w.y + 0.02 + r.hop, r.z);
        r.obj.rotation.set(-w.dz * 0.5 - 0.1 * k - r.hop * 0.5, r.heading, w.dx * 0.5 - r.turn * 0.5 * k, 'YXZ');
        if (dToP < 300) poseRaider(r.run, dt, r.turn, Math.min(1, k), attack);
        if (r.speed > 3 && Math.random() < 0.7) g.foam.emit(new THREE.Vector3(r.x - Math.sin(r.heading) * 1.9, w.y + 0.25, r.z - Math.cos(r.heading) * 1.9), 1 + (k > 0.7 ? 1 : 0), '#ffffff', 0.9, 1.4 + k * 2.2, 1.1, 1.5, 0.6);
      } else {
        r.obj.position.set(r.x, w.y + 0.05, r.z);
        r.obj.rotation.set(-w.dz * 0.6, r.heading, w.dx * 0.6, 'YXZ');
        if (r.speed > 3 && Math.random() < 0.4) g.foam.emit(new THREE.Vector3(r.x - Math.sin(r.heading) * 3, w.y + 0.2, r.z - Math.cos(r.heading) * 3), 1, '#ffffff', 0.8, 0.8, 1.2, 1, 0.6);
      }
      if (r.state !== 'chase') continue;
      // harpoon / defender drive them off
      const range = st.harpoon || (defender ? 14 : 0);
      if (range && dToP < range && this.harpoonCool <= 0) {
        this.harpoonCool = (st.harpoon ? 7 : 8) / (defender && st.harpoon ? 2 : 1); // a manual HARPOON is quicker (shoot)
        this.fire(r);
        continue;
      }
      // ram and steal
      if (dToP < g.ship.beam + 3.2) {
        r.state = 'flee';
        r.timer = 25;
        g.damage(14, 'Rammed by Rustfang!');
        audio.clunk();
        setTimeout(() => pack.say('raider_taunt', 40), 700);
        g.haptic(80);
        const cargo = g.store.data.cargo.filter((c) => item(c.id).rarity !== 'legendary');
        if (cargo.length) {
          const c = cargo[Math.floor(Math.random() * cargo.length)];
          const n = g.store.removeFrom(g.store.data.cargo, c.id, 1 + Math.floor(Math.random() * 3));
          g.ui.toast(`Raiders grabbed ${n} ${item(c.id).name} and peeled away!`, { icon: c.id, color: '#c8352a', life: 3.5 });
          g.store.commit();
        }
      }
    }
  }

  /** The nearest chasing raider inside harpoon range (for the manual HARPOON action), or null. */
  inRange(): Raider | null {
    const g = this.g, b = g.boat, range = g.store.stats.harpoon;
    if (!range) return null;
    let best: Raider | null = null, bd = Infinity;
    for (const r of this.list) {
      if (r.state !== 'chase') continue;
      const d = Math.hypot(r.x - b.x, r.z - b.z);
      if (d < range * 1.25 && d < bd) {
        bd = d;
        best = r;
      }
    }
    return best;
  }

  /** A manual harpoon shot from the timing ring: a hit drives the raider off, a perfect also tears loot off it. */
  shoot(r: Raider, grade: 'perfect' | 'hit') {
    if (r.state !== 'chase') return;
    this.harpoonCool = 4;
    this.fire(r, grade === 'perfect');
  }

  private fire(r: Raider, perfect = false) {
    const g = this.g;
    // fire from the turret itself (on the Trimaran it rides the starboard outrigger beam)
    const from = g.ship.harpoon ? g.ship.harpoon.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0)) : g.shipRoot.localToWorld(new THREE.Vector3(0, 1.4, g.ship.length * 0.36));
    const to = r.obj.position.clone().setY(r.obj.position.y + 1);
    (this.bolt.geometry as THREE.BufferGeometry).setFromPoints([from, to]);
    this.boltLife = 0.35;
    if (g.ship.harpoon) g.ship.harpoon.rotation.y = Math.atan2(to.x - from.x, to.z - from.z) - g.boat.heading;
    g.foam.emit(to, 30, '#ffffff', 3, 4, 1, 8, 1);
    g.flip.burst('sparks', to, 2.6);
    g.flip.burst('splash', to.clone().setY(r.obj.position.y + 0.6), 3.4);
    audio.harpoon();
    pack.layer('harpoonFire', 0.6);
    setTimeout(() => pack.layer('harpoonHit', 0.7), 220);
    setTimeout(() => (g.store.hasRole('defender') ? pack.say('ines_hit', 40) : pack.say('raider_flee', 40)), 900);
    r.state = 'flee';
    r.timer = 30;
    g.store.data.raidersRepelled++;
    if (!g.crewBark('repelled', {}, { prefer: 'defender', force: true, cool: 10 })) g.ui.toast('Harpoon hit! The raider veers away.', { color: '#4f9a95' });
    if (perfect) {
      g.hitStop(90);
      g.kick(0.2);
      g.haptic([30, 30, 70]);
      g.ui.stamp('PERFECT SHOT!', 'Tore the loot off his runner');
      const n = g.gain(Math.random() < 0.5 ? 'engine_parts' : 'alloy_plate', 1, 'a Rustfang runner', { reveal: 'none' }) + g.gain('scrap_metal', 2, 'Rustfang flotsam', { reveal: 'none' });
      if (n) g.ui.toast(`+${n} salvage torn off the raider`, { icon: 'scrap_metal', color: '#f0c445', life: 2.5 });
    } else if (Math.random() < 0.5) {
      const n = g.gain('scrap_metal', 1 + Math.floor(Math.random() * 2), 'Rustfang flotsam', { reveal: 'none' });
      if (n) g.ui.toast(`+${n} Scrap Metal from the raider’s plating`, { icon: 'scrap_metal', color: '#c9b48a', life: 2 });
    }
    g.store.commit();
  }
}

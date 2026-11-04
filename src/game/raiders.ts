// Rustfang raiders: scrap skiffs that patrol hostile waters, chase, ram and steal cargo.
// The Harpoon Turret (and a Defender) drives them off; twin diesels outrun them.
import * as THREE from 'three';
import type { Game } from './game';
import { RAIDER_ZONES, type RaiderZone } from '../data/world';
import { item } from '../data/items';
import { model, characterModel, type Character } from '../world/assets';
import { angleDiff, clamp } from '../core/noise';
import { audio } from '../audio/audio';
import { pack } from '../audio/pack';

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
}

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
      const obj = model('tb_raider_skiff', 'raider_body', { shadows: true }) ?? new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 6), new THREE.MeshToonMaterial({ color: 0x6b2e14 }));
      const a = (i / z.count) * Math.PI * 2;
      const r: Raider = { obj, x: z.x + Math.cos(a) * z.r * 0.5, z: z.z + Math.sin(a) * z.r * 0.5, heading: a, speed: 4, state: 'patrol', timer: 0, zone: z, ph: a, crew: [], attacking: false };
      this.crewUp(r);
      this.g.scene.add(obj);
      this.list.push(r);
    }
    this.spawned.add(z.id);
  }

  /** Rustfang crew on deck (GITCRAFT survivor rig): one at the bow with a cutlass, one at the tiller. */
  crewUp(r: Raider) {
    if (r.crew.length) return;
    for (const [z, ry] of [[1.1, 0], [-1.7, 0.4]] as const) {
      const c = characterModel('tb_raider');
      if (!c) return;
      c.root.position.set(z > 0 ? 0.15 : -0.2, 0.62, z);
      c.root.rotation.y = ry;
      r.obj.add(c.root);
      const idle = c.actions.Idle;
      if (idle) {
        idle.time = r.ph + z;
        idle.play();
      }
      r.crew.push(c);
    }
  }

  /** Characters stream in after the title: give skiffs already on the water their crews. */
  onCharacters() {
    for (const r of this.list) this.crewUp(r);
  }

  private despawn(z: RaiderZone) {
    for (const r of this.list.filter((r) => r.zone === z)) this.g.scene.remove(r.obj);
    this.list = this.list.filter((r) => r.zone !== z);
    this.spawned.delete(z.id);
  }

  update(dt: number) {
    const g = this.g;
    const b = g.boat;
    const px = g.mode === 'sail' ? b.x : g.foot.x, pz = g.mode === 'sail' ? b.z : g.foot.z;
    for (const z of RAIDER_ZONES) {
      const d = Math.hypot(px - z.x, pz - z.z);
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
      const zoneD = Math.hypot(px - r.zone.x, pz - r.zone.z);
      const chaseR = r.zone.r * (defender ? 0.6 : 1);
      if (r.state === 'flee' && r.timer <= 0) r.state = 'patrol';
      if (r.state === 'patrol' && exposed && zoneD < chaseR) {
        r.state = 'chase';
        if (!g.store.data.flags.includes('met_raiders')) {
          g.store.data.flags.push('met_raiders');
          g.ui.revealInfo('Rustfang Raiders', 'Scrap skiffs, closing fast', 'They ram boats and steal cargo. Outrun them with an engine, or fit a <b>Harpoon Turret</b> at Rig Helios to drive them off.', 'Hold on');
        } else if (g.store.hasRole('lookout')) {
          g.ui.toast('Kai: “Rustfang skiffs! Coming in hard!”', { color: '#c8352a' });
          pack.say('kai_raiders', 30);
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
      r.heading += clamp(angleDiff(r.heading, want), -1.6 * dt, 1.6 * dt);
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
      r.obj.position.set(r.x, w.y + 0.05, r.z);
      r.obj.rotation.set(-w.dz * 0.6, r.heading, w.dx * 0.6, 'YXZ');
      if (r.speed > 3 && Math.random() < 0.4) g.foam.emit(new THREE.Vector3(r.x - Math.sin(r.heading) * 3, w.y + 0.2, r.z - Math.cos(r.heading) * 3), 1, '#ffffff', 0.8, 0.8, 1.2, 1, 0.6);
      if (r.state !== 'chase') continue;
      // harpoon / defender drive them off
      const range = st.harpoon || (defender ? 14 : 0);
      if (range && dToP < range && this.harpoonCool <= 0) {
        this.harpoonCool = (st.harpoon ? 5 : 8) / (defender && st.harpoon ? 2 : 1);
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

  private fire(r: Raider) {
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
    g.ui.toast(g.store.hasRole('defender') ? 'Ines: “And stay out!” Raider driven off.' : 'Harpoon hit! The raider veers away.', { color: '#4f9a95' });
    if (Math.random() < 0.5) {
      const n = g.gain('scrap_metal', 1 + Math.floor(Math.random() * 2), 'Rustfang flotsam', { reveal: 'none' });
      if (n) g.ui.toast(`+${n} Scrap Metal from the raider’s plating`, { icon: 'scrap_metal', color: '#c9b48a', life: 2 });
    }
    g.store.commit();
  }
}

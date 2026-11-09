// The vehicles (loop pass Phase 4): the Wave Runner and the Hot Air Balloon.
//
// Wave Runner: rides in a cradle on the Trimaran's port float (alongside on other hulls). LAUNCH drops it in the
// water and the controls hand over to it at once; the main boat holds position. Much faster and nimbler than any
// hull, it jumps off wave crests, carries one load (two with the tow sled) and reaches shallows the boats can't.
// It is fragile: a hard crash or a rogue wave throws you off, the load floats away (you can grab it again), and you
// swim back to the runner or respawn at the boat. Loads only count once unloaded onto the boat (RETURN beside her),
// and then bank at a dock like everything else.
//
// Hot Air Balloon: stowed on the starboard float. GO UP inflates it on a tether; HOLD BURN to climb, let go to sink.
// Up high the camera pulls far overhead: wrecks (tier shown with the Salvage Radar), the squall, rogue waves and
// rivals in sight are marked, and the marks stay on the radar after you land. The trip clock and the storm keep
// running, and the wind drifts you. With the winch, hover over a heavy wreck in the shallows, WINCH LIFT it and fly
// it back to the boat.
//
// Pure rules (cargo transfer, crash drop, the raiders' steal, balloon sight) are exported for the tests.
import * as THREE from 'three';
import type { Game } from './game';
import { runnerStats } from '../data/ship';
import { item } from '../data/items';
import { sceneModel, loadModelFiles, modelRequested } from '../world/assets';
import { heightAt } from '../world/terrain';
import { WORLD, SALVAGE_SITES } from '../data/world';
import { TIER_COLOR, tierRank, tierOf } from '../data/loot';
import { angleDiff, clamp } from '../core/noise';
import { audio } from '../audio/audio';
import { pack } from '../audio/pack';

export type Load = { id: string; n: number };

/** Unload the runner's loads into the boat's hold. `room(id)` is how many fit. Returns what moved and what's left. */
export function transferCargo(carried: Load[], room: (id: string) => number): { moved: Load[]; left: Load[] } {
  const moved: Load[] = [], left: Load[] = [];
  for (const l of carried) {
    const fit = Math.min(l.n, Math.max(0, room(l.id)));
    if (fit > 0) moved.push({ id: l.id, n: fit });
    if (l.n - fit > 0) left.push({ id: l.id, n: l.n - fit });
  }
  return { moved, left };
}

/** A crash throws everything the runner carried into the water. */
export function crashDrop(carried: Load[]): { dropped: Load[]; kept: Load[] } {
  return { dropped: carried.map((l) => ({ ...l })), kept: [] };
}

/** Is this impact a crash? Hitting land or a wreck hard, or a rogue wave. */
export function isCrash(speed: number, kind: 'land' | 'object' | 'wave'): boolean {
  if (kind === 'wave') return true;
  return speed > (kind === 'land' ? 8 : 7);
}

/** What a raider snatches from the hold on a pass: one of the most valuable non-legendary stacks, 1 unit. */
export function raiderSteal(cargo: Load[], rng: () => number): Load | null {
  const ok = cargo.filter((c) => c.n > 0 && tierOf(c.id) !== 'legendary');
  if (!ok.length) return null;
  ok.sort((a, b) => item(b.id).value - item(a.id).value);
  const pick = ok[Math.min(ok.length - 1, Math.floor(rng() * Math.min(3, ok.length)))];
  return { id: pick.id, n: 1 };
}

/** How far you can see from the balloon at an altitude (m). */
export function balloonSight(alt: number): number {
  return clamp(80 + alt * 6, 80, 760);
}

export interface Mark {
  kind: 'wreck' | 'wreck_rare' | 'wreck_legendary' | 'storm' | 'wave' | 'rival';
  x: number;
  z: number;
  id?: string;
}

/** The radar kind a spotted wreck is marked with: its tier only if the Salvage Radar is fitted. */
export function wreckMarkKind(tier: 'common' | 'rare' | 'legendary', radar: boolean): Mark['kind'] {
  if (!radar || tier === 'common') return 'wreck';
  return tier === 'rare' ? 'wreck_rare' : 'wreck_legendary';
}

const RUNNER_FILE = 'tb_waverunner';
const BALLOON_FILE = 'tb_balloon';
/** The vehicle model files a save needs (lazy: only when owned or previewed). */
export function vehicleFiles(owned: readonly string[]): string[] {
  return [...(owned.includes('wr_runner') ? [RUNNER_FILE] : []), ...(owned.includes('bl_balloon') ? [BALLOON_FILE] : [])];
}

/** Where the docked runner and stowed balloon ride, in the boat's frame (the Trimaran's floats; alongside elsewhere). */
export function stowSpots(vessel: string, beam: number) {
  if (vessel === 'sloop') return { runner: new THREE.Vector3(-5.25, 0.15, -0.39), balloon: new THREE.Vector3(4.375, 1.06, -0.75) };
  return { runner: new THREE.Vector3(-(beam + 0.9), 0.05, -0.4), balloon: new THREE.Vector3(beam + 1.0, 0.05, -0.6) };
}

export class Vehicles {
  active: 'runner' | 'balloon' | null = null;
  // the runner
  rx = 0;
  rz = 0;
  rHeading = 0;
  rSpeed = 0;
  rY = 0;
  rVy = 0;
  carried: Load[] = [];
  dropped: { x: number; z: number; loads: Load[]; obj: THREE.Object3D; life: number }[] = [];
  thrown = 0; // >0: thrown off, seconds left of the swim back
  homing = false;
  boostT = 0;
  boostCool = 0;
  // the balloon
  bx = 0;
  bz = 0;
  alt = 0;
  burning = false;
  lifting: { site: string; obj: THREE.Object3D } | null = null;
  marks: Mark[] = [];
  private markTimer = 0;
  // scene
  private runnerObj: THREE.Object3D | null = null;
  private dockedRunner: THREE.Object3D | null = null;
  private balloonObj: THREE.Object3D | null = null;
  private stowedBalloon: THREE.Object3D | null = null;
  private tether: THREE.Line;
  private holdBtn: HTMLElement | null = null;
  private lastSpray = 0;

  constructor(private g: Game) {
    this.tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x3a2a1c }));
    this.tether.frustumCulled = false;
    this.tether.visible = false;
    g.scene.add(this.tether);
    this.marks = (g.store.data.trip.marks ?? []) as Mark[]; // a reload mid-trip keeps the balloon's marks
  }

  get runner() {
    return runnerStats((id) => this.g.store.has(id));
  }
  get hasBalloon() {
    return this.g.store.has('bl_balloon');
  }

  /** Fetch the vehicle models the save needs, then (re)mount them. */
  ensureModels() {
    const need = vehicleFiles(this.g.store.data.upgrades).filter((f) => !modelRequested(f));
    if (need.length) loadModelFiles(need).then(() => this.mount());
    this.mount();
  }

  /** Mount the docked runner and the stowed balloon on the boat (called after every rebuild of the ship). */
  mount() {
    const g = this.g;
    for (const o of [this.dockedRunner, this.stowedBalloon]) o?.parent?.remove(o);
    this.dockedRunner = this.stowedBalloon = null;
    const spots = stowSpots(g.store.data.vessel, g.ship.beam);
    if (this.runner.owned) {
      const o = this.buildRunner(true);
      o.position.copy(spots.runner);
      g.ship.group.add(o);
      this.dockedRunner = o;
      o.visible = this.active !== 'runner';
    }
    if (this.hasBalloon) {
      const o = this.buildBalloon('stowed');
      o.position.copy(spots.balloon);
      g.ship.group.add(o);
      this.stowedBalloon = o;
      o.visible = this.active !== 'balloon';
    }
  }

  /** The GITCRAFT model, or a code-built stand-in if the file failed to load. */
  private buildRunner(docked: boolean): THREE.Object3D {
    const m = sceneModel(RUNNER_FILE, { shadows: true });
    let o: THREE.Object3D;
    if (m) o = m;
    else {
      o = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.8, 4, 8), new THREE.MeshToonMaterial({ color: 0x4fb39a }));
      hull.rotation.x = Math.PI / 2;
      hull.scale.set(1, 1, 0.55);
      hull.position.y = 0.15;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.9), new THREE.MeshToonMaterial({ color: 0x1b1b1f }));
      seat.position.set(0, 0.55, -0.35);
      const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.5), new THREE.MeshToonMaterial({ color: 0x8c8a86 }));
      cowl.position.set(0, 0.55, 0.42);
      o.add(hull, seat, cowl);
      o.userData.fallback = true;
    }
    const sled = o.getObjectByName('waverunner_sled');
    if (sled) sled.visible = !docked && this.runner.cargo > 1;
    return o;
  }

  private buildBalloon(state: 'stowed' | 'flying'): THREE.Object3D {
    const m = sceneModel(BALLOON_FILE, { shadows: state === 'flying' });
    let o: THREE.Object3D;
    if (m) {
      o = m;
      const env = o.getObjectByName('balloon_envelope'), stow = o.getObjectByName('balloon_stowed'), burner = o.getObjectByName('balloon_burner'), winch = o.getObjectByName('balloon_winch');
      if (env) env.visible = state === 'flying';
      if (burner) burner.visible = state === 'flying';
      if (stow) stow.visible = state === 'stowed';
      if (winch) winch.visible = state === 'flying' && this.g.store.has('bl_winch');
    } else {
      o = new THREE.Group();
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.76, 12), new THREE.MeshToonMaterial({ color: 0xa24b21 }));
      basket.position.y = 0.38;
      o.add(basket);
      if (state === 'flying') {
        const env = new THREE.Mesh(new THREE.SphereGeometry(3.4, 12, 10), new THREE.MeshToonMaterial({ color: 0x2f6fb0 }));
        env.scale.set(1, 1.15, 1);
        env.position.y = 6.4;
        o.add(env);
      } else {
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 10), new THREE.MeshToonMaterial({ color: 0x2f6fb0 }));
        roll.rotation.z = Math.PI / 2;
        roll.position.y = 0.95;
        o.add(roll);
      }
      o.userData.fallback = true;
    }
    if (state === 'stowed') o.scale.setScalar(0.8);
    return o;
  }

  // ─────────── launching and returning ───────────
  canLaunchRunner() {
    const g = this.g;
    return this.runner.owned && !this.active && g.mode === 'sail' && !g.boat.docked && !g.boat.busy;
  }
  canLaunchBalloon() {
    const g = this.g;
    return this.hasBalloon && !this.active && g.mode === 'sail' && !g.boat.docked && !g.boat.busy;
  }

  launchRunner() {
    const g = this.g, b = g.boat;
    if (!this.canLaunchRunner()) return;
    const spot = stowSpots(g.store.data.vessel, g.ship.beam).runner;
    const w = g.shipRoot.localToWorld(spot.clone());
    this.rx = w.x + Math.sin(b.heading - Math.PI / 2) * 2;
    this.rz = w.z + Math.cos(b.heading - Math.PI / 2) * 2;
    this.rHeading = b.heading;
    this.rSpeed = Math.max(4, b.speed);
    this.rY = 0;
    this.rVy = 0;
    this.thrown = 0;
    this.homing = false;
    this.active = 'runner';
    this.runnerObj = this.buildRunner(false);
    g.scene.add(this.runnerObj);
    if (this.dockedRunner) this.dockedRunner.visible = false;
    g.camYaw = this.rHeading;
    audio.splash(true);
    audio.engineStart(true);
    g.haptic(25);
    if (!g.store.data.flags.includes('runner_tip')) {
      g.store.data.flags.push('runner_tip');
      g.ui.toast(`Steer with the wheel. Carries ${this.runner.cargo} load${this.runner.cargo > 1 ? 's' : ''}: RETURN beside the boat to unload.`, { color: '#9fd0c8', life: 4 });
    }
  }

  /** RETURN: beside the boat, unload and dock instantly; further out, the runner heads home on its own. */
  returnRunner() {
    const g = this.g, b = g.boat;
    if (this.active !== 'runner') return;
    const d = Math.hypot(this.rx - b.x, this.rz - b.z);
    if (d > g.ship.beam + 14 && this.thrown <= 0) {
      this.homing = true;
      g.ui.toast('Heading home to the boat', { life: 1.6 });
      return;
    }
    this.unload();
    this.dock();
  }

  private unload() {
    const g = this.g, s = g.store;
    if (!this.carried.length) return;
    const { moved, left } = transferCargo(this.carried, (id) => s.room(id));
    for (const m of moved) s.addCargo(m.id, m.n);
    this.carried = left;
    if (moved.length) {
      audio.pickup();
      g.haptic([20, 30, 40]);
      g.ui.toast(`Unloaded onto the boat: ${moved.map((m) => `${m.n} ${item(m.id).name}`).join(', ')}`, { color: '#4f9a95', life: 2.6 });
    }
    if (left.length) g.ui.toast('The hold is full: the rest stays on the runner', { color: '#ff6b4a', life: 2.5 });
    s.commit();
  }

  private dock() {
    const g = this.g;
    if (this.runnerObj) g.scene.remove(this.runnerObj);
    this.runnerObj = null;
    this.active = null;
    this.homing = false;
    if (this.dockedRunner) this.dockedRunner.visible = true;
    g.camYaw = g.boat.heading;
    audio.engine(0);
    audio.clunk();
    this.setHold(null);
  }

  /** A crash or a rogue wave: thrown off. The load floats where it fell; swim back to the runner, or respawn. */
  crash(why: string) {
    const g = this.g;
    if (this.active !== 'runner' || this.thrown > 0) return;
    const { dropped } = crashDrop(this.carried);
    this.carried = [];
    if (dropped.length) {
      const obj = new THREE.Group();
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.7), new THREE.MeshToonMaterial({ color: 0xc9a46b }));
      obj.add(crate);
      obj.position.set(this.rx, 0, this.rz);
      g.scene.add(obj);
      this.dropped.push({ x: this.rx, z: this.rz, loads: dropped, obj, life: 90 });
    }
    this.thrown = 3.2;
    this.rSpeed = 0;
    g.kick(0.5);
    g.haptic([80, 40, 140]);
    audio.hullHit(0.8);
    audio.splash(true);
    g.foam.emit(new THREE.Vector3(this.rx, 0.4, this.rz), 36, '#ffffff', 3, 4, 1.2, 8, 1.2);
    g.ui.stamp('THROWN OFF!', `${why}${dropped.length ? ' · the load is floating where you fell' : ''}`, '#ff7a5c');
  }

  /** Respawn at the boat after a crash (the runner is hauled back aboard). */
  respawn() {
    if (this.active !== 'runner') return;
    this.thrown = 0;
    this.dock();
    this.g.ui.toast('Back aboard. The runner’s in her cradle.', { life: 2 });
  }

  goUp() {
    const g = this.g;
    if (!this.canLaunchBalloon()) return;
    this.active = 'balloon';
    this.bx = g.boat.x;
    this.bz = g.boat.z;
    this.alt = 4;
    this.balloonObj = this.buildBalloon('flying');
    g.scene.add(this.balloonObj);
    if (this.stowedBalloon) this.stowedBalloon.visible = false;
    this.tether.visible = true;
    audio.burner(true);
    g.haptic(30);
    this.setHold({ label: '🔥 HOLD TO BURN', on: () => (this.burning = true), off: () => (this.burning = false) });
    if (!g.store.data.flags.includes('balloon_tip')) {
      g.store.data.flags.push('balloon_tip');
      g.ui.toast('Hold BURN to climb, let go to sink. Everything you see from up high goes on your radar.', { color: '#f0c445', life: 4.5 });
    }
  }

  land() {
    const g = this.g;
    if (this.active !== 'balloon') return;
    if (this.lifting) this.deliverLift();
    if (this.balloonObj) g.scene.remove(this.balloonObj);
    this.balloonObj = null;
    this.active = null;
    this.burning = false;
    this.tether.visible = false;
    if (this.stowedBalloon) this.stowedBalloon.visible = true;
    audio.burner(false);
    pack.loopGain('tb_balloon_burner', 0);
    pack.loopGain('tb_balloon_wind', 0);
    g.camYaw = g.boat.heading;
    this.setHold(null);
    if (this.marks.length) g.ui.toast(`${this.marks.length} mark${this.marks.length > 1 ? 's' : ''} on your radar`, { color: '#f0c445', life: 2.5 });
  }

  /** The hold button (burner, boost) under the right thumb. */
  setHold(o: { label: string; on: () => void; off: () => void } | null) {
    this.holdBtn?.remove();
    this.holdBtn = null;
    if (!o) return;
    const b = document.createElement('button');
    b.className = 'hold-btn';
    b.textContent = o.label;
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      b.setPointerCapture(e.pointerId);
      b.classList.add('on');
      o.on();
    });
    const up = () => {
      b.classList.remove('on');
      o.off();
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    (document.querySelector('.hud') ?? document.body).append(b);
    this.holdBtn = b;
  }

  /** Clear everything at the end of a trip (docking banks, swamping loses: either way the vehicles come home). */
  reset() {
    if (this.active === 'runner') {
      this.carried = [];
      this.dock();
    } else if (this.active === 'balloon') this.land();
    for (const d of this.dropped) this.g.scene.remove(d.obj);
    this.dropped = [];
    this.marks = [];
    this.g.store.data.trip.marks = [];
  }

  // ─────────── per frame ───────────
  /** The camera target and framing while a vehicle is out (null: follow the boat). */
  camera(): { x: number; y: number; z: number; dist: number; pitch: number } | null {
    if (this.active === 'runner') return { x: this.rx, y: 0.8 + this.rY * 0.6, z: this.rz, dist: 7 * this.g.zoom, pitch: 0.26 };
    if (this.active === 'balloon') {
      const high = clamp((this.alt - 25) / 60, 0, 1);
      // low down: frame the basket (and anything on the winch under it); high up: pull far overhead over the sea
      return { x: this.bx, y: (this.alt - 3) * (1 - high) + this.alt * 0.6 * high, z: this.bz, dist: (24 + high * 200) * this.g.zoom, pitch: 0.3 + high * 1.0 };
    }
    return null;
  }

  update(dt: number) {
    if (this.active === 'runner') this.updateRunner(dt);
    else if (this.active === 'balloon') this.updateBalloon(dt);
    // the floating loads from a crash bob, and a runner that rides over them picks them up again
    for (const d of [...this.dropped]) {
      d.life -= dt;
      const s = this.g.ocean.sample(d.x, d.z, this.g.renderT);
      d.obj.position.y = s.y;
      d.obj.rotation.y += dt * 0.3;
      if (this.active === 'runner' && this.thrown <= 0 && Math.hypot(d.x - this.rx, d.z - this.rz) < 2.5 && this.room() > 0) {
        this.carried.push(...d.loads.slice(0, this.room()));
        this.g.scene.remove(d.obj);
        this.dropped = this.dropped.filter((o) => o !== d);
        audio.pickup();
        this.g.ui.toast('Got the load back!', { life: 1.6 });
      } else if (d.life <= 0) {
        this.g.scene.remove(d.obj);
        this.dropped = this.dropped.filter((o) => o !== d);
      }
    }
    this.markTimer -= dt;
  }

  /** Loads the runner can still take. */
  room() {
    return Math.max(0, this.runner.cargo - this.carried.length);
  }

  /** The runner picks a load up (a cache it rides over, a wreck it hauls). Returns false when it is full. */
  take(l: Load) {
    if (this.room() <= 0) {
      this.g.say?.('runner_full', 'The runner is full. RETURN to the boat to unload.', 3);
      return false;
    }
    this.carried.push(l);
    this.g.haptic(25);
    return true;
  }

  private updateRunner(dt: number) {
    const g = this.g, b = g.boat;
    const st = this.runner;
    const j = g.ui.joy;
    if (this.thrown > 0) {
      // swimming back to the runner (it drifts where it stopped)
      this.thrown -= dt;
      if (this.thrown <= 0) g.ui.toast('Back on the runner', { life: 1.4 });
    } else {
      let throttle = 0, target = this.rHeading;
      const mag = Math.min(1, Math.hypot(j.x, j.y));
      if (this.homing && mag > 0.2) this.homing = false;
      if (this.homing) {
        target = Math.atan2(b.x - this.rx, b.z - this.rz);
        throttle = 1;
        if (Math.hypot(b.x - this.rx, b.z - this.rz) < g.ship.beam + 8) {
          this.unload();
          this.dock();
          return;
        }
      } else if (mag > 0.15 && !g.ui.panelOpen) {
        const F = { x: Math.sin(g.camYaw), z: Math.cos(g.camYaw) }, R = { x: -Math.cos(g.camYaw), z: Math.sin(g.camYaw) };
        target = Math.atan2(F.x * j.y + R.x * j.x, F.z * j.y + R.z * j.x);
        throttle = mag;
      }
      // range: past it the engine coughs and the runner limps (never stranded: it can always crawl home)
      const fromBoat = Math.hypot(this.rx - b.x, this.rz - b.z);
      const over = fromBoat > st.range;
      if (over && (g as any).__rangeSaid !== true) {
        (g as any).__rangeSaid = true;
        g.ui.toast('Tank’s nearly dry! Head back to the boat.', { color: '#f0a050', life: 3 });
      } else if (!over) (g as any).__rangeSaid = false;
      const boost = this.boostT > 0 ? 1.6 : 1;
      const top = (over ? 5 : st.speed) * boost;
      const diff = angleDiff(this.rHeading, target);
      this.rHeading += clamp(diff, -2.8 * dt, 2.8 * dt);
      const want = throttle * top * (Math.abs(diff) > 1.6 ? 0.6 : 1);
      this.rSpeed += (want - this.rSpeed) * Math.min(1, dt * (want > this.rSpeed ? 2.2 : 1.4));
    }
    this.boostT = Math.max(0, this.boostT - dt);
    this.boostCool = Math.max(0, this.boostCool - dt);
    // move, and crash into land or wrecks at speed
    const nx = this.rx + Math.sin(this.rHeading) * this.rSpeed * dt, nz = this.rz + Math.cos(this.rHeading) * this.rSpeed * dt;
    const ground = heightAt(nx, nz);
    const hitObj = g.drowned.colliders.some((c) => Math.hypot(c.x - nx, c.z - nz) < c.r + 0.8);
    if (ground > -0.25 || hitObj) {
      if (isCrash(this.rSpeed, hitObj ? 'object' : 'land')) this.crash(hitObj ? 'Hit a wreck at full tilt' : 'Ran aground at speed');
      else this.rSpeed = 0;
    } else {
      this.rx = nx;
      this.rz = nz;
    }
    // ride the waves; launch off a crest at speed
    const w = g.ocean.sample(this.rx, this.rz, g.renderT);
    const slope = w.dx * Math.sin(this.rHeading) + w.dz * Math.cos(this.rHeading);
    if (this.rY <= 0 && this.rSpeed > 11 && slope < -0.12 && this.thrown <= 0) {
      this.rVy = 2.5 + this.rSpeed * 0.18;
      g.haptic(30);
    }
    if (this.rY > 0 || this.rVy > 0) {
      this.rY += this.rVy * dt;
      this.rVy -= 14 * dt;
      if (this.rY <= 0) {
        if (this.rVy < -5) {
          g.foam.emit(new THREE.Vector3(this.rx, w.y + 0.2, this.rz), 22, '#ffffff', 2.5, 3, 1, 8, 0.8);
          if (!pack.oneShot('tb_runner_splash', 0.6, 0.9 + Math.random() * 0.2)) audio.splash(true);
          g.haptic(40);
          g.kick(0.12);
        }
        this.rY = 0;
        this.rVy = 0;
      }
    }
    const o = this.runnerObj!;
    o.position.set(this.rx, w.y + 0.05 + this.rY, this.rz);
    o.rotation.set(-w.dz * 0.4 - (this.rY > 0 ? clamp(this.rVy * 0.05, -0.35, 0.35) : 0), this.rHeading, w.dx * 0.4 + (this.thrown > 0 ? 1.2 : 0), 'YXZ');
    const bars = o.getObjectByName('waverunner_bars');
    if (bars) bars.rotation.y = clamp(angleDiff(this.rHeading, Math.atan2(g.ui.joy.x, g.ui.joy.y) + g.camYaw), -0.5, 0.5) * 0.6;
    // spray and the engine
    if (this.rSpeed > 6 && g.renderT - this.lastSpray > 0.08 && this.rY <= 0) {
      this.lastSpray = g.renderT;
      g.wakeFoam.emit(new THREE.Vector3(this.rx - Math.sin(this.rHeading) * 1.3, w.y + 0.2, this.rz - Math.cos(this.rHeading) * 1.3), 2, '#ffffff', 1, 1.2, 0.9, 2, 0.5);
    }
    audio.runner(this.thrown > 0 ? 0 : 0.25 + (this.rSpeed / 21) * 0.75, this.boostT > 0);
    // caches it rides over (including the shallow ones only it can reach)
    g.runnerPickups(this.rx, this.rz, dt);
    // the boat holds position while you're out
    b.speed *= Math.max(0, 1 - dt * 1.5);
  }

  boost() {
    if (this.active !== 'runner' || !this.runner.boost || this.boostCool > 0 || this.thrown > 0) return;
    this.boostT = 2.5;
    this.boostCool = 7;
    this.g.kick(0.1);
    this.g.haptic([20, 20, 50]);
    if (!pack.oneShot('tb_runner_boost', 0.7)) audio.engineStart(true);
  }

  private updateBalloon(dt: number) {
    const g = this.g, b = g.boat;
    // one input: burn to climb, let go to sink (never below the deck)
    const climb = this.burning ? 9 : -5;
    this.alt = clamp(this.alt + climb * dt, 3, 140);
    // the wind drifts you downwind of the boat, more the higher you are; the tether holds you within range
    const wd = WORLD.wind.dir;
    const drift = 6 + this.alt * 0.5;
    const tx = b.x + Math.sin(wd) * drift, tz = b.z + Math.cos(wd) * drift;
    // the joystick nudges the balloon along the tether arc (a little control, not a lot)
    const j = g.ui.joy;
    const F = { x: Math.sin(g.camYaw), z: Math.cos(g.camYaw) }, R = { x: -Math.cos(g.camYaw), z: Math.sin(g.camYaw) };
    const nudge = 50 * Math.min(1, this.alt / 40);
    const gx = tx + (F.x * j.y + R.x * j.x) * nudge, gz = tz + (F.z * j.y + R.z * j.x) * nudge;
    const k = 1 - Math.exp(-dt * 0.5);
    this.bx += (gx - this.bx) * k;
    this.bz += (gz - this.bz) * k;
    const o = this.balloonObj!;
    o.position.set(this.bx, this.alt, this.bz);
    o.rotation.y += dt * 0.05;
    o.rotation.z = Math.sin(g.renderT * 0.7) * 0.04;
    const flame = o.getObjectByName('balloon_burner');
    if (flame) flame.scale.y = this.burning ? 1.3 + Math.random() * 0.3 : 0.6;
    // StudioCraft burner and high-wind loops; the synth roar stands in until the burner loop has loaded
    pack.loopGain('tb_balloon_burner', this.burning ? 0.55 : 0);
    pack.loopGain('tb_balloon_wind', clamp((this.alt - 15) / 90, 0, 1) * 0.35);
    audio.burnerLevel(this.burning && !pack.loopReady('tb_balloon_burner') ? 1 : 0);
    // tether from the boat to the basket
    const from = new THREE.Vector3(b.x, 2, b.z), to = new THREE.Vector3(this.bx, this.alt, this.bz);
    (this.tether.geometry as THREE.BufferGeometry).setFromPoints([from, to]);
    // a lifted wreck hangs under the basket
    if (this.lifting) {
      this.lifting.obj.position.set(this.bx, this.alt - 3.2, this.bz);
      if (Math.hypot(this.bx - b.x, this.bz - b.z) < g.ship.beam + 10) this.deliverLift();
    }
    // spot and mark what's in sight
    if (this.markTimer <= 0 && this.alt > 30) {
      this.markTimer = 0.5;
      this.spot();
    }
    b.speed *= Math.max(0, 1 - dt * 1.5);
  }

  /** Everything in sight from up here goes on the radar (and stays there after you land). */
  spot() {
    const g = this.g;
    const R = balloonSight(this.alt);
    const radar = !!g.store.stats.radar;
    const add = (m: Mark) => {
      const old = this.marks.findIndex((o) => (m.id && o.id === m.id) || (!m.id && o.kind === m.kind && Math.hypot(o.x - m.x, o.z - m.z) < 40));
      if (old >= 0) this.marks[old] = m;
      else {
        this.marks.push(m);
        g.ui.markPing?.(m.kind);
      }
    };
    for (const w of g.wrecks.list) {
      if (w.hauled || w.taken || Math.hypot(w.site.x - this.bx, w.site.z - this.bz) > R) continue;
      add({ kind: wreckMarkKind(w.tier, radar), x: w.site.x, z: w.site.z, id: w.site.id });
    }
    for (const a of g.events.active) {
      if (a.kind === 'rogue_wave' && a.data.wall) add({ kind: 'wave', x: a.data.wall.position.x, z: a.data.wall.position.z, id: 'wave' });
      if (a.kind === 'rival' && a.data.boat) add({ kind: 'rival', x: a.data.x, z: a.data.z, id: 'rival' });
      if (a.kind === 'raiders') for (const [i, r] of (a.data.riders ?? []).entries()) add({ kind: 'rival', x: r.x, z: r.z, id: `raider${i}` });
    }
    // the storm edge: the nearest roaming cell (and the squall) within sight
    for (const c of g.atmo.storms) {
      const d = Math.hypot(c.x - this.bx, c.z - this.bz);
      if (d - c.r < R) {
        const k = Math.max(0, d - c.r * 0.7) / Math.max(1, d);
        add({ kind: 'storm', x: this.bx + (c.x - this.bx) * k, z: this.bz + (c.z - this.bz) * k });
      }
    }
    g.store.data.trip.marks = this.marks.map((m) => ({ ...m }));
  }

  /** WINCH LIFT: hook a heavy wreck under the basket (needs the winch, low over the wreck). */
  winchTarget() {
    const g = this.g;
    if (this.active !== 'balloon' || !g.store.has('bl_winch') || this.lifting || this.alt > 45) return null;
    return g.wrecks.list.find((w) => !w.hauled && !w.taken && Math.hypot(w.site.x - this.bx, w.site.z - this.bz) < 16) ?? null;
  }
  winchLift() {
    const g = this.g;
    const w = this.winchTarget();
    if (!w) return;
    g.wrecks.list = g.wrecks.list.filter((o) => o !== w);
    const obj = w.obj;
    obj.remove(w.beam);
    this.lifting = { site: w.site.id, obj };
    (obj.userData as any).wreck = w;
    g.kick(0.2);
    g.haptic([40, 40, 80]);
    audio.winch(true);
    setTimeout(() => audio.winch(false), 1200);
    g.ui.stamp('WINCH LIFT!', 'Fly her back to the boat', '#f0c445');
  }
  private deliverLift() {
    const g = this.g;
    if (!this.lifting) return;
    const w = (this.lifting.obj.userData as any).wreck;
    g.scene.remove(this.lifting.obj);
    this.lifting = null;
    // she comes down on deck: haul her out as a clean three-pull haul
    g.salvage.haulLifted(w.site, w.tier);
  }

  /** The persistent marks for the radar (after landing too). */
  radarMarks(): Mark[] {
    return this.marks;
  }

  /** Thumb positions on the phone are fixed: the hold button sits bottom-right above the action column. */
  get holdOpen() {
    return !!this.holdBtn;
  }
}

export const MARK_COLOR: Record<Mark['kind'], string> = {
  wreck: '#d9cfb4',
  wreck_rare: TIER_COLOR.rare,
  wreck_legendary: TIER_COLOR.legendary,
  storm: '#9aa9b4',
  wave: '#e9fbf6',
  rival: '#ff7a5c',
};
void tierRank;
void SALVAGE_SITES;

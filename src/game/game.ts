// TIDEBREAKERS core: rendering loop, sailing, going ashore, digging, treasure, harbor and quests.
import * as THREE from 'three';
import { Store } from '../state/store';
import { UI, type GameAPI, type Action } from '../ui/ui';
import { Ocean } from '../world/ocean';
import { Sky, SUN_DIR, FOG, SKY_HORIZON } from '../world/sky';
import { Environment } from '../world/environment';
import { heightAt, isReef, swellFactor, findShore, nearestIsland } from '../world/terrain';
import { swayUniforms } from '../world/materials';
import { buildShip, animateShip, type ShipParts } from '../ship/shipModel';
import { Captain } from '../player/captain';
import { audio } from '../audio/audio';
import { Particles, pickupMesh, bottleMesh, chestMesh, crateFindMesh, digHole, crabMesh } from './fx';
import { ISLANDS, ISLAND_MAP, WORLD, TREASURE_MAPS, TREASURE_MAP_MAP, FRAGMENT_MAP, BEACH_POOL, DIG_POOL, REGIONS, type IslandDef, type ScriptedFind } from '../data/world';
import { item, RARITY_ORDER } from '../data/items';
import { UPGRADE_MAP, VESSELS, COSMETIC_MAP, type VesselId } from '../data/ship';
import { angleDiff, clamp, lerp, RNG } from '../core/noise';

type Mode = 'sail' | 'foot';

interface Pickup { id: string; obj: THREE.Object3D; x: number; z: number }
interface FindObj { def: ScriptedFind; isl: IslandDef; obj: THREE.Object3D; lid?: THREE.Object3D; x: number; z: number }

function weighted<T extends { w: number }>(rng: () => number, list: T[]): T {
  const total = list.reduce((a, b) => a + b.w, 0);
  let r = rng() * total;
  for (const e of list) {
    r -= e.w;
    if (r <= 0) return e;
  }
  return list[list.length - 1];
}

export class Game implements GameAPI {
  store = new Store();
  ui: UI;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  sunLight: THREE.DirectionalLight;
  ocean!: Ocean;
  sky!: Sky;
  env!: Environment;
  foam!: Particles;
  sparkle!: Particles;
  dirt!: Particles;

  ship!: ShipParts;
  shipRoot = new THREE.Group();
  boat = { x: 0, z: 0, heading: 0, speed: 0, anchored: false, docked: true, anchorDepth: 0 };
  captain = new Captain();
  mode: Mode = 'sail';
  foot = { x: 0, z: 0, heading: 0, landX: 0, landZ: 0, island: ISLANDS[0] as IslandDef, speed: 0 };

  camYaw = Math.PI;
  camPitch = 0.42;
  camDist = 15;
  zoom = 1;
  private lastDrag = -10;
  private t = 0;
  private started = false;
  showcase = false;

  private pickups: Pickup[] = [];
  private finds: FindObj[] = [];
  private holes: { x: number; z: number; obj: THREE.Object3D }[] = [];
  private spawnedThisTrip = new Set<string>();
  private digsThisVisit = 0;
  private digBusy = 0;
  private crabs: { obj: THREE.Object3D; vx: number; vz: number; life: number }[] = [];
  private anims: ((dt: number) => boolean)[] = [];
  private msgCooldown: Record<string, number> = {};
  private steerTime = 0;
  private shoreCache: { x: number; z: number } | null = null;
  private shoreTimer = 0;
  private islandTimer = 0;
  private saveTimer = 0;
  private currentRegion = 'harbor';
  private wpTarget: { x: number; z: number } | null = null;
  private rng = new RNG(Date.now() & 0xffff);

  constructor(private canvas: HTMLCanvasElement, private progress: (p: number, msg: string) => Promise<void>) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
    this.scene.fog = new THREE.Fog(FOG.color, FOG.near, FOG.far);
    this.scene.background = SKY_HORIZON.clone();

    const hemi = new THREE.HemisphereLight(0xcfeeff, 0xc9b48a, 1.5);
    this.scene.add(hemi);
    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.4);
    this.sunLight.position.copy(SUN_DIR).multiplyScalar(80);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    const sc = this.sunLight.shadow.camera;
    sc.left = sc.bottom = -40;
    sc.right = sc.top = 40;
    sc.near = 1;
    sc.far = 220;
    this.sunLight.shadow.bias = -0.0008;
    this.sunLight.shadow.normalBias = 0.04;
    this.scene.add(this.sunLight, this.sunLight.target);

    this.ui = new UI(this);
    this.ui.onAction = (id) => this.action(id);
    this.store.on(() => {});
    audio.setVolumes(this.store.data.settings.sfx, this.store.data.settings.music);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.bindCameraGestures();
  }

  async init() {
    await this.progress(0.1, 'Charting the Shallows…');
    this.ocean = new Ocean(this.scene, SUN_DIR, FOG, SKY_HORIZON);
    await this.progress(0.35, 'Raising islands…');
    this.env = new Environment(this.scene);
    await this.progress(0.7, 'Painting the sky…');
    this.sky = new Sky(this.scene);
    this.foam = new Particles(this.scene, 500, 0.7);
    this.sparkle = new Particles(this.scene, 300, 0.6, true);
    this.dirt = new Particles(this.scene, 200, 0.35);
    await this.progress(0.85, 'Caulking the dinghy…');
    this.scene.add(this.shipRoot);
    this.rebuildShip();
    this.scene.add(this.captain.root);
    this.restoreState();
    this.placeFinds();
    await this.progress(1, 'Ready');
    this.renderer.compile(this.scene, this.camera);
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const save = () => {
      this.persistShip();
      this.store.saveNow();
    };
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());
    window.addEventListener('pagehide', save);
    this.ui.showTitle(this.store.isNew);
  }

  start() {
    this.started = true;
    audio.unlock();
    if (this.store.isNew) {
      this.ui.revealInfo('Port Saltwhistle', 'Wake up, Captain!', 'You own one leaky dinghy, fifteen gold and a head full of stories. The ocean is full of secrets. Time to find some.<br><br><b>Drag the ship’s wheel</b> (bottom-left) toward where you want to sail.', 'Let’s go');
      this.store.isNew = false;
      this.store.saveNow();
    } else {
      this.ui.toast('Welcome back, Captain. Your progress was restored.', { color: '#3fa55a', life: 3.5 });
    }
    if (this.boat.docked) setTimeout(() => this.ui.toast('Push the wheel to cast off from the pier', { life: 3.5 }), 1200);
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 68 : 55;
    this.camera.updateProjectionMatrix();
  }

  private bindCameraGestures() {
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    this.canvas.addEventListener('pointerdown', (e) => {
      audio.unlock();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.canvas.setPointerCapture(e.pointerId);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) {
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        this.camYaw -= dx * 0.006;
        this.camPitch = clamp(this.camPitch + dy * 0.004, 0.12, 1.2);
        this.lastDrag = this.t;
      } else if (pts.size === 2) {
        p.x = e.clientX;
        p.y = e.clientY;
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) this.zoom = clamp(this.zoom * (pinch / d), 0.55, 1.8);
        pinch = d;
        return;
      }
      p.x = e.clientX;
      p.y = e.clientY;
    });
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      pinch = 0;
    };
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
    this.canvas.addEventListener('wheel', (e) => {
      this.zoom = clamp(this.zoom * (1 + e.deltaY * 0.001), 0.55, 1.8);
    }, { passive: true });
  }

  // ───────── state ─────────
  private restoreState() {
    const s = this.store.data.ship;
    this.boat.x = s.x;
    this.boat.z = s.z;
    this.boat.heading = s.heading;
    this.boat.anchored = s.anchored;
    this.boat.docked = s.docked;
    if (this.boat.docked) this.dockPose();
    this.camYaw = this.boat.heading;
  }

  private persistShip() {
    const s = this.store.data.ship;
    s.x = this.boat.x;
    s.z = this.boat.z;
    s.heading = this.boat.heading;
    s.anchored = this.boat.anchored;
    s.docked = this.boat.docked;
  }

  private dockPose() {
    this.boat.x = WORLD.spawn.x;
    this.boat.z = WORLD.spawn.z;
    this.boat.heading = WORLD.spawn.heading;
    this.boat.speed = 0;
    this.boat.anchored = false;
    this.boat.docked = true;
  }

  rebuildShip() {
    if (this.ship) this.shipRoot.remove(this.ship.group);
    this.ship = buildShip(this.store);
    this.shipRoot.add(this.ship.group);
    this.camDist = this.store.data.vessel === 'sloop' ? 24 : 15;
  }

  // ───────── GameAPI ─────────
  shipState() {
    return { x: this.boat.x, z: this.boat.z, heading: this.boat.heading };
  }
  isDocked() {
    return this.boat.docked && this.mode === 'sail';
  }
  setShowcase(on: boolean) {
    this.showcase = on;
  }
  setActiveMap(id: string) {
    this.store.data.activeMap = id;
    this.store.commit();
    this.ui.toast(this.store.stats.compass ? 'Your compass now points to the X' : 'Map set as your heading', { icon: 'map' });
  }
  questEvent(e: 'read_map' | 'catalog') {
    if (this.store.advanceQuest(e)) this.store.commit();
  }

  sell(id: string, n: number) {
    const s = this.store;
    let left = n;
    left -= s.removeFrom(s.data.vault, id, left);
    if (left > 0) left -= s.removeFrom(s.data.cargo, id, left);
    const sold = n - left;
    if (!sold) return;
    // if we sold the last displayed trophy, take it down
    if (s.countOwned(id) === 0) s.data.trophies = s.data.trophies.map((t) => (t === id ? null : t));
    const gold = item(id).value * sold;
    s.data.gold += gold;
    s.data.stats.goldEarned += gold;
    if (!s.data.flags.includes('sold')) s.data.flags.push('sold');
    audio.coins(Math.min(14, 3 + sold));
    this.ui.toast(`Sold ${item(id).name}${sold > 1 ? ` ×${sold}` : ''} for ${gold}g`, { icon: id, color: '#f4c542' });
    this.haptic(15);
    s.advanceQuest('sell');
    s.commit();
    if (s.countOwned(id) === 0 && s.data.trophies.includes(id)) this.rebuildShip();
    this.checkMilestones();
  }

  buyUpgrade(id: string) {
    const s = this.store;
    const u = UPGRADE_MAP[id];
    if (!u || s.has(id) || (u.requires && !s.has(u.requires))) return;
    if (!s.canAfford(u.cost)) {
      audio.deny();
      return;
    }
    s.pay(u.cost);
    s.data.upgrades.push(id);
    s.advanceQuest('upgrade');
    s.commit();
    audio.hammer();
    this.haptic(30);
    this.rebuildShip();
    this.showcase = true;
    this.sparkle.emit(new THREE.Vector3(this.boat.x, 2, this.boat.z), 50, '#ffd25e', 4, 5, 1.4, 4, 2);
    this.ui.toast(`${u.name} installed!`, { color: '#3fa55a', life: 3 });
    if (s.data.quest === 'free' && s.data.upgrades.length === 1) {
      setTimeout(() => this.ui.revealInfo('First upgrade!', 'She looks better already', 'Every upgrade changes your ship — look at her! Now the ocean is yours: follow Wren’s rumours, find the wreck of the Wren, and save up for a Sloop to cross the open swell.', 'Fair winds'), 900);
    }
  }

  buyVessel(id: string) {
    const s = this.store;
    const v = VESSELS[id as VesselId];
    if (!v) return;
    if (!s.data.vesselsOwned.includes(v.id)) {
      if (!v.cost || !s.canAfford(v.cost)) {
        audio.deny();
        return;
      }
      s.pay(v.cost);
      s.data.vesselsOwned.push(v.id);
      audio.hammer();
      setTimeout(() => audio.discover(4), 500);
      this.ui.revealInfo('New vessel commissioned', v.name, `${v.desc}<br><br>Your upgrades, paint and trophies came with you. The open swell is no longer a wall.`, 'Hoist the sails');
    }
    s.data.vessel = v.id;
    s.commit();
    this.rebuildShip();
  }

  buyCosmetic(id: string) {
    const s = this.store;
    const c = COSMETIC_MAP[id];
    if (!c || !c.cost || s.data.cosmetics.includes(id)) return;
    if (s.data.gold < c.cost) {
      audio.deny();
      this.ui.toast(`Need ${c.cost}g`);
      return;
    }
    s.data.gold -= c.cost;
    s.data.cosmetics.push(id);
    s.data.equipped[c.slot] = id;
    audio.coins(4);
    s.commit();
    this.rebuildShip();
  }

  equip(slot: 'paint' | 'sail' | 'flag', id: string) {
    this.store.data.equipped[slot] = id;
    this.store.commit();
    audio.ui();
    this.rebuildShip();
  }

  setTrophy(slot: number, id: string | null) {
    const s = this.store;
    s.data.trophies = s.data.trophies.map((t) => (t === id ? null : t));
    s.data.trophies[slot] = id;
    s.commit();
    if (id) {
      audio.pickup();
      this.ui.toast(`${item(id).name} mounted on deck`, { icon: id });
    }
    this.rebuildShip();
  }

  jettison(id: string) {
    this.store.removeFrom(this.store.data.cargo, id, 1);
    this.store.commit();
    audio.splash();
  }

  setSail() {
    this.ui.toast('Push the wheel to cast off from the pier', { life: 3 });
  }

  resetSave() {
    this.store.reset();
    location.reload();
  }

  private haptic(ms: number) {
    if (this.store.data.settings.haptics && navigator.vibrate) navigator.vibrate(ms);
  }

  private say(key: string, text: string, cool = 4, opts: { icon?: string; color?: string } = {}) {
    if ((this.msgCooldown[key] ?? 0) > this.t) return;
    this.msgCooldown[key] = this.t + cool;
    this.ui.toast(text, opts);
  }

  // ───────── world objects ─────────
  private placeFinds() {
    for (const isl of ISLANDS) {
      for (const f of isl.finds) {
        const x = isl.x + f.x, z = isl.z + f.z;
        const y = heightAt(x, z);
        const opened = this.store.data.findsOpened.includes(f.id);
        if (f.kind === 'bottle') {
          if (opened) continue;
          const obj = bottleMesh();
          obj.position.set(x, Math.max(y, 0.1), z);
          obj.rotation.y = 0.7;
          this.scene.add(obj);
          this.finds.push({ def: f, isl, obj, x, z });
        } else {
          const { root, lid } = crateFindMesh(f.kind === 'drawer' ? 'drawer' : 'crate');
          root.position.set(x, y - 0.05, z);
          root.rotation.y = Math.atan2(isl.x - x, isl.z - z) + Math.PI;
          if (opened) lid.rotation.x = -1.9;
          this.scene.add(root);
          this.finds.push({ def: f, isl, obj: root, lid, x, z });
        }
      }
    }
    // dug-up treasure sites stay dug
    for (const id of this.store.data.mapsCompleted) {
      const m = TREASURE_MAP_MAP[id];
      const isl = ISLAND_MAP[m.island];
      const x = isl.x + m.x, z = isl.z + m.z;
      const y = heightAt(x, z);
      const hole = digHole();
      hole.position.set(x, y, z);
      this.scene.add(hole);
      const c = chestMesh(m.chestTier);
      c.lid.rotation.x = -1.9;
      c.root.position.set(x + 1.2, y - 0.25, z);
      c.root.rotation.y = 0.6;
      this.scene.add(c.root);
    }
  }

  private spawnPickups(isl: IslandDef) {
    if (this.spawnedThisTrip.has(isl.id) || !isl.shells) return;
    this.spawnedThisTrip.add(isl.id);
    const pool = BEACH_POOL[isl.region];
    let placed = 0;
    for (let t = 0; t < 200 && placed < isl.shells; t++) {
      const a = this.rng.range(0, Math.PI * 2);
      const d = isl.r * this.rng.range(0.7, 1.15);
      const x = isl.x + Math.cos(a) * d, z = isl.z + Math.sin(a) * d;
      const h = heightAt(x, z);
      if (h < 0.4 || h > 1.6) continue;
      if (this.env.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.6)) continue;
      const id = weighted(() => this.rng.next(), pool).id;
      const obj = pickupMesh(id);
      obj.position.set(x, h, z);
      obj.rotation.y = this.rng.range(0, 6);
      this.scene.add(obj);
      this.pickups.push({ id, obj, x, z });
      placed++;
    }
  }

  private clearPickups() {
    for (const p of this.pickups) this.scene.remove(p.obj);
    this.pickups = [];
    for (const h of this.holes) this.scene.remove(h.obj);
    this.holes = [];
    this.spawnedThisTrip.clear();
  }

  /** Give items to the player. force = ignore cargo capacity (story finds / chests). */
  private gain(id: string, n: number, where: string, opts: { force?: boolean; reveal?: 'card' | 'toast' | 'none' } = {}): number {
    const s = this.store;
    let got: number;
    if (opts.force) {
      s.addTo(s.data.cargo, id, n);
      got = n;
    } else got = s.addCargo(id, n);
    if (!got) return 0;
    const d = item(id);
    if (d.category !== 'resource' || !s.data.discoveries[id]) {
      const isNew = d.category !== 'resource' ? s.discover(id, where, got) : (s.discover(id, where, got), false);
      const mode = opts.reveal ?? 'toast';
      if (isNew && mode === 'card') this.ui.revealItem(id, got, true);
      else if (isNew && mode === 'toast') {
        this.ui.toast(`New discovery: ${d.name}!`, { icon: id, color: '#ffb627', life: 3.2 });
        audio.discover(RARITY_ORDER.indexOf(d.rarity));
      } else if (mode !== 'none') {
        this.ui.toast(`+${got} ${d.name}`, { icon: id, color: '#c9b48a', life: 1.8 });
        audio.pickup();
      }
    } else {
      s.discover(id, where, got);
      if (opts.reveal !== 'none') {
        this.ui.toast(`+${got} ${d.name}`, { icon: id, color: '#c9b48a', life: 1.8 });
        audio.pickup();
      }
    }
    return got;
  }

  private checkMilestones() {
    const done = this.store.checkMilestones();
    for (const m of done) {
      const reward = [m.reward.gold ? `${m.reward.gold} gold` : '', m.reward.cosmetic ? `${COSMETIC_MAP[m.reward.cosmetic].name} (${COSMETIC_MAP[m.reward.cosmetic].slot})` : ''].filter(Boolean).join(' + ');
      this.ui.revealMilestone(m.name, m.desc, reward);
    }
    if (done.length) this.store.commit();
  }

  // ───────── actions ─────────
  private action(id: string) {
    switch (id) {
      case 'harbor':
        this.ui.openPanel('harbor');
        break;
      case 'dock':
        this.dock();
        break;
      case 'anchor': {
        const depth = -heightAt(this.boat.x, this.boat.z);
        if (this.boat.speed > 3.2) return this.say('slow', 'Too fast! Ease off the wheel to slow down first.');
        if (depth > 10) return this.say('deep', 'Too deep to anchor. Get closer to an island’s turquoise shallows.');
        this.boat.anchored = true;
        this.boat.speed = 0;
        this.boat.anchorDepth = depth;
        audio.anchor(true);
        this.haptic(40);
        this.store.advanceQuest('anchor');
        this.persistShip();
        this.store.commit();
        break;
      }
      case 'raise':
        this.boat.anchored = false;
        audio.anchor(false);
        this.persistShip();
        this.store.commit();
        break;
      case 'ashore':
        this.goAshore();
        break;
      case 'board':
        this.board();
        break;
      case 'dig':
        this.dig();
        break;
      case 'search':
        this.search();
        break;
      case 'nofit':
        this.say('nofit', 'The swell is too rough for this boat.');
        break;
    }
  }

  private dock() {
    this.ui.fade(() => {
      this.dockPose();
      const n = this.store.unloadToVault();
      this.store.data.stats.trips++;
      this.clearPickups();
      this.store.advanceQuest('return_harbor');
      this.persistShip();
      this.store.commit();
      this.camYaw = 0.35; // look back at the town
      if (n) this.ui.toast(`Unloaded ${n} item${n > 1 ? 's' : ''} into your harbor vault`, { color: '#3fa55a', life: 3 });
      audio.phrase('harbor');
      setTimeout(() => this.ui.openPanel('harbor'), 300);
    });
  }

  private goAshore() {
    const shore = findShore(this.boat.x, this.boat.z, 30);
    if (!shore) return this.say('noshore', 'No beach close enough. Anchor nearer the shore.');
    const isl = nearestIsland(shore.x, shore.z).isl;
    this.ui.fade(() => {
      this.mode = 'foot';
      this.foot.x = shore.x;
      this.foot.z = shore.z;
      this.foot.landX = shore.x;
      this.foot.landZ = shore.z;
      this.foot.island = isl;
      this.foot.heading = Math.atan2(isl.x - shore.x, isl.z - shore.z);
      this.camYaw = this.foot.heading;
      this.digsThisVisit = 0;
      this.spawnPickups(isl);
      audio.splash();
      this.store.advanceQuest('ashore');
      this.store.commit();
      if (isl.id === 'harbor') this.say('harborwalk', 'Port Saltwhistle — dock at the pier to visit the merchants.', 5);
    });
  }

  private board() {
    this.ui.fade(() => {
      this.mode = 'sail';
      this.camYaw = this.boat.heading;
      audio.splash();
    });
  }

  private nearestFind(): FindObj | null {
    let best: FindObj | null = null;
    let bd = 3.4;
    for (const f of this.finds) {
      if (this.store.data.findsOpened.includes(f.def.id)) continue;
      const d = Math.hypot(f.x - this.foot.x, f.z - this.foot.z);
      if (d < bd) {
        bd = d;
        best = f;
      }
    }
    return best;
  }

  private search() {
    const f = this.nearestFind();
    if (!f) return;
    const s = this.store;
    if (f.def.requiresItem && s.countOwned(f.def.requiresItem) === 0) {
      audio.clunk();
      this.ui.revealInfo('Locked', f.def.label.replace(/^\w+ the /, ''), f.def.requiresText ?? 'It won’t budge.', 'Hmm…');
      return;
    }
    s.data.findsOpened.push(f.def.id);
    this.captain.dig();
    const where = f.isl.name;
    const pos = new THREE.Vector3(f.x, heightAt(f.x, f.z) + 0.8, f.z);
    if (f.def.kind === 'bottle') {
      audio.splash();
      this.sparkle.emit(pos, 30, '#bff7e6', 2, 3, 1, 3, 0.5);
      this.scene.remove(f.obj);
    } else {
      if (f.def.requiresItem) {
        audio.clunk();
        this.ui.toast(`The ${item(f.def.requiresItem).name} fits!`, { icon: f.def.requiresItem });
      }
      const lid = f.lid!;
      let k = 0;
      this.anims.push((dt) => {
        k = Math.min(1, k + dt * 2);
        lid.rotation.x = -1.9 * (1 - Math.pow(1 - k, 3));
        return k < 1;
      });
      this.sparkle.emit(pos, 40, '#ffd25e', 3, 4, 1.2, 5, 0.6);
      audio.chestOpen();
    }
    // loot: story finds always come aboard
    if (f.def.loot.length) {
      for (const l of f.def.loot) this.gain(l.id, l.n, where, { force: true, reveal: 'none' });
      this.ui.revealChest(f.def.kind === 'bottle' ? 'Message in a bottle' : f.def.label.replace(/^(Search|Open|Pry loose|Dig through) the /i, '').replace(/^./, (c) => c.toUpperCase()), f.def.loot, `Found on ${where}`);
    }
    if (f.def.fragment) {
      const frag = FRAGMENT_MAP[f.def.fragment];
      if (!s.data.fragments.includes(frag.id)) s.data.fragments.push(frag.id);
      const m = TREASURE_MAP_MAP[frag.mapId];
      const complete = m.fragments.every((x) => s.data.fragments.includes(x));
      if (complete) s.data.activeMap = m.id;
      this.ui.revealFragment(frag.id, complete);
      s.advanceQuest('find_bottle');
    }
    s.commit();
    this.checkMilestones();
    this.haptic(30);
  }

  private dig() {
    if (this.digBusy > 0) return;
    const h0 = heightAt(this.foot.x, this.foot.z);
    if (h0 < 0.25) return this.say('wet', 'Too wet to dig here. Try drier sand.');
    this.digBusy = 0.75;
    this.captain.dig();
    const fx = this.foot.x + Math.sin(this.foot.heading) * 0.9;
    const fz = this.foot.z + Math.cos(this.foot.heading) * 0.9;
    const s = this.store;
    s.data.stats.digs++;
    setTimeout(() => {
      audio.dig();
      this.haptic(12);
      const y = heightAt(fx, fz);
      this.dirt.emit(new THREE.Vector3(fx, y + 0.3, fz), 18, '#c9a46a', 2.2, 4, 0.8, 12, 0.4);
    }, 330);
    setTimeout(() => {
      const y = heightAt(fx, fz);
      if (this.holes.some((h) => Math.hypot(h.x - fx, h.z - fz) < 1.4)) {
        this.say('dug', 'You already dug here.', 2);
        return;
      }
      const hole = digHole();
      hole.position.set(fx, y, fz);
      hole.rotation.y = this.foot.heading;
      this.scene.add(hole);
      this.holes.push({ x: fx, z: fz, obj: hole });
      const isl = this.foot.island;
      // treasure maps
      for (const m of TREASURE_MAPS) {
        if (m.island !== isl.id || s.data.mapsCompleted.includes(m.id)) continue;
        const tx = isl.x + m.x, tz = isl.z + m.z;
        if (Math.hypot(tx - fx, tz - fz) < 2.8) {
          if (!m.fragments.every((f) => s.data.fragments.includes(f))) {
            // dug it up without the map — still yours, but you don't know what it is
          }
          this.treasure(m.id, fx, y, fz);
          return;
        }
      }
      // hidden caches
      for (const c of isl.caches) {
        if (s.data.cachesFound.includes(c.id)) continue;
        if (Math.hypot(isl.x + c.x - fx, isl.z + c.z - fz) < 2.6) {
          s.data.cachesFound.push(c.id);
          audio.clunk();
          this.sparkle.emit(new THREE.Vector3(fx, y + 0.5, fz), 30, '#ffd25e', 2, 4, 1, 6, 0.4);
          setTimeout(() => {
            for (const l of c.loot) this.gain(l.id, l.n, isl.name, { force: true, reveal: 'card' });
            s.commit();
            this.checkMilestones();
          }, 250);
          return;
        }
      }
      // random sand finds
      const chance = 0.4 * Math.pow(0.75, this.digsThisVisit);
      this.digsThisVisit++;
      if (this.rng.next() < chance) {
        const id = weighted(() => this.rng.next(), DIG_POOL).id;
        const got = this.gain(id, 1, isl.name, { reveal: 'toast' });
        if (!got) this.say('full', 'Cargo full! Toss something or head home.', 3);
        s.commit();
        this.checkMilestones();
      } else if (this.rng.next() < 0.3) {
        this.spawnCrab(fx, y, fz);
        this.say('crab', 'Just a very annoyed crab.', 2);
      } else {
        this.say('sand', this.rng.pick(['Just sand.', 'Sand. Classic.', 'Nothing but sand and regret.', 'A pebble. You put it back.']), 1.5);
      }
    }, 520);
  }

  private spawnCrab(x: number, y: number, z: number) {
    const obj = crabMesh();
    obj.position.set(x, y, z);
    this.scene.add(obj);
    const a = this.rng.range(0, Math.PI * 2);
    this.crabs.push({ obj, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, life: 3 });
  }

  private treasure(mapId: string, x: number, y: number, z: number) {
    const s = this.store;
    const m = TREASURE_MAP_MAP[mapId];
    s.data.mapsCompleted.push(mapId);
    if (s.data.activeMap === mapId) s.data.activeMap = null;
    s.data.chestsOpened++;
    const c = chestMesh(m.chestTier);
    // rise a little ahead of the captain, who steps back to admire it
    x += Math.sin(this.foot.heading) * 1.2;
    z += Math.cos(this.foot.heading) * 1.2;
    y = heightAt(x, z);
    this.foot.x -= Math.sin(this.foot.heading) * 0.8;
    this.foot.z -= Math.cos(this.foot.heading) * 0.8;
    c.root.position.set(x, y - 1.6, z);
    c.root.rotation.y = this.foot.heading + Math.PI;
    // swing the camera to a side-on view so the chest isn't hidden behind the captain
    this.camYaw = this.foot.heading + 1.1;
    this.camPitch = 0.35;
    this.lastDrag = this.t + 3;
    this.scene.add(c.root);
    audio.clunk();
    this.haptic(60);
    let k = 0;
    let phase = 0;
    this.anims.push((dt) => {
      k += dt;
      if (phase === 0) {
        const p = Math.min(1, k / 1.1);
        c.root.position.y = y - 1.6 + 1.45 * (1 - Math.pow(1 - p, 3));
        c.root.rotation.z = Math.sin(k * 30) * 0.03 * (1 - p);
        if (Math.random() < 0.5) this.dirt.emit(new THREE.Vector3(x, y + 0.2, z), 2, '#c9a46a', 2.5, 4, 0.7, 12, 0.8);
        if (p >= 1) {
          phase = 1;
          k = 0;
          audio.chestOpen();
          this.captain.pose = 'cheer';
        }
        return true;
      }
      const p = Math.min(1, k / 0.6);
      c.lid.rotation.x = -1.9 * (1 - Math.pow(1 - p, 3));
      c.glow.intensity = 6 * p;
      if (Math.random() < 0.6) this.sparkle.emit(new THREE.Vector3(x, y + 0.8, z), 3, '#ffd25e', 1.5, 5, 1.2, 4, 0.5);
      if (k > 2.4) {
        c.glow.intensity = 2;
        if (this.captain.pose === 'cheer') this.captain.pose = 'idle';
        return false;
      }
      return true;
    });
    setTimeout(() => {
      for (const l of m.loot) this.gain(l.id, l.n, ISLAND_MAP[m.island].name, { force: true, reveal: 'none' });
      this.ui.revealChest(m.name, m.loot, m.chestTier === 'grand' ? 'A GRAND TREASURE!' : 'Buried treasure!');
      s.advanceQuest('dig_x');
      s.commit();
      this.checkMilestones();
    }, 1900);
  }

  // ───────── update ─────────
  private update(dt: number) {
    this.t += dt;
    swayUniforms.uTime.value = this.t;
    if (this.mode === 'sail') this.updateSail(dt);
    else this.updateFoot(dt);
    this.updateCamera(dt);
    const focus = this.camera.position;
    this.ocean.update(this.t, focus);
    this.sky.update(this.t, dt, focus);
    this.env.update(this.t, dt);
    this.foam.update(dt);
    this.sparkle.update(dt);
    this.dirt.update(dt);
    this.anims = this.anims.filter((a) => a(dt));
    for (const c of this.crabs) {
      c.life -= dt;
      c.obj.position.x += c.vx * dt;
      c.obj.position.z += c.vz * dt;
      c.obj.position.y = heightAt(c.obj.position.x, c.obj.position.z) + Math.abs(Math.sin(this.t * 20)) * 0.05;
      c.obj.rotation.y = Math.atan2(c.vx, c.vz) + Math.PI / 2;
      if (c.life <= 0) this.scene.remove(c.obj);
    }
    this.crabs = this.crabs.filter((c) => c.life > 0);
    for (const p of this.pickups) {
      p.obj.children[1].scale.setScalar(0.6 + Math.abs(Math.sin(this.t * 3 + p.x)) * 0.6);
      p.obj.rotation.y += dt * 0.5;
    }
    for (const f of this.finds) {
      const sp = f.obj.children.find((c) => c.userData.sparkle);
      if (sp) sp.scale.setScalar(1 + Math.abs(Math.sin(this.t * 2.5)) * 1.2);
    }
    // sun & shadows follow the action
    const fp = this.mode === 'sail' ? new THREE.Vector3(this.boat.x, 0, this.boat.z) : new THREE.Vector3(this.foot.x, 0, this.foot.z);
    this.sunLight.position.copy(fp).addScaledVector(SUN_DIR, 100);
    this.sunLight.target.position.copy(fp);
    if (this.started) {
      this.updateIslands(dt);
      this.updateQuest();
      this.updateGuidance();
      this.saveTimer += dt;
      if (this.saveTimer > 8) {
        this.saveTimer = 0;
        this.persistShip();
        this.store.saveNow();
      }
    }
  }

  private windEff(heading: number) {
    const c = Math.cos(angleDiff(heading, WORLD.wind.dir));
    return c >= 0 ? 1 - 0.1 * c : 1 - 0.55 * -c;
  }

  private updateSail(dt: number) {
    const b = this.boat;
    const st = this.store.stats;
    const j = this.ui.joy;
    const mag = Math.min(1, Math.hypot(j.x, j.y));
    let throttle = 0;
    let target = b.heading;
    const canInput = this.started && !this.ui.panelOpen;
    if (canInput && mag > 0.18) {
      if (b.docked) {
        b.docked = false;
        this.ui.toast('Cast off! ⚓', { life: 1.6 });
        audio.splash();
      }
      if (b.anchored) {
        this.say('anchored', 'You’re anchored. Tap RAISE ANCHOR to sail.', 3);
      } else {
        const F = { x: Math.sin(this.camYaw), z: Math.cos(this.camYaw) };
        const R = { x: -Math.cos(this.camYaw), z: Math.sin(this.camYaw) };
        const wx = F.x * j.y + R.x * j.x;
        const wz = F.z * j.y + R.z * j.x;
        target = Math.atan2(wx, wz);
        throttle = mag;
        this.steerTime += dt;
      }
    }
    if (b.docked) this.dockPose();
    const diff = angleDiff(b.heading, target);
    const turnRate = st.turn * (0.45 + 0.55 * Math.min(1, b.speed / (st.speed * 0.5)));
    b.heading += clamp(diff, -turnRate * dt, turnRate * dt);
    const eff = this.windEff(b.heading);
    const targetSpeed = throttle * st.speed * eff * (Math.abs(diff) > 1.4 ? 0.55 : 1);
    const k = targetSpeed > b.speed ? 0.7 : 0.9;
    b.speed += (targetSpeed - b.speed) * (1 - Math.exp(-dt * k));
    if (b.anchored) b.speed *= Math.exp(-dt * 4);

    const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
    const nx = b.x + fx * b.speed * dt;
    const nz = b.z + fz * b.speed * dt;
    const draft = this.store.data.vessel === 'sloop' ? 1.2 : 0.65;
    const blocked = (x: number, z: number): string | null => {
      const h = heightAt(x, z);
      if (isReef(x, z) && h < 0.2) {
        if (!st.reef) return 'reef';
      } else if (h > -draft) return 'land';
      if (!st.crossSwell && swellFactor(x, z) > 0.55) return 'swell';
      if (Math.hypot(x, z) > WORLD.size / 2 - 40) return 'edge';
      for (const r of this.env.boatRects) if (x > r.x0 - 0.8 && x < r.x1 + 0.8 && z > r.z0 - 0.8 && z < r.z1 + 0.8) return 'pier';
      return null;
    };
    if (!b.docked) {
      const why = blocked(nx, nz);
      if (!why) {
        this.store.data.stats.distance += Math.hypot(nx - b.x, nz - b.z);
        b.x = nx;
        b.z = nz;
      } else {
        // try sliding along the obstacle
        if (!blocked(nx, b.z)) b.x = nx;
        else if (!blocked(b.x, nz)) b.z = nz;
        if (b.speed > 1.5) {
          if (why === 'reef') {
            this.say('reef', 'Breakers! The reef would tear your hull apart. Marlo sells a Copper-Banded Hull…', 6);
            audio.splash(true);
            this.foam.emit(new THREE.Vector3(nx, 0.3, nz), 30, '#ffffff', 3, 4, 1, 9, 1);
          } else if (why === 'swell') {
            this.say('swell', 'The open swell is far too rough for this boat. A Sloop could cross it.', 6);
            audio.splash(true);
          } else if (why === 'edge') {
            this.say('edge', 'Uncharted waters. Wren hasn\u2019t drawn this part of the world yet.', 6);
          } else if (why === 'land') {
            this.say('land', 'Aground! Steer back toward deeper water.', 4);
            audio.creak();
          }
          this.haptic(25);
        }
        b.speed *= why === 'swell' ? 0.2 : 0.4;
        if (why === 'swell') {
          // push back toward the shallows
          const c = WORLD.shallowsCenter;
          const a = Math.atan2(c.x - b.x, c.z - b.z);
          b.x += Math.sin(a) * 2 * dt * 10;
          b.z += Math.cos(a) * 2 * dt * 10;
        }
      }
    }

    // float on the waves
    const w = this.ocean.sample(b.x, b.z, this.t);
    const L = this.ship.length;
    const fwdSlope = (w.dx * fx + w.dz * fz);
    const sideSlope = (w.dx * fz - w.dz * fx);
    this.shipRoot.position.set(b.x, w.y + 0.05, b.z);
    this.shipRoot.rotation.order = 'YXZ';
    this.shipRoot.rotation.y = b.heading;
    this.shipRoot.rotation.x = lerp(this.shipRoot.rotation.x, -fwdSlope * (8 / L) * 0.6, 0.1);
    this.shipRoot.rotation.z = lerp(this.shipRoot.rotation.z, sideSlope * (8 / L) * 0.6 + clamp(diff, -0.5, 0.5) * 0.12 * Math.min(1, b.speed / 4), 0.1);

    // sails swing with the wind
    const rel = angleDiff(b.heading, WORLD.wind.dir);
    const swing = clamp(-Math.sin(rel) * 0.9, -1.0, 1.0);
    for (const sail of this.ship.sails) sail.rotation.y = lerp(sail.rotation.y, Math.PI / 2 + swing, 0.05);
    animateShip(this.ship, this.t, b.anchored || b.docked ? 0.15 : clamp(b.speed / st.speed, 0, 1) * eff);

    // anchor visuals
    const a = this.ship.anchor;
    const targetY = b.anchored ? -Math.min(4, b.anchorDepth) : this.ship.anchor.userData.restY ?? (this.ship.anchor.userData.restY = a.position.y);
    a.position.y = lerp(a.position.y, targetY, dt * 3);
    this.ship.rope.visible = b.anchored;
    if (b.anchored) {
      const rest = a.userData.restY as number;
      this.ship.rope.position.set(a.position.x, (rest + a.position.y) / 2 + 0.3, a.position.z);
      this.ship.rope.scale.y = Math.max(0.1, rest - a.position.y + 0.3);
    }

    // captain in the boat
    this.captain.pose = 'sit';
    const seat = this.ship.seat.clone();
    this.shipRoot.localToWorld(seat);
    this.captain.root.position.copy(seat);
    this.captain.root.rotation.y = b.heading;
    this.captain.update(dt, 0);

    // wake foam
    if (b.speed > 1) {
      const stern = this.ship.wake.clone();
      this.shipRoot.localToWorld(stern);
      if (Math.random() < b.speed * 0.25) this.foam.emit(new THREE.Vector3(stern.x, w.y + 0.1, stern.z), 1, '#ffffff', 0.6, 0.6, 1.6, 1, 0.8);
      const bow = new THREE.Vector3(0, 0, L * 0.5);
      this.shipRoot.localToWorld(bow);
      if (Math.random() < b.speed * 0.15) this.foam.emit(new THREE.Vector3(bow.x, w.y + 0.2, bow.z), 1, '#ffffff', 1.2, 1, 0.8, 4, 0.6);
    }

    audio.ambience(dt, b.speed, false, swellFactor(b.x, b.z), this.currentRegion);
    this.ui.setSpeed(this.started ? b.speed * 1.4 : null, -angleDiff(this.camYaw, WORLD.wind.dir), eff);
    this.ui.setDigMeter(null);

    // contextual actions
    if (!this.started) return this.ui.setActions([]);
    const acts: Action[] = [];
    const q = this.store.data.quest;
    if (b.docked) {
      acts.push({ id: 'harbor', label: '⚓ HARBOR', glow: ['sell', 'catalog', 'upgrade', 'return_harbor'].includes(q) });
    } else {
      const pierD = Math.hypot(b.x - this.env.pierTip.x, b.z - this.env.pierTip.z);
      if (pierD < 18) acts.push({ id: 'dock', label: '⚓ DOCK', glow: true });
      this.shoreTimer -= dt;
      if (this.shoreTimer <= 0) {
        this.shoreTimer = 0.4;
        this.shoreCache = findShore(b.x, b.z, 30);
      }
      const depth = -heightAt(b.x, b.z);
      if (b.anchored) {
        if (this.shoreCache) acts.push({ id: 'ashore', label: '\u{1F3DD} GO ASHORE', glow: q === 'ashore' });
        acts.push({ id: 'raise', label: 'RAISE ANCHOR' });
      } else if (pierD >= 18 && (this.shoreCache || depth < 10)) {
        acts.push({ id: 'anchor', label: '⚓ ANCHOR', glow: q === 'anchor' && b.speed < 3.2, disabled: b.speed > 3.2 || depth > 10 });
      }
    }
    this.ui.setActions(acts);
  }

  private updateFoot(dt: number) {
    const f = this.foot;
    const j = this.ui.joy;
    const mag = Math.min(1, Math.hypot(j.x, j.y));
    let moving = false;
    if (mag > 0.15 && this.digBusy <= 0 && !this.ui.panelOpen) {
      const F = { x: Math.sin(this.camYaw), z: Math.cos(this.camYaw) };
      const R = { x: -Math.cos(this.camYaw), z: Math.sin(this.camYaw) };
      const wx = F.x * j.y + R.x * j.x;
      const wz = F.z * j.y + R.z * j.x;
      const dir = Math.atan2(wx, wz);
      f.heading += angleDiff(f.heading, dir) * Math.min(1, dt * 12);
      const sp = 5.2 * mag;
      let nx = f.x + Math.sin(dir) * sp * dt;
      let nz = f.z + Math.cos(dir) * sp * dt;
      // stay out of deep water
      if (heightAt(nx, nz) < -0.7) {
        if (heightAt(nx, f.z) >= -0.7) nz = f.z;
        else if (heightAt(f.x, nz) >= -0.7) nx = f.x;
        else {
          nx = f.x;
          nz = f.z;
          this.say('water', 'Too deep to wade. Head back to your boat to sail.', 4);
        }
      }
      // steep terrain slows
      for (const c of this.env.colliders) {
        const dx = nx - c.x, dz = nz - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + 0.45;
        if (d < min && d > 0.0001) {
          nx = c.x + (dx / d) * min;
          nz = c.z + (dz / d) * min;
        }
      }
      f.x = nx;
      f.z = nz;
      f.speed = sp;
      moving = true;
    } else f.speed = 0;
    this.digBusy -= dt;
    const h = heightAt(f.x, f.z);
    this.captain.root.position.set(f.x, Math.max(h, -0.75) - 0.02, f.z);
    this.captain.root.rotation.y = f.heading;
    if (this.captain.pose !== 'dig' && this.captain.pose !== 'cheer') this.captain.pose = moving ? 'walk' : 'idle';
    if (moving && this.captain.pose === 'cheer') this.captain.pose = 'walk';
    this.captain.update(dt, f.speed);
    if (moving && h < 0.1 && Math.random() < 0.3) this.foam.emit(new THREE.Vector3(f.x, 0.1, f.z), 1, '#ffffff', 1, 1.5, 0.5, 6, 0.3);

    // boat keeps bobbing at anchor
    const b = this.boat;
    const w = this.ocean.sample(b.x, b.z, this.t);
    this.shipRoot.position.set(b.x, w.y + 0.05, b.z);
    animateShip(this.ship, this.t, 0.15);

    // pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (Math.hypot(p.x - f.x, p.z - f.z) < 1.6) {
        const got = this.gain(p.id, 1, f.island.name, { reveal: this.store.data.discoveries[p.id] ? 'toast' : 'toast' });
        if (got) {
          this.sparkle.emit(p.obj.position.clone().setY(p.obj.position.y + 0.4), 16, '#fff3b0', 1.5, 3, 0.8, 4, 0.3);
          this.scene.remove(p.obj);
          this.pickups.splice(i, 1);
          this.store.commit();
          this.checkMilestones();
          this.haptic(10);
        } else this.say('full', 'Cargo full! Toss something in CARGO, or head home to unload.', 4);
      }
    }

    // shovel sense
    const isl = f.island;
    let best = Infinity;
    for (const m of TREASURE_MAPS) {
      if (m.island !== isl.id || this.store.data.mapsCompleted.includes(m.id)) continue;
      best = Math.min(best, Math.hypot(isl.x + m.x - f.x, isl.z + m.z - f.z));
    }
    for (const c of isl.caches) {
      if (this.store.data.cachesFound.includes(c.id)) continue;
      best = Math.min(best, Math.hypot(isl.x + c.x - f.x, isl.z + c.z - f.z));
    }
    if (best < 13) {
      const heat = 1 - best / 13;
      this.ui.setDigMeter(heat, best < 2.6 ? 'Your shovel is twitching! DIG!' : best < 6 ? 'The sand feels loose here…' : 'Something’s buried nearby…');
    } else this.ui.setDigMeter(null);

    audio.ambience(dt, 0, true, 0, this.currentRegion);
    this.ui.setSpeed(null, 0, 1);

    const acts: Action[] = [];
    const find = this.nearestFind();
    const q = this.store.data.quest;
    if (find) acts.push({ id: 'search', label: `\u{1F50D} ${find.def.kind === 'bottle' ? 'OPEN BOTTLE' : 'SEARCH'}`, glow: true });
    acts.push({ id: 'dig', label: '⛏ DIG', glow: q === 'dig_x' && best < 2.6 });
    const boatD = Math.hypot(f.landX - f.x, f.landZ - f.z);
    if (boatD < 7) acts.push({ id: 'board', label: '⛵ BOARD', glow: q === 'return_harbor' });
    this.ui.setActions(acts);
  }

  private updateCamera(dt: number) {
    const target = new THREE.Vector3();
    let dist: number, pitch: number;
    if (!this.started) {
      // title orbit
      this.camYaw += dt * 0.08;
      target.set(this.boat.x, 2, this.boat.z);
      dist = 22;
      pitch = 0.32;
    } else if (this.showcase) {
      this.camYaw += dt * 0.22;
      target.set(this.boat.x, this.store.data.vessel === 'sloop' ? 3 : 1.2, this.boat.z);
      dist = this.ship.length * 2.1 + 4;
      pitch = 0.36;
      // drop the look-at point so the ship sits above the half-height sheet
      target.y -= dist * 0.3;
    } else if (this.mode === 'sail') {
      target.set(this.boat.x, 1.5, this.boat.z);
      if (this.t - this.lastDrag > 1.5 && this.boat.speed > 0.8) {
        this.camYaw += angleDiff(this.camYaw, this.boat.heading) * Math.min(1, dt * 0.9);
      }
      dist = this.camDist * this.zoom;
      pitch = this.camPitch;
    } else {
      target.set(this.foot.x, heightAt(this.foot.x, this.foot.z) + 1.4, this.foot.z);
      if (this.t - this.lastDrag > 1.5 && this.foot.speed > 0.5) {
        this.camYaw += angleDiff(this.camYaw, this.foot.heading) * Math.min(1, dt * 0.6);
      }
      dist = 10 * this.zoom;
      pitch = Math.max(0.35, this.camPitch);
    }
    const cx = target.x - Math.sin(this.camYaw) * Math.cos(pitch) * dist;
    const cz = target.z - Math.cos(this.camYaw) * Math.cos(pitch) * dist;
    let cy = target.y + Math.sin(pitch) * dist;
    cy = Math.max(cy, heightAt(cx, cz) + 1.5, 1.2);
    const desired = new THREE.Vector3(cx, cy, cz);
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 6));
    this.camera.lookAt(target);
  }

  private updateIslands(dt: number) {
    this.islandTimer -= dt;
    if (this.islandTimer > 0) return;
    this.islandTimer = 0.5;
    const px = this.mode === 'sail' ? this.boat.x : this.foot.x;
    const pz = this.mode === 'sail' ? this.boat.z : this.foot.z;
    const { isl, d } = nearestIsland(px, pz);
    const s = this.store;
    if (d < 45 && !s.data.islandsVisited.includes(isl.id)) {
      s.data.islandsVisited.push(isl.id);
      this.ui.banner(isl.name, isl.blurb);
      audio.discover(1);
      s.commit();
    }
    const region = isl.id === 'harbor' && d < 60 ? 'harbor' : d < 150 ? isl.region : swellFactor(px, pz) > 0.5 ? 'emerald' : 'shallows';
    if (region !== this.currentRegion) {
      this.currentRegion = region;
      if (region === 'emerald' && !s.data.regionsSeen.includes('emerald')) {
        s.data.regionsSeen.push('emerald');
        this.ui.banner(REGIONS.emerald.name, REGIONS.emerald.blurb);
        s.commit();
      }
    }
  }

  private updateQuest() {
    const s = this.store;
    const turtle = ISLAND_MAP.turtle;
    let changed = false;
    for (let guard = 0; guard < 4; guard++) {
      const q = s.data.quest;
      let ok = false;
      switch (q) {
        case 'steer':
          ok = this.steerTime > 1.2;
          break;
        case 'leave_dock':
          ok = Math.hypot(this.boat.x - this.env.pierTip.x, this.boat.z - this.env.pierTip.z) > 35;
          break;
        case 'reach_turtle':
          ok = Math.hypot(this.boat.x - turtle.x, this.boat.z - turtle.z) < turtle.r + 60;
          break;
        case 'anchor':
          ok = this.boat.anchored && Math.hypot(this.boat.x - turtle.x, this.boat.z - turtle.z) < turtle.r + 70;
          break;
        case 'ashore':
          ok = this.mode === 'foot' && this.foot.island.id === 'turtle';
          break;
        case 'find_bottle':
          ok = s.data.fragments.includes('turtle_scrap');
          break;
        case 'read_map':
          ok = s.data.mapsCompleted.includes('turtle_map');
          break;
        case 'dig_x':
          ok = s.data.mapsCompleted.includes('turtle_map');
          break;
        case 'return_harbor':
          ok = this.boat.docked && this.mode === 'sail';
          break;
        case 'sell':
          ok = s.data.flags.includes('sold');
          break;
        case 'upgrade':
          ok = s.data.upgrades.length > 0;
          break;
      }
      if (!ok) break;
      s.advanceQuest(q);
      changed = true;
    }
    if (changed) s.commit();
  }

  private updateGuidance() {
    const s = this.store;
    const q = s.data.quest;
    const turtle = ISLAND_MAP.turtle;
    let target: { x: number; z: number; y?: number } | null = null;
    switch (q) {
      case 'leave_dock':
        target = { x: -40, z: 130 };
        break;
      case 'reach_turtle':
        target = { x: turtle.x, z: turtle.z, y: 10 };
        break;
      case 'anchor':
        target = this.boat.anchored ? null : { x: turtle.x + 6, z: turtle.z + turtle.r + 14 };
        break;
      case 'find_bottle': {
        const b = turtle.finds[0];
        target = this.mode === 'foot' ? { x: turtle.x + b.x, z: turtle.z + b.z, y: 1.5 } : { x: turtle.x, z: turtle.z, y: 10 };
        break;
      }
      case 'read_map':
      case 'dig_x':
        target = this.mode === 'foot' ? null : { x: turtle.x, z: turtle.z, y: 10 };
        break;
      case 'return_harbor':
        target = this.mode === 'foot' ? { x: this.foot.landX, z: this.foot.landZ, y: 1 } : { x: this.env.pierTip.x, z: this.env.pierTip.z, y: 3 };
        break;
    }
    if (this.showcase || this.ui.panelOpen) target = null;
    this.wpTarget = target;
    if (target) {
      const v = new THREE.Vector3(target.x, target.y ?? 2, target.z);
      const px = this.mode === 'sail' ? this.boat.x : this.foot.x;
      const pz = this.mode === 'sail' ? this.boat.z : this.foot.z;
      const dist = Math.hypot(target.x - px, target.z - pz);
      const ndc = v.clone().project(this.camera);
      const w = window.innerWidth, h = window.innerHeight;
      const behind = ndc.z > 1;
      let x = (ndc.x * 0.5 + 0.5) * w;
      let y = (-ndc.y * 0.5 + 0.5) * h;
      const margin = 60;
      const on = !behind && x > margin && x < w - margin && y > margin + 60 && y < h - margin - 80;
      let angle = Math.PI; // pointing down at target
      if (!on) {
        const cx = w / 2, cy = h / 2;
        let dx = x - cx, dy = y - cy;
        if (behind) {
          dx = -dx;
          dy = -dy;
        }
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) dy = 1;
        const sc = Math.min((w / 2 - margin) / Math.abs(dx || 0.001), (h / 2 - margin - 70) / Math.abs(dy || 0.001));
        x = cx + dx * sc;
        y = cy + dy * sc;
        angle = Math.atan2(dy, dx) + Math.PI / 2;
      } else y -= 30;
      this.ui.setWaypoint({ x, y, angle, onScreen: on }, dist);
    } else this.ui.setWaypoint(null);

    // Brass compass: points to the X of the active map
    const am = s.data.activeMap ? TREASURE_MAP_MAP[s.data.activeMap] : null;
    if (s.stats.compass && am && am.fragments.every((f) => s.data.fragments.includes(f)) && !s.data.mapsCompleted.includes(am.id) && !this.ui.panelOpen) {
      const isl = ISLAND_MAP[am.island];
      const px = this.mode === 'sail' ? this.boat.x : this.foot.x;
      const pz = this.mode === 'sail' ? this.boat.z : this.foot.z;
      const ang = Math.atan2(isl.x + am.x - px, isl.z + am.z - pz);
      const d = Math.hypot(isl.x + am.x - px, isl.z + am.z - pz);
      this.ui.setCompass(-angleDiff(this.camYaw, ang), `${am.name.split(' ').slice(-1)[0]} · ${Math.round(d)}m`);
    } else this.ui.setCompass(null);
  }
}

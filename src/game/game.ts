// SCRAP TIDE core: rendering loop, sailing and motoring, weather and hull, salvage, crew, raiders,
// settlements, going ashore, digging, treasure, the first voyage and the Captain's Log.
import { heroize, updateHeroLight } from '../world/hero';
import * as THREE from 'three';
import { Store } from '../state/store';
import { UI, type GameAPI, type Action } from '../ui/ui';
import { Ocean } from '../world/ocean';
import { Sky } from '../world/sky';
import { Atmosphere } from '../world/atmosphere';
import { DrownedWorld } from '../world/drowned';
import { loadModels, loadModelFiles, modelRequested, loadCrew, model, loadReport, characterModel } from '../world/assets';
import { oceanState } from '../world/ocean';
import { Salvage } from './salvage';
import { Raiders } from './raiders';
import { Environment } from '../world/environment';
import { heightAt, isReef, swellFactor, findShore, nearestIsland } from '../world/terrain';
import { swayUniforms } from '../world/materials';
import { pagePreviewShip, pagePreviewUpgrades } from '../state/preview';
import { pageExperiments, pageFresh } from '../state/experiments';
import { buildShip, animateShip, sloopUpgradeFiles, type ShipParts } from '../ship/shipModel';
import { Captain } from '../player/captain';
import { audio } from '../audio/audio';
import { pack, VOICE_LINES, type VoiceId } from '../audio/pack';
import { FlipFX } from './flipfx';
import { goalTarget } from './goalHelp';
import { Particles, pickupMesh, bottleMesh, chestMesh, crateFindMesh, digHole, crabMesh, plantFindMesh } from './fx';
import { ISLANDS, ISLAND_MAP, WORLD, TREASURE_MAPS, TREASURE_MAP_MAP, FRAGMENT_MAP, BEACH_POOL, DIG_POOL, REGIONS, SETTLEMENTS, SETTLEMENT_MAP, SALVAGE_SITES, CASTAWAYS, POIS, STRUCTURES, RAIDER_ZONES, OUTPOSTS, SEA_MARKS, STORMWALL, stormwallLee, type IslandDef, type ScriptedFind, type SettlementDef } from '../data/world';
import { item, RARITY_ORDER, LIVING_GREEN, isLiving } from '../data/items';
import { UPGRADE_MAP, VESSELS, COSMETIC_MAP, type VesselId } from '../data/ship';
import { RECIPE_MAP } from '../data/crafting';
import { CREW_MAP, ROLE_INFO, type CrewRole } from '../data/crew';
import { pickLine, type LineTrigger } from '../data/characters';
import { RUMOUR_MAP } from '../data/rumours';
import { nextBeat, type ArcBeat } from '../data/arcs';
import { CHARACTER_MAP } from '../data/characters';
import { CONTRACT_MAP, MAX_ACTIVE, contractReady, GARDEN_POINTS, gardenStage, freshFood, standingRank, type PortId } from '../data/contracts';
import { RENOWN, renownTitle, refitStage } from '../data/renown';
import { sideLead, type Lead } from './leads';
import { GOALS } from '../data/progress';
import { windEff, offWind, luffAmount, pointOfSail, bearAwaySide, luffLine, drawingLine, LUFF_WARN_AFTER, LUFF_WARN_COOLDOWN, NO_GO } from './pointOfSail';
import { WindStreaks } from '../world/windStreaks';
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

/** World size of a wake puff on a wide screen (it was 0.7, shared with every other splash). */
const WAKE_PUFF = 0.55;
// on foot (world m/s, m/s²): a brisk run tops out where the procedural Run's stride and cadence put it
const FOOT_MIN = 0.7, FOOT_MAX = 5.0, FOOT_ACCEL = 9, FOOT_DECEL = 14;

export class Game implements GameAPI {
  store = new Store({ preview: pagePreviewShip(), upgrades: pagePreviewUpgrades(), experiments: pageExperiments(), fresh: pageFresh() });
  ui: UI;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  sunLight: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  /** Low-light fill on the player's boat from the camera side, so hull and sail stay readable at dusk and night. */
  shipFill: THREE.PointLight;
  atmo = new Atmosphere();
  ocean!: Ocean;
  sky!: Sky;
  env!: Environment;
  drowned!: DrownedWorld;
  salvage!: Salvage;
  raiders!: Raiders;
  engineOn = false;
  private fishTimer = 0;
  private castawayObjs = new Map<string, THREE.Object3D>();
  private caches: { obj: THREE.Object3D; x: number; z: number; region: string }[] = [];
  private cacheTimer = 0;
  private lastHullWarn = 0;
  private goalTimer = 0;
  private stormSaid = false;
  foam!: Particles;
  /** Wake puffs behind the boat: their own system so they can stay small and short-lived on narrow screens. */
  wakeFoam!: Particles;
  flip!: FlipFX;
  /** World position of the engine exhaust while motoring, for the smoke plume (null otherwise). */
  private exhaust: THREE.Vector3 | null = null;
  sparkle!: Particles;
  dirt!: Particles;

  ship!: ShipParts;
  shipRoot = new THREE.Group();
  boat = { x: 0, z: 0, heading: 0, speed: 0, anchored: false, docked: true, dockedAt: 'driftholm', anchorDepth: 0, busy: false };
  captain = new Captain();
  mode: Mode = 'sail';
  foot = { x: 0, z: 0, heading: 0, landX: 0, landZ: 0, island: ISLANDS[0] as IslandDef, speed: 0, vel: 0 };

  camYaw = Math.PI;
  camPitch = 0.42;
  camDist = 15;
  zoom = 1;
  private lastDrag = -10;
  private t = 0;
  started = false;
  get renderT() {
    return this.t;
  }
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
  private barkRecent: string[] = [];
  private barkAt = -99;
  private nightSaid = false;
  private voyageTowerPassed = false;
  private side: Lead | null = null;
  private beatTimer = 3;
  private sideTimer = 0;
  private steerTime = 0;
  private shoreCache: { x: number; z: number } | null = null;
  private shoreTimer = 0;
  private islandTimer = 0;
  private saveTimer = 0;
  private currentRegion = 'harbor';
  private wpTarget: { x: number; z: number } | null = null;
  private rng = new RNG(Date.now() & 0xffff);
  private shake = 0;
  private proxTimer = 0;
  // upwind sailing (#5): presentation only, never read by the physics
  private luff = 0; // 0..1, how hard the sails are luffing this frame
  private luffTime = 0; // s the sail has luffed under sail without a break
  private luffWarned = false; // a luff warning is showing; say so once the sail fills again
  private luffTips = 0; // warnings shown this session (the first explains the WIND dial)
  private flapTimer = 0;
  private windStreaks = new WindStreaks();
  private titleYawSet = false;

  constructor(private canvas: HTMLCanvasElement, private progress: (p: number, msg: string) => Promise<void>) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
    this.scene.fog = new THREE.Fog(0x9fa89f, 150, 860);
    this.scene.background = new THREE.Color(0xadb4aa);

    this.hemi = new THREE.HemisphereLight(0xc2cac2, 0x877357, 1.45);
    this.scene.add(this.hemi);
    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.4);
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
    this.shipFill = new THREE.PointLight(0xffe2c0, 0, 40, 1);
    this.scene.add(this.shipFill);

    this.ui = new UI(this);
    this.ui.onAction = (id) => this.action(id);
    this.store.on(() => {});
    audio.setVolumes(this.store.data.settings.sfx, this.store.data.settings.music);
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.bindCameraGestures();
  }

  async init() {
    this.atmo.time = this.store.data.timeOfDay;
    await this.progress(0.05, 'Hauling salvage out of the deep…');
    // upgrade models load lazily: only the ones this save already shows (see rebuildShip / ensureUpgradeModels)
    await loadModels((k) => void this.progress(0.05 + k * 0.3, 'Hauling salvage out of the deep…'), this.upgradeModelsNeeded());
    await this.progress(0.38, 'Flooding the world…');
    this.ocean = new Ocean(this.scene);
    await this.progress(0.5, 'Raising the last high ground…');
    this.env = new Environment(this.scene);
    await this.progress(0.62, 'Drowning the cities…');
    this.drowned = new DrownedWorld(this.scene);
    await this.progress(0.74, 'Brewing storms…');
    this.sky = new Sky(this.scene, this.atmo);
    this.atmo.onThunder = (d) => setTimeout(() => audio.thunder(1 - d * 0.6), d * 1400);
    this.salvage = new Salvage(this);
    this.raiders = new Raiders(this);
    this.placeCastaways();
    this.placeSeaMarks();
    this.buildGrowth();
    this.foam = new Particles(this.scene, 500, 0.7);
    this.wakeFoam = new Particles(this.scene, 300, WAKE_PUFF);
    this.wakeFoam.fade = 1.6;
    this.flip = new FlipFX(this.scene);
    this.scene.add(this.windStreaks.mesh);
    this.sky.onStrike = (p) => this.flip.burst('lightning', p.clone().setY(120), 70, 240, 0.9);
    this.resize();
    this.sparkle = new Particles(this.scene, 300, 0.6, true);
    this.dirt = new Particles(this.scene, 200, 0.35);
    await this.progress(0.85, 'Patching the skiff…');
    this.scene.add(this.shipRoot);
    this.rebuildShip();
    this.scene.add(this.captain.root);
    this.restoreState();
    this.placeFinds();
    await this.progress(1, 'Ready');
    loadCrew().then(() => {
      if (this.store.data.crew.length) this.rebuildShip();
      this.onCharacters();
    });
    this.renderer.compile(this.scene, this.camera);
    let last = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      // behind the Maps panel the scene is only a dimmed backdrop: draw it every other frame so the map's
      // pinch and pan keep the GPU on a phone
      if (!this.ui.mapOpen || (frame++ & 1) === 0) this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const save = () => {
      this.persistShip();
      this.store.data.timeOfDay = this.atmo.time;
      this.store.saveNow();
    };
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());
    window.addEventListener('pagehide', save);
    this.ui.showTitle(this.store.isNew);
  }

  /** The apocalyptic-pirate cast has streamed in: the captain, the townsfolk and the raider crews come alive. */
  private onCharacters() {
    const cap = characterModel('tb_captain');
    if (cap) {
      this.captain.useCharacter(cap);
      heroize(cap.root, 0.012);
      this.captain.onStep = (side, run) => this.footfall(side, run);
    }
    this.env.upgradeNpcs();
    this.raiders.onCharacters();
  }

  start() {
    this.started = true;
    this.camYaw = this.boat.heading; // play starts with the camera behind the boat, as before
    audio.unlock();
    setTimeout(() => pack.prefetch(), 4000);
    if (this.store.isNew) {
      this.ui.revealInfo('Driftholm · Year 61 After the Water', 'Wake up, Captain!', 'The sea took the cities, the roads and the mountains. It left you a patchwork skiff, fifteen gold and a head full of stories.<br><br>Old Wren is waiting at the end of the pier, lantern up: <i>“A bottle washed up on Turtle Atoll, the gulls say. Bring me what’s inside. Don’t read it first.” …“Read it first.”</i><br><br><b>Drag the wheel</b> (bottom-left) toward where you want to sail.', 'Let’s go');
      this.store.isNew = false;
      this.store.saveNow();
    } else {
      this.ui.toast('Welcome back, Captain. Your progress was restored.', { color: '#4f9a95', life: 3.5 });
    }
    if (this.boat.docked) setTimeout(() => this.ui.toast('Push the wheel to cast off from the pier', { life: 3.5 }), 1200);
  }

  private resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 68 : 55;
    this.camera.updateProjectionMatrix();
    // points are sized against screen height, so on a tall, narrow phone the same puff covers far more of the
    // width; shrink wake puffs with the aspect ratio (desktop keeps close to the old size)
    this.ocean?.setWakeAspect(w / h);
    this.wakeFoam?.setSize(WAKE_PUFF * Math.pow(Math.min(1, Math.max(0.4, w / h)), 0.75));
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
    this.boat.dockedAt = s.dockedAt || 'driftholm';
    if (this.boat.docked && this.boat.dockedAt === 'driftholm') this.dockPose();
    this.camYaw = this.boat.heading;
  }

  private persistShip() {
    const s = this.store.data.ship;
    s.x = this.boat.x;
    s.z = this.boat.z;
    s.heading = this.boat.heading;
    s.anchored = this.boat.anchored;
    s.docked = this.boat.docked;
    s.dockedAt = this.boat.dockedAt;
  }

  private dockPose() {
    this.boat.x = WORLD.spawn.x;
    this.boat.z = WORLD.spawn.z;
    this.boat.heading = WORLD.spawn.heading;
    this.boat.speed = 0;
    this.boat.anchored = false;
    this.boat.docked = true;
    this.boat.dockedAt = 'driftholm';
  }

  rebuildShip() {
    if (this.ship) this.shipRoot.remove(this.ship.group);
    this.ship = buildShip(this.store);
    for (const c of this.ship.crew) heroize(c.root, 0.012); // (thinner ink on people than on hulls)
    heroize(this.ship.group, this.store.data.vessel === 'dinghy' ? 0.022 : 0.035);
    this.shipRoot.add(this.ship.group);
    this.camDist = this.store.data.vessel === 'ironwake' ? 30 : this.store.data.vessel === 'brig' ? 27 : this.store.data.vessel === 'sloop' ? 24 : 15;
    const st = this.store.stats;
    this.store.data.hull = Math.min(this.store.data.hull, st.hullMax);
    this.store.data.fuel = Math.min(this.store.data.fuel, st.fuelCap);
    this.ensureUpgradeModels();
  }

  /** Lazily loaded model files the current boat shows: the Trimaran's owned upgrades, or the Ironwake's own model. */
  private upgradeModelsNeeded() {
    const v = this.store.data.vessel;
    return v === 'sloop' ? sloopUpgradeFiles(this.store.data.upgrades) : v === 'ironwake' ? ['tb_ironwake'] : [];
  }

  /**
   * Fetch any upgrade model the boat now needs (an upgrade just bought, or a switch to the Trimaran). Until it
   * arrives the upgrade's code-built part is drawn, so the slot is never empty; then the ship is rebuilt with it.
   */
  private ensureUpgradeModels() {
    const need = this.upgradeModelsNeeded().filter((f) => !modelRequested(f));
    if (need.length) loadModelFiles(need).then(() => this.rebuildShip());
  }

  // ───────── GameAPI ─────────
  shipState() {
    return { x: this.boat.x, z: this.boat.z, heading: this.boat.heading };
  }
  isDocked() {
    return this.boat.docked && this.mode === 'sail';
  }
  dockedSettlement(): SettlementDef | null {
    return this.isDocked() ? SETTLEMENT_MAP[this.boat.dockedAt] ?? null : null;
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
    const cost = s.upgradeCost(id, this.dockedSettlement()?.id);
    if (!s.canAfford(cost)) {
      audio.deny();
      return;
    }
    s.pay(cost);
    s.data.flags = s.data.flags.filter((f) => !f.startsWith('welcome_')); // the welcome price is good for one part
    s.data.upgrades.push(id);
    s.advanceQuest('upgrade');
    s.commit();
    pack.sting('upgrade');
    this.crewCheer(900);
    if (s.hasRole('mechanic')) setTimeout(() => pack.say('juno_upgrade', 90), 1600);
    setTimeout(() => this.crewBark('upgrade', { solar: u.slot === 'power' }, { prefer: 'mechanic', cool: 20 }), 2600);
    audio.hammer();
    this.haptic(30);
    this.rebuildShip();
    this.showcase = true;
    this.sparkle.emit(new THREE.Vector3(this.boat.x, 2, this.boat.z), 50, '#ffd25e', 4, 5, 1.4, 4, 2);
    this.ui.toast(`${u.name} installed!`, { color: '#4f9a95', life: 3 });
    const stageNow = refitStage(s.data.upgrades.length);
    if (stageNow.min === s.data.upgrades.length && stageNow.min > 0) {
      setTimeout(() => this.ui.revealInfo('Her refit', `${s.data.shipName || 'She'} is ${stageNow.name}`, `${stageNow.look} Every part you fit shows on her.`, 'Looks mean'), 1200);
    }
    if (s.data.upgrades.length === 1 && !s.data.shipName) setTimeout(() => this.nameShip(), 700);
    if (s.data.quest === 'free' && s.data.upgrades.length === 1 && !s.data.flags.includes('voyage_finale')) {
      setTimeout(() => this.voyageFinale(), 900);
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
      s.data.hull = v.hull + (s.bestInSlot('hull')?.effects.hull ?? 0);
      audio.hammer();
      setTimeout(() => audio.discover(4), 500);
      setTimeout(() => pack.sting('upgrade', 0.9), 700);
      this.ui.revealInfo('New vessel commissioned', v.name, `${v.desc}<br><br>Your upgrades, paint, trophies and crew came with you.${v.id === 'ironwake' ? ' The Stormwall is no longer a wall.' : ' The open swell is no longer a wall.'}`, 'Hoist the sails');
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

  haptic(ms: number) {
    if (this.store.data.settings.haptics && navigator.vibrate) navigator.vibrate(ms);
  }

  /**
   * A crew member says something about what just happened (src/data/characters.ts). One remark at a time: a short
   * gap between any two barks and a cooldown per trigger, so the crew comments without chattering. Returns whether
   * anyone spoke.
   */
  crewBark(trigger: LineTrigger, ctx: Record<string, boolean> = {}, opts: { prefer?: CrewRole; cool?: number; specificOnly?: boolean; force?: boolean } = {}): boolean {
    const s = this.store;
    if (!s.data.crew.length) return false;
    if (!opts.force && (this.t - this.barkAt < 7 || (this.msgCooldown[`bark_${trigger}`] ?? 0) > this.t)) return false;
    const recent = new Set(this.barkRecent);
    const aboard = s.data.crew.map((id) => CREW_MAP[id]).filter(Boolean);
    const order = [...aboard].sort(() => Math.random() - 0.5).sort((a, b) => Number(b.role === opts.prefer) - Number(a.role === opts.prefer));
    for (const c of order) {
      const text = pickLine(c.id, trigger, ctx, { recent, specificOnly: opts.specificOnly });
      if (!text) continue;
      this.barkAt = this.t;
      this.msgCooldown[`bark_${trigger}`] = this.t + (opts.cool ?? 30);
      this.barkRecent = [...this.barkRecent, text].slice(-12);
      this.ui.toast(`${c.name.split(' ')[0]}: “${text}”`, { color: ROLE_INFO[c.role].color, life: 3.8 });
      return true;
    }
    return false;
  }

  private say(key: string, text: string, cool = 4, opts: { icon?: string; color?: string; life?: number } = {}) {
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
        if (f.kind === 'plant') {
          if (opened) continue; // taken aboard: it lives on your boat now
          const obj = plantFindMesh(f.plant ?? 'flora_potted');
          obj.position.set(x, y - 0.03, z);
          obj.rotation.y = Math.atan2(isl.x - x, isl.z - z);
          this.scene.add(obj);
          this.finds.push({ def: f, isl, obj, x, z });
        } else if (f.kind === 'bottle') {
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
          if (f.requiresUpgrade) {
            // a cave find sits in the dark of the mouth, facing out, and only shows once a spotlight can reach it
            root.rotation.y = Math.atan2(x - isl.x, z - isl.z) + Math.PI;
            root.userData.needs = f.requiresUpgrade;
            root.visible = opened || this.store.has(f.requiresUpgrade);
          }
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
  gain(id: string, n: number, where: string, opts: { force?: boolean; reveal?: 'card' | 'toast' | 'none' } = {}): number {
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
        this.ui.toast(isLiving(id) ? `Something alive: ${d.name}!` : `New discovery: ${d.name}!`, { icon: id, color: isLiving(id) ? LIVING_GREEN : '#f0c445', life: 3.2 });
        if (isLiving(id)) setTimeout(() => this.crewBark('green', {}, { cool: 60 }), 2200);
        if (!s.data.flags.includes('catalog_hint')) {
          // the First Voyage no longer has a "look at your Catalog" step: teach it here, once
          s.data.flags.push('catalog_hint');
          setTimeout(() => this.ui.toast('Logged in your CATALOG. Every find stays on record, even after you trade it away.', { icon: 'map', color: '#c9b48a', life: 4 }), 3600);
        }
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

  // ───────── the Wren's Bottle (design bible PR 2.1): the First Voyage as a story with two choices ─────────
  /** The chest is up: two letters on its lid, and (if Kai is still adrift) the first choice of the game. */
  private voyageAfterDig() {
    const s = this.store;
    this.ui.revealInfo('Scratched into the lid', 'R.F.', 'Two letters, cut deep with a knife, a long time ago. Old Wren will want to see this.', 'Take it to Wren');
    const kai = CASTAWAYS.find((c) => c.crew === 'kai');
    if (!kai || s.data.castaways.includes(kai.id)) return;
    this.ui.revealChoice('On the radar', 'A raft, north of here', 'A ragged flag and someone waving both arms. It’s a detour on the way home, and the sea won’t wait for them forever. Probably.', [
      { label: 'Go to the raft', sub: 'A minute out of your way', pick: () => { s.data.flags.push('voyage_kai'); s.commit(); } },
      { label: 'Later', sub: 'Home first. The Captain’s Log will remember', pick: () => {} },
    ]);
  }

  /** Home from the first voyage: Marlo offers one starter part at a welcome price, your pick. */
  private voyageStarterOffer() {
    const s = this.store;
    if (s.data.quest !== 'upgrade' || s.data.flags.includes('starter_offer')) return;
    s.data.flags.push('starter_offer');
    const pick = (id: string) => () => {
      s.data.flags.push(`welcome_${id}`);
      s.commit();
      this.ui.toast(`Marlo will fit the ${UPGRADE_MAP[id].name} at half the gold. Sell to Pip, then see him.`, { color: '#d6a62a', life: 4 });
    };
    const opt = (id: string, sub: string) => ({ label: `${UPGRADE_MAP[id].name} · ${Math.ceil(UPGRADE_MAP[id].cost.gold / 2)}g`, sub, pick: pick(id) });
    this.ui.revealChoice('Marlo Keelhart · Shipwright', 'One part, at a welcome price', '“Came back in one piece. That earns you a discount on one thing. One. Choose.”', [
      opt('sail_canvas', 'Faster everywhere: more sea for your time'),
      opt('rudder_ash', 'Turns sharp: easier to work wrecks and reefs'),
      opt('cargo_crate', '+4 cargo: more salvage per trip home'),
    ]);
  }

  /** The voyage is done: Wren reads the letters, and the Log opens on two roads. */
  private voyageFinale() {
    const s = this.store;
    if (s.data.flags.includes('voyage_finale')) return;
    s.data.flags.push('voyage_finale');
    if (RUMOUR_MAP.r_wren && !s.data.pinned.includes('r_wren')) s.data.pinned = ['r_wren', ...s.data.pinned];
    s.commit();
    this.ui.revealInfo('Old Wren · Driftholm', '“R.F. Redfinch.”', '“So he did come this way.” She turns the lid in her hands for a long time. “He had a trawler once. The Wren. She went down inside the reef ring north of here.”<br><br>Your <b>Captain’s Log</b> now shows two roads: the main goal, and a side lead (the wreck of the Wren). Tap the side lead to follow it. Every part you fit shows on your boat.', 'Fair winds');
  }

  // ───────── contracts, standing and the Green Choice (design bible PR 2.2) ─────────
  acceptContract(id: string) {
    const s = this.store.data;
    const c = CONTRACT_MAP[id];
    if (!c || s.contracts.done.includes(id) || s.contracts.active.some((a) => a.id === id)) return;
    if (s.contracts.active.length >= MAX_ACTIVE) return this.ui.toast(`You can carry ${MAX_ACTIVE} jobs at once. Finish one first.`, { color: '#ff6b4a' });
    s.contracts.active.push({ id, at: this.store.seaNow(), base: s.raidersRepelled });
    audio.ui();
    this.ui.toast(`Job taken: ${c.title}`, { color: '#d6a62a', life: 2.5 });
    this.updateSide(true);
    this.store.commit();
  }

  /** Hand in a finished job where it was posted: goods change hands, gold and standing come back. */
  completeContract(id: string) {
    const st = this.store;
    const s = st.data;
    const c = CONTRACT_MAP[id];
    const a = s.contracts.active.find((x) => x.id === id);
    const sett = this.dockedSettlement();
    if (!c || !a || sett?.id !== c.port || !contractReady(c, a, s, st)) return;
    if (c.kind === 'deliver') st.consume(c.need.item!, c.need.n ?? 1);
    s.contracts.active = s.contracts.active.filter((x) => x.id !== id);
    s.contracts.done.push(id);
    const r = c.reward;
    if (r.gold) {
      s.gold += r.gold;
      s.stats.goldEarned += r.gold;
    }
    for (const m of r.mats ?? []) st.addTo(s.vault, m.id, m.n);
    if (r.cosmetic && !s.cosmetics.includes(r.cosmetic)) s.cosmetics.push(r.cosmetic);
    this.addStanding(c.port, r.standing);
    if (r.growth && !s.flags.includes(`growth_${r.growth}`)) s.flags.push(`growth_${r.growth}`);
    audio.coins(8);
    pack.sting('discovery', 0.6);
    this.crewCheer(300);
    const got = [r.gold ? `${r.gold} gold` : '', ...(r.mats ?? []).map((m) => `${m.n} ${item(m.id).name}`), r.cosmetic ? COSMETIC_MAP[r.cosmetic].name : ''].filter(Boolean).join(' · ');
    this.ui.revealInfo(`Job done · ${SETTLEMENT_MAP[c.port].name}`, c.title, `${got ? `<b>${got}</b><br>` : ''}${r.growth ? 'Something new is going up in port. Look for it on your way out.<br>' : ''}Standing here: <b>${standingRank(s.standing[c.port] ?? 0).name}</b>.`, 'Good work');
    this.buildGrowth();
    st.commit();
    this.checkMilestones();
  }

  private addStanding(port: PortId, n: number) {
    const s = this.store.data;
    const before = standingRank(s.standing[port] ?? 0);
    s.standing[port] = (s.standing[port] ?? 0) + n;
    const after = standingRank(s.standing[port]!);
    if (after.name !== before.name) setTimeout(() => this.ui.revealInfo(`Standing · ${SETTLEMENT_MAP[port].name}`, `You are ${after.name}`, after.perk || 'People here know your boat.', 'Earned'), 600);
  }

  /** The Green Choice: plant something alive in a port garden instead of selling it. */
  plantGreen(id: string) {
    const st = this.store;
    const s = st.data;
    const sett = this.dockedSettlement();
    const port = sett?.id as PortId | undefined;
    if (!port || (port !== 'driftholm' && port !== 'hollow') || !isLiving(id) || !st.consume(id, 1)) return;
    const pts = GARDEN_POINTS[item(id).rarity];
    const stage0 = gardenStage(s.garden[port] ?? 0);
    s.garden[port] = (s.garden[port] ?? 0) + pts;
    this.addStanding(port, Math.max(1, Math.round(pts / 2)));
    const stage1 = gardenStage(s.garden[port]!);
    if (s.trophies.includes(id) && st.countOwned(id) === 0) s.trophies = s.trophies.map((t) => (t === id ? null : t));
    audio.discover(3);
    this.crewCheer(300);
    if (stage1 > stage0) {
      this.ui.revealInfo(port === 'hollow' ? 'The Roof Garden' : 'The Pier Garden', `It’s growing (${stage1}/3)`, `Green, where there was none. People stop to look at it.<br><br><b>Fresh food:</b> your crew catch and repair ${Math.round((freshFood(s) - 1) * 100)}% better at sea.`, 'Keep it alive');
      this.buildGrowth();
    } else this.ui.toast(`Planted: ${item(id).name}. The garden takes it.`, { color: LIVING_GREEN, life: 3 });
    st.commit();
    this.rebuildShip();
  }

  /** Things that grow in port because of you: the gardens, Nori's deck, Dace's second flare. Rebuilt on change. */
  private growth: THREE.Object3D[] = [];
  buildGrowth() {
    for (const o of this.growth) this.scene.remove(o);
    this.growth = [];
    const s = this.store.data;
    const add = (o: THREE.Object3D | null) => {
      if (!o) return;
      this.scene.add(o);
      this.growth.push(o);
    };
    const kit = (file: string, node: string, x: number, y: number, z: number, ry = 0, sc = 1) => {
      const o = model(file, node, { shadows: true });
      if (o) {
        o.position.set(x, y, z);
        o.rotation.y = ry;
        o.scale.setScalar(sc);
      }
      return o;
    };
    const planters = (x: number, y: number, z: number, ry: number, stage: number) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.y = ry;
      g.scale.setScalar(1.5); // big enough to read from the water: the point is that people can see it
      const box = (bx: number, bz: number) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), new THREE.MeshToonMaterial({ color: 0x6b4a33 }));
        m.position.set(bx, 0.25, bz);
        g.add(m);
        const soil = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.06, 0.75), new THREE.MeshToonMaterial({ color: 0x3a2a1c }));
        soil.position.set(bx, 0.5, bz);
        g.add(soil);
      };
      const plant = (node: string, px: number, pz: number, sc: number) => {
        const p = model('tb_flora_kit', node, { shadows: true });
        if (!p) return;
        p.position.set(px, 0.5, pz);
        p.scale.setScalar(sc);
        g.add(p);
      };
      box(-1, 0); box(1, 0);
      if (stage >= 1) { plant('flora_seedling', -1.3, 0, 1.3); plant('flora_moss', -0.6, 0.1, 1.2); plant('flora_seedling', 0.8, -0.1, 1.2); }
      if (stage >= 2) { box(-1, 1.3); box(1, 1.3); plant('flora_potted', -1, 1.3, 1.3); plant('flora_flowering', 1, 1.3, 1.3); plant('flora_fruit', 1.4, 0.1, 1.2); }
      if (stage >= 3) { box(0, -1.3); plant('flora_sapling', 0, -1.3, 1.6); }
      return g;
    };
    // Driftholm: a planter raft off the pier
    const dh = gardenStage(s.garden.driftholm ?? 0);
    if (dh > 0) {
      add(kit('tb_outpost_kit', 'pontoon', 14, 0, 182, 0.2, 1.1));
      add(planters(14, 0.9, 182, 0.2, dh));
    }
    // Rooftop Hollow: up among the forty, on the roof
    const ho = gardenStage(s.garden.hollow ?? 0);
    if (ho > 0) add(planters(-238.5, this.drowned.hollowTop - 0.75, -73, 0.5, ho));
    // Nori's new raft deck, lashed beside the Hollow's dock
    if (s.flags.includes('growth_hollow_deck')) {
      add(kit('tb_outpost_kit', 'pontoon', -246, 0, -38, 0.5, 1.2));
      add(kit('tb_outpost_kit', 'net_tower', -246, 0.6, -38, 0.5, 0.9));
    }
    // Pip's museum: a stall on its own pontoon by the pier, full of the things the sea gave back
    if (s.flags.includes('growth_museum')) {
      add(kit('tb_outpost_kit', 'pontoon', -16, 0, 179, -0.3, 1.1));
      add(kit('tb_outpost_kit', 'market_stall', -16, 0.9, 179, -0.3 + Math.PI, 1));
    }
    // Dace's second flare: a burning stack on a pontoon off the rig
    if (s.flags.includes('growth_helios_flare')) {
      add(kit('tb_outpost_kit', 'pontoon', -566, 0, 196, 0.6, 1.2));
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 11, 8), new THREE.MeshToonMaterial({ color: 0x5c5a54 }));
      stack.position.set(-566, 6, 196);
      add(stack);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.2, 8), new THREE.MeshBasicMaterial({ color: 0xffa23a }));
      flame.position.set(-566, 13, 196);
      add(flame);
      this.drowned.animators.push((t) => flame.scale.set(1 + Math.sin(t * 9) * 0.12, 1 + Math.sin(t * 6.3) * 0.2, 1 + Math.cos(t * 8) * 0.12));
    }
  }

  // ───────── character arcs (design bible PR 2.3) ─────────
  private checkBeats() {
    const st = this.store;
    const d = st.data;
    if (d.quest !== 'free') return;
    const beat = nextBeat(d.beats, {
      aboard: (id) => d.crew.includes(id),
      port: this.boat.docked ? this.boat.dockedAt : null,
      flags: d.flags,
      has: (u) => st.has(u),
      owns: (v) => d.vesselsOwned.includes(v as VesselId),
      regions: d.regionsSeen,
      done: d.contracts.done,
      discoveries: st.discoveryCount,
      standing: d.standing,
      items: (id) => st.countOwned(id),
      mapsDone: d.mapsCompleted,
    });
    if (!beat) return;
    d.beats.push(beat.id);
    this.playBeat(beat);
    st.commit();
  }

  private playBeat(b: ArcBeat) {
    const st = this.store;
    const d = st.data;
    const who = CHARACTER_MAP[b.who];
    const kicker = `${who?.name ?? b.who} · ${who?.role ?? ''}`;
    switch (b.effect) {
      case 'cache_going_under':
        this.gain('clay_whistle', 1, 'Going Under', { force: true, reveal: 'none' });
        this.gain('rope', 3, 'Going Under', { force: true, reveal: 'none' });
        break;
      case 'mara_survey':
        this.gain('polaroid', 1, 'Old Meridian', { force: true, reveal: 'none' });
        break;
      case 'juno_plate':
        if (!d.flags.includes('juno_plate')) d.flags.push('juno_plate');
        break;
      case 'tidebreaker_colours':
        if (!d.cosmetics.includes('flag_tidebreaker')) d.cosmetics.push('flag_tidebreaker');
        break;
      case 'hold_way':
        if (!d.flags.includes('hold_way')) d.flags.push('hold_way');
        break;
      case 'museum':
        if (!d.flags.includes('growth_museum')) d.flags.push('growth_museum');
        this.buildGrowth();
        break;
    }
    if (b.effect === 'ledger_choice') {
      this.ui.revealInfo(kicker, b.title, b.text, 'Put it on the table');
      this.ui.revealChoice('Foreman Dace · Rig Trader', '“Rig rules.”', 'Dace looks at the ledger for a long time. “Fifteen years. They’d have burned the rig without it. You going to tell everyone, or are we going to come to an arrangement?”', [
        { label: 'Read it out on the flare deck', sub: 'Helios stops paying. The rig arms itself and Rustfang pulls out of Old Meridian. Prices here go up 10%.', pick: () => {
          d.flags.push('ledger_confront');
          st.consume('dace_ledger', 1);
          st.commit();
          this.ui.toast('The rig goes quiet, then loud. By dusk the Meridian skiffs are gone.', { color: '#d6a62a', life: 4.5 });
        } },
        { label: 'Hand it back', sub: 'Dace owes you for life: 15% off everything at Rig Helios, and his trust.', pick: () => {
          d.flags.push('ledger_secret');
          st.consume('dace_ledger', 1);
          d.standing.helios = (d.standing.helios ?? 0) + 3;
          st.commit();
          this.ui.toast('Dace pockets the ledger. “Rustfang excepted,” he says, and almost smiles.', { color: '#d6a62a', life: 4.5 });
        } },
      ]);
    } else if (b.effect === 'vik_choice') {
      this.ui.revealInfo(kicker, b.title, b.text, 'Find Vik');
      // the first choice an NPC asks of you: price, or principle
      this.ui.revealChoice('Vik Ashby · Rig Mechanic', '“It was drifting.”', '“It was drifting. It was. I told myself it was.” Vik can’t look at Juno. “Take the diesels at cost. Least I can do.” Juno says nothing at all.', [
        { label: 'Take them at cost', sub: 'Twin Diesel Drive for half the gold. Juno never mentions it again.', pick: () => {
          d.flags.push('twin_at_cost');
          d.standing.helios = (d.standing.helios ?? 0) + 2;
          st.commit();
          this.ui.toast('Juno: “Fine. They’re still Dad’s.”', { color: ROLE_INFO.mechanic.color, life: 4 });
        } },
        { label: 'Let Juno build her own', sub: 'She can fit a twin diesel at Driftholm, and her engines drink less.', pick: () => {
          d.flags.push('juno_diesel');
          st.commit();
          this.ui.toast('Juno: “Keep them, Vik. I’ll build better.” She means it.', { color: ROLE_INFO.mechanic.color, life: 4 });
        } },
      ]);
    } else this.ui.revealInfo(kicker, b.title, b.text, 'Go on');
    this.crewCheer(400);
  }

  /** Name (or rename) the boat: painted on her stern, and people call her by it. */
  nameShip() {
    const s = this.store;
    this.ui.promptShipName(s.data.shipName, (name) => {
      s.data.shipName = name;
      s.commit();
      this.rebuildShip();
      this.crewCheer(200);
      this.ui.toast(`The ${name}. It suits her.`, { color: '#d6a62a', life: 3 });
      if (this.ui.panelOpen) this.ui.openPanel('ship');
    });
  }

  checkMilestones() {
    // renown: what the Drift calls you, announced once per title
    const d = this.store.data;
    const title = renownTitle(d);
    if (RENOWN.findIndex((r) => r.id === title.id) > RENOWN.findIndex((r) => r.id === d.renown)) {
      d.renown = title.id;
      this.store.commit();
      this.crewCheer(600);
      this.ui.revealInfo('Renown', `They call you ${title.title}`, `${title.how} The Drift talks. Word travels from raft to raft faster than any boat.`, 'Earned');
    }
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
      case 'salvage':
        this.salvage.begin();
        break;
      default:
        if (id.startsWith('dock:')) this.dockAt(id.slice(5));
        else if (id.startsWith('rescue:')) this.rescue(id.slice(7));
        else if (id.startsWith('mark:')) this.investigate(id.slice(5));
    }
  }

  // ───────── drowned world systems ─────────
  private applyAtmosphere() {
    const a = this.atmo;
    this.sunLight.color.copy(a.sunColor);
    this.sunLight.intensity = a.sunIntensity;
    this.hemi.color.copy(a.hemiSky);
    this.hemi.groundColor.copy(a.hemiGround);
    this.hemi.intensity = a.hemiIntensity;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.copy(a.fogColor);
    fog.near = a.fogNear;
    fog.far = a.fogFar;
    (this.scene.background as THREE.Color).copy(a.skyHorizon);
    const u = this.ocean.uniforms;
    u.uSunDir.value.copy(a.sunDir);
    u.uSunColor.value.copy(a.sunColor).multiplyScalar(Math.min(1.2, a.sunIntensity / 2));
    u.uFogColor.value.copy(a.fogColor);
    u.uFogNear.value = a.fogNear;
    u.uFogFar.value = a.fogFar;
    u.uSkyColor.value.copy(a.skyHorizon);
    u.uSkyTop.value.copy(a.skyTop);
    u.uStorm.value = a.storm;
    u.uNight.value = a.night;
    a.calm = !!this.store.data.settings.calm;
    const amb = 0.3 + 0.7 * (1 - a.night) * (1 - a.storm * 0.45) + a.flash * 0.5;
    u.uAmbient.value.setRGB(amb * 0.9, amb * 0.97, amb);
    oceanState.storm = a.storm;
    if (this.ship.lamp) this.ship.lamp.intensity = a.night * 3 + a.storm * 1.2;
    updateHeroLight(a.sunColor, a.sunIntensity, a.night, a.sunDir, this.camera);
  }

  /** Dusk, night and storms flatten the boat into the dark sea (the sun is low or gone, and the ocean shader lights
   *  the water separately). A warm fill from the camera side, above the boat, fades in as the sun's light drops and
   *  only reaches about four boat-lengths, so the boat reads without brightening the world. Off in daylight. */
  private updateShipFill() {
    const f = this.shipFill;
    const low = clamp((1.6 - this.atmo.sunIntensity) / 1.0, 0, 1);
    if (this.mode !== 'sail' || low <= 0) {
      f.intensity = 0;
      return;
    }
    const L = this.ship.length;
    const p = this.shipRoot.position;
    const to = new THREE.Vector3(this.camera.position.x - p.x, 0, this.camera.position.z - p.z);
    if (to.lengthSq() < 1e-6) to.set(0, 0, 1);
    to.normalize();
    f.position.set(p.x + to.x * L * 0.8, p.y + L * 0.9 + 1.5, p.z + to.z * L * 0.8);
    f.distance = L * 4 + 6;
    f.color.setRGB(1, 0.89, 0.76).lerp(new THREE.Color(0.75, 0.85, 1), this.atmo.night);
    f.intensity = low * (L + 4) * 0.55;
  }

  /** Visual check (scripts/visual-check.mjs): of the live wake/spray puffs, how many are drawn over the boat, i.e. the
   *  ray from the camera through the puff's centre or its sprite's edge hits the ship or captain behind the puff, above
   *  the water. */
  wakeOverlap() {
    const ray = new THREE.Raycaster();
    const targets = [this.shipRoot, this.captain.root];
    const cam = this.camera.position;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const r = (this.wakeFoam.points.material as THREE.PointsMaterial).size * 0.35; // the bright core of the puff
    const pts = this.wakeFoam.live();
    const shown = (o: THREE.Object3D | null): boolean => !o || (o.visible && shown(o.parent));
    let over = 0;
    for (const p of pts) {
      const d = p.distanceTo(cam);
      const hit = [p, p.clone().addScaledVector(right, r), p.clone().addScaledVector(right, -r), p.clone().addScaledVector(up, r), p.clone().addScaledVector(up, -r)].some((q) => {
        ray.set(cam, q.clone().sub(cam).normalize());
        ray.far = d * 3;
        const h = ray.intersectObjects(targets, true).find((x) => shown(x.object)); // raycasts also hit hidden meshes
        // a hit under the water surface shows water, not hull (the ocean isn't in the raycast)
        return !!h && h.distance > d && h.point.y > this.ocean.sample(h.point.x, h.point.z, this.t).y;
      });
      if (hit) over++;
    }
    return { live: pts.length, over };
  }

  /** Storms batter the hull; a Mechanic patches it at sea. */
  private updateHull(dt: number) {
    const s = this.store.data, st = this.store.stats;
    const b = this.boat;
    if (b.docked || this.mode !== 'sail') return;
    const storm = this.atmo.storm;
    if (storm > 0.4) {
      const inWall = this.atmo.wall > 0.5;
      const lee = inWall && st.crossStorm ? stormwallLee(b.x, b.z) : 0;
      const wallMul = inWall ? (st.crossStorm ? STORMWALL.hullMul + (STORMWALL.leeMul - STORMWALL.hullMul) * lee : 2) : 1;
      this.damage((storm - 0.4) * 1.6 * wallMul * dt, null);
      if (!this.stormSaid) {
        this.stormSaid = true;
        if (inWall && st.crossStorm && lee < 0.5) this.ui.toast('The Stormwall! A gale holds her back. Push through: the Spire’s lee is calmer.', { color: '#9aa9b4', life: 3.5 });
        else if (!this.crewBark('storm', {}, { prefer: 'lookout', force: true, cool: 40 })) this.ui.toast('Storm! Waves are battering the hull.', { color: '#9aa9b4', life: 3.5 });
        if (this.store.hasRole('lookout')) pack.say('kai_storm', 40);
        audio.discover(0);
      }
    } else if (storm < 0.2) this.stormSaid = false;
    // nightfall: someone on deck says something (once a night)
    if (this.atmo.night > 0.75 && !this.nightSaid) {
      if (this.crewBark('night', { lights: this.store.has('deck_lights') }, { cool: 200 })) this.nightSaid = true;
    } else if (this.atmo.night < 0.3) this.nightSaid = false;
    if (this.store.hasRole('mechanic') && s.hull < st.hullMax && storm < 0.4) s.hull = Math.min(st.hullMax, s.hull + dt * 0.35 * freshFood(s)); // the gardens feed the crew
    // Juno's plate from her father's tug: her repairs keep going inside the Stormwall, twice as fast
    if (this.store.hasRole('mechanic') && s.flags.includes('juno_plate') && this.atmo.wall > 0.5 && s.hull < st.hullMax) s.hull = Math.min(st.hullMax, s.hull + dt * 0.7);
    // Lookout: early warning of a storm cell ahead
    if (this.store.hasRole('lookout')) {
      const ax = b.x + Math.sin(b.heading) * 160, az = b.z + Math.cos(b.heading) * 160;
      if (this.atmo.stormAt(ax, az) > 0.5 && storm < 0.2) {
        if ((this.msgCooldown.lookout_storm ?? 0) <= this.t) {
          this.msgCooldown.lookout_storm = this.t + 25;
          this.ui.toast('Kai: “Storm ahead, Captain. Go round, or brace.”', { color: ROLE_INFO.lookout.color, life: 3.5 });
          pack.say('kai_storm', 40);
        }
      }
    }
    // Fishing: rods and/or a Fisher bring in Silverfin while under way
    const rate = st.fishing + (this.store.hasRole('fisher') ? (st.fishing ? 2 : 1) : 0);
    if (rate && b.speed > 1.2) {
      this.fishTimer += dt * rate * freshFood(this.store.data);
      if (this.fishTimer > 40) {
        this.fishTimer = 0;
        const got = this.gain('fish', 1, 'the open sea', { reveal: 'none' });
        if (got) {
          this.ui.toast('+1 Silverfin', { icon: 'fish', color: '#9ec5e8', life: 1.6 });
          audio.splash();
          if (this.store.hasRole('fisher')) {
            pack.say('tomas_catch', 180);
            this.crewBark('fish', {}, { prefer: 'fisher', cool: 240 });
          }
          this.store.commit();
        }
      }
    }
  }

  /** The crew on deck throw an arm up once (animcraft 'Cheer' clip), then settle back into Idle. */
  crewCheer(delay = 0) {
    setTimeout(() => {
      for (const c of this.ship.crew) {
        const cheer = c.actions.Cheer, idle = c.actions.Idle;
        if (!cheer || !idle) continue;
        cheer.reset().setLoop(THREE.LoopRepeat, 2).play();
        cheer.clampWhenFinished = false;
        idle.crossFadeTo(cheer, 0.25, false);
        const back = (e: { action: THREE.AnimationAction }) => {
          if (e.action !== cheer) return;
          c.mixer.removeEventListener('finished', back);
          idle.reset().play();
          cheer.crossFadeTo(idle, 0.4, false);
        };
        c.mixer.addEventListener('finished', back);
      }
    }, delay);
  }

  /** A new hand comes aboard: the crew stinger, then their own first words. */
  private crewJoined(id: string) {
    pack.sting('crew');
    this.crewCheer(600);
    const line = `${id}_joined`;
    if (line in VOICE_LINES) setTimeout(() => pack.say(line as VoiceId, 1e9), 1400);
  }

  /** The Driftholm dockhand: a hail the first time home, after that a word about wherever you're headed next. */
  private dockhandHail() {
    const s = this.store.data;
    const key = 'vo_dockhand_hail';
    if (!s.flags.includes(key)) {
      s.flags.push(key);
      return setTimeout(() => pack.say('dockhand_hail', 1e9), 900);
    }
    const line: VoiceId = s.vesselsOwned.includes('ironwake') && !s.regionsSeen.includes('stormwall')
      ? 'dockhand_stormwall'
      : s.vesselsOwned.includes('sloop') && !s.regionsSeen.includes('emerald')
        ? 'dockhand_reach'
        : 'dockhand_return';
    setTimeout(() => pack.say(line, 240), 900);
  }

  damage(n: number, msg: string | null) {
    const s = this.store.data, st = this.store.stats;
    const dmg = n * (1 - st.armor);
    s.hull = Math.max(0, s.hull - dmg);
    if (msg && dmg > 0.5) this.say('dmg', `${msg} −${Math.round(dmg)} hull`, 2, { color: '#ff6b4a' });
    // a real strike (not the slow grind of a storm): feel it
    if (dmg >= 1.5) {
      this.shake = Math.min(1, this.shake + 0.25 + dmg / 14);
      this.ui.hit();
      audio.hullHit(Math.min(1, dmg / 12));
      pack.layer('hull', 0.35 + Math.min(0.5, dmg / 24));
      if (this.store.hasRole('mechanic') && s.hull < this.store.stats.hullMax * 0.35) {
        pack.say('juno_hull', 60);
        this.crewBark('hull', {}, { prefer: 'mechanic', cool: 60 });
      }
      this.haptic(Math.min(80, 20 + dmg * 4));
    }
    if (s.hull < st.hullMax * 0.25 && this.t - this.lastHullWarn > 20) {
      this.lastHullWarn = this.t;
      this.ui.toast('Hull critical! Patch it from the SHIP screen or head for a settlement.', { color: '#ff6b4a', life: 4 });
      audio.creak();
      this.haptic(60);
    }
    if (s.hull <= 0) this.swamped();
  }

  private swamped() {
    const s = this.store;
    this.engineOn = false;
    this.ui.fade(() => {
      // lose half of everything that isn't story loot
      let lost = 0;
      for (const st of [...s.data.cargo]) {
        const d = item(st.id);
        if (d.rarity === 'legendary' || d.rarity === 'epic') continue;
        const n = Math.ceil(st.n / 2);
        lost += s.removeFrom(s.data.cargo, st.id, n);
      }
      this.mode = 'sail';
      this.dockPose();
      s.data.hull = Math.round(s.stats.hullMax * 0.4);
      s.data.stats.trips++;
      this.clearPickups();
      this.persistShip();
      s.commit();
      this.ui.revealInfo('Swamped', 'Towed home to Driftholm', `The sea came over the rails. A Driftholm tug found you and towed you home${lost ? `, but ${lost} items went over the side` : ''}. Marlo patched the worst of it.<br><br>Armour plating, a Mechanic and hull patch kits keep you afloat in storms.`, 'Never again');
    });
  }

  /** The sea marks of the north-west (data/world.ts SEA_MARKS), built from the GITCRAFT kits. */
  private placeSeaMarks() {
    for (const m of SEA_MARKS) {
      const g = new THREE.Group();
      const kit = (file: string, node: string, x = 0, z = 0, ry = 0, sc = 1) => {
        const o = model(file, node, { shadows: true });
        if (!o) return;
        o.position.set(x, 0, z);
        o.rotation.y = ry;
        o.scale.setScalar(sc);
        g.add(o);
      };
      if (m.kind === 'bell') {
        kit('tb_flotsam_kit', 'bell_buoy', 0, 0, 0.4, 1.25);
        kit('tb_flotsam_kit', 'hull_shard', 4.5, 2, 1.1);
      } else if (m.kind === 'shrine') {
        kit('tb_outpost_kit', 'pontoon', 0, 0, 0.3);
        kit('tb_outpost_kit', 'dead_tree', 0, 0, 0.9, 0.8);
        kit('tb_debris_kit', 'oil_drum', 2.2, 1.4, 0.2);
        kit('tb_debris_kit', 'oil_drum', -2, 1.6, 1.3);
        kit('tb_debris_kit', 'oil_drum', 1.4, -2.2, 2.2);
      } else {
        const bb = billboardMesh();
        bb.scale.setScalar(0.8);
        g.add(bb);
        kit('tb_flotsam_kit', 'barrel_raft', -1.5, 2.5, 0.6);
      }
      g.position.set(m.x, 0, m.z);
      // face the Drift, so the first look from the usual routes is the front
      g.rotation.y = m.kind === 'billboard' ? Math.atan2(0 - m.x, 100 - m.z) : (m.x * 0.013) % 6.28;
      this.scene.add(g);
      const ph = m.x * 0.02;
      this.drowned.animators.push((t) => {
        g.position.y = Math.sin(t * 0.9 + ph) * 0.18 - 0.1;
        g.rotation.z = Math.sin(t * 0.7 + ph) * 0.03;
      });
    }
  }

  /** Sail up to a sea mark and look it over: its find comes aboard, and its story with it. */
  private investigate(id: string) {
    const m = SEA_MARKS.find((x) => x.id === id);
    const s = this.store;
    if (!m || s.data.flags.includes(`found_${m.id}`)) return;
    if (this.boat.speed > 3) return this.say('slow', 'Ease off to come alongside.');
    s.data.flags.push(`found_${m.id}`);
    for (const l of m.loot) this.gain(l.id, l.n, m.name, { force: true, reveal: 'none' });
    this.ui.revealChest(m.name, m.loot, m.lore);
    audio.discover(2);
    this.haptic(25);
    s.commit();
    this.checkMilestones();
  }

  /** The Captain's Log side lead (leads.ts), refreshed twice a second. */
  sideLead(): Lead | null {
    return this.side;
  }

  toggleFollowSide() {
    const s = this.store.data;
    s.followSide = !s.followSide && !!this.side;
    this.store.commit();
  }

  /** Pin (or unpin) one of Old Wren's rumours: a pinned rumour becomes the side lead. */
  pinRumour(id: string) {
    const s = this.store.data;
    if (!RUMOUR_MAP[id]) return;
    if (s.pinned.includes(id)) s.pinned = s.pinned.filter((x) => x !== id);
    else {
      s.pinned = [id, ...s.pinned];
      s.followSide = true; // you pinned it because you mean to go
    }
    this.updateSide(true);
    this.store.commit();
  }

  private updateSide(force = false) {
    const s = this.store;
    if (s.data.quest !== 'free') {
      this.side = null;
      return;
    }
    const st = s.stats;
    const g = GOALS[s.data.goal];
    const prev = this.side?.id;
    const reach = { crossSwell: st.crossSwell, crossStorm: st.crossStorm, heavy: !!st.salvage };
    const jobs: Lead[] = [];
    for (const a of s.data.contracts.active) {
      const c = CONTRACT_MAP[a.id];
      if (!c) continue;
      const ready = contractReady(c, a, s.data, s);
      const home = SETTLEMENT_MAP[c.port];
      const p = ready || !c.target ? home : c.target;
      if (!ready && c.target && Math.hypot(c.target.x, c.target.z - 30) > 365 && !reach.crossSwell) continue;
      jobs.push({ id: c.id, kind: 'contract', label: ready ? `Paid at ${home.name}: ${c.title}` : `Job: ${c.title}`, x: p.x, z: p.z });
    }
    this.side = sideLead(s.data, reach, { x: this.boat.x, z: this.boat.z }, g?.target ?? null, jobs);
    if (!this.side && s.data.followSide) s.data.followSide = false;
    if (force || prev !== this.side?.id) this.ui.refreshHUD();
  }

  private placeCastaways() {
    for (const cw of CASTAWAYS) {
      if (this.store.data.castaways.includes(cw.id)) continue;
      const o = model('tb_debris_kit', 'castaway_raft', { shadows: true }) ?? new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 2), new THREE.MeshToonMaterial({ color: 0x8a5a34 }));
      o.position.set(cw.x, 0, cw.z);
      o.rotation.y = cw.x * 0.1;
      this.scene.add(o);
      this.castawayObjs.set(cw.id, o);
    }
  }

  private rescue(id: string) {
    const cw = CASTAWAYS.find((c) => c.id === id);
    const s = this.store;
    if (!cw || s.data.castaways.includes(id)) return;
    if (this.boat.speed > 3) return this.say('slow', 'Slow down to bring them aboard.');
    const def = CREW_MAP[cw.crew];
    s.data.castaways.push(id);
    const obj = this.castawayObjs.get(id);
    if (obj) this.scene.remove(obj);
    this.castawayObjs.delete(id);
    this.sparkle.emit(new THREE.Vector3(cw.x, 1, cw.z), 40, '#bff7e6', 2, 4, 1, 4, 0.6);
    audio.discover(2);
    this.crewJoined(cw.crew);
    this.haptic(40);
    if (s.data.crew.length < s.stats.berths) {
      s.data.crew.push(def.id);
      this.ui.revealInfo(`Rescued · ${ROLE_INFO[def.role].label}`, def.name, `${def.pitch}<br><br><b>${ROLE_INFO[def.role].icon} ${ROLE_INFO[def.role].perk}</b>`, 'Welcome aboard');
      loadCrew().then(() => this.rebuildShip());
    } else {
      this.ui.revealInfo('Rescued', def.name, `${def.pitch}<br><br>No berth free aboard, so ${def.name.split(' ')[0]} will wait for you at Driftholm. Recruit them from the Crew board once you have room (a Container Cabin adds berths).`, 'Understood');
    }
    s.commit();
  }

  recruit(id: string) {
    const s = this.store;
    const def = CREW_MAP[id];
    if (!def || s.data.crew.includes(id)) return;
    if (s.data.crew.length >= s.stats.berths) {
      audio.deny();
      return this.ui.toast('No free berth. Commission a bigger boat or fit a Container Cabin.', { color: '#ff6b4a' });
    }
    if (def.cost && s.data.gold < def.cost) {
      audio.deny();
      return this.ui.toast(`${def.name} wants ${def.cost}g to sign on.`);
    }
    if (def.cost) s.data.gold -= def.cost;
    s.data.crew.push(id);
    audio.discover(2);
    this.crewJoined(id);
    this.ui.toast(`${def.name} joined your crew! ${ROLE_INFO[def.role].icon}`, { color: '#4f9a95', life: 3 });
    s.commit();
    loadCrew().then(() => this.rebuildShip());
  }

  dismiss(id: string) {
    const s = this.store;
    s.data.crew = s.data.crew.filter((c) => c !== id);
    if (!s.data.castaways.length || CREW_MAP[id].home !== 'castaway') void 0;
    s.commit();
    this.rebuildShip();
  }

  private dockAt(id: string) {
    const sett = SETTLEMENT_MAP[id];
    if (!sett) return;
    if (this.boat.speed > 3.2) return this.say('slow', 'Too fast! Ease off to come alongside.');
    this.boat.docked = true;
    this.boat.dockedAt = id;
    this.boat.speed = 0;
    this.engineOn = false;
    const s = this.store.data;
    if (!s.settlementsVisited.includes(id)) s.settlementsVisited.push(id);
    const flag = `docked_${id}`;
    if (!s.flags.includes(flag)) s.flags.push(flag);
    audio.anchor(true);
    audio.phrase('harbor');
    this.persistShip();
    this.store.commit();
    this.checkMilestones();
    setTimeout(() => this.crewBark('dock', { [id]: true }, { specificOnly: true, cool: 120 }), 900);
    setTimeout(() => this.ui.openPanel('harbor'), 250);
  }

  toggleEngine() {
    const st = this.store.stats;
    if (!st.engine) return this.ui.toast('No engine yet. Marlo can fit a Salvaged Outboard.', { life: 3 });
    if (!this.engineOn && this.store.data.fuel <= 0) {
      audio.deny();
      return this.ui.toast('Tank is empty.', { color: '#ff6b4a' });
    }
    this.engineOn = !this.engineOn;
    audio.engineStart(this.engineOn);
    this.haptic(20);
  }

  craft(id: string) {
    const r = RECIPE_MAP[id];
    const s = this.store;
    if (!r || !s.canAfford({ gold: 0, mats: r.needs })) return audio.deny();
    s.pay({ gold: 0, mats: r.needs });
    s.addTo(this.boat.docked ? s.data.vault : s.data.cargo, r.makes.id, r.makes.n);
    s.discover(r.makes.id, 'your workbench', r.makes.n);
    audio.hammer();
    this.ui.toast(`Crafted ${item(r.makes.id).name} ×${r.makes.n}`, { icon: r.makes.id, color: '#4f9a95' });
    s.commit();
  }

  /** Use fuel cans from cargo/vault to fill the tank. */
  refuel() {
    const s = this.store, st = s.stats;
    let used = 0;
    while (s.data.fuel < st.fuelCap - 2 && s.countOwned('fuel_can') > 0) {
      s.consume('fuel_can', 1);
      s.data.fuel = Math.min(st.fuelCap, s.data.fuel + 20);
      used++;
    }
    if (!used) return audio.deny();
    audio.splash();
    this.ui.toast(`Poured ${used} fuel can${used > 1 ? 's' : ''} into the tank`, { icon: 'fuel_can', color: '#f2b825' });
    s.commit();
  }

  buyFuel() {
    const s = this.store, st = s.stats;
    const sett = this.dockedSettlement();
    const price = (sett?.fuelPrice ?? 3) * (sett ? s.portDiscount(sett.id) : 1);
    const want = Math.floor(st.fuelCap - s.data.fuel);
    const n = Math.min(want, Math.floor(s.data.gold / price));
    if (n <= 0) return audio.deny();
    const paid = Math.ceil(n * price);
    s.data.gold -= paid;
    s.data.fuel += n;
    audio.coins(4);
    this.ui.toast(`Filled ${n} fuel for ${paid}g`, { color: '#f2b825' });
    s.commit();
  }

  /** Repair at a settlement for gold, or at sea with a patch kit. */
  repair(withKit: boolean) {
    const s = this.store, st = s.stats;
    const miss = st.hullMax - s.data.hull;
    if (miss < 1) return;
    if (withKit) {
      if (!s.consume('hull_patch', 1)) return audio.deny();
      s.data.hull = Math.min(st.hullMax, s.data.hull + 35);
    } else {
      const sett = this.dockedSettlement();
      const cost = Math.ceil(miss * 0.6 * (sett ? s.portDiscount(sett.id) : 1));
      if (s.data.gold < cost) return audio.deny();
      s.data.gold -= cost;
      s.data.hull = st.hullMax;
    }
    audio.hammer();
    s.commit();
  }

  private updateCaches(dt: number) {
    if (!this.started || this.mode !== 'sail') return;
    const b = this.boat;
    // pick over flotsam: ease through it slowly and the crew hooks out whatever is worth keeping
    for (const f of this.drowned.flotsam) {
      if (f.picked || Math.abs(f.x - b.x) > 12 || Math.abs(f.z - b.z) > 12) continue;
      if (Math.hypot(f.x - b.x, f.z - b.z) > this.ship.beam + 3) continue;
      if (b.speed > 4.5) {
        this.say('flotsam_fast', 'Too fast to hook anything. Ease off to pick through the flotsam.', 6);
        continue;
      }
      f.picked = true;
      const table: Record<string, [string, number][]> = {
        barrel_raft: [['crude_oil', 1], ['scrap_metal', 2], ['rope', 1]],
        net_tangle: [['rope', 2], ['plastic', 2], ['fish', 1]],
        hull_shard: [['driftwood', 2], ['iron_nails', 2], ['canvas', 1]],
        algae_mat: [['algae_mat', 3], ['sea_lettuce', 2]],
      };
      if (f.kind === 'net_tangle' && this.rng.next() < 0.4) table.net_tangle = [...table.net_tangle, ['sea_lettuce', 1]];
      const got: string[] = [];
      for (const [id, n] of table[f.kind] ?? table.hull_shard) {
        if (this.rng.next() < 0.35) continue;
        const k = 1 + Math.floor(this.rng.next() * n);
        const fit = this.gain(id, k, 'flotsam', { reveal: 'none' });
        if (fit) got.push(`+${fit} ${item(id).name}`);
      }
      audio.splash();
      audio.pickup();
      this.foam.emit(new THREE.Vector3(f.x, 0.3, f.z), 14, '#b8b2a0', 1.5, 2, 1, 4, 0.6);
      const what = f.kind === 'barrel_raft' ? 'a barrel raft' : f.kind === 'net_tangle' ? 'a ghost net' : f.kind === 'algae_mat' ? 'a drifting algae mat' : 'a capsized hull';
      const green = f.kind === 'algae_mat';
      if (green) this.sparkle.emit(new THREE.Vector3(f.x, 0.5, f.z), 18, LIVING_GREEN, 1.2, 2, 1.2, 2, 1);
      this.ui.toast(got.length ? `Picked over ${what}: ${got.join(', ')}` : 'Picked clean long ago. Nothing worth keeping.', { icon: got.length ? (green ? 'algae_mat' : 'rope') : undefined, color: green ? LIVING_GREEN : '#9a8a5a', life: 2.8 });
      this.store.commit();
      setTimeout(() => (f.picked = false), 240000); // the sea brings more
    }
    // pick up
    for (let i = this.caches.length - 1; i >= 0; i--) {
      const c = this.caches[i];
      const w = this.ocean.sample(c.x, c.z, this.t);
      c.obj.position.y = w.y - 0.15;
      c.obj.rotation.z = w.dx * 0.5;
      c.obj.rotation.x = w.dz * 0.5;
      const d = Math.hypot(c.x - b.x, c.z - b.z);
      if (d < this.ship.beam + 3.2) {
        this.scene.remove(c.obj);
        this.caches.splice(i, 1);
        this.salvage.openCache(c.region as 'shallows');
      } else if (d > 420) {
        this.scene.remove(c.obj);
        this.caches.splice(i, 1);
      }
    }
    // spawn ahead and around, in open water
    this.cacheTimer -= dt;
    const max = 3 + (this.store.hasRole('lookout') ? 2 : 0) + (this.store.stats.radar ? 1 : 0);
    if (this.cacheTimer <= 0 && this.caches.length < max) {
      this.cacheTimer = 6;
      for (let tries = 0; tries < 8; tries++) {
        const a = b.heading + this.rng.range(-1.3, 1.3);
        const d = this.rng.range(90, 260);
        const x = b.x + Math.sin(a) * d, z = b.z + Math.cos(a) * d;
        if (heightAt(x, z) > -3 || Math.hypot(x, z) > WORLD.size / 2 - 80) continue;
        if (this.drowned.colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 6)) continue;
        const obj = model('tb_debris_kit', 'cache_crate', { shadows: true });
        if (!obj) return;
        obj.position.set(x, 0, z);
        obj.rotation.y = this.rng.range(0, 6);
        this.scene.add(obj);
        const region = this.atmo.wallAt(x, z) > 0.5 ? 'stormwall' : swellFactor(x, z) > 0.5 ? 'emerald' : 'shallows';
        this.caches.push({ obj, x, z, region });
        break;
      }
    }
  }

  chartExtras() {
    const d = this.store.data;
    return {
      flags: d.flags,
      sites: SALVAGE_SITES.map((s) => ({ x: s.x, z: s.z, name: s.name, ready: this.salvage.ready(s), region: s.region })),
      settlements: SETTLEMENTS.map((s) => ({ x: s.x, z: s.z, name: s.name, visited: d.settlementsVisited.includes(s.id) })),
      castaways: CASTAWAYS.filter((c) => !d.castaways.includes(c.id) && (this.store.hasRole('navigator') || this.store.stats.radar > 0)).map((c) => ({ x: c.x, z: c.z })),
      structures: STRUCTURES.map((s) => ({ x: s.x, z: s.z, kind: s.kind })),
      raiders: RAIDER_ZONES.map((r) => ({ x: r.x, z: r.z, r: r.r, name: r.name })),
      pois: POIS,
      pins: d.pinned.map((id) => RUMOUR_MAP[id]).filter(Boolean).map((r) => ({ x: r.x, z: r.z, name: r.label })),
    };
  }

  cacheList() {
    return this.caches.map((c) => ({ x: c.x, z: c.z }));
  }

  private updateGoals(dt: number) {
    this.goalTimer -= dt;
    if (this.goalTimer > 0) return;
    this.goalTimer = 0.5;
    const s = this.store;
    if (s.data.quest !== 'free') return;
    const g = GOALS[s.data.goal];
    if (!g) return;
    const d = s.data;
    const done: Record<string, () => boolean> = {
      g_salvage: () => d.firstHauls.includes('sv_stump') || d.hauls > 0,
      g_engine: () => s.has('engine_outboard'),
      g_crew: () => d.crew.length > 0,
      g_trimaran: () => d.vesselsOwned.includes('sloop'),
      g_helios: () => d.flags.includes('docked_helios'),
      g_meridian: () => d.firstHauls.some((h) => h.startsWith('sv_meridian')),
      g_raiders: () => d.raidersRepelled > 0,
      g_brig: () => d.vesselsOwned.includes('brig') || d.vesselsOwned.includes('ironwake'),
      g_ironwake: () => d.vesselsOwned.includes('ironwake'),
      g_spire: () => d.flags.includes('reached_spire'),
    };
    if (done[g.id]?.()) {
      const reward = s.completeGoal(g.id);
      const next = GOALS[s.data.goal];
      audio.discover(3);
      this.ui.revealInfo('Captain’s Log', `✔ ${g.text}`, `${reward ? `<b>+${reward} gold.</b><br><br>` : ''}Next: <b>${next.text}</b><br>${next.hint}`, 'Onward');
      s.commit();
    }
  }

  private updateHUD() {
    const s = this.store.data, st = this.store.stats;
    const lbl = this.atmo.label();
    this.ui.setStatus({
      fuel: s.fuel, fuelCap: st.fuelCap, hull: s.hull, hullMax: st.hullMax,
      clock: lbl.clock, phase: lbl.phase, weather: lbl.weather, engine: st.engine > 0, engineOn: this.engineOn, sailing: this.mode === 'sail',
    });
    const px = this.mode === 'sail' ? this.boat.x : this.foot.x, pz = this.mode === 'sail' ? this.boat.z : this.foot.z;
    const range = st.radar || 160;
    const blips: { x: number; z: number; kind: string }[] = [];
    for (const site of SALVAGE_SITES) if (Math.hypot(site.x - px, site.z - pz) < range * 1.4) blips.push({ x: site.x - px, z: site.z - pz, kind: this.salvage.ready(site) ? 'site' : 'site_done' });
    for (const st2 of SETTLEMENTS) if (Math.hypot(st2.x - px, st2.z - pz) < range * 1.4) blips.push({ x: st2.x - px, z: st2.z - pz, kind: 'town' });
    // anything still growing shows up green: the one blip every captain turns toward
    for (const f of this.finds) if (f.def.kind === 'plant' && Math.hypot(f.x - px, f.z - pz) < range * 1.2) blips.push({ x: f.x - px, z: f.z - pz, kind: 'plant' });
    if (st.radar || this.store.hasRole('lookout')) {
      for (const c of this.caches) blips.push({ x: c.x - px, z: c.z - pz, kind: 'cache' });
      for (const r of this.raiders.positions()) blips.push({ x: r.x - px, z: r.z - pz, kind: 'raider' });
    }
    for (const cw of CASTAWAYS) if (!s.castaways.includes(cw.id) && Math.hypot(cw.x - px, cw.z - pz) < range * 1.4) blips.push({ x: cw.x - px, z: cw.z - pz, kind: 'castaway' });
    this.ui.setRadar(blips, range, this.mode === 'sail' ? this.boat.heading : this.foot.heading, this.camYaw, !!st.radar);
    this.ui.setCritical(this.mode === 'sail' && s.hull < st.hullMax * 0.25);
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
      if (n) this.ui.toast(`Unloaded ${n} item${n > 1 ? 's' : ''} into your harbor vault`, { color: '#4f9a95', life: 3 });
      audio.phrase('harbor');
      this.dockhandHail();
      setTimeout(() => this.crewBark('dock', { driftholm: true }, { specificOnly: true, cool: 120 }), 1400);
      setTimeout(() => this.voyageStarterOffer(), 700);
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
      this.foot.vel = this.foot.speed = 0;
      this.camYaw = this.foot.heading;
      this.digsThisVisit = 0;
      this.spawnPickups(isl);
      audio.splash();
      this.store.advanceQuest('ashore');
      this.store.commit();
      if (isl.id === 'harbor') this.say('harborwalk', 'Driftholm: dock at the raft pier to visit the traders.', 5);
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
    if (f.def.requiresUpgrade && !s.has(f.def.requiresUpgrade)) {
      audio.clunk();
      this.ui.revealInfo('Too dark', f.isl.name, f.def.requiresText ?? 'You can’t see a thing.', 'Come back with a light');
      return;
    }
    if (f.def.requiresItem && s.countOwned(f.def.requiresItem) === 0) {
      audio.clunk();
      this.ui.revealInfo('Locked', f.def.label.replace(/^\w+ the /, ''), f.def.requiresText ?? 'It won’t budge.', 'Hmm…');
      return;
    }
    s.data.findsOpened.push(f.def.id);
    this.captain.dig();
    const where = f.isl.name;
    const pos = new THREE.Vector3(f.x, heightAt(f.x, f.z) + 0.8, f.z);
    if (f.def.kind === 'plant') {
      // lift it gently: a burst of green motes, the halo collapses, the plant comes aboard
      this.sparkle.emit(pos, 60, LIVING_GREEN, 2.4, 4.2, 1.6, 2.5, 0.8);
      this.sparkle.emit(pos, 20, '#f6e7a0', 1.5, 3, 1.2, 2, 0.5);
      audio.discover(4);
      this.scene.remove(f.obj);
      for (const l of f.def.loot) this.gain(l.id, l.n, f.isl.name, { force: true, reveal: 'none' });
      this.ui.revealLiving(f.def.loot, f.isl.name);
      s.commit();
      this.checkMilestones();
      this.haptic(40);
      return;
    }
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
      if (mapId === 'turtle_map' && s.data.quest === 'dig_x') this.voyageAfterDig();
      s.advanceQuest('dig_x');
      s.commit();
      this.checkMilestones();
    }, 1900);
  }

  // ───────── update ─────────
  private update(dt: number) {
    this.t += dt;
    swayUniforms.uTime.value = this.t;
    // the camera's yaw settles first: steering is camera-relative, so the boat and the camera must agree on this
    // frame's yaw (see followYaw)
    this.followYaw(dt);
    if (this.mode === 'sail') this.updateSail(dt);
    else this.updateFoot(dt);
    this.updateCamera(dt);
    const focus = this.camera.position;
    const pxz = this.mode === 'sail' ? this.boat : this.foot;
    this.atmo.update(dt * (this.ui.panelOpen ? 0.25 : 1), pxz.x, pxz.z);
    this.applyAtmosphere();
    this.ocean.update(this.t, dt, focus);
    this.sky.update(this.t, dt, focus);
    this.env.update(this.t, dt);
    this.drowned.focus.copy(focus);
    this.drowned.update(this.t, dt, this.atmo.night);
    // wind you can see: faint streaks drifting downwind round the boat (fainter at night, stronger in a storm)
    this.windStreaks.update(this.t, pxz.x, pxz.z, WORLD.wind.dir, this.started ? (1 - this.atmo.night * 0.6) * (1 + this.atmo.storm * 0.8) : 0);
    this.salvage.update(dt);
    this.raiders.update(dt);
    for (const c of this.ship.crew) c.mixer.update(dt);
    for (const [id, o] of this.castawayObjs) {
      const cw = CASTAWAYS.find((c) => c.id === id)!;
      const w = this.ocean.sample(cw.x, cw.z, this.t);
      o.position.y = w.y - 0.1;
      o.rotation.z = w.dx * 0.4;
    }
    this.updateCaches(dt);
    this.foam.update(dt);
    this.flip.update(dt, this.camera, this.mode === 'sail' && !this.boat.docked ? this.exhaust : null, this.atmo.storm);
    this.wakeFoam.update(dt);
    this.sparkle.update(dt);
    this.dirt.update(dt);
    this.anims = this.anims.filter((a) => a(dt));
    for (const c of this.crabs) {
      c.life -= dt;
      c.obj.position.x += c.vx * dt;
      c.obj.position.z += c.vz * dt;
      c.obj.position.y = heightAt(c.obj.position.x, c.obj.position.z) + Math.abs(Math.sin(this.t * 20)) * 0.05;
      c.obj.rotation.y = Math.atan2(c.vx, c.vz) + Math.PI / 2;
      const legs = c.obj.userData.legs as THREE.Object3D | undefined;
      if (legs) legs.rotation.x = Math.sin(this.t * 28) * 0.22; // scuttle
      if (c.life <= 0) this.scene.remove(c.obj);
    }
    this.crabs = this.crabs.filter((c) => c.life > 0);
    for (const p of this.pickups) {
      p.obj.children[1].scale.setScalar(0.6 + Math.abs(Math.sin(this.t * 3 + p.x)) * 0.6);
      p.obj.rotation.y += dt * 0.5;
    }
    for (const f of this.finds) {
      if (f.obj.userData.needs && !f.obj.visible && this.store.has(f.obj.userData.needs)) f.obj.visible = true;
      const sp = f.obj.children.find((c) => c.userData.sparkle);
      if (sp) sp.scale.setScalar(1 + Math.abs(Math.sin(this.t * 2.5)) * 1.2);
      if (f.obj.userData.living) {
        const vx = this.mode === 'sail' ? this.boat.x : this.foot.x, vz = this.mode === 'sail' ? this.boat.z : this.foot.z;
        f.obj.visible = Math.abs(f.x - vx) < 380 && Math.abs(f.z - vz) < 380; // past this the haze has it anyway
        if (!f.obj.visible) continue;
        // a slow green heartbeat; the light shaft fades as you walk up so it never hides the plant
        const beat = 0.5 + 0.5 * Math.sin(this.t * 2.2 + f.x);
        for (const c of f.obj.children) {
          if (c.userData.halo) {
            c.scale.setScalar(1 + beat * 0.35);
            ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.35 + beat * 0.35;
          } else if (c.userData.shaft) {
            const px = this.mode === 'sail' ? this.boat.x : this.foot.x, pz = this.mode === 'sail' ? this.boat.z : this.foot.z;
            const near = clamp((Math.hypot(px - f.x, pz - f.z) - 4) / 26, 0, 1);
            ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (0.12 + beat * 0.2) * near;
          }
        }
        if (this.rng.next() < dt * 1.5) this.sparkle.emit(new THREE.Vector3(f.x, heightAt(f.x, f.z) + 0.4, f.z), 1, LIVING_GREEN, 0.3, 1.2, 1.6, -0.2, 1.4);
      }
    }
    // sun & shadows follow the action
    const fp = this.mode === 'sail' ? new THREE.Vector3(this.boat.x, 0, this.boat.z) : new THREE.Vector3(this.foot.x, 0, this.foot.z);
    this.sunLight.position.copy(fp).addScaledVector(this.atmo.sunDir, 100);
    this.sunLight.target.position.copy(fp);
    this.updateShipFill();
    if (this.started) {
      this.updateIslands(dt);
      this.updateQuest();
      this.updateGoals(dt);
      this.updateGuidance();
      this.updateHUD();
      this.saveTimer += dt;
      if (this.saveTimer > 8) {
        this.saveTimer = 0;
        this.persistShip();
        this.store.data.timeOfDay = this.atmo.time;
        this.store.saveNow();
      }
    }
  }

  /** Sail speed for a heading: unchanged, see pointOfSail.windEff. */
  private windEff(heading: number) {
    return windEff(heading, WORLD.wind.dir);
  }

  /**
   * Upwind sailing, Option A: pointing inside the no-go cone luffs the sails (visual + a flogging sound), and after a
   * few seconds the crew (or the sail itself, with no crew aboard) says so; bearing away gets a word that she's drawing
   * again. Reads the boat; changes nothing the physics uses, and uses no Math.random (the bot's seeded run is unchanged).
   */
  private updateLuff(dt: number, throttle: number, motoring: boolean) {
    const b = this.boat;
    const free = !b.docked && !b.anchored && !b.busy;
    const off = offWind(b.heading, WORLD.wind.dir);
    const target = free ? luffAmount(off) : 0;
    this.luff += (target - this.luff) * (1 - Math.exp(-dt * 5));
    const underSail = this.started && free && throttle > 0.05 && !motoring && !this.ui.panelOpen;
    if (underSail && target > 0.5) this.luffTime += dt;
    else this.luffTime = 0;
    if (this.luffTime > LUFF_WARN_AFTER && (this.msgCooldown.luff ?? 0) <= this.t) {
      const line = luffLine(this.store.data.crew, bearAwaySide(b.heading, WORLD.wind.dir), this.luffTips === 0);
      this.say('luff', line.text, LUFF_WARN_COOLDOWN, { color: line.color, life: this.luffTips === 0 ? 6 : 4 });
      this.luffTips++;
      this.luffWarned = true;
    }
    if (this.luffWarned && underSail && off > NO_GO + 0.17) {
      const line = drawingLine(this.store.data.crew);
      this.say('luff_ok', line.text, 12, { color: line.color, life: 3 });
      this.luffWarned = false;
    }
    if (!free) this.luffWarned = false;
    // the canvas flogs: short slaps while the sail luffs, quicker the harder it shakes (jitter from game time, not RNG)
    this.flapTimer -= dt;
    if (this.started && this.luff > 0.35 && this.flapTimer <= 0) {
      audio.sailFlap(this.luff);
      this.flapTimer = 0.42 - this.luff * 0.16 + (Math.sin(this.t * 7.3) * 0.5 + 0.5) * 0.18;
    }
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
    if (b.docked && b.dockedAt === 'driftholm') this.dockPose();
    if (b.docked || b.busy) throttle = 0;
    const diff = angleDiff(b.heading, target);
    const turnRate = st.turn * (0.45 + 0.55 * Math.min(1, b.speed / (Math.max(st.speed, st.engine) * 0.5)));
    b.heading += clamp(diff, -turnRate * dt, turnRate * dt);
    const eff = this.windEff(b.heading);
    const gust = 1 + this.atmo.storm * 0.25;
    let targetSpeed = throttle * st.speed * eff * gust * (Math.abs(diff) > 1.4 ? 0.55 : 1);
    // engine: wind-independent, burns fuel
    const s = this.store.data;
    const motoring = this.engineOn && st.engine > 0 && s.fuel > 0 && throttle > 0.05 && !b.anchored;
    if (motoring) {
      targetSpeed = Math.max(targetSpeed, throttle * st.engine * (Math.abs(diff) > 1.4 ? 0.7 : 1));
      s.fuel = Math.max(0, s.fuel - st.fuelUse * throttle * dt);
      if (s.fuel <= 0) {
        this.engineOn = false;
        this.say('nofuel', 'Out of fuel! The engine sputters out. Salvage fuel cans, refine crude, or trade for fuel.', 6, { color: '#ff6b4a' });
        audio.deny();
      }
    }
    if (this.engineOn && st.engine <= 0) this.engineOn = false;
    audio.engine(motoring ? 0.35 + throttle * 0.65 : 0, st.engine > 12);
    this.updateLuff(dt, throttle, motoring);
    // power upgrades trickle fuel back into the tank
    if (st.solar && s.fuel < st.fuelCap) s.fuel = Math.min(st.fuelCap, s.fuel + (st.solar / 60) * dt * (1 - this.atmo.night * 0.6 + this.atmo.storm * 0.5));
    // the Stormwall's gale: the deeper in, the slower (not in the Spire's lee)
    if (st.crossStorm && this.atmo.wall > 0) targetSpeed *= 1 - (1 - STORMWALL.speedMul) * this.atmo.wall * (1 - stormwallLee(b.x, b.z));
    const k = targetSpeed > b.speed ? 0.7 : 0.9;
    b.speed += (targetSpeed - b.speed) * (1 - Math.exp(-dt * k));
    if (b.anchored || b.busy) b.speed *= Math.exp(-dt * 4);
    this.updateHull(dt);

    const fx = Math.sin(b.heading), fz = Math.cos(b.heading);
    const nx = b.x + fx * b.speed * dt;
    const nz = b.z + fz * b.speed * dt;
    const draft = this.store.data.vessel === 'sloop' || this.store.data.vessel === 'brig' ? 1.2 : 0.65;
    const blocked = (x: number, z: number): string | null => {
      const h = heightAt(x, z);
      if (isReef(x, z) && h < 0.2) {
        if (!st.reef) return 'reef';
      } else if (h > -draft) return 'land';
      if (!st.crossSwell && swellFactor(x, z) > 0.55) return 'swell';
      if (!st.crossStorm && this.atmo.wallAt(x, z) > 0.55) return 'wall';
      if (Math.hypot(x, z) > WORLD.size / 2 - 40) return 'edge';
      for (const r of this.env.boatRects) if (x > r.x0 - 0.8 && x < r.x1 + 0.8 && z > r.z0 - 0.8 && z < r.z1 + 0.8) return 'pier';
      const br = this.ship.beam * 0.8;
      for (const c of this.drowned.colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + br) return 'wreck';
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
            this.say('swell', 'The open swell is far too rough for this boat. The Scrap Trimaran could cross it.', 6);
            audio.splash(true);
          } else if (why === 'edge') {
            this.say('edge', 'Uncharted waters. Wren hasn\u2019t drawn this part of the world yet.', 6);
          } else if (why === 'land') {
            this.say('land', 'Aground! Steer back toward deeper water.', 4);
            audio.creak();
          } else if (why === 'wall') {
            this.say('wall', 'The Stormwall throws you back. Only the Ironwake Expedition Cat can survive inside it.', 6, { color: '#ff6b4a' });
            if (this.store.hasRole('mechanic')) pack.say('juno_hull', 60);
            audio.splash(true);
          } else if (why === 'wreck') {
            if (b.speed > 3) {
              this.damage(b.speed * 1.4, 'Crunch! You hit drowned steel.');
              audio.clunk();
              this.foam.emit(new THREE.Vector3(nx, 0.4, nz), 20, '#ffffff', 2, 3, 1, 6, 0.8);
            }
          }
          this.haptic(25);
        }
        b.speed *= why === 'swell' || why === 'wall' ? 0.2 : 0.4;
        if (why === 'swell' || why === 'wall') {
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
    // pitch and roll ease toward the wave slope (and the heel into a turn) at a rate in time, not per frame: the
    // old fixed 10 %/frame stepped unevenly on uneven frames and ran twice as stiff on 120 Hz screens. 6.32/s is
    // exactly the old 10 %/frame at 60 fps.
    const ease = 1 - Math.exp(-dt * 6.32);
    this.shipRoot.rotation.x = lerp(this.shipRoot.rotation.x, -fwdSlope * (8 / L) * 0.6, ease);
    this.shipRoot.rotation.z = lerp(this.shipRoot.rotation.z, sideSlope * (8 / L) * 0.6 + clamp(diff, -0.5, 0.5) * 0.12 * Math.min(1, b.speed / 4), ease);

    // sails swing with the wind
    const rel = angleDiff(b.heading, WORLD.wind.dir);
    const swing = clamp(-Math.sin(rel) * 0.9, -1.0, 1.0);
    const sailEase = 1 - Math.exp(-dt * 3.08); // the old 5 %/frame at 60 fps, in time
    // a luffing sail flogs: it swings from side to side round the mast, visible from the stern camera (from #47)
    const flog = this.luff * Math.sin(this.t * 3.4) * 0.32;
    for (const sail of this.ship.sails) sail.rotation.y = lerp(sail.rotation.y, Math.PI / 2 + swing + flog, sailEase);
    animateShip(this.ship, this.t, b.anchored || b.docked ? 0.15 : clamp(b.speed / st.speed, 0, 1) * eff, this.luff, rel);

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

    const wl = this.ship.waterline;
    this.ocean.setHull(b.x, b.z, b.heading, wl.halfLen, wl.halfBeam, wl.twin, clamp(b.speed / 9, 0, 1));

    // wake trail in the water + foam spray
    if (b.speed > 1.2) {
      const stern = this.ship.wake.clone();
      this.shipRoot.localToWorld(stern);
      this.ocean.addWake(stern.x, stern.z, Math.min(1, b.speed / 9), dt);
    }
    // Spray and wake puffs are camera-facing sprites drawn at their centre's depth, so a puff that starts on the hull
    // (or that the hull sails into) paints over it. Every puff starts clear of the hull by more than half a sprite and
    // moves away from it: stern foam spawns behind the transom and drifts aft, bow spray leaves each side of the bow
    // carrying the boat's speed so the hull doesn't overtake it.
    const clear = WAKE_PUFF * 0.6;
    const vel = new THREE.Vector3(fx * b.speed, 0, fz * b.speed);
    if (motoring) this.exhaust = this.shipRoot.localToWorld(this.ship.wake.clone().add(new THREE.Vector3(0, 0.6, -0.5 - clear)));
    else this.exhaust = null;
    if (motoring && Math.random() < 0.5) {
      const ex = this.ship.wake.clone().add(new THREE.Vector3(0, 0.4, -0.35 - clear));
      this.shipRoot.localToWorld(ex);
      this.wakeFoam.emitVel(ex, 1, '#ffffff', new THREE.Vector3(-fx * 0.8, 0.9, -fz * 0.8), 0.4, 0.45, 2, 0.2);
    }
    // wake foam
    if (b.speed > 1) {
      const stern = this.ship.wake.clone().add(new THREE.Vector3(0, 0, -clear - 0.35)); // past the rudder blade too
      this.shipRoot.localToWorld(stern);
      if (Math.random() < b.speed * 0.25)
        this.wakeFoam.emitVel(new THREE.Vector3(stern.x, w.y + 0.1, stern.z), 1, '#ffffff', new THREE.Vector3(-fx * 0.6, 0.6, -fz * 0.6), 0.35, 1.0, 1, 0.4);
      if (Math.random() < b.speed * 0.15) {
        // one side of the bow at a time, thrown outward; on the Ironwake, the outer side of a hull
        const side = Math.random() < 0.5 ? -1 : 1;
        const halfW = this.store.data.vessel === 'ironwake' ? 1.15 : this.ship.beam;
        const x = (this.ship.beam - halfW + halfW * 0.45 + clear) * side;
        const bow = new THREE.Vector3(x, 0, L * 0.4);
        this.shipRoot.localToWorld(bow);
        const out = new THREE.Vector3(side, 0, 0).applyQuaternion(this.shipRoot.quaternion).setY(0).normalize(); // outward, world
        this.wakeFoam.emitVel(new THREE.Vector3(bow.x, w.y + 0.2, bow.z), 1, '#ffffff', vel.clone().multiplyScalar(0.9).addScaledVector(out, 1.4).setY(1), 0.25, 0.6, 4, 0.2);
      }
      // bow slamming into a swell at speed: a flipbook sheet of spray thrown off one side, well clear of the hull
      const swell = Math.max(swellFactor(b.x, b.z), this.atmo.storm);
      if (this.flip.quality === 'high' && b.speed > 5 && swell > 0.3 && Math.random() < dt * swell * 1.2) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const p = this.shipRoot.localToWorld(new THREE.Vector3((this.ship.beam + 1.6) * side, 0, L * 0.38));
        this.flip.burst('splash', p.setY(w.y + 0.9), 2.4, 2.4, 0.75);
      }
    }

    this.proxTimer -= dt;
    if (this.proxTimer <= 0) {
      this.proxTimer = 0.5;
      let bell = Infinity, wreck = Infinity;
      for (const p of this.drowned.bells) bell = Math.min(bell, Math.hypot(p.x - b.x, p.z - b.z));
      for (const c of this.drowned.colliders) wreck = Math.min(wreck, Math.hypot(c.x - b.x, c.z - b.z) - c.r);
      audio.proximity(bell, wreck);
    }
    audio.ambience(dt, b.speed, false, Math.max(swellFactor(b.x, b.z), this.atmo.storm), this.currentRegion, this.atmo.storm);
    pack.music(this.currentRegion, this.raiders.danger);
    this.ui.setSpeed(this.started ? b.speed * 1.4 : null, -angleDiff(this.camYaw, WORLD.wind.dir), eff, motoring, {
      heading: -angleDiff(this.camYaw, b.heading),
      point: pointOfSail(offWind(b.heading, WORLD.wind.dir)),
      luff: this.luff,
    });
    this.ui.setDigMeter(null);

    // contextual actions
    if (!this.started) return this.ui.setActions([]);
    const acts: Action[] = [];
    const q = this.store.data.quest;
    if (b.docked) {
      const sett = SETTLEMENT_MAP[b.dockedAt];
      acts.push({ id: 'harbor', label: `⚓ ${sett && sett.id !== 'driftholm' ? sett.name.toUpperCase() : 'HARBOR'}`, glow: ['upgrade', 'return_harbor'].includes(q) });
    } else {
      const pierD = Math.hypot(b.x - this.env.pierTip.x, b.z - this.env.pierTip.z);
      if (pierD < 18) acts.push({ id: 'dock', label: '⚓ DOCK', glow: true });
      for (const st2 of SETTLEMENTS) {
        if (st2.id === 'driftholm') continue;
        if (Math.hypot(b.x - st2.x, b.z - st2.z) < st2.dockR + this.ship.beam) acts.push({ id: `dock:${st2.id}`, label: `⚓ DOCK AT ${st2.name.toUpperCase()}`, glow: true });
      }
      const site = this.salvage.siteInReach();
      if (site && !b.anchored) {
        const ready = this.salvage.ready(site);
        const heavyBlocked = (site.heavy && !st.salvage) || (!!site.requiresFlag && !this.store.data.flags.includes(site.requiresFlag));
        acts.push({ id: 'salvage', label: `\u{1FA9D} SALVAGE ${site.name.toUpperCase()}`, glow: ready && !heavyBlocked && b.speed < 3, disabled: !ready || heavyBlocked || b.speed > 3 });
      }
      for (const cw of CASTAWAYS) {
        if (this.store.data.castaways.includes(cw.id)) continue;
        if (Math.hypot(b.x - cw.x, b.z - cw.z) < 12 + this.ship.beam) acts.push({ id: `rescue:${cw.id}`, label: '\u{1F6DF} RESCUE', glow: true, disabled: b.speed > 3 });
      }
      for (const m of SEA_MARKS) {
        if (this.store.data.flags.includes(`found_${m.id}`)) continue;
        if (Math.hypot(b.x - m.x, b.z - m.z) < 24 + this.ship.beam) acts.push({ id: `mark:${m.id}`, label: '\u{1F50D} INVESTIGATE', glow: true, disabled: b.speed > 3 });
      }
      this.shoreTimer -= dt;
      if (this.shoreTimer <= 0) {
        this.shoreTimer = 0.4;
        this.shoreCache = findShore(b.x, b.z, 30);
      }
      const depth = -heightAt(b.x, b.z);
      if (b.anchored) {
        if (this.shoreCache) acts.push({ id: 'ashore', label: '\u{1F3DD} GO ASHORE', glow: q === 'ashore' && b.anchored });
        acts.push({ id: 'raise', label: 'RAISE ANCHOR' });
      } else if (pierD >= 18 && (this.shoreCache || depth < 10)) {
        acts.push({ id: 'anchor', label: '⚓ ANCHOR', glow: q === 'ashore' && b.speed < 3.2, disabled: b.speed > 3.2 || depth > 10 });
      }
    }
    this.ui.setActions(acts);
  }

  /** A heel strike from the gait: the sound of the ground underfoot, and a splash when wading in the shallows. */
  private footfall(side: 1 | -1, run: number) {
    if (this.mode !== 'foot') return;
    const f = this.foot;
    // the striking foot, a little ahead of the body and to its side
    const fx = f.x + Math.sin(f.heading) * 0.25 + Math.cos(f.heading) * 0.09 * side;
    const fz = f.z + Math.cos(f.heading) * 0.25 - Math.sin(f.heading) * 0.09 * side;
    const h = heightAt(fx, fz);
    const wet = h < 0.12;
    audio.footstep(wet ? 'wet' : 'sand', run);
    if (wet) this.foam.emit(new THREE.Vector3(fx, Math.max(h, 0) + 0.05, fz), 3 + Math.round(run * 5), '#e8efe9', 1 + run * 1.5, 1.6 + run, 0.5, 7, 0.25);
  }

  private updateFoot(dt: number) {
    const f = this.foot;
    const j = this.ui.joy;
    const mag = Math.min(1, Math.hypot(j.x, j.y));
    // Momentum: the stick sets a target speed and direction; the captain accelerates, decelerates and turns at
    // human rates and always moves the way they face (no sideways gliding while the body catches up).
    let target = 0;
    if (mag > 0.15 && this.digBusy <= 0 && !this.ui.panelOpen) {
      const F = { x: Math.sin(this.camYaw), z: Math.cos(this.camYaw) };
      const R = { x: -Math.cos(this.camYaw), z: Math.sin(this.camYaw) };
      const wx = F.x * j.y + R.x * j.x;
      const wz = F.z * j.y + R.z * j.x;
      const dir = Math.atan2(wx, wz);
      const m = (mag - 0.15) / 0.85;
      target = FOOT_MIN + (FOOT_MAX - FOOT_MIN) * Math.pow(m, 1.5);
      const off = angleDiff(f.heading, dir);
      // a hard reversal at speed: plant and pivot rather than spinning on the spot
      if (Math.abs(off) > 2.2 && f.vel > 2) target *= 0.25;
      const maxTurn = (15 - 7 * Math.min(1, f.vel / FOOT_MAX)) * dt;
      f.heading += clamp(off, -maxTurn, maxTurn);
    }
    f.vel += clamp(target - f.vel, -FOOT_DECEL * dt, FOOT_ACCEL * dt);
    if (f.vel < 0.02 && target === 0) f.vel = 0;
    const ox = f.x, oz = f.z;
    if (f.vel > 0) {
      let nx = f.x + Math.sin(f.heading) * f.vel * dt;
      let nz = f.z + Math.cos(f.heading) * f.vel * dt;
      // stay out of deep water
      if (heightAt(nx, nz) < -0.7) {
        if (heightAt(nx, f.z) >= -0.7) nz = f.z;
        else if (heightAt(f.x, nz) >= -0.7) nx = f.x;
        else {
          nx = f.x;
          nz = f.z;
          if (target > 0) this.say('water', 'Too deep to wade. Head back to your boat to sail.', 4);
        }
      }
      // rocks, walls and huts push back
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
    }
    // the legs animate at the speed actually covered, so pushing against a rock doesn't run on the spot
    const covered = dt > 0 ? Math.hypot(f.x - ox, f.z - oz) / dt : 0;
    f.vel = Math.min(f.vel, covered + FOOT_ACCEL * dt * 2);
    f.speed += (covered - f.speed) * (1 - Math.exp(-dt * 20));
    const moving = f.speed > 0.15;
    this.digBusy -= dt;
    const h = heightAt(f.x, f.z);
    this.captain.root.position.set(f.x, Math.max(h, -0.75) - 0.02, f.z);
    this.captain.root.rotation.y = f.heading;
    if (this.captain.pose !== 'dig' && this.captain.pose !== 'cheer') this.captain.pose = moving ? 'walk' : 'idle';
    if (moving && this.captain.pose === 'cheer') this.captain.pose = 'walk';
    this.captain.update(dt, f.speed);

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
    pack.music(this.currentRegion, 0);
    this.ui.setSpeed(null, 0, 1);

    const acts: Action[] = [];
    const find = this.nearestFind();
    const q = this.store.data.quest;
    if (find) acts.push({ id: 'search', label: find.def.kind === 'plant' ? '\u{1F331} TAKE IT ABOARD' : find.def.requiresUpgrade ? (this.store.has(find.def.requiresUpgrade) ? '\u{1F526} LIGHT IT UP' : '\u{1F526} LOOK INSIDE') : `\u{1F50D} ${find.def.kind === 'bottle' ? 'OPEN BOTTLE' : 'SEARCH'}`, glow: true });
    acts.push({ id: 'dig', label: '⛏ DIG', glow: q === 'dig_x' && best < 2.6 });
    const boatD = Math.hypot(f.landX - f.x, f.landZ - f.z);
    if (boatD < 7) acts.push({ id: 'board', label: '⛵ BOARD', glow: q === 'return_harbor' });
    this.ui.setActions(acts);
  }

  /**
   * The follow camera swings round behind the boat (or the captain on foot). This runs at the START of the frame,
   * before steering: the stick is read relative to camYaw, and the heading is then rate-limited toward that target.
   * When the yaw was updated after steering (in updateCamera), each frame's heading moved by the camera's swing of
   * the PREVIOUS frame while the clock moved by this frame's dt, so on uneven frame times (every phone) a turning
   * boat stuttered against a smoothly turning camera. Same follow rates as before.
   */
  private followYaw(dt: number) {
    if (!this.started || this.showcase || this.t - this.lastDrag <= 1.5) return;
    if (this.mode === 'sail') {
      if (this.boat.speed > 0.8) this.camYaw += angleDiff(this.camYaw, this.boat.heading) * Math.min(1, dt * 0.9);
    } else if (this.foot.speed > 0.5) {
      this.camYaw += angleDiff(this.camYaw, this.foot.heading) * Math.min(1, dt * 0.6);
    }
  }

  private updateCamera(dt: number) {
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const target = new THREE.Vector3();
    let dist: number, pitch: number;
    if (!this.started) {
      // title orbit: opens on Driftholm (the scrap atoll behind the pier), then drifts round to the open sea
      if (!this.titleYawSet) {
        this.titleYawSet = true;
        this.camYaw = 0.25;
      }
      this.camYaw += dt * 0.05;
      target.set(this.boat.x, 4, this.boat.z + 6);
      dist = 30;
      pitch = 0.26;
    } else if (this.showcase) {
      this.camYaw += dt * 0.22;
      target.set(this.boat.x, this.store.data.vessel === 'sloop' || this.store.data.vessel === 'brig' ? 3 : 1.2, this.boat.z);
      dist = this.ship.length * 2.1 + 4;
      pitch = 0.36;
      // drop the look-at point so the ship sits above the half-height sheet
      target.y -= dist * 0.3;
    } else if (this.mode === 'sail') {
      target.set(this.boat.x, 1.5, this.boat.z);
      dist = this.camDist * this.zoom;
      pitch = this.camPitch;
    } else {
      target.set(this.foot.x, heightAt(this.foot.x, this.foot.z) + 1.4, this.foot.z);
      dist = 10 * this.zoom;
      pitch = Math.max(0.35, this.camPitch);
    }
    const cx = target.x - Math.sin(this.camYaw) * Math.cos(pitch) * dist;
    const cz = target.z - Math.cos(this.camYaw) * Math.cos(pitch) * dist;
    let cy = target.y + Math.sin(pitch) * dist;
    cy = Math.max(cy, heightAt(cx, cz) + 1.5, 1.2);
    if (this.started && !this.showcase && this.mode === 'foot') {
      // keep the captain in sight: if a dune or hillside rises into the line from the camera to the captain,
      // lift the camera just enough to see over it
      for (let i = 1; i <= 6; i++) {
        const k = i / 7;
        const ground = heightAt(cx + (target.x - cx) * k, cz + (target.z - cz) * k) + 0.6;
        const lineY = cy + (target.y - cy) * k;
        if (ground > lineY) cy += (ground - lineY) / (1 - k);
      }
    }
    const desired = new THREE.Vector3(cx, cy, cz);
    this.camera.position.lerp(desired, 1 - Math.exp(-dt * 6));
    if (this.shake > 0.001 && !this.store.data.settings.calm) {
      const k = this.shake * this.shake * 0.6;
      this.camera.position.x += (Math.random() - 0.5) * k;
      this.camera.position.y += (Math.random() - 0.5) * k;
      target.x += (Math.random() - 0.5) * k * 0.4;
    }
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
    const wall = this.atmo.wallAt(px, pz) > 0.5;
    const region = wall ? 'stormwall' : isl.id === 'harbor' && d < 60 ? 'harbor' : d < 150 ? isl.region : swellFactor(px, pz) > 0.5 ? 'emerald' : 'shallows';
    if (region !== this.currentRegion) {
      this.currentRegion = region;
      if ((region === 'emerald' || region === 'stormwall') && !s.data.regionsSeen.includes(region)) {
        s.data.regionsSeen.push(region);
        this.ui.banner(REGIONS[region].name, REGIONS[region].blurb);
        setTimeout(() => this.crewBark('region', { [region]: true }, { specificOnly: true, force: true }), 3500);
        s.commit();
        this.checkMilestones();
      }
    }
    // named places announce themselves the first time
    for (const poi of POIS) {
      const key = `seen_${poi.id}`;
      if (!s.data.flags.includes(key) && Math.hypot(px - poi.x, pz - poi.z) < 140) {
        s.data.flags.push(key);
        this.ui.banner(poi.name, poi.blurb ?? SETTLEMENT_MAP[poi.id]?.blurb ?? SALVAGE_SITES.find((x) => Math.hypot(x.x - poi.x, x.z - poi.z) < 60)?.blurb ?? '');
        audio.discover(2);
        if (poi.id === 'spire' && !s.data.flags.includes('reached_spire')) s.data.flags.push('reached_spire');
        setTimeout(() => this.crewBark('poi', { [poi.id]: true }, { specificOnly: true, force: true }), 3200);
        s.commit();
        this.checkMilestones();
      }
    }
    // Kai knows the sinking platform called Going Under: it was home
    const sinking = OUTPOSTS.find((o) => o.kind === 'sinking');
    if (sinking && s.hasRole('lookout') && !s.data.flags.includes('kai_going_under') && Math.hypot(px - sinking.x, pz - sinking.z) < 70) {
      s.data.flags.push('kai_going_under');
      this.crewBark('poi', { sinking: true }, { prefer: 'lookout', specificOnly: true, force: true });
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
        case 'leave_dock':
          ok = Math.hypot(this.boat.x - this.env.pierTip.x, this.boat.z - this.env.pierTip.z) > 35;
          break;
        case 'reach_turtle':
          ok = Math.hypot(this.boat.x - turtle.x, this.boat.z - turtle.z) < turtle.r + 60;
          break;
        case 'ashore':
          ok = this.mode === 'foot' && this.foot.island.id === 'turtle';
          break;
        case 'find_bottle':
          ok = s.data.fragments.includes('turtle_scrap');
          break;
        case 'dig_x':
          ok = s.data.mapsCompleted.includes('turtle_map');
          break;
        case 'return_harbor':
          ok = this.boat.docked && this.mode === 'sail';
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
      case 'ashore':
        target = this.mode === 'sail' && !this.boat.anchored ? { x: turtle.x + 6, z: turtle.z + turtle.r + 14 } : null;
        break;
      case 'find_bottle': {
        const b = turtle.finds[0];
        target = this.mode === 'foot' ? { x: turtle.x + b.x, z: turtle.z + b.z, y: 1.5 } : { x: turtle.x, z: turtle.z, y: 10 };
        break;
      }
      case 'dig_x':
        target = this.mode === 'foot' ? null : { x: turtle.x, z: turtle.z, y: 10 };
        break;
      case 'return_harbor': {
        // home by way of the Sunken Tower: the first SALVAGE is taught on the voyage. Skip past it and the marker
        // simply moves on to the pier.
        const tower = SALVAGE_SITES.find((x) => x.id === 'sv_stump')!;
        if (this.mode === 'foot') target = { x: this.foot.landX, z: this.foot.landZ, y: 1 };
        else {
          if (Math.hypot(this.boat.x - tower.x, this.boat.z - tower.z) < 45) this.voyageTowerPassed = true;
          const kai = CASTAWAYS.find((c) => c.crew === 'kai' && !s.data.castaways.includes(c.id));
          target = kai && s.data.flags.includes('voyage_kai') ? { x: kai.x, z: kai.z, y: 4 }
            : s.data.hauls === 0 && !this.voyageTowerPassed ? { x: tower.x, z: tower.z, y: 8 } : { x: this.env.pierTip.x, z: this.env.pierTip.z, y: 3 };
        }
        break;
      }
    }
    // character arcs: one beat at a time, when its moment comes (data/arcs.ts)
    // (timed on game time, not frames: right at any frame rate)
    if (this.t >= this.beatTimer) {
      this.beatTimer = this.t + 2;
      this.checkBeats();
    }
    if (this.t >= this.sideTimer) {
      this.sideTimer = this.t + 0.5;
      this.updateSide();
    }
    if (q === 'free' && s.data.followSide && this.side && this.mode === 'sail') target = { x: this.side.x, z: this.side.z, y: 8 };
    if (q === 'free' && !target && this.mode === 'sail') {
      const g = GOALS[s.data.goal];
      // build goals: the nearest salvage site with a missing material, then home to Marlo
      const build = g && goalTarget(s, g.id, this.boat, { x: this.env.pierTip.x, z: this.env.pierTip.z }, (site) => this.salvage.usable(site));
      // first crew member: Kai's raft is free and close (the hint names him), so point there until he's aboard
      const kai = g?.id === 'g_crew' ? CASTAWAYS.find((c) => c.crew === 'kai' && !s.data.castaways.includes(c.id)) : undefined;
      if (build) target = { x: build.x, z: build.z, y: build.site ? 8 : 3 };
      else if (kai) target = { x: kai.x, z: kai.z, y: 4 };
      else if (g?.target) target = { x: g.target.x, z: g.target.z, y: 12 };
      else if (this.store.hasRole('navigator')) {
        const near = this.salvage.nearestReady(this.boat.x, this.boat.z);
        if (near) target = { x: near.x, z: near.z, y: 8 };
      }
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

/** The Smiling Family: half a billboard out of the swell, its lawn bleached khaki and LIAR painted across it. */
function billboardMesh(): THREE.Object3D {
  const g = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#b9c3c4'; // washed-out sky
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = '#8f8a62'; // the lawn, bleached to khaki (green is only for living things)
  x.fillRect(0, 78, 256, 50);
  x.fillStyle = '#c9a98a';
  for (const [px, h] of [[70, 46], [100, 38], [128, 30], [156, 40]]) {
    x.fillRect(px - 8, 82 - h, 16, h); // four smiling figures, reduced to silhouettes by the sun
    x.beginPath();
    x.arc(px, 74 - h, 9, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = '#e8e2cf';
  x.font = 'bold 20px sans-serif';
  x.fillText('A HOME FOR EVERY FAMILY', 14, 24);
  x.save();
  x.translate(128, 76);
  x.rotate(-0.12);
  x.fillStyle = '#b3341f';
  x.font = 'bold 54px sans-serif';
  x.textAlign = 'center';
  x.fillText('LIAR', 0, 18);
  x.restore();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 0.3), [
    ...Array(4).fill(new THREE.MeshToonMaterial({ color: 0x5c5a54 })),
    new THREE.MeshToonMaterial({ map: tex }),
    new THREE.MeshToonMaterial({ color: 0x4a4740 }),
  ]);
  panel.position.y = 4.2;
  panel.rotation.z = 0.08;
  panel.castShadow = true;
  g.add(panel);
  for (const px of [-3, 3]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 6, 6), new THREE.MeshToonMaterial({ color: 0x6b4a33 }));
    post.position.set(px, 1.5, -0.3);
    g.add(post);
  }
  return g;
}
